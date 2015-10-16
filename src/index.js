import MediumEditor from "medium-editor";

export const atKeyCode = 50;
export const hashKeyCode = 51;

export function unwrapForTextNode (el, doc) {
    var parentNode = el.parentNode,
        prevNode,
        currentNode;
    MediumEditor.util.unwrap(el, doc);
    // Merge textNode
    currentNode = parentNode.lastChild;
    while (prevNode = currentNode.previousSibling) {
        if (3 === currentNode.nodeType && 3 === prevNode.nodeType) {
            prevNode.textContent += currentNode.textContent;
            parentNode.removeChild(currentNode);
        }
        currentNode = prevNode;
    }
}

export const TCMention = MediumEditor.Extension.extend({
    name: `mention`,

    /* extraClassName: [string]
     *
     * Extra className to be added to the `medium-editor-mention-panel` element.
     */
    extraClassName: ``,

    /* tagName: [string]
     *
     * Element tag name that would indicate that this mention. It will have
     * `medium-editor-mention-at` className applied on it.
     */
    tagName: `strong`,

    /* renderPanelContent: [function (panelEl: dom, currentMentionText: string, selectMentionCallback: function)]
     *
     * Render function that used to create the content of the panel when panel is show.
     *
     * @params panelEl: DOM element of the panel.
     *
     * @params currentMentionText: Often used as query criteria. e.g. @medium
     *
     * @params selectMentionCallback:
     *      callback used in customized panel content.
     *
     *      When called with null, it tells the Mention plugin to close the panel.
     *          e.g. selectMentionCallback(null);
     *
     *      When called with text, it tells the Mention plugin that the text is selected by the user.
     *          e.g. selectMentionCallback("@mediumrocks")
     */
    renderPanelContent: () => {},

    /* destroyPanelContent: [function (panelEl: dom)]
     *
     * Destroy function to remove any contents rendered by renderPanelContent before panelEl being removed from the document.
     *
     * @params panelEl: DOM element of the panel.
     */
    destroyPanelContent: () => {},

    activeTriggerList: [`@`],

    triggerClassNameMap: {
        "#": `medium-editor-mention-hash`,
        "@": `medium-editor-mention-at`,
    },

    init () {
        this.mentionPanel = this.createPanel();

        this.getEditorOption(`elementsContainer`).appendChild(this.mentionPanel);

        this.subscribe(`editableKeydown`, ::this.handleKeydown);
        //
        // instance variables
        this.trigger = null;
        this.triggerClassName = null;
        this.activeMentionAt = null;
    },

    createPanel () {
        const el = this.document.createElement(`div`);

        el.classList.add(`medium-editor-mention-panel`);
        if (this.extraClassName) {
          el.classList.add(this.extraClassName);
        }
        el.innerHTML = this.getTemplate();

        return el;
    },

    getTemplate: function () {
        return (
`<p>
Your mention implementation
</p>`);
    },

    destroy: function () {
        if (this.mentionPanel) {
            if (this.mentionPanel.parentNode) {
                this.destroyPanelContent(this.mentionPanel);
                this.mentionPanel.parentNode.removeChild(this.mentionPanel);
            }
            delete this.mentionPanel;
        }
    },

    handleKeydown (event) {
        switch(MediumEditor.util.getKeyCode(event)) {
            case MediumEditor.util.keyCode.ESCAPE:
                this.hidePanel();
                break;
            case MediumEditor.util.keyCode.SPACE:
                this.hidePanel();
                break;
            case MediumEditor.util.keyCode.ENTER:
                this.hidePanel();
                break;
            case MediumEditor.util.keyCode.BACKSPACE:
                const {startOffset, endOffset} = MediumEditor.selection.getSelectionRange(this.document);
                if (1 === startOffset && 1 === endOffset) {
                    // last word. So `@` will be deleted.
                    this.hidePanel();
                } else {
                    this.updatePanelContentWithDelay();
                }
                break;
            case atKeyCode:
                if (-1 !== this.activeTriggerList.indexOf(`@`)) {
                    this.handleTriggerKeydown(`@`, event);
                } else {
                    this.updatePanelContentWithDelay();
                }
                break;
            case hashKeyCode:
                if (-1 !== this.activeTriggerList.indexOf(`#`)) {
                    this.handleTriggerKeydown(`#`, event);
                } else {
                    this.updatePanelContentWithDelay();
                }
                break;
            default:
                this.updatePanelContentWithDelay();
                break;
        }
    },

    handleTriggerKeydown (trigger, event) {
        this.trigger = trigger;
        this.triggerClassName = this.triggerClassNameMap[this.trigger];

        event.preventDefault(); // Remove typed in `${ this.trigger }`
        const selectionStart = MediumEditor.selection.getSelectionStart(this.document);
        if (selectionStart.classList.contains(this.triggerClassName)) {
            // The case: `##` or `#medium#`
            // Just ignore it for now.
            return;
        }
        this.hidePanel();
        this.showPanel();
        this.positionPanel();
        this.updatePanelContentWithDelay();
    },

    handleSelectMention (seletedText) {
        if (seletedText) {
            const textNode = this.activeMentionAt.childNodes[0];
            textNode.textContent = seletedText;
            MediumEditor.selection.select(this.document, textNode, seletedText.length);
            //
            this.hidePanel();
        } else {
            this.hidePanel();
        }
    },

    hidePanel () {
        this.mentionPanel.classList.remove(`medium-editor-mention-panel-active`);

        if (this.activeMentionAt) {
            // LIKE core#execAction
            this.base.saveSelection();
            unwrapForTextNode(this.activeMentionAt, this.document);
            this.base.restoreSelection();
            // LIKE core#execAction
            this.activeMentionAt = null;
        }
    },

    showPanel () {
        // Instead, insert our own version of it.
        // TODO: Not sure why, but using <span> tag doens't work here
        const html = `<${ this.tagName } class="${ this.triggerClassName }">${ this.trigger }</${ this.tagName }>`;
        MediumEditor.util.insertHTMLCommand(this.document, html);

        if (this.mentionPanel.classList.contains(`medium-editor-mention-panel-active`)) {
            return;
        }

        this.activeMentionAt = this.document.querySelector(`.${ this.triggerClassName }`)
        this.mentionPanel.classList.add(`medium-editor-mention-panel-active`);
    },

    positionPanel () {
        const {bottom, left} = this.activeMentionAt.getBoundingClientRect();
        const {pageYOffset} = this.window;

        this.mentionPanel.style.top = `${ bottom + pageYOffset }px`;
        this.mentionPanel.style.left = `${ left }px`;
    },

    updatePanelContent () {
        const {textContent} = this.activeMentionAt;
        this.renderPanelContent(this.mentionPanel, textContent, ::this.handleSelectMention);
    },

    updatePanelContentWithDelay () {
        if (this.activeMentionAt && this.activeMentionAt === MediumEditor.selection.getSelectionStart(this.document)) {
            this.base.delay(::this.updatePanelContent);
        }
    },

});

export default TCMention;
