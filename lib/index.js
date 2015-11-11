"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.unwrapForTextNode = unwrapForTextNode;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _mediumEditor = require("medium-editor");

var _mediumEditor2 = _interopRequireDefault(_mediumEditor);

var atKeyCode = 50;
exports.atKeyCode = atKeyCode;
var hashKeyCode = 51;

exports.hashKeyCode = hashKeyCode;

function unwrapForTextNode(el, doc) {
    var parentNode = el.parentNode,
        prevNode,
        currentNode;
    _mediumEditor2["default"].util.unwrap(el, doc);
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

var TCMention = _mediumEditor2["default"].Extension.extend({
    name: "mention",

    /* extraClassName: [string]
     *
     * Extra className to be added with the `medium-editor-mention-panel` element.
     */
    extraClassName: "",

    /* extraActiveClassName: [string]
     *
     * Extra active className to be added with the `medium-editor-mention-panel-active` element.
     */
    extraActiveClassName: "",

    /* tagName: [string]
     *
     * Element tag name that would indicate that this mention. It will have
     * `medium-editor-mention-at` className applied on it.
     */
    tagName: "strong",

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
    renderPanelContent: function renderPanelContent() {},

    /* destroyPanelContent: [function (panelEl: dom)]
     *
     * Destroy function to remove any contents rendered by renderPanelContent before panelEl being removed from the document.
     *
     * @params panelEl: DOM element of the panel.
     */
    destroyPanelContent: function destroyPanelContent() {},

    activeTriggerList: ["@"],

    triggerClassNameMap: {
        "#": "medium-editor-mention-hash",
        "@": "medium-editor-mention-at"
    },

    autoHideOnBlurDelay: 300,

    init: function init() {
        this.mentionPanel = this.createPanel();

        this.getEditorOption("elementsContainer").appendChild(this.mentionPanel);

        this.subscribe("editableKeydown", this.handleKeydown.bind(this));
        this.subscribe("editableBlur", this.handleBlur.bind(this));
        this.subscribe("focus", this.handleFocus.bind(this));
        //
        // instance variables
        this.trigger = null;
        this.triggerClassName = null;
        this.activeMentionAt = null;
    },

    createPanel: function createPanel() {
        var el = this.document.createElement("div");

        el.classList.add("medium-editor-mention-panel");
        if (this.extraClassName) {
            el.classList.add(this.extraClassName);
        }
        el.innerHTML = this.getTemplate();

        return el;
    },

    getTemplate: function getTemplate() {
        return "<p>\nYour mention implementation\n</p>";
    },

    destroy: function destroy() {
        if (this.mentionPanel) {
            if (this.mentionPanel.parentNode) {
                this.destroyPanelContent(this.mentionPanel);
                this.mentionPanel.parentNode.removeChild(this.mentionPanel);
            }
            delete this.mentionPanel;
        }
    },

    handleKeydown: function handleKeydown(event) {
        switch (_mediumEditor2["default"].util.getKeyCode(event)) {
            case _mediumEditor2["default"].util.keyCode.ESCAPE:
                this.hidePanel();
                break;
            case _mediumEditor2["default"].util.keyCode.SPACE:
                this.hidePanel();
                break;
            case _mediumEditor2["default"].util.keyCode.ENTER:
                this.hidePanel();
                break;
            case _mediumEditor2["default"].util.keyCode.BACKSPACE:
                var _MediumEditor$selection$getSelectionRange = _mediumEditor2["default"].selection.getSelectionRange(this.document),
                    startOffset = _MediumEditor$selection$getSelectionRange.startOffset,
                    endOffset = _MediumEditor$selection$getSelectionRange.endOffset;

                if (1 === startOffset && 1 === endOffset) {
                    // last word. So `@` will be deleted.
                    this.hidePanel();
                } else {
                    this.updatePanelContentWithDelay();
                }
                break;
            case atKeyCode:
                if (!!event.shiftKey && -1 !== this.activeTriggerList.indexOf("@")) {
                    this.handleTriggerKeydown("@", event);
                } else {
                    this.updatePanelContentWithDelay();
                }
                break;
            case hashKeyCode:
                if (!!event.shiftKey && -1 !== this.activeTriggerList.indexOf("#")) {
                    this.handleTriggerKeydown("#", event);
                } else {
                    this.updatePanelContentWithDelay();
                }
                break;
            default:
                this.updatePanelContentWithDelay();
                break;
        }
    },

    handleBlur: function handleBlur(event) {
        this.autoHideTimeoutId = setTimeout(this.hidePanel.bind(this), this.autoHideOnBlurDelay);
    },

    handleFocus: function handleFocus(event) {
        clearTimeout(this.autoHideTimeoutId);
    },

    handleTriggerKeydown: function handleTriggerKeydown(trigger, event) {
        this.trigger = trigger;
        this.triggerClassName = this.triggerClassNameMap[this.trigger];

        event.preventDefault(); // Remove typed in `${ this.trigger }`
        var selectionStart = _mediumEditor2["default"].selection.getSelectionStart(this.document);
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

    handleSelectMention: function handleSelectMention(seletedText) {
        if (seletedText) {
            var textNode = this.activeMentionAt.childNodes[0];
            textNode.textContent = seletedText;
            _mediumEditor2["default"].selection.select(this.document, textNode, seletedText.length);
            //
            this.hidePanel();
        } else {
            this.hidePanel();
        }
    },

    hidePanel: function hidePanel() {
        this.mentionPanel.classList.remove("medium-editor-mention-panel-active");
        if (this.extraActiveClassName) {
            this.mentionPanel.classList.remove(this.extraActiveClassName);
        }

        if (this.activeMentionAt) {
            // LIKE core#execAction
            this.base.saveSelection();
            unwrapForTextNode(this.activeMentionAt, this.document);
            this.base.restoreSelection();
            // LIKE core#execAction
            this.activeMentionAt = null;
        }
    },

    showPanel: function showPanel() {
        // Instead, insert our own version of it.
        // TODO: Not sure why, but using <span> tag doens't work here
        var html = "<" + this.tagName + " class=\"" + this.triggerClassName + "\">" + this.trigger + "</" + this.tagName + ">";
        _mediumEditor2["default"].util.insertHTMLCommand(this.document, html);

        if (this.mentionPanel.classList.contains("medium-editor-mention-panel-active")) {
            return;
        }

        this.activeMentionAt = this.document.querySelector("." + this.triggerClassName);
        this.mentionPanel.classList.add("medium-editor-mention-panel-active");
        if (this.extraActiveClassName) {
            this.mentionPanel.classList.add(this.extraActiveClassName);
        }
    },

    positionPanel: function positionPanel() {
        var _activeMentionAt$getBoundingClientRect = this.activeMentionAt.getBoundingClientRect();

        var bottom = _activeMentionAt$getBoundingClientRect.bottom;
        var left = _activeMentionAt$getBoundingClientRect.left;
        var width = _activeMentionAt$getBoundingClientRect.width;
        var _window = this.window;
        var pageXOffset = _window.pageXOffset;
        var pageYOffset = _window.pageYOffset;

        this.mentionPanel.style.top = pageYOffset + bottom + "px";
        this.mentionPanel.style.left = pageXOffset + left + width + "px";
    },

    updatePanelContent: function updatePanelContent() {
        var textContent = this.activeMentionAt.textContent;

        this.positionPanel();
        this.renderPanelContent(this.mentionPanel, textContent, this.handleSelectMention.bind(this));
    },

    updatePanelContentWithDelay: function updatePanelContentWithDelay() {
        if (this.activeMentionAt && this.activeMentionAt === _mediumEditor2["default"].selection.getSelectionStart(this.document)) {
            this.base.delay(this.updatePanelContent.bind(this));
        }
    }

});

exports.TCMention = TCMention;
exports["default"] = TCMention;