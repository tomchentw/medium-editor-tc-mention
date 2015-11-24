import MediumEditor from "medium-editor";

function last (text) {
    return text[text.length - 1];
}

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
     * Extra className to be added with the `medium-editor-mention-panel` element.
     */
    extraClassName: ``,

    /* extraActiveClassName: [string]
     *
     * Extra active className to be added with the `medium-editor-mention-panel-active` element.
     */
    extraActiveClassName: ``,

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

    activeTriggerClassNameMap: {
        "#": `medium-editor-mention-hash-active`,
        "@": `medium-editor-mention-at-active`,
    },

    hideOnBlurDelay: 300,

    init () {
        this.initMentionPanel();
        this.attachEventHandlers();
    },

    destroy () {
        if (this.mentionPanel) {
            if (this.mentionPanel.parentNode) {
                this.destroyPanelContent(this.mentionPanel);
                this.mentionPanel.parentNode.removeChild(this.mentionPanel);
            }
            delete this.mentionPanel;
        }
    },

    initMentionPanel () {
        const el = this.document.createElement(`div`);

        el.classList.add(`medium-editor-mention-panel`);
        if (this.extraClassName) {
          el.classList.add(this.extraClassName);
        }

        this.getEditorOption(`elementsContainer`).appendChild(el);

        this.mentionPanel = el;
    },

    attachEventHandlers () {
        if (null != this.hideOnBlurDelay) {
            // for hideOnBlurDelay, the panel should hide after blur event
            this.subscribe(`blur`, ::this.handleBlur);
            // and clear out hide timeout if focus again
            this.subscribe(`focus`, ::this.handleFocus);
        }
        // if the editor changes its content, we have to show or hide the panel
        this.subscribe(`editableKeyup`, ::this.handleKeyup);
    },

    handleBlur () {
        if (null != this.hideOnBlurDelay) {
            this.hideOnBlurDelayId = setTimeout(::this.hidePanel, this.hideOnBlurDelay);
        }
    },

    handleFocus () {
        if (this.hideOnBlurDelayId) {
            clearTimeout(this.hideOnBlurDelayId);
            this.hideOnBlurDelayId = null;
        }
    },

    handleKeyup (event) {
        const keyCode = MediumEditor.util.getKeyCode(event);
        const isSpace = keyCode === MediumEditor.util.keyCode.SPACE;
        this.getWordFromSelection(event.target, isSpace ? -1 : 0);

        if (!isSpace && -1 !== this.activeTriggerList.indexOf(this.trigger) && 1 < this.word.length) {
            this.showPanel();
        } else {
            this.hidePanel();
        }
    },

    hidePanel () {
        this.mentionPanel.classList.remove(`medium-editor-mention-panel-active`);
        if (this.extraActiveClassName) {
            this.mentionPanel.classList.remove(this.extraActiveClassName);
        }
        if (this.activeMentionAt) {
            this.activeMentionAt.classList.remove(this.activeTriggerClassName);
        }
        if (this.activeMentionAt) {
            // http://stackoverflow.com/a/27004526/1458162
            const {parentNode, nextSibling, firstChild} = this.activeMentionAt;
            let textNode = nextSibling;
            if (!nextSibling) {
                textNode = this.document.createTextNode(``);
                parentNode.appendChild(textNode);
            } else if (3 !== nextSibling.nodeType) {
                textNode = this.document.createTextNode(``);
                parentNode.insertBefore(textNode, nextSibling);
            }
            const lastEmptyWord = last(firstChild.textContent);
            const hasLastEmptyWord = 0 === lastEmptyWord.trim().length;
            if (hasLastEmptyWord) {
                firstChild.textContent = firstChild.textContent.substr(0, firstChild.textContent.length-1);
                textNode.textContent = `${ lastEmptyWord }${ textNode.textContent }`;
            } else {
                if (0 === textNode.textContent.length && 1 < firstChild.textContent.length) {
                    textNode.textContent = `\u00A0`;
                }
            }
            MediumEditor.selection.select(this.document, textNode, Math.min(textNode.length, 1));
            if (1 >= firstChild.textContent.length) {
                // LIKE core#execAction
                this.base.saveSelection();
                unwrapForTextNode(this.activeMentionAt, this.document);
                this.base.restoreSelection();
            }
            //
            this.activeMentionAt = null;
        }
    },

    getWordFromSelection (target, initialDiff) {
        const {startContainer, startOffset, endContainer, endOffset} = MediumEditor.selection.getSelectionRange(this.document);
        if (startContainer !== endContainer) {
            return;
        }
        const {textContent} = startContainer;

        function getWordPosition (position, diff) {
            const prevText = textContent[position - 1];
            if (null == prevText || 0 === prevText.trim().length || 0 >= position || textContent.length < position) {
                return position;
            } else {
                return getWordPosition(position + diff, diff);
            }
        }

        this.wordStart = getWordPosition(startOffset + initialDiff, -1);
        this.wordEnd = getWordPosition(startOffset + initialDiff, 1) - 1;
        this.word = textContent.slice(this.wordStart, this.wordEnd);
        this.trigger = this.word.slice(0, 1);
        this.triggerClassName = this.triggerClassNameMap[this.trigger];
        this.activeTriggerClassName = this.activeTriggerClassNameMap[this.trigger];
    },

    showPanel () {
        if (!this.mentionPanel.classList.contains(`medium-editor-mention-panel-active`)) {
            this.activatePanel();
            this.wrapWordInMentionAt();
        }
        this.positionPanel();
        this.updatePanelContent();
    },

    activatePanel () {
        this.mentionPanel.classList.add(`medium-editor-mention-panel-active`);
        if (this.extraActiveClassName) {
            this.mentionPanel.classList.add(this.extraActiveClassName);
        }
    },

    wrapWordInMentionAt () {
        const selection = this.document.getSelection();
        if (!selection.rangeCount) {
            return;
        }
        // http://stackoverflow.com/a/6328906/1458162
        const range = selection.getRangeAt(0).cloneRange();
        if (range.startContainer.parentNode.classList.contains(this.triggerClassName)) {
            this.activeMentionAt = range.startContainer.parentNode;
        } else {
            range.setStart(range.startContainer, this.wordStart);
            range.setEnd(range.startContainer, Math.min(this.wordEnd, range.startContainer.textContent.length));
            // Instead, insert our own version of it.
            // TODO: Not sure why, but using <span> tag doens't work here
            const element = this.document.createElement(this.tagName);
            element.classList.add(this.triggerClassName);
            this.activeMentionAt = element;
            //
            range.surroundContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        MediumEditor.selection.select(this.document, this.activeMentionAt.firstChild, this.word.length);
        this.activeMentionAt.classList.add(this.activeTriggerClassName);
    },

    positionPanel () {
        const {bottom, left, width} = this.activeMentionAt.getBoundingClientRect();
        const {pageXOffset, pageYOffset} = this.window;

        this.mentionPanel.style.top = `${ pageYOffset + bottom }px`;
        this.mentionPanel.style.left = `${ pageXOffset + left + width }px`;
    },

    updatePanelContent () {
        this.renderPanelContent(this.mentionPanel, this.word, ::this.handleSelectMention);
    },

    handleSelectMention (seletedText) {
        if (seletedText) {
            const textNode = this.activeMentionAt.firstChild;
            textNode.textContent = seletedText;
            MediumEditor.selection.select(this.document, textNode, seletedText.length);
            //
            this.hidePanel();
        } else {
            this.hidePanel();
        }
    },

});

export default TCMention;
