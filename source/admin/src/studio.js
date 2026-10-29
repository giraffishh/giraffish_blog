import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { markdown as markdownLanguage } from '@codemirror/lang-markdown';
import { indentWithTab } from '@codemirror/commands';
import { openSearchPanel, search } from '@codemirror/search';
import { readBackup, templates } from './document-utils.js';
import { livePreview, liveFocus, renderedBlocks } from './live-preview.js';
import { LazyDocument } from './rendered-document.js';
import { createTemplateCard } from './template-card.js';
import { clampRatio, modeAtRatio, dividerRatio, DEFAULT_SOURCE_FIRST } from './split-layout.js';
import { ScrollSync, indexBefore } from './scroll-sync.js';
import { SidebarResize } from './sidebar-resize.js';
import { createImageThumbnail, imagePreviewUrl } from './image-preview.js';
import { reloadDocumentImages } from './image-reload.js';
import { MetadataDock } from './metadata-dock.js';
import { LayoutMotion, reducedMotion } from './layout-motion.js';
import { PaneLayout } from './pane-layout.js';
import { compactQuery, ResponsiveEditorLayout } from './responsive-layout.js';
import { compactAction } from './action-icon.js';
import { DocumentRenderer } from './analysis-client.js';
import { attachToolbar } from './toolbar-bridge.js';
import { ToolbarMenus } from './toolbar-menus.js';
import { startPdfExport } from './pdf-launcher.js';
import { downloadText } from './export-utils.js';
import { sourceCodeLanguage, sourceCodeHighlight } from './source-code.js';
let toolbarId = 0;
const activeStudios = new Set();
export function markBodySaved(body) {
  if (typeof body !== 'string') return;
  for (const studio of activeStudios) {
    if (studio.value.trimEnd() !== body.trimEnd()) continue;
    clearTimeout(studio.backupTimer);
    studio.original = studio.value;
    studio.edited = false;
    try {
      localStorage.removeItem(studio.key);
    } catch {/* Optional cleanup. */}
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
  try {
    return localStorage.getItem(`studio:${key}`) || fallback;
  } catch {
    return fallback;
  }
}
function storePreference(key, value) {
  try {
    localStorage.setItem(`studio:${key}`, value);
  } catch {/* Optional preference. */}
}
export class WritingStudio {
  constructor(root, {
    value = '',
    onChange,
    name = 'body',
    entryKey = location.hash
  }) {
    this.root = root;
    this.value = value;
    this.original = value;
    this.onChange = onChange;
    this.key = `studio:backup:v1:${entryKey}:${name}`;
    this.mode = 'source';
    this.sourceFirst = preference('source-first', String(DEFAULT_SOURCE_FIRST)) === 'true';
    this.requestId = 0;
    this.abort = new AbortController();
    this.compact = window.matchMedia(compactQuery).matches;
    this.desktopSidebarOpen = preference('sidebar-open', 'true') === 'true';
    activeStudios.add(this);
    this.build();
    this.motion = new LayoutMotion(this.root);
    this.renderer = new DocumentRenderer(data => this.renderResult(data));
    this.source = new EditorView({
      parent: this.sourcePane,
      state: EditorState.create({
        doc: value,
        extensions: [basicSetup, livePreview, liveFocus, markdownLanguage({codeLanguages:sourceCodeLanguage}), sourceCodeHighlight, keymap.of([indentWithTab]), EditorView.lineWrapping, search({
          top: true
        }), EditorState.phrases.of({
          'Find': '查找内容',
          'Replace': '替换为',
          'next': '下一处',
          'previous': '上一处',
          'all': '选中全部',
          'match case': '区分大小写',
          'regexp': '正则表达式',
          'by word': '全词匹配',
          'replace': '替换',
          'replace all': '全部替换',
          'close': '关闭查找',
          'No matches found': '未找到匹配项',
          'replaced $ matches': '已替换 $ 处',
          'current match': '当前匹配',
          'on line': '位于行'
        }), EditorView.contentAttributes.of({
          'aria-label': '正文编辑器',
          spellcheck: 'false'
        }), EditorView.updateListener.of(update => {
          if (update.docChanged && !this.syncing) this.commit(update.state.doc.toString());
          if (update.geometryChanged || update.viewportChanged) this.scrollSync?.schedule();
        })]
      })
    });
    this.offerRecovery();
    this.lazyPreview = new LazyDocument(this.previewPane, () => this.scrollSync?.schedule());
    this.scrollSync = new ScrollSync(this);
    this.paneLayout = new PaneLayout(this);
    this.sidebarResize = new SidebarResize({
      body: this.body,
      handle: this.sidebarDivider,
      initialWidth: Number(preference('sidebar-width', 240)),
      onResize: () => {
        this.source.requestMeasure();
        this.scrollSync.schedule();
        this.metadataDock?.schedule();
      },
      onCommit: width => {
        storePreference('sidebar-width', String(width));
        this.scrollSync.schedule();
      }
    });
    this.metadataDock = new MetadataDock(this);
    this.responsiveLayout = new ResponsiveEditorLayout(this);
    this.toolbarMenus = new ToolbarMenus(this);
    this.setMode(preference('mode', 'render'));
    window.addEventListener('pagehide', () => this.saveBackup(), {
      signal: this.abort.signal
    });
    this.detachToolbar = attachToolbar(this);
  }
  build() {
    this.root.className = 'writing-studio studio-focus';
    delete this.root.dataset.mode;
    delete this.root.dataset.paneMode;
    this.root.dataset.sourceFirst = String(this.sourceFirst);
    this.root.classList.toggle('studio-sidebar-open', !this.compact && this.desktopSidebarOpen);
    const nav = el('div', 'studio-nav studio-unified-nav');
    this.nav = nav;
    this.exitSlot = el('div', 'studio-exit-slot');
    this.actionsSlot = el('div', 'studio-actions-slot');
    this.extraActionsSlot = el('div', 'studio-extra-actions');
    this.cmsToolsSlot = el('div', 'studio-toolbar-native-tools');
    this.toolbarTools = el('div', 'studio-toolbar-secondary');
    this.toolbarTools.id = `studio-toolbar-tools-${++toolbarId}`;
    this.toolbarTools.setAttribute('aria-label', '更多编辑操作');
    this.toolbarMore = button('⋯', () => this.toggleToolbarTools(), 'studio-toolbar-more');
    this.toolbarMore.setAttribute('aria-label', '更多编辑操作');
    this.toolbarMore.setAttribute('aria-controls', this.toolbarTools.id);
    this.toolbarMore.setAttribute('aria-expanded', 'false');
    const tools = el('div', 'studio-editor-tools');
    const modes = el('div', 'studio-modes');
    modes.setAttribute('aria-label', '编辑模式');
    this.modeButtons = {};
    for (const [mode, label] of [['source', '源码'], ['split', '分屏'], ['render', '渲染']]) {
      const item = button(label, () => { if (this.compact) this.toggleSidebar(false); this.setMode(mode); });
      compactAction(item, mode);
      item.setAttribute('aria-pressed', 'false');
      this.modeButtons[mode] = item;
      modes.append(item);
    }
    this.metadataToggle = button('元数据', () => {
      const visible = this.root.classList.contains('studio-sidebar-open') && this.activeSide === 'metadata';
      this.toggleSidebar(!visible);
      if (!visible) this.showSidebar('metadata');
    });
    this.swapButton = compactAction(button('交换左右', () => this.swapPanes()), 'swap');
    this.swapButton.classList.add('studio-swap-toggle');
    tools.append(compactAction(this.metadataToggle, 'metadata'), compactAction(button('查找替换', () => {
      if (this.compact) this.toggleSidebar(false);
      openSearchPanel(this.source);
    }), 'search'), this.swapButton, compactAction(button('导出', () => this.exportDialog()), 'download'));
    this.toolbarTools.append(this.extraActionsSlot, tools, this.cmsToolsSlot);
    const leading = el('div', 'studio-toolbar-leading');
    this.leadingActionsSlot = el('div', 'studio-extra-actions');
    leading.append(this.exitSlot, this.actionsSlot, this.leadingActionsSlot);
    nav.append(leading, modes, this.toolbarMore, this.toolbarTools);
    tools.addEventListener('click', () => this.toggleToolbarTools(false));
    document.addEventListener('pointerdown', event => {
      if (!this.toolbarTools.contains(event.target) && !this.toolbarMore.contains(event.target)) this.toggleToolbarTools(false);
    }, {signal:this.abort.signal});
    nav.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !this.root.classList.contains('studio-tools-open')) return;
      this.toggleToolbarTools(false);
      this.toolbarMore.focus();
      event.preventDefault();
    });
    this.recovery = el('div', 'studio-recovery');
    this.recovery.hidden = true;
    this.body = el('div', 'studio-body');
    this.sidebar = el('aside', 'studio-sidebar');
    const sidebarNav = el('div', 'studio-side-nav');
    sidebarNav.setAttribute('aria-label', '侧栏内容');
    this.sidebarButtons = {};
    for (const [tab, title] of [['outline', '大纲'], ['metadata', '元数据'], ['images', '图片'], ['templates', '模板']]) {
      const item = button(title, () => this.showSidebar(tab));
      item.setAttribute('aria-pressed', String(tab === 'outline'));
      this.sidebarButtons[tab] = item;
      sidebarNav.append(item);
    }
    this.sideContent = el('div', 'studio-side-content');
    this.metadataSlot = el('div', 'studio-metadata-slot');
    this.metadataSlot.hidden = true;
    this.sidebar.append(sidebarNav, this.sideContent, this.metadataSlot);
    this.sidebarDivider = el('div', 'studio-sidebar-divider');
    this.workspace = el('div', 'studio-workspace');
    this.sourcePane = el('div', 'studio-source');
    this.previewFrame = el('div', 'studio-preview-frame');
    this.previewPane = el('article', 'studio-preview studio-typography');
    this.previewFrame.append(this.previewPane);
    this.previewPane.setAttribute('aria-label', '文章预览');
    this.previewPane.addEventListener('click', event => {
      const link = event.composedPath()[0].closest?.('a');
      if (link?.getAttribute('href')?.startsWith('#')) {
        event.preventDefault();
        const id = link.getAttribute('href').slice(1);
        if (this.scrollSync) this.scrollSync.leader = 'preview';
        this.lazyPreview.jumpAnchor(id);
        this.scrollSync?.schedule();
      }
    });
    this.divider = el('div', 'studio-divider');
    this.divider.tabIndex = 0;
    this.divider.setAttribute('role', 'separator');
    this.divider.setAttribute('aria-label', '拖动调整源码和预览宽度');
    this.divider.setAttribute('aria-orientation', 'vertical');
    this.divider.setAttribute('aria-valuemin', '0');
    this.divider.setAttribute('aria-valuemax', '100');
    this.splitRatio = clampRatio(Number(preference('divider-position', 100 - Number(preference('ratio', 50)))));
    if (modeAtRatio(this.splitRatio) !== 'split') this.splitRatio = 50;
    this.setRatio(this.splitRatio);
    this.divider.addEventListener('pointerdown', event => {
      if (event.button !== 0 || this.drag) return;
      const box = this.workspace.getBoundingClientRect();
      this.drag = {
        id: event.pointerId,
        coordinate: this.compact ? event.clientY : event.clientX,
        mode: this.mode,
        ratio: this.ratio,
        start: this.compact ? box.top : box.left,
        length: this.compact ? box.height : box.width,
        moved: false
      };
      this.divider.setPointerCapture(event.pointerId);
      this.divider.focus();
      event.preventDefault();
    });
    this.divider.addEventListener('pointermove', event => {
      if (this.drag?.id !== event.pointerId) return;
      const coordinate = this.compact ? event.clientY : event.clientX;
      if (!this.drag.moved && Math.abs(coordinate - this.drag.coordinate) < 3) return;
      this.drag.moved = true;
      this.root.classList.add('studio-resizing');
      this.drag.next = (coordinate - this.drag.start) / this.drag.length * 100;
      if (this.mode !== 'split') this.setMode('split');
      if (!this.dragFrame) this.dragFrame = requestAnimationFrame(() => {
        this.dragFrame = 0;
        if (this.drag) this.setRatio(this.drag.next);
      });
    });
    const finishDrag = (event, cancelled = false) => {
      if (this.drag?.id !== event.pointerId) return;
      const drag = this.drag;
      cancelAnimationFrame(this.dragFrame);
      this.dragFrame = 0;
      if (!cancelled && drag.next != null) this.setRatio(drag.next);
      this.drag = null;
      this.root.classList.remove('studio-resizing');
      if (this.divider.hasPointerCapture(event.pointerId)) this.divider.releasePointerCapture(event.pointerId);
      if (cancelled) {
        this.setMode(drag.mode);
        this.setRatio(drag.ratio);
      } else if (drag.moved) this.settleRatio(this.ratio);
      this.scrollSync?.schedule();
    };
    this.divider.addEventListener('pointerup', event => finishDrag(event));
    this.divider.addEventListener('pointercancel', event => finishDrag(event, true));
    this.divider.addEventListener('lostpointercapture', event => finishDrag(event, true));
    this.divider.addEventListener('keydown', event => {
      const previous = this.compact ? 'ArrowUp' : 'ArrowLeft';
      const next = this.compact ? 'ArrowDown' : 'ArrowRight';
      if (![previous, next, 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = dividerRatio(this.mode, this.ratio, this.sourceFirst);
      this.settleRatio(event.key === 'Home' ? 0 : event.key === 'End' ? 100 : current + (event.key === previous ? -5 : 5));
    });
    this.workspace.append(this.previewFrame, this.divider, this.sourcePane);
    this.sidebarBackdrop = button('', () => this.toggleSidebar(false), 'studio-sidebar-backdrop');
    this.sidebarBackdrop.setAttribute('aria-label', '关闭侧栏');
    this.body.append(this.sidebar, this.sidebarDivider, this.workspace, this.sidebarBackdrop);
    this.footer = el('div', 'studio-footer');
    this.sidebarToggle = button('', () => this.toggleSidebar(), 'studio-sidebar-toggle');
    const sidebarIcon = el('span', 'studio-sidebar-icon');
    sidebarIcon.setAttribute('aria-hidden', 'true');
    this.sidebarToggle.append(sidebarIcon);
    this.updateSidebarToggle();
    const footerInfo = el('div', 'studio-footer-info');
    this.count = el('span');
    this.status = el('span');
    this.status.setAttribute('role', 'status');
    footerInfo.append(this.status, this.count);
    this.footer.append(this.sidebarToggle, footerInfo);
    this.root.append(nav, this.recovery, this.body, this.footer);
    this.activeSide = 'outline';
  }
  setRatio(value) {
    const ratio = clampRatio(value);
    if (ratio === this.ratio) return;
    this.ratio = ratio;
    if (this.mode === 'split') this.paneLayout?.resize();
    this.updateDivider();
    this.source?.requestMeasure();
  }
  toggleToolbarTools(force) {
    const open = force ?? !this.root.classList.contains('studio-tools-open');
    this.root.classList.toggle('studio-tools-open', open);
    this.toolbarMore.setAttribute('aria-expanded', String(open));
    this.toolbarMenus?.tools(open);
  }
  updateDivider() {
    const value = dividerRatio(this.mode, this.ratio, this.sourceFirst);
    const low = this.compact ? '上' : '左';
    const high = this.compact ? '下' : '右';
    const before = this.sourceFirst ? high : low;
    const after = this.sourceFirst ? low : high;
    const preview = this.sourceFirst ? 100 - value : value;
    const swapLabel = this.compact ? '交换上下' : '交换左右';
    this.swapButton.querySelector('.studio-action-label').textContent = swapLabel;
    this.swapButton.setAttribute('aria-label', swapLabel);
    this.swapButton.title = swapLabel + (this.mode === 'split' ? '' : '（分屏模式）');
    this.swapButton.disabled = this.mode !== 'split';
    this.divider.setAttribute('aria-orientation', this.compact ? 'horizontal' : 'vertical');
    this.divider.setAttribute('aria-label', this.compact ? '拖动调整源码和预览高度' : '拖动调整源码和预览宽度');
    this.divider.setAttribute('aria-valuenow', String(Math.round(value)));
    this.divider.setAttribute('aria-valuetext', this.mode === 'render' ? `渲染，向${before}拖动展开源码` : this.mode === 'source' ? `源码，向${after}拖动展开预览` : '预览 ' + Math.round(preview) + '%，源码 ' + Math.round(100 - preview) + '%');
    this.divider.title = this.mode === 'split' ? `拖动调整${this.compact ? '高度' : '宽度'}，拖到边缘切换单栏` : this.mode === 'source' ? `向${after}拖动展开预览` : `向${before}拖动展开源码`;
  }
  swapPanes() {
    if (this.mode !== 'split' || this.drag) return;
    this.paneLayout.swap(() => {
      this.sourceFirst = !this.sourceFirst;
      this.root.dataset.sourceFirst = String(this.sourceFirst);
      this.ratio = 100 - this.ratio;
      this.splitRatio = this.ratio;
      storePreference('source-first', String(this.sourceFirst));
      storePreference('divider-position', String(this.ratio));
      this.updateDivider();
    });
  }
  settleRatio(value) {
    const ratio = clampRatio(value);
    const mode = modeAtRatio(ratio, this.sourceFirst);
    if (mode === 'split') {
      this.splitRatio = ratio;
      storePreference('divider-position', String(ratio));
    }
    this.setMode(mode);
  }
  updateSidebarToggle() {
    const open = this.root.classList.contains('studio-sidebar-open');
    this.workspace.inert = this.compact && open;
    this.sidebar.inert = !open;
    this.sidebarDivider.inert = !open || this.compact;
    this.sidebarToggle.setAttribute('aria-expanded', String(open));
    this.sidebarToggle.setAttribute('aria-label', open ? '隐藏侧栏' : '显示侧栏');
    this.sidebarToggle.title = open ? '隐藏侧栏' : '显示侧栏';
    const metadataVisible = open && this.activeSide === 'metadata';
    this.metadataToggle.setAttribute('aria-expanded', String(metadataVisible));
    this.metadataToggle.title = metadataVisible ? '关闭元数据侧栏' : '打开元数据侧栏';
  }
  toggleSidebar(force) {
    const open = force ?? !this.root.classList.contains('studio-sidebar-open');
    const changed = open !== this.root.classList.contains('studio-sidebar-open');
    if (changed) {
      clearTimeout(this.sidebarMotionTimer);
      const closing = !open && this.root.classList.contains('studio-ready') && !reducedMotion();
      this.root.classList.toggle('studio-sidebar-closing', closing);
      if (closing) this.sidebarMotionTimer = setTimeout(() => {
        this.root.classList.remove('studio-sidebar-closing');
        this.metadataDock?.sync();
        this.source?.requestMeasure();
      }, 220);
    }
    this.root.classList.toggle('studio-sidebar-open', open);
    this.sidebar.inert = !open;
    this.sidebarDivider.inert = !open;
    if (!this.compact) {
      this.desktopSidebarOpen = open;
      storePreference('sidebar-open', String(open));
    }
    this.updateSidebarToggle();
    this.source?.requestMeasure();
    this.updateOutline(this.currentLine || 1, true);
    this.metadataDock?.sync();
  }
  setMode(mode) {
    if (mode === 'ir' || mode === 'preview') mode = 'render';
    if (!['render', 'source', 'split'].includes(mode)) mode = 'render';
    if (this.root.dataset.mode === mode) {
      if (mode === 'split') this.setRatio(this.splitRatio);
      return;
    }
    this.mode = mode;
    this.root.dataset.mode = mode;
    if (mode === 'split') this.ratio = clampRatio(this.drag?.next ?? this.splitRatio);
    this.updateDivider();
    for (const [key, btn] of Object.entries(this.modeButtons)) btn.setAttribute('aria-pressed', String(key === mode));
    storePreference('mode', mode);
    this.paneLayout.change();
    this.scrollSync.leader = 'source';
    this.scrollSync.navigation = null;
    this.queueRender(0);
  }
  updateSource() {
    if (!this.source || this.source.state.doc.toString() === this.value) return;
    this.syncing = true;
    this.source.dispatch({
      changes: {
        from: 0,
        to: this.source.state.doc.length,
        insert: this.value
      }
    });
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
      if (this.edited) {
        try {
          localStorage.removeItem(this.key);
        } catch {/* Optional cleanup. */}
      }
      return;
    }
    try {
      localStorage.setItem(this.key, JSON.stringify({
        version: 1,
        body: this.value,
        base: this.original,
        time: Date.now()
      }));
      this.notice('已备份到本机');
    } catch {
      this.notice('本地空间不足或不可用，请及时保存到仓库或导出正文。');
    }
  }
  offerRecovery() {
    let backup;
    try {
      backup = readBackup(localStorage, this.key, this.value);
    } catch {
      return;
    }
    if (!backup) return;
    this.recovery.hidden = false;
    this.recovery.append(el('span', '', `本地备份 · ${new Date(backup.time).toLocaleString('zh-CN')}`), button('恢复副本', () => {
      this.commit(backup.body);
      this.setValue(backup.body);
      this.updateSource();
      this.recovery.hidden = true;
    }), button('忽略此副本', () => {
      this.recovery.hidden = true;
      try {
        localStorage.removeItem(this.key);
      } catch {/* Optional cleanup. */}
    }));
  }
  queueRender(delay = 400) {
    clearTimeout(this.renderTimer);
    if (this.countedValue !== this.value) {
      this.countedValue = this.value;
      this.count.textContent = `${this.value.replace(/\s/g, '').length.toLocaleString()} 字符 · ${this.source.state.doc.lines.toLocaleString()} 行`;
    }
    const id = ++this.requestId;
    if (this.analyzedValue === this.value && this.documentInfo && (this.mode === 'source' || this.documentInfo.blocks)) {
      this.applyDocument(this.documentInfo);
      return;
    }
    this.renderTimer = setTimeout(() => {
      this.requestedValue = this.value;
      this.renderer.request(id, this.value, this.mode !== 'source');
    }, delay);
  }
  renderResult(data) {
    if (this.destroyed || data.id !== this.requestId) return;
    if (data.error) {
      this.workspace.dataset.initialError = 'true';
      this.notice(`预览失败：${data.error}`);
      return;
    }
    delete this.workspace.dataset.initialError;
    this.documentInfo = data;
    this.analyzedValue = this.requestedValue;
    this.applyDocument(data);
  }
  applyDocument(data) {
    this.showSidebar(this.activeSide);
    if (data.blocks) {
      if (this.appliedBlocks !== data.blocks) {
        this.appliedBlocks = data.blocks;
        this.source.dispatch({effects: renderedBlocks.of(data.blocks)});
      }
      if ((this.mode === 'split' || this.paneLayout?.moving) && this.previewBlocks !== data.blocks) {
        this.previewBlocks = data.blocks;
        this.lazyPreview.update(data.blocks);
      }
    }
    this.scrollSync?.refresh(data.blocks);
    if (this.paneLayout?.pending && data.blocks) this.paneLayout.change();
  }
  updateOutline(line, force = false) {
    this.currentLine = line;
    if (this.activeSide !== 'outline' || !this.outlineItems?.length) return;
    const index = indexBefore(this.outlineItems, line, item => item.line);
    const active = this.outlineItems[index].element;
    const changed = this.activeOutline !== active;
    if (changed) {
      this.activeOutline?.removeAttribute('aria-current');
      active.setAttribute('aria-current', 'location');
      this.activeOutline = active;
    }
    if (changed || force) {
      const path = new Set();
      for (let at = index; at != null; at = this.outlineItems[at].parent) path.add(at);
      for (let i = 0; i < this.outlineItems.length; i++) {
        const item = this.outlineItems[i];
        item.element.hidden = item.parent != null && !path.has(item.parent);
        if (item.hasChildren) {
          item.element.setAttribute('aria-expanded', String(path.has(i)));
          item.element.querySelector('.studio-outline-arrow').textContent = path.has(i) ? '▾' : '▸';
        }
      }
    }
    if ((changed || force) && this.root.classList.contains('studio-sidebar-open')) {
      const bounds = this.sidebar.getBoundingClientRect();
      const item = active.getBoundingClientRect();
      const top = bounds.top + this.sidebar.querySelector('.studio-side-nav').offsetHeight + 8;
      const bottom = bounds.bottom - 8;
      if (item.top < top) this.sidebar.scrollTop += item.top - top;else if (item.bottom > bottom) this.sidebar.scrollTop += item.bottom - bottom;
    }
  }
  showSidebar(tab) {
    const changed = this.activeSide !== tab;
    this.activeSide = tab;
    this.sidebar.dataset.section = tab;
    this.sideContent.hidden = tab === 'metadata';
    this.metadataSlot.hidden = tab !== 'metadata';
    for (const [key, item] of Object.entries(this.sidebarButtons)) item.setAttribute('aria-pressed', String(key === tab));
    this.updateSidebarToggle();
    const items = tab === 'outline' ? this.documentInfo?.headings : tab === 'images' ? this.documentInfo?.images : null;
    const signature = items === this.sidebarItems && tab === this.sidebarTab ? this.sidebarSignature : `${tab}:${JSON.stringify(items || [])}`;
    this.sidebarItems = items;
    this.sidebarTab = tab;
    if (signature === this.sidebarSignature) {
      if (tab === 'outline') this.updateOutline(this.currentLine || 1);
      if (tab === 'metadata') this.metadataDock?.sync();
      return;
    }
    this.sidebarSignature = signature;
    this.outlineItems = [];
    this.sideContent.replaceChildren();
    if (tab === 'metadata') {
      this.metadataDock?.sync();
      if (changed && this.metadataDock?.form) {
        for (const field of this.metadataDock.form.children) if (field !== this.metadataDock.host) this.motion?.reveal(field);
      }
      return;
    } else if (tab === 'templates') {
      let notes;
      for (const [name, content] of Object.entries(templates)) {
        const card = createTemplateCard(name, content, () => this.insert(`\n${content}\n`));
        if (['提示便签', '成功便签', '警告便签'].includes(name)) {
          if (!notes) {
            const group = el('div', 'studio-template-notes');
            group.setAttribute('role', 'group');
            group.setAttribute('aria-label', '便签');
            notes = el('div', 'studio-template-note-options');
            group.append(el('span', 'studio-template-name', '便签'), notes);
            this.sideContent.append(group);
          }
          card.classList.add('studio-template-compact');
          card.querySelector('.note p').textContent = name.replace('便签', '');
          notes.append(card);
        } else this.sideContent.append(card);
      }
    } else if (tab === 'images') {
      const images = this.documentInfo?.images || [];
      this.sideContent.append(el('p', 'studio-muted', `${images.length} 张图片`));
      this.reloadImagesButton = button('重新加载所有图片', () => this.reloadImages());
      this.reloadImagesButton.disabled = Boolean(this.reloadingImages) || !images.length;
      this.sideContent.append(this.reloadImagesButton);
      const thumbnails = new Map();
      for (const image of images) {
        const card = el('div', 'studio-image-card');
        const name = image.alt || '未填写图片说明';
        const key = JSON.stringify([image.url, name]);
        const thumbnail = this.imageThumbnails?.get(key) || createImageThumbnail(image.url, name);
        thumbnails.set(key, thumbnail);
        card.append(el('strong', '', name), thumbnail);
        const actions = el('div', 'studio-image-actions');
        actions.append(button('定位', () => this.goToLine(image.line)), button('复制地址', async () => {
          try {
            await navigator.clipboard.writeText(image.url);
            this.notice('图片地址已复制');
          } catch {
            this.notice('浏览器未允许复制，请选中图片地址复制。');
          }
        }));
        const url = imagePreviewUrl(image.url);
        if (url) {
          const link = el('a', '', '原图');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          actions.append(link);
        }
        card.append(actions);
        this.sideContent.append(card);
      }
      this.imageThumbnails = thumbnails;
    } else {
      const headings = this.documentInfo?.headings || [];
      const parents = [];
      if (!headings.length) this.sideContent.append(el('p', 'studio-muted', '暂无标题'));
      for (const heading of headings) {
        const item = button('', () => this.goToLine(heading.line), 'studio-outline-item');
        item.setAttribute('aria-label', heading.text);
        item.append(el('span', 'studio-outline-arrow'), el('span', '', heading.text));
        item.firstChild.setAttribute('aria-hidden', 'true');
        item.style.paddingLeft = `${10 + Math.min(heading.level - 1, 4) * 10}px`;
        item.dataset.line = String(heading.line);
        while (parents.length && this.outlineItems[parents.at(-1)].level >= heading.level) parents.pop();
        const parent = parents.at(-1);
        if (parent != null) this.outlineItems[parent].hasChildren = true;
        parents.push(this.outlineItems.length);
        this.outlineItems.push({
          line: heading.line,
          level: heading.level,
          parent,
          element: item
        });
        this.sideContent.append(item);
      }
      this.updateOutline(this.currentLine || 1, true);
    }
    this.metadataDock?.sync();
    if (changed) this.motion?.reveal(this.sideContent);
  }
  goToLine(number) {
    const line = this.source.state.doc.line(Math.min(number, this.source.state.doc.lines));
    if (this.scrollSync) this.scrollSync.leader = this.mode === 'split' ? 'preview' : 'source';
    if (this.mode === 'split') {
      this.source.dispatch({
        selection: {
          anchor: line.from
        }
      });
      this.source.focus();
      this.lazyPreview.jump(line.from);
    } else if (this.mode === 'render') {
      this.source.dispatch({
        effects: EditorView.scrollIntoView(line.from, {
          y: 'start',
          yMargin: 20
        })
      });
    } else {
      this.source.dispatch({
        selection: {
          anchor: line.from
        },
        effects: EditorView.scrollIntoView(line.from, {
          y: 'start',
          yMargin: 20
        })
      });
      this.source.focus();
    }
    this.updateOutline(line.number, true);
    this.scrollSync?.navigate(line.from);
    if (this.compact) this.toggleSidebar(false);
  }
  insert(text) {
    const from = this.source.state.selection.main.head;
    this.source.dispatch({
      changes: {
        from,
        insert: text
      },
      selection: {
        anchor: from + text.length
      }
    });
    this.source.focus();
  }
  async reloadImages() {
    if (this.reloadingImages) return;
    this.reloadingImages = true;
    this.reloadImagesButton.disabled = true;
    try {
      const count = await reloadDocumentImages(this.body, this.documentInfo?.images || [], this.abort.signal, (done, total) => {
        if (!this.destroyed) this.notice('重新加载图片 ' + done + ' / ' + total);
      });
      if (!this.destroyed) this.notice('已重新请求 ' + count + ' 张图片');
    } finally {
      this.reloadingImages = false;
      if (!this.destroyed && this.reloadImagesButton) this.reloadImagesButton.disabled = !this.documentInfo?.images?.length;
    }
  }
  exportSnapshot() {
    return {
      text:this.value,
      title:this.metadataDock?.form?.querySelector('input[id^="title-field"]')?.value?.trim() || '文章正文'
    };
  }
  exportDialog() {
    this.closeExportDialog?.();
    const dialog = el('dialog', 'studio-dialog studio-export-dialog');
    const title = el('h2', '', '导出');
    title.id = 'studio-export-title';
    dialog.setAttribute('aria-labelledby', title.id);
    const formats = el('div', 'studio-export-formats');
    const markdown = button('Markdown (.md)', () => { dialog.close(); this.download(); });
    const pdf = button('PDF (.pdf)', () => {
      const snapshot = this.exportSnapshot();
      this.closePdfExport?.();
      this.closePdfExport = startPdfExport(snapshot, message => { if (!this.destroyed) this.notice(message); });
      dialog.close();
    });
    const html = button('HTML (.html)', async () => {
      const snapshot = this.exportSnapshot();
      dialog.close();
      this.notice('正在导出 HTML…');
      try {
        const {downloadHtml} = await import('./html-export.js');
        await downloadHtml(snapshot, this.abort.signal);
        if (!this.destroyed) this.notice('HTML 已导出');
      } catch (error) {
        if (!this.destroyed) this.notice('HTML 导出失败：' + error.message);
      }
    });
    formats.append(compactAction(markdown, 'source'), compactAction(pdf, 'render'), compactAction(html, 'source'));
    const actions = el('div', 'studio-dialog-actions');
    actions.append(button('取消', () => dialog.close()));
    dialog.append(title, formats, actions);
    this.root.append(dialog);
    const cleanup = () => { dialog.remove(); if (this.closeExportDialog === cleanup) this.closeExportDialog = null; };
    this.closeExportDialog = cleanup;
    dialog.addEventListener('close', cleanup, {once:true});
    dialog.showModal();
    markdown.focus();
  }
  download() {
    downloadText(this.value, 'text/markdown;charset=utf-8', '文章正文.md');
  }
  notice(text) {
    this.status.textContent = text;
  }
  destroy() {
    this.saveBackup();
    this.closeExportDialog?.();
    this.closePdfExport?.();
    this.destroyed = true;
    this.toolbarMenus?.destroy();
    this.detachToolbar?.();
    activeStudios.delete(this);
    this.abort.abort();
    this.scrollSync?.destroy();
    this.sidebarResize?.destroy();
    this.metadataDock?.destroy();
    this.paneLayout?.destroy();
    this.motion?.destroy();
    this.responsiveLayout?.destroy();
    clearTimeout(this.sidebarMotionTimer);
    clearTimeout(this.backupTimer);
    clearTimeout(this.renderTimer);
    cancelAnimationFrame(this.dragFrame);
    this.renderer.destroy();
    this.lazyPreview.destroy();
    this.source.destroy();
  }
}
