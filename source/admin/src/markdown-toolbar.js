import {compactQuery} from './responsive-layout.js';

import {button} from './studio-ui.js';

// Presentation only: the tool entry owns documents, persistence and save state.
export class MarkdownToolbar {
  constructor({onNew, onOpen, onSave}) {
    this.filename = document.createElement('span');
    this.filename.className = 'markdown-filename';
    this.storageStatus = document.createElement('span');
    this.storageStatus.className = 'markdown-storage';
    this.storageStatus.setAttribute('role', 'status');
    this.saveButton = button('保存', () => onSave(), 'markdown-save');
    this.saveButton.title = '保存（Ctrl / ⌘ + S）';
    this.newButton = button('新建', onNew);
    this.openButton = button('打开', () => onOpen());
    this.copyButton = button('另存为', () => onSave(true));
    for (const action of [this.newButton, this.openButton, this.saveButton, this.copyButton]) {
      action.classList.add('markdown-file-action');
    }
    this.back = document.createElement('a');
    this.back.href = '/tools/';
    this.back.className = 'markdown-back';
    this.back.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M19 12H5m6-6-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    this.back.title = '返回工具集';
    this.back.setAttribute('aria-label', '返回工具集');
    this.input = document.createElement('input');
    this.input.type = 'file';
    this.input.accept = '.md,.markdown,.txt';
    this.input.hidden = true;
    document.body.append(this.input);
    this.input.addEventListener('change', () => {
      const file = this.input.files[0];
      this.input.value = '';
      if (file) onOpen({file});
    });
    this.compact = window.matchMedia(compactQuery);
    this.compact.addEventListener('change', () => this.placeActions());
  }
  mount(studio) {
    this.studio = studio;
    studio.root.classList.add('studio-toolbar-integrated', 'markdown-tool');
    studio.exitSlot.append(this.back);
    studio.leadingActionsSlot.append(this.filename);
    studio.footer.prepend(this.storageStatus);
    this.placeActions();
  }
  placeActions() {
    if (!this.studio) return;
    const {actionsSlot, extraActionsSlot} = this.studio;
    if (this.compact.matches) {
      actionsSlot.append(this.saveButton);
      extraActionsSlot.append(this.newButton, this.openButton, this.copyButton);
    } else {
      actionsSlot.append(this.newButton, this.openButton, this.saveButton, this.copyButton);
    }
  }
  update({name, dirty, busy, status}) {
    this.filename.textContent = name + (dirty ? ' •' : '');
    this.filename.title = name;
    document.title = (dirty ? '• ' : '') + name + ' · Markdown';
    this.storageStatus.textContent = status;
    this.saveButton.disabled = busy;
  }
  chooseFile() { this.input.click(); }
}
