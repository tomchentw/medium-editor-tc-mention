import {
  default as MediumEditor,
} from "medium-editor";

function last(text) {
  return text[text.length - 1];
}

export const LEFT_ARROW_KEYCODE = 37;

export function unwrapForTextNode(el, doc) {
  const parentNode = el.parentNode;
  MediumEditor.util.unwrap(el, doc);
    // Merge textNode
  let currentNode = parentNode.lastChild;
  let prevNode = currentNode.previousSibling;
  while (prevNode) {
    if (currentNode.nodeType === 3 && prevNode.nodeType === 3) {
      prevNode.textContent += currentNode.textContent;
      parentNode.removeChild(currentNode);
    }
    currentNode = prevNode;
    prevNode = currentNode.previousSibling;
  }
}

export const TCMention = MediumEditor.Extension.extend({
  name: `mention`,

  /* @deprecated: use extraPanelClassName. Will remove in next major (3.0.0) release
   * extraClassName: [string]
   *
   * Extra className to be added with the `medium-editor-mention-panel` element.
   */
  extraClassName: ``,

  /* @deprecated: use extraActivePanelClassName. Will remove in next major (3.0.0) release
   * extraActiveClassName: [string]
   *
   * Extra active className to be added with the `medium-editor-mention-panel-active` element.
   */
  extraActiveClassName: ``,

  /* extraPanelClassName: [string]
   *
   * Extra className to be added with the `medium-editor-mention-panel` element.
   */
  extraPanelClassName: ``,

  /* extraActivePanelClassName: [string]
   *
   * Extra active className to be added with the `medium-editor-mention-panel-active` element.
   */
  extraActivePanelClassName: ``,

  extraTriggerClassNameMap: {},

  extraActiveTriggerClassNameMap: {},

  /* tagName: [string]
   *
   * Element tag name that would indicate that this mention. It will have
   * `medium-editor-mention-at` className applied on it.
   */
  tagName: `strong`,

  /* renderPanelContent: [
   *    function (panelEl: dom, currentMentionText: string, selectMentionCallback: function)
   * ]
   *
   * Render function that used to create the content of the panel when panel is show.
   *
   * @params panelEl: DOM element of the panel.
   *
   * @params currentMentionText: Often used as query criteria. e.g. @medium
   *
   * @params selectMentionCallback:
   *    callback used in customized panel content.
   *
   *    When called with null, it tells the Mention plugin to close the panel.
   *        e.g. selectMentionCallback(null);
   *
   *    When called with text, it tells the Mention plugin that the text is selected by the user.
   *        e.g. selectMentionCallback("@mediumrocks")
   */
  renderPanelContent() {},

  /* destroyPanelContent: [function (panelEl: dom)]
   *
   * Destroy function to remove any contents rendered by renderPanelContent
   *  before panelEl being removed from the document.
   *
   * @params panelEl: DOM element of the panel.
   */
  destroyPanelContent() {},

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

  init() {
    this.initMentionPanel();
    this.attachEventHandlers();
  },

  destroy() {
    this.detachEventHandlers();
    this.destroyMentionPanel();
  },

  initMentionPanel() {
    const el = this.document.createElement(`div`);

    el.classList.add(`medium-editor-mention-panel`);
    if (this.extraPanelClassName || this.extraClassName) {
      el.classList.add(this.extraPanelClassName || this.extraClassName);
    }

    this.getEditorOption(`elementsContainer`).appendChild(el);

    this.mentionPanel = el;
  },

  destroyMentionPanel() {
    if (this.mentionPanel) {
      if (this.mentionPanel.parentNode) {
        this.destroyPanelContent(this.mentionPanel);
        this.mentionPanel.parentNode.removeChild(this.mentionPanel);
      }
      delete this.mentionPanel;
    }
  },

  attachEventHandlers() {
    this.unsubscribeCallbacks = [];

    const subscribeCallbackName = (eventName, callbackName) => {
      const boundCallback = ::this[callbackName];
      this.subscribe(eventName, boundCallback);

      this.unsubscribeCallbacks.push(() => {
        // Bug: this.unsubscribe isn't exist!
        this.base.unsubscribe(eventName, boundCallback);
      });
    };

    if (this.hideOnBlurDelay !== null && this.hideOnBlurDelay !== undefined) {
      // for hideOnBlurDelay, the panel should hide after blur event
      subscribeCallbackName(`blur`, `handleBlur`);
      // and clear out hide timeout if focus again
      subscribeCallbackName(`focus`, `handleFocus`);
    }
    // if the editor changes its content, we have to show or hide the panel
    subscribeCallbackName(`editableKeyup`, `handleKeyup`);
  },

  detachEventHandlers() {
    if (this.hideOnBlurDelayId) {
      clearTimeout(this.hideOnBlurDelayId);
    }
    if (this.unsubscribeCallbacks) {
      this.unsubscribeCallbacks.forEach(boundCallback => boundCallback());
      this.unsubscribeCallbacks = null;
    }
  },

  handleBlur() {
    if (this.hideOnBlurDelay !== null && this.hideOnBlurDelay !== undefined) {
      this.hideOnBlurDelayId = setTimeout(() => {
        this.hidePanel(false);
      }, this.hideOnBlurDelay);
    }
  },

  handleFocus() {
    if (this.hideOnBlurDelayId) {
      clearTimeout(this.hideOnBlurDelayId);
      this.hideOnBlurDelayId = null;
    }
  },

  handleKeyup(event) {
    const keyCode = MediumEditor.util.getKeyCode(event);
    const isSpace = keyCode === MediumEditor.util.keyCode.SPACE;
    this.getWordFromSelection(event.target, isSpace ? -1 : 0);

    if (!isSpace && this.activeTriggerList.indexOf(this.trigger) !== -1 && this.word.length > 1) {
      this.showPanel();
    } else {
      this.hidePanel(keyCode === LEFT_ARROW_KEYCODE);
    }
  },

  hidePanel(isArrowTowardsLeft) {
    this.mentionPanel.classList.remove(`medium-editor-mention-panel-active`);
    const extraActivePanelClassName = this.extraActivePanelClassName || this.extraActiveClassName;

    if (extraActivePanelClassName) {
      this.mentionPanel.classList.remove(extraActivePanelClassName);
    }
    if (this.activeMentionAt) {
      this.activeMentionAt.classList.remove(this.activeTriggerClassName);
      if (this.extraActiveTriggerClassName) {
        this.activeMentionAt.classList.remove(this.extraActiveTriggerClassName);
      }
    }
    if (this.activeMentionAt) {
      // http://stackoverflow.com/a/27004526/1458162
      const { parentNode, previousSibling, nextSibling, firstChild } = this.activeMentionAt;
      const siblingNode = isArrowTowardsLeft ? previousSibling : nextSibling;
      let textNode;
      if (!siblingNode) {
        textNode = this.document.createTextNode(``);
        parentNode.appendChild(textNode);
      } else if (siblingNode.nodeType !== 3) {
        textNode = this.document.createTextNode(``);
        parentNode.insertBefore(textNode, siblingNode);
      } else {
        textNode = siblingNode;
      }
      const lastEmptyWord = last(firstChild.textContent);
      const hasLastEmptyWord = lastEmptyWord.trim().length === 0;
      if (hasLastEmptyWord) {
        const { textContent } = firstChild;
        firstChild.textContent = textContent.substr(0, textContent.length - 1);
        textNode.textContent = `${lastEmptyWord}${textNode.textContent}`;
      } else {
        if (textNode.textContent.length === 0 && firstChild.textContent.length > 1) {
          textNode.textContent = `\u00A0`;
        }
      }
      if (isArrowTowardsLeft) {
        MediumEditor.selection.select(this.document, textNode, textNode.length);
      } else {
        MediumEditor.selection.select(this.document, textNode, Math.min(textNode.length, 1));
      }
      if (firstChild.textContent.length <= 1) {
        // LIKE core#execAction
        this.base.saveSelection();
        unwrapForTextNode(this.activeMentionAt, this.document);
        this.base.restoreSelection();
      }
      //
      this.activeMentionAt = null;
    }
  },

  getWordFromSelection(target, initialDiff) {
    const {
      startContainer,
      startOffset,
      endContainer,
    } = MediumEditor.selection.getSelectionRange(this.document);
    if (startContainer !== endContainer) {
      return;
    }
    const { textContent } = startContainer;

    function getWordPosition(position, diff) {
      const prevText = textContent[position - 1];
      if (prevText === null || prevText === undefined) {
        return position;
      } else if (prevText.trim().length === 0 || position <= 0 || textContent.length < position) {
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
      //
    this.extraTriggerClassName = this.extraTriggerClassNameMap[this.trigger];
    this.extraActiveTriggerClassName = this.extraActiveTriggerClassNameMap[this.trigger];
  },

  showPanel() {
    if (!this.mentionPanel.classList.contains(`medium-editor-mention-panel-active`)) {
      this.activatePanel();
      this.wrapWordInMentionAt();
    }
    this.positionPanel();
    this.updatePanelContent();
  },

  activatePanel() {
    this.mentionPanel.classList.add(`medium-editor-mention-panel-active`);
    if (this.extraActivePanelClassName || this.extraActiveClassName) {
      this.mentionPanel.classList.add(this.extraActivePanelClassName || this.extraActiveClassName);
    }
  },

  wrapWordInMentionAt() {
    const selection = this.document.getSelection();
    if (!selection.rangeCount) {
      return;
    }
    // http://stackoverflow.com/a/6328906/1458162
    const range = selection.getRangeAt(0).cloneRange();
    if (range.startContainer.parentNode.classList.contains(this.triggerClassName)) {
      this.activeMentionAt = range.startContainer.parentNode;
    } else {
      const nextWordEnd = Math.min(this.wordEnd, range.startContainer.textContent.length);
      range.setStart(range.startContainer, this.wordStart);
      range.setEnd(range.startContainer, nextWordEnd);
      // Instead, insert our own version of it.
      // TODO: Not sure why, but using <span> tag doens't work here
      const element = this.document.createElement(this.tagName);
      element.classList.add(this.triggerClassName);
      if (this.extraTriggerClassName) {
        element.classList.add(this.extraTriggerClassName);
      }
      this.activeMentionAt = element;
      //
      range.surroundContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
      //
      MediumEditor.selection.select(
        this.document,
        this.activeMentionAt.firstChild,
        this.word.length
      );
    }
    this.activeMentionAt.classList.add(this.activeTriggerClassName);
    if (this.extraActiveTriggerClassName) {
      this.activeMentionAt.classList.add(this.extraActiveTriggerClassName);
    }
  },

  positionPanel() {
    const { bottom, left, width } = this.activeMentionAt.getBoundingClientRect();
    const { pageXOffset, pageYOffset } = this.window;

    this.mentionPanel.style.top = `${pageYOffset + bottom}px`;
    this.mentionPanel.style.left = `${pageXOffset + left + width}px`;
  },

  updatePanelContent() {
    this.renderPanelContent(this.mentionPanel, this.word, ::this.handleSelectMention);
  },

  handleSelectMention(seletedText) {
    if (seletedText) {
      const textNode = this.activeMentionAt.firstChild;
      textNode.textContent = seletedText;
      MediumEditor.selection.select(this.document, textNode, seletedText.length);
      //
      // If one of our contenteditables currently has focus, we should
      // attempt to trigger the 'editableInput' event
      const target = this.base.getFocusedElement();
      if (target) {
        this.base.events.updateInput(target, {
          target,
          currentTarget: target,
        });
      }
      //
      this.hidePanel(false);
    } else {
      this.hidePanel(false);
    }
  },

});

export default TCMention;
