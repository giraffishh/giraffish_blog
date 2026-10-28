import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { markdown as markdownLanguage } from '@codemirror/lang-markdown';
import { indentWithTab } from '@codemirror/commands';
import { openSearchPanel } from '@codemirror/search';
import { imageMarkdown, safeImageUrl, readBackup, templates } from './document.js';

const assetBase = '/admin/assets';
import { livePreview, liveFocus, renderedBlocks, renderMode } from './live-preview.js';
import { LazyDocument } from './rendered-document.js';
const activeStudios = new Set();
export function markBodySaved(body) {
  if (typeof body !== 'string') return;
  for (const studio of activeStudios) {
    if (studio.value.trimEnd() !== body.trimEnd()) continue;
    clearTimeout(studio.backupTimer);
    studio.original = studio.value;
    studio.edited = false;
    try { localStorage.removeItem(studio.key); } catch { /* Optional cleanup. */ }
    studio.recovery.hidden = true;
    studio.notice('已保存');
  }
}
const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
};
const button = (label, action, cls = '') => {
  const node = el('button', cls, label);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
};
function preference(key, fallback) {
  try { return localStorage.getItem(`studio:${key}`) || fallback; } catch { return fallback; }
}
function storePreference(key, value) {
  try { localStorage.setItem(`studio:${key}`, value); } catch { /* Optional preference. */ }
}

export class WritingStudio {
  constructor(root, { value = '', onChange, name = 'body', entryKey = location.hash }) {
    this.root = root;
    this.value = value;
    this.original = value;
    this.onChange = onChange;
    this.key = `studio:backup:v1:${entryKey}:${name}`;
    this.mode = 'source';
    this.requestId = 0;
    this.abort = new AbortController();
    activeStudios.add(this);
    this.build();
    this.worker = new Worker(`${assetBase}/render-worker.js`);
    this.worker.onmessage = ({ data }) => this.renderResult(data);
    this.worker.onerror = () => this.notice('预览加载失败，源码仍可编辑。请刷新后重试。');
    this.source = new EditorView({
      parent: this.sourcePane,
      state: EditorState.create({
        doc: value,
        extensions: [basicSetup, livePreview, liveFocus, markdownLanguage(), keymap.of([indentWithTab]), EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': '正文编辑器', spellcheck: 'false' }),
          EditorView.updateListener.of(update => {
            if (update.docChanged && !this.syncing) this.commit(update.state.doc.toString());
          }),
          EditorView.domEventHandlers({ scroll: () => this.syncScroll() }),
        ],
      }),
    });
    this.offerRecovery();
    this.lazyPreview = new LazyDocument(this.previewPane);
    this.setMode(preference('mode', 'render'));
    this.queueRender(0);
    window.addEventListener('pagehide', () => this.saveBackup(), { signal: this.abort.signal });
    this.root.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.root.classList.contains('studio-focus')) this.toggleFocus();
    }, { signal: this.abort.signal });
  }

  build() {
    this.root.className = 'writing-studio';
    this.focusButton = button('全屏', () => this.toggleFocus());
    const nav = el('div', 'studio-nav');
    const modes = el('div', 'studio-modes');
    modes.setAttribute('aria-label', '编辑模式');
    this.modeButtons = {};
    for (const [mode, label] of [['render', '渲染'], ['source', '源码'], ['split', '分屏']]) {
      const item = button(label, () => this.setMode(mode));
      item.setAttribute('aria-pressed', 'false');
      this.modeButtons[mode] = item;
      modes.append(item);
    }
    nav.append(modes, button('侧栏', () => {
      this.root.classList.toggle('studio-sidebar-open');
      this.source.requestMeasure();
    }), button('查找替换', () => { this.setMode('source'); openSearchPanel(this.source); }), button('导出正文', () => this.download()), this.focusButton);
    this.recovery = el('div', 'studio-recovery');
    this.recovery.hidden = true;
    this.body = el('div', 'studio-body');
    this.sidebar = el('aside', 'studio-sidebar');
    const sidebarNav = el('div', 'studio-side-nav');
    for (const [tab, title] of [['outline', '大纲'], ['images', '图片'], ['templates', '模板']]) {
      sidebarNav.append(button(title, () => this.showSidebar(tab)));
    }
    this.sideContent = el('div', 'studio-side-content');
    this.sidebar.append(sidebarNav, this.sideContent);
    this.workspace = el('div', 'studio-workspace');
    this.sourcePane = el('div', 'studio-source');
    this.previewPane = el('article', 'studio-preview studio-typography');
    this.previewPane.setAttribute('aria-label', '文章预览');
    this.previewPane.addEventListener('click', event => {
      const link = event.target.closest('a');
      if (link?.getAttribute('href')?.startsWith('#')) {
        event.preventDefault();
        const id = link.getAttribute('href').slice(1);
        this.lazyPreview.jumpAnchor(id);
      }
    });
    this.divider = el('div', 'studio-divider');
    this.divider.tabIndex = 0;
    this.divider.setAttribute('role', 'separator');
    this.divider.setAttribute('aria-label', '拖动调整源码和预览宽度');
    this.divider.setAttribute('aria-orientation', 'vertical');
    this.divider.setAttribute('aria-valuemin', '20');
    this.divider.setAttribute('aria-valuemax', '80');
    this.setRatio(Number(preference('ratio', 50)));
    this.divider.addEventListener('pointerdown', event => {
      this.divider.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    this.divider.addEventListener('pointermove', event => {
      if (!this.divider.hasPointerCapture(event.pointerId)) return;
      const box = this.workspace.getBoundingClientRect();
      this.setRatio((event.clientX - box.left) / box.width * 100);
    });
    this.divider.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      this.setRatio(event.key === 'Home' ? 20 : event.key === 'End' ? 80 : this.ratio + (event.key === 'ArrowLeft' ? -5 : 5));
    });
    this.workspace.append(this.sourcePane, this.divider, this.previewPane);
    this.body.append(this.sidebar, this.workspace);
    this.footer = el('div', 'studio-footer');
    this.count = el('span');
    this.status = el('span');
    this.status.setAttribute('role', 'status');
    this.footer.append(this.count, this.status);
    this.root.append(nav, this.recovery, this.body, this.footer);
    this.activeSide = 'outline';
  }

  setRatio(value) {
    this.ratio = Math.max(20, Math.min(80, Number.isFinite(value) ? value : 50));
    this.workspace.style.setProperty('--studio-split', `${this.ratio}%`);
    this.divider.setAttribute('aria-valuenow', String(Math.round(this.ratio)));
    storePreference('ratio', String(this.ratio));
    this.source?.requestMeasure();
  }

  toggleFocus() {
    const focused = this.root.classList.toggle('studio-focus');
    this.focusButton.textContent = focused ? '退出全屏' : '全屏';
    this.source.requestMeasure();
  }

  setMode(mode) {
    if (mode === 'ir' || mode === 'preview') mode = 'render';
    if (!['render','source','split'].includes(mode)) mode = 'render';
    this.flush();
    this.mode = mode;
    this.root.dataset.mode = mode;
    for (const [key, btn] of Object.entries(this.modeButtons)) btn.setAttribute('aria-pressed', String(key === mode));
    storePreference('mode', mode);
    this.source.dispatch({ effects: renderMode.of(mode === 'render') });
    this.source.requestMeasure();
    this.queueRender(0);
  }

  flush() {
    // CodeMirror publishes edits synchronously; do not rewrite untouched CRLF source.
  }

  updateSource() {
    if (!this.source || this.source.state.doc.toString() === this.value) return;
    this.syncing = true;
    this.source.dispatch({ changes: { from: 0, to: this.source.state.doc.length, insert: this.value } });
    this.syncing = false;
  }

  setValue(value) {
    if (value === this.value) return;
    this.value = value || '';
    this.updateSource();

    this.queueRender(0);
  }

  commit(text) {
    if (this.value === text) return;
    this.value = text;
    this.edited = true;
    this.onChange(text);
    clearTimeout(this.backupTimer);
    this.backupTimer = setTimeout(() => this.saveBackup(), 500);
    this.queueRender();
  }

  saveBackup() {
    if (!this.edited) return;
    if (this.value === this.original) {
      if (this.edited) { try { localStorage.removeItem(this.key); } catch { /* Optional cleanup. */ } }
      return;
    }
    try {
      localStorage.setItem(this.key, JSON.stringify({ version: 1, body: this.value, base: this.original, time: Date.now() }));
      this.notice('已备份到本机');
    } catch { this.notice('本地空间不足或不可用，请及时保存到仓库或导出正文。'); }
  }

  offerRecovery() {
    let backup;
    try { backup = readBackup(localStorage, this.key, this.value); } catch { return; }
    if (!backup) return;
    this.recovery.hidden = false;
    this.recovery.append(el('span', '', `本地备份 · ${new Date(backup.time).toLocaleString('zh-CN')}`),
      button('恢复副本', () => {
        this.commit(backup.body);
        this.setValue(backup.body);
        this.updateSource();

        this.recovery.hidden = true;
      }), button('忽略此副本', () => {
        this.recovery.hidden = true;
        try { localStorage.removeItem(this.key); } catch { /* Optional cleanup. */ }
      }));
  }

  queueRender(delay = 400) {
    clearTimeout(this.renderTimer);
    this.count.textContent = `${this.value.replace(/\s/g, '').length.toLocaleString()} 字符 · ${this.value.split('\n').length.toLocaleString()} 行`;
    const id = ++this.requestId;
    this.renderTimer = setTimeout(() => {
      this.worker.postMessage({ id, text: this.source.state.doc.toString(), preview: ['split','render'].includes(this.mode) });
    }, delay);
  }

  renderResult(data) {
    if (this.destroyed || data.id !== this.requestId) return;
    if (data.error) { this.notice(`预览失败：${data.error}`); return; }
    this.documentInfo = data;
    this.showSidebar(this.activeSide);
    if (!data.blocks) return;
    this.source.dispatch({ effects: renderedBlocks.of(data.blocks) });
    if (this.mode === 'split') this.lazyPreview.update(data.blocks);
  }

  syncScroll() {
    if (this.mode !== 'split') return;
    const scroll = this.source.scrollDOM;
    const ratio = scroll.scrollTop / Math.max(1, scroll.scrollHeight - scroll.clientHeight);
    this.previewPane.scrollTop = ratio * (this.previewPane.scrollHeight - this.previewPane.clientHeight);
  }

  showSidebar(tab) {
    this.activeSide = tab;
    this.sideContent.replaceChildren();
    if (tab === 'templates') {
      for (const [name, content] of Object.entries(templates)) this.sideContent.append(button(name, () => this.insert(`\n${content}\n`), 'studio-template'));
    } else if (tab === 'images') {
      const images = this.documentInfo?.images || [];
      this.sideContent.append(el('p', 'studio-muted', `${images.length} 张图片`));
      this.sideContent.append(button('插入图片', () => this.linkDialog(true)));
      for (const image of images) {
        const card = el('div', 'studio-image-card');
        card.append(el('strong', '', image.alt || '未填写图片说明'), el('code', '', image.url));
        const actions = el('div');
        actions.append(button('定位', () => this.goToLine(image.line)), button('复制地址', async () => {
          try { await navigator.clipboard.writeText(image.url); this.notice('图片地址已复制'); }
          catch { this.notice('浏览器未允许复制，请选中图片地址复制。'); }
        }));
        const url = safeImageUrl(image.url);
        if (url) {
          const link = el('a', '', '打开');
          link.href = url.startsWith('/') ? `https://blog.giraffish.top${url}` : url;
          link.target = '_blank'; link.rel = 'noopener noreferrer';
          actions.append(link);
        }
        card.append(actions);
        this.sideContent.append(card);
      }
    } else {
      const headings = this.documentInfo?.headings || [];
      if (!headings.length) this.sideContent.append(el('p', 'studio-muted', '暂无标题'));
      for (const heading of headings) {
        const item = button(heading.text, () => this.goToLine(heading.line), 'studio-outline-item');
        item.style.paddingLeft = `${10 + Math.min(heading.level - 1, 4) * 10}px`;
        this.sideContent.append(item);
      }
    }
  }

  goToLine(number) {
    const line = this.source.state.doc.line(Math.min(number, this.source.state.doc.lines));
    if (this.mode === 'render') {
      this.source.dispatch({ effects: EditorView.scrollIntoView(line.from, { y:'start' }) });
    } else {
      this.source.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
      this.source.focus();
      if (this.mode === 'split') this.lazyPreview.jump(line.from);
    }
  }

  insert(text) {
    const from = this.source.state.selection.main.head;
    this.source.dispatch({ changes: { from, insert: text }, selection: { anchor: from + text.length } });
    this.source.focus();
  }

  linkDialog(image) {
    const dialog = el('dialog', 'studio-dialog');
    const form = el('form');
    form.method = 'dialog';
    const title = el('h2', '', image ? '插入外链图片' : '插入链接');
    const urlLabel = el('label', '', image ? '图片地址' : '链接地址');
    const url = el('input'); url.type = 'text'; url.required = true; url.placeholder = 'https://…';
    urlLabel.append(url);
    const altLabel = el('label', '', image ? '图片说明 / Alt 文本' : '链接文字');
    const alt = el('input'); alt.type = 'text'; altLabel.append(alt);
    const error = el('p', 'studio-error'); error.setAttribute('role', 'alert');
    const actions = el('div', 'studio-dialog-actions');
    const submit = el('button', 'studio-primary', '插入'); submit.type = 'submit';
    actions.append(button('取消', () => dialog.close()), submit);
    form.append(title, urlLabel, altLabel, error, actions);
    form.addEventListener('submit', event => {
      event.preventDefault();
      try {
        const text = image ? imageMarkdown(url.value, alt.value) : imageMarkdown(url.value, alt.value || '链接').slice(1);
        dialog.close();
        this.insert(text);
      } catch (err) { error.textContent = err.message; }
    });
    dialog.append(form); this.root.append(dialog);
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    dialog.showModal(); url.focus();
  }

  download() {
    this.flush();
    const url = URL.createObjectURL(new Blob([this.value], { type: 'text/markdown;charset=utf-8' }));
    const link = el('a'); link.href = url; link.download = '文章正文.md'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  notice(text) { this.status.textContent = text; }

  destroy() {
    this.flush(); this.saveBackup();
    this.destroyed = true;
    activeStudios.delete(this);
    this.abort.abort();
    clearTimeout(this.backupTimer); clearTimeout(this.renderTimer);
    this.worker.terminate(); this.lazyPreview.destroy(); this.source.destroy();
  }
}
