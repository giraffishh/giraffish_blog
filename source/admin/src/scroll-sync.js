const inset = 20;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Last entry at or before a source/visual position; duplicate titles remain distinct.
export function indexBefore(items, position, start) {
  let lo = 0,
    hi = items.length;
  while (lo < hi) {
    const mid = lo + hi >>> 1;
    if (start(items[mid]) <= position) lo = mid + 1;else hi = mid;
  }
  return Math.max(0, lo - 1);
}
export function scrollEdge(element) {
  const max = element.scrollHeight - element.clientHeight;
  if (element.scrollTop <= 1) return 'top';
  if (max > 1 && element.scrollTop >= max - 1) return 'bottom';
  return null;
}
export class ScrollSync {
  constructor(studio) {
    this.studio = studio;
    this.leader = 'source';
    this.blocks = [];
    this.abort = new AbortController();
    for (const [side, element] of [['source', studio.source.scrollDOM], ['preview', studio.previewPane]]) {
      const intent = () => {
        this.leader = side;
        this.navigation = null;
      };
      // Search controls sit beside scrollDOM. Their input must also release an
      // earlier outline jump, otherwise it overrides subsequent search results.
      const inputRoot = side === 'source' ? studio.source.dom || element : element;
      for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
        inputRoot.addEventListener(type, intent, {
          passive: true,
          capture: true,
          signal: this.abort.signal
        });
      }
      element.addEventListener('scroll', () => {
        if (this.leader === side) this.schedule();
      }, {
        passive: true,
        signal: this.abort.signal
      });
    }
  }
  schedule() {
    if (this.frame || this.destroyed || this.studio.drag || this.studio.sidebarResize?.drag) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.sync();
    });
  }
  refresh(blocks) {
    this.blocks = blocks || [];
    this.schedule();
  }
  navigate(position) {
    this.navigation = position;
    this.leader = this.studio.mode === 'split' ? 'preview' : 'source';
    this.schedule();
  }
  sourceAnchor() {
    const view = this.studio.source;
    const scroll = view.scrollDOM;
    const y = scroll.getBoundingClientRect().top + inset - view.documentTop;
    const line = view.lineBlockAtHeight(Math.max(0, y));
    const edge = scrollEdge(scroll);
    const index = indexBefore(this.blocks, line.from, block => block.from);
    const block = this.blocks[index];
    if (!block) return {
      position: line.from,
      edge
    };
    const top = view.lineBlockAt(Math.min(block.from, view.state.doc.length)).top;
    const bottom = view.lineBlockAt(Math.min(block.to, view.state.doc.length)).bottom;
    const fraction = clamp((y - top) / Math.max(1, bottom - top), 0, 1);
    return {
      index,
      fraction,
      position: line.from,
      edge
    };
  }
  previewAnchor() {
    const root = this.studio.previewPane;
    const nodes = this.studio.lazyPreview.nodes;
    if (!nodes.length) return null;
    const y = root.getBoundingClientRect().top + inset;
    const index = indexBefore(nodes, y, node => node.getBoundingClientRect().top);
    const node = nodes[index];
    this.studio.lazyPreview.mount(node);
    const rect = node.getBoundingClientRect();
    const fraction = clamp((y - rect.top) / Math.max(1, rect.height), 0, 1);
    return {
      index,
      fraction,
      position: Math.floor(node.block.from + fraction * (node.block.to - node.block.from)),
      edge: scrollEdge(root)
    };
  }
  setScroll(element, target, edge) {
    const max = Math.max(0, element.scrollHeight - element.clientHeight);
    const top = edge === 'top' ? 0 : edge === 'bottom' ? max : clamp(target, 0, max);
    if (Math.abs(element.scrollTop - top) > 1) element.scrollTop = top;
  }
  applyPreview(anchor) {
    const node = this.studio.lazyPreview.nodes[anchor.index];
    if (!node) return;
    this.studio.lazyPreview.mount(node);
    const root = this.studio.previewPane;
    const rect = node.getBoundingClientRect();
    this.setScroll(root, root.scrollTop + rect.top - root.getBoundingClientRect().top + anchor.fraction * rect.height - inset, anchor.edge);
  }
  applySource(anchor) {
    const block = this.blocks[anchor.index];
    if (!block) return;
    const view = this.studio.source;
    const scroll = view.scrollDOM;
    const from = view.lineBlockAt(Math.min(block.from, view.state.doc.length));
    const to = view.lineBlockAt(Math.min(block.to, view.state.doc.length));
    const y = from.top + anchor.fraction * (to.bottom - from.top);
    this.setScroll(scroll, scroll.scrollTop + view.documentTop - scroll.getBoundingClientRect().top + y - inset, anchor.edge);
  }
  sync() {
    const studio = this.studio;
    if (this.destroyed || studio.destroyed || studio.drag || studio.sidebarResize?.drag) return;
    if (this.navigation != null) {
      const index = indexBefore(this.blocks, this.navigation, block => block.from);
      const anchor = {
        index,
        fraction: 0,
        position: this.navigation
      };
      if (studio.mode === 'split') this.applyPreview(anchor);
      const view = studio.source;
      const position = clamp(this.navigation, 0, view.state.doc.length);
      const scroll = view.scrollDOM;
      this.setScroll(scroll, scroll.scrollTop + view.documentTop - scroll.getBoundingClientRect().top + view.lineBlockAt(position).top - inset);
      studio.updateOutline(view.state.doc.lineAt(position).number);
      return;
    }
    const previewLeads = studio.mode === 'split' && this.leader === 'preview';
    const anchor = previewLeads ? this.previewAnchor() : this.sourceAnchor();
    if (!anchor) return;
    if (studio.mode === 'split') {
      if (previewLeads) this.applySource(anchor);else this.applyPreview(anchor);
    }
    const position = clamp(anchor.position, 0, studio.source.state.doc.length);
    const line = anchor.edge === 'bottom' ? studio.source.state.doc.lines : studio.source.state.doc.lineAt(position).number;
    studio.updateOutline(line);
  }
  destroy() {
    this.destroyed = true;
    this.abort.abort();
    cancelAnimationFrame(this.frame);
  }
}
