import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { markdown as markdownLanguage } from '@codemirror/lang-markdown';
import { indentWithTab } from '@codemirror/commands';
import { openSearchPanel } from '@codemirror/search';
import DOMPurify from 'dompurify';
import { imageMarkdown, safeImageUrl, readBackup, templates, documentSections } from './document.js';

const assetBase = '/admin/assets';
const vditorCDN = `${assetBase}/vditor`;
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
    studio.notice('正文已保存到当前文章');
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
        extensions: [basicSetup, markdownLanguage(), keymap.of([indentWithTab]), EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': 'Markdown 源码', spellcheck: 'false' }),
          EditorView.updateListener.of(update => {
            if (update.docChanged && !this.syncing) this.commit(update.state.doc.toString());
          }),
          EditorView.domEventHandlers({ scroll: () => this.syncScroll() }),
        ],
      }),
    });
    this.offerRecovery();
    this.setMode(preference('mode', value.length > 100000 ? 'split' : 'ir'));
    this.queueRender(0);
    window.addEventListener('pagehide', () => this.saveBackup(), { signal: this.abort.signal });
    this.root.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.root.classList.contains('studio-focus')) this.toggleFocus();
    }, { signal: this.abort.signal });
  }

  build() {
    this.root.className = 'writing-studio';
    const header = el('div', 'studio-heading');
    const brand = el('div');
    brand.append(el('span', 'studio-eyebrow', 'GIRAFFISH / WRITING STUDIO'), el('strong', '', '让思考，顺畅落笔。'));
    this.focusButton = button('专注写作 ↗', () => this.toggleFocus(), 'studio-primary');
    header.append(brand, this.focusButton);
    const nav = el('div', 'studio-nav');
    const modes = el('div', 'studio-modes');
    modes.setAttribute('aria-label', '编辑模式');
    this.modeButtons = {};
    for (const [mode, label] of [['ir', '即时渲染'], ['source', '源码'], ['split', '分屏'], ['preview', '阅读']]) {
      const item = button(label, () => this.setMode(mode));
      item.setAttribute('aria-pressed', 'false');
      this.modeButtons[mode] = item;
      modes.append(item);
    }
    nav.append(modes, button('大纲 / 图片', () => {
      this.root.classList.toggle('studio-sidebar-open');
      this.source.requestMeasure();
    }), button('查找替换', () => { this.setMode('source'); openSearchPanel(this.source); }), button('导出正文', () => this.download()));
    this.toolbar = el('div', 'studio-tools');
    this.toolbar.append(
      button('B', () => this.wrap('**', '**', '粗体文字'), 'studio-bold'),
      button('H₂', () => this.insert('\n## 小标题\n')),
      button('链接', () => this.linkDialog(false)),
      button('外链图片', () => this.linkDialog(true), 'studio-accent'),
      button('代码', () => this.insert(`\n${templates['代码示例']}\n`)),
      button('公式', () => this.insert(`\n${templates['公式']}\n`)),
      button('表格', () => this.insert(`\n${templates['表格']}\n`)),
      button('写作模板', () => { this.root.classList.add('studio-sidebar-open'); this.showSidebar('templates'); }),
    );
    this.sectionBar = el('div', 'studio-section-bar');
    this.sectionBar.hidden = true;
    const sectionLabel = el('label', '', '长文分节编辑 ');
    this.sectionSelect = el('select');
    this.sectionSelect.setAttribute('aria-label', '当前编辑章节');
    this.sectionSelect.addEventListener('change', () => {
      this.flush();
      this.sectionIndex = Number(this.sectionSelect.value);
      this.configureIRScope();
      this.ensureIR();
    });
    sectionLabel.append(this.sectionSelect);
    this.sectionBar.append(sectionLabel, el('span', '', '源码与分屏始终显示全文。'));
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
    this.irPane = el('div', 'studio-ir');
    this.previewPane = el('article', 'studio-preview');
    this.previewPane.setAttribute('aria-label', '文章预览');
    this.previewPane.addEventListener('click', event => {
      const link = event.target.closest('a');
      if (link?.getAttribute('href')?.startsWith('#')) {
        event.preventDefault();
        const id = link.getAttribute('href').slice(1);
        this.previewPane.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({ block: 'nearest' });
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
    this.workspace.append(this.sourcePane, this.divider, this.previewPane, this.irPane);
    this.body.append(this.sidebar, this.workspace);
    this.footer = el('div', 'studio-footer');
    this.count = el('span');
    this.status = el('span', '', '本地恢复副本仅保存在此浏览器，发布请使用文章保存按钮。');
    this.status.setAttribute('role', 'status');
    this.footer.append(this.count, this.status);
    this.root.append(header, nav, this.toolbar, this.sectionBar, this.recovery, this.body, this.footer);
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
    this.focusButton.textContent = focused ? '返回文章设置 ↙' : '专注写作 ↗';
    this.source.requestMeasure();
  }

  setMode(mode) {
    if (!['ir', 'source', 'split', 'preview'].includes(mode)) mode = 'ir';
    this.flush();
    this.mode = mode;
    this.root.dataset.mode = mode;
    for (const [key, btn] of Object.entries(this.modeButtons)) btn.setAttribute('aria-pressed', String(key === mode));
    storePreference('mode', mode);
    this.toolbar.hidden = mode === 'preview';
    this.sectionBar.hidden = true;
    if (mode === 'ir') { this.configureIRScope(); this.ensureIR(); }
    else this.updateSource();
    this.source.requestMeasure();
    this.queueRender(0);
  }

  configureIRScope() {
    this.irScope = null;
    if (this.value.length <= 80000) return;
    const sections = documentSections(this.value);
    this.sectionIndex = Math.min(this.sectionIndex || 0, sections.length - 1);
    this.irScope = { ...sections[this.sectionIndex] };
    this.sectionSelect.replaceChildren();
    sections.forEach((section, i) => {
      const option = el('option', '', `${i + 1}. ${section.title}`);
      option.value = String(i); this.sectionSelect.append(option);
    });
    this.sectionSelect.value = String(this.sectionIndex);
    this.sectionBar.hidden = false;
  }

  irText() { return this.irScope ? this.value.slice(this.irScope.from, this.irScope.to) : this.value; }

  commitIR(text) {
    this.irValue = text;
    if (!this.irScope) { this.commit(text); return; }
    const { from, to } = this.irScope;
    const next = this.value.slice(0, from) + text + this.value.slice(to);
    this.irScope.to = from + text.length;
    this.commit(next);
  }

  ensureIR() {
    const editorText = this.irText();
    if (editorText.length > 80000) {
      this.notice('这个章节较长，已使用分屏模式。可添加小标题后按章节即时编辑。');
      this.setMode('split'); return;
    }
    if (this.vditor) {
      // Initialization loads Lute asynchronously. Do not swap a section while
      // the initial document is still being mounted into the editor.
      if (!this.irReady) return;
      if (this.irValue !== editorText) {
        this.irReady = false;
        this.vditor.setValue(editorText, true);
        this.irBaseline = this.vditor.getValue();
        this.irValue = editorText;
        this.irReady = true;
        this.irEdited = false;
      }
      return;
    }
    if (!window.Vditor) { this.notice('即时渲染组件未加载，已切换至源码。'); this.setMode('source'); return; }
    this.irValue = editorText;
    this.sectionSelect.disabled = true;
    this.vditor = new window.Vditor(this.irPane, {
      cdn: vditorCDN, value: editorText, mode: 'ir', lang: 'zh_CN', height: '100%',
      cache: { enable: false }, toolbar: [], toolbarConfig: { hide: true },
      placeholder: '从一个想法开始，输入 Markdown…',
      outline: { enable: false },
      preview: {
        delay: 350, maxWidth: 10000,
        markdown: { sanitize: true, autoSpace: false, fixTermTypo: false, codeBlockPreview: false },
        math: { engine: 'KaTeX', inlineDigit: true },
        hljs: { enable: true },
        transform: html => DOMPurify.sanitize(html),
      },
      link: { isOpen: false },
      upload: { handler: () => { this.notice('请先将图片上传到图床，再使用“外链图片”插入地址。'); return '请使用外链图片地址'; } },
      after: () => {
        if (this.destroyed) return;
        this.irBaseline = this.vditor.getValue();
        this.irValue = editorText;
        this.irReady = true;
        this.sectionSelect.disabled = false;
        this.irPane.querySelector('.vditor-ir [contenteditable="true"]')?.setAttribute('aria-label', '即时渲染编辑器');
        if (this.irText() !== editorText) this.ensureIR();
      },
      input: text => {
        if (!this.irReady || this.mode !== 'ir' || text === this.irBaseline) return;
        this.irEdited = true;
        this.irBaseline = text;
        this.commitIR(text);
      },
    });
  }

  flush() {
    // Vditor debounces its input callback. Read the DOM synchronously before a
    // save/mode/section change, comparing with its normalized baseline so merely
    // opening a document never rewrites the original Markdown.
    if (this.mode === 'ir' && this.irReady) {
      const text = this.vditor.getValue();
      if (text !== this.irBaseline) {
        this.irBaseline = text;
        this.commitIR(text);
      }
    }
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
    if (this.mode === 'ir') this.ensureIR();
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
      this.notice(`本地恢复副本已更新 · ${new Date().toLocaleTimeString('zh-CN')} · 尚需保存到仓库`);
    } catch { this.notice('本地空间不足或不可用，请及时保存到仓库或导出正文。'); }
  }

  offerRecovery() {
    let backup;
    try { backup = readBackup(localStorage, this.key, this.value); } catch { return; }
    if (!backup) return;
    this.recovery.hidden = false;
    this.recovery.append(el('span', '', `发现 ${new Date(backup.time).toLocaleString('zh-CN')} 的本地副本。恢复前可先导出当前正文。`),
      button('恢复副本', () => {
        this.commit(backup.body);
        this.setValue(backup.body);
        this.updateSource();
        if (this.mode === 'ir') this.ensureIR();
        this.recovery.hidden = true;
      }), button('忽略此副本', () => {
        this.recovery.hidden = true;
        try { localStorage.removeItem(this.key); } catch { /* Optional cleanup. */ }
      }));
  }

  queueRender(delay = 400) {
    clearTimeout(this.renderTimer);
    this.count.textContent = `${this.value.replace(/\s/g, '').length.toLocaleString()} 字符 · ${this.value.split('\n').length.toLocaleString()} 行`;
    this.renderTimer = setTimeout(() => {
      this.worker.postMessage({ id: ++this.requestId, text: this.value, preview: ['split','preview'].includes(this.mode) });
    }, delay);
  }

  renderResult(data) {
    if (this.destroyed || data.id !== this.requestId) return;
    if (data.error) { this.notice(`预览失败：${data.error}`); return; }
    this.documentInfo = data;
    this.showSidebar(this.activeSide);
    if (data.html === undefined || !['split','preview'].includes(this.mode)) return;
    const ratio = this.previewPane.scrollTop / Math.max(1, this.previewPane.scrollHeight - this.previewPane.clientHeight);
    this.previewPane.innerHTML = DOMPurify.sanitize(data.html, { ADD_ATTR: ['target'], FORBID_TAGS: ['iframe', 'form', 'input', 'style'] });
    for (const image of this.previewPane.querySelectorAll('img')) {
      image.loading = 'lazy';
      image.referrerPolicy = 'no-referrer';
      const src = image.getAttribute('src');
      if (src?.startsWith('/')) image.src = new URL(src, 'https://blog.giraffish.top').href;
    }
    for (const link of this.previewPane.querySelectorAll('a[href]')) {
      link.target = '_blank'; link.rel = 'noopener noreferrer';
    }
    this.previewPane.scrollTop = ratio * (this.previewPane.scrollHeight - this.previewPane.clientHeight);
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
      this.sideContent.append(el('p', 'studio-muted', '在光标处插入，不覆盖已有内容。'));
      for (const [name, content] of Object.entries(templates)) this.sideContent.append(button(name, () => this.insert(`\n${content}\n`), 'studio-template'));
    } else if (tab === 'images') {
      const images = this.documentInfo?.images || [];
      this.sideContent.append(el('p', 'studio-muted', `当前文章引用了 ${images.length} 个图片地址。外链直接保留，无需导入媒体库。`));
      if (!images.length) this.sideContent.append(button('插入第一张外链图片', () => this.linkDialog(true)));
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
      if (!headings.length) this.sideContent.append(el('p', 'studio-muted', '用 # 或 ## 添加标题，大纲会自动出现。'));
      for (const heading of headings) {
        const item = button(heading.text, () => this.goToLine(heading.line), 'studio-outline-item');
        item.style.paddingLeft = `${10 + Math.min(heading.level - 1, 4) * 10}px`;
        this.sideContent.append(item);
      }
    }
  }

  goToLine(number) {
    this.setMode('source');
    const line = this.source.state.doc.line(Math.min(number, this.source.state.doc.lines));
    this.source.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
    this.source.focus();
  }

  insert(text) {
    if (this.mode === 'ir' && this.irReady) {
      this.vditor.insertMD(text);
      this.irEdited = true;
      this.flush();
      return;
    }
    if (this.mode === 'preview') this.setMode('source');
    const { from, to } = this.source.state.selection.main;
    this.source.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } });
    this.source.focus();
  }

  wrap(before, after, placeholder) {
    const selected = this.mode === 'ir' ? this.vditor?.getSelection() : this.source.state.sliceDoc(this.source.state.selection.main.from, this.source.state.selection.main.to);
    this.insert(`${before}${selected || placeholder}${after}`);
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
    const hint = el('p', 'studio-muted', image ? '支持图床外链和 /images/ 站内路径，保留原地址。粘贴完整 Markdown 图片语法请直接粘贴到源码。' : '输入完整地址，支持 http(s)。');
    const error = el('p', 'studio-error'); error.setAttribute('role', 'alert');
    const actions = el('div', 'studio-dialog-actions');
    const submit = el('button', 'studio-primary', '插入'); submit.type = 'submit';
    actions.append(button('取消', () => dialog.close()), submit);
    form.append(title, urlLabel, altLabel, hint, error, actions);
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
    this.worker.terminate(); this.source.destroy(); this.vditor?.destroy();
  }
}
