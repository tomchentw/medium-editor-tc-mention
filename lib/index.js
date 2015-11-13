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

    hideOnBlurDelay: 300,

    init: function init() {
        this.initMentionPanel();
        this.attachEventHandlers();
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

    initMentionPanel: function initMentionPanel() {
        var el = this.document.createElement("div");

        el.classList.add("medium-editor-mention-panel");
        if (this.extraClassName) {
            el.classList.add(this.extraClassName);
        }

        this.getEditorOption("elementsContainer").appendChild(el);

        this.mentionPanel = el;
    },

    attachEventHandlers: function attachEventHandlers() {
        if (null != this.hideOnBlurDelay) {
            // for hideOnBlurDelay, the panel should hide after blur event
            this.subscribe("blur", this.handleBlur.bind(this));
            // and clear out hide timeout if focus again
            this.subscribe("focus", this.handleFocus.bind(this));
        }
        // if the editor changes its content, we have to show or hide the panel
        this.subscribe("editableKeyup", this.handleKeyup.bind(this));
    },

    handleBlur: function handleBlur() {
        if (null != this.hideOnBlurDelay) {
            this.hideOnBlurDelayId = setTimeout(this.hidePanel.bind(this), this.hideOnBlurDelay);
        }
    },

    handleFocus: function handleFocus() {
        if (this.hideOnBlurDelayId) {
            clearTimeout(this.hideOnBlurDelayId);
            this.hideOnBlurDelayId = null;
        }
    },

    handleKeyup: function handleKeyup(event) {
        var keyCode = _mediumEditor2["default"].util.getKeyCode(event);
        var isSpace = keyCode === _mediumEditor2["default"].util.keyCode.SPACE;
        this.getWordFromSelection(event.target, isSpace ? -1 : 0);

        if (!isSpace && -1 !== this.activeTriggerList.indexOf(this.trigger) && 1 < this.word.length) {
            this.showPanel();
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

    getWordFromSelection: function getWordFromSelection(target, initialDiff) {
        var _MediumEditor$selection$getSelectionRange = _mediumEditor2["default"].selection.getSelectionRange(this.document);

        var startContainer = _MediumEditor$selection$getSelectionRange.startContainer;
        var startOffset = _MediumEditor$selection$getSelectionRange.startOffset;
        var endContainer = _MediumEditor$selection$getSelectionRange.endContainer;
        var endOffset = _MediumEditor$selection$getSelectionRange.endOffset;

        if (startContainer !== endContainer) {
            return;
        }
        var textContent = startContainer.textContent;

        function getWordPosition(_x, _x2) {
            var _again = true;

            _function: while (_again) {
                var position = _x,
                    diff = _x2;
                prevText = undefined;
                _again = false;

                var prevText = textContent[position - 1];
                if (null == prevText || 0 === prevText.trim().length || 0 >= position || textContent.length < position) {
                    return position;
                } else {
                    _x = position + diff;
                    _x2 = diff;
                    _again = true;
                    continue _function;
                }
            }
        }

        this.wordStart = getWordPosition(startOffset + initialDiff, -1);
        this.wordEnd = getWordPosition(startOffset + initialDiff, 1) - 1;
        this.word = textContent.slice(this.wordStart, this.wordEnd);
        this.trigger = this.word.slice(0, 1);
        this.triggerClassName = this.triggerClassNameMap[this.trigger];
    },

    showPanel: function showPanel() {
        if (!this.mentionPanel.classList.contains("medium-editor-mention-panel-active")) {
            this.activatePanel();
            this.wrapWordInMentionAt();
        }
        this.positionPanel();
        this.updatePanelContent();
    },

    activatePanel: function activatePanel() {
        this.mentionPanel.classList.add("medium-editor-mention-panel-active");
        if (this.extraActiveClassName) {
            this.mentionPanel.classList.add(this.extraActiveClassName);
        }
    },

    wrapWordInMentionAt: function wrapWordInMentionAt() {
        var selection = this.document.getSelection();
        if (selection.rangeCount) {
            // http://stackoverflow.com/a/6328906/1458162
            var range = selection.getRangeAt(0).cloneRange();
            range.setStart(range.startContainer, this.wordStart);
            range.setEnd(range.startContainer, Math.min(this.wordEnd, range.startContainer.textContent.length));
            // Instead, insert our own version of it.
            // TODO: Not sure why, but using <span> tag doens't work here
            var element = this.document.createElement(this.tagName);
            element.classList.add(this.triggerClassName);
            this.activeMentionAt = element;
            //
            range.surroundContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
            //
            _mediumEditor2["default"].selection.select(this.document, element.firstChild, this.word.length);
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
        this.renderPanelContent(this.mentionPanel, this.word, this.handleSelectMention.bind(this));
    },

    handleSelectMention: function handleSelectMention(seletedText) {
        if (seletedText) {
            var textNode = this.activeMentionAt.firstChild;
            textNode.textContent = seletedText;
            _mediumEditor2["default"].selection.select(this.document, textNode, seletedText.length);
            //
            this.hidePanel();
        } else {
            this.hidePanel();
        }
    }

});

exports.TCMention = TCMention;
exports["default"] = TCMention;