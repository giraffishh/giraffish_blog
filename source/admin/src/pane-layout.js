import {renderMode} from './live-preview.js';
import {reducedMotion} from './layout-motion.js';
import {dividerRatio} from './split-layout.js';

const positionFor = studio => dividerRatio(studio.mode,studio.ratio,studio.sourceFirst) / 100;

// One animated grid coordinate owns both panes and the divider. The editable
// rendered view takes over the full preview column only after expansion ends.
export class PaneLayout {
  constructor(studio) {
    this.studio = studio;
    this.moving = false;
    this.currentPosition = 0;
    this.abort = new AbortController();
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reduced.addEventListener('change', () => this.finish(), {signal:this.abort.signal});
    for (const type of ['pointerdown','keydown','wheel']) {
      studio.workspace.addEventListener(type, event => {
        if (!studio.divider.contains(event.target)) this.finish();
      }, {capture:true, passive:true, signal:this.abort.signal});
    }
  }
  position() {
    if (!this.animation) return this.currentPosition;
    const value = Number(getComputedStyle(this.studio.workspace).getPropertyValue('--studio-position'));
    return Number.isFinite(value) ? Math.max(0,Math.min(1,value)) : 0;
  }
  writePosition(position) {
    if (this.currentPosition === position) return;
    this.currentPosition = position;
    this.studio.workspace.style.setProperty('--studio-position',position);
  }
  stop() {
    const position = this.position();
    this.animation?.cancel();
    this.animation = null;
    for (const animation of this.swapAnimations || []) animation.cancel();
    this.swapAnimations = null;
    this.writePosition(position);
    cancelAnimationFrame(this.restoreFrame);
    return position;
  }
  captureAnchor() {
    if (this.moving && this.anchor) return this.anchor;
    const sync = this.studio.scrollSync;
    return sync.leader === 'preview' && this.studio.root.dataset.paneMode === 'split'
      ? sync.previewAnchor() || sync.sourceAnchor() : sync.sourceAnchor();
  }
  swap(update) {
    const studio = this.studio;
    if (this.moving || this.pending) {
      // Finish a mode transition first; a second press cancels the queued swap.
      this.queuedSwap = this.queuedSwap ? null : update;
      return;
    }
    this.anchor = this.captureAnchor();
    this.stop();
    const elements = [studio.previewFrame,studio.divider,studio.sourcePane];
    const before = elements.map(element => element.getBoundingClientRect());
    update();
    this.writePosition(positionFor(studio));
    this.moving = true;
    studio.root.classList.add('studio-layout-moving');
    studio.previewPane.inert = true;
    studio.source.requestMeasure();
    if (reducedMotion()) { this.settle(); return; }
    const animations = elements.map((element,index) => {
      const after = element.getBoundingClientRect();
      const x = before[index].left-after.left, y = before[index].top-after.top;
      return element.animate([
        {transform:`translate(${x}px,${y}px)`,opacity:1},
        {opacity:.65,offset:.5},
        {transform:'none',opacity:1}
      ],{duration:240,easing:'cubic-bezier(.25,.1,.25,1)'});
    });
    this.swapAnimations = animations;
    Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (this.swapAnimations !== animations || studio.destroyed) return;
      this.swapAnimations = null;
      this.settle();
    }, () => {});
  }
  change() {
    const studio = this.studio;
    if (studio.mode !== 'split') this.queuedSwap = null;
    if (studio.mode !== 'source' && (!studio.documentInfo?.blocks || studio.analyzedValue !== studio.value)) {
      this.pending = true;
      return;
    }
    this.pending = false;
    const details = studio.root.dataset.paneMode === 'render' ? this.details(true) : null;
    this.anchor = this.captureAnchor();
    const from = this.stop();
    const to = positionFor(studio);
    this.moving = true;
    studio.root.classList.add('studio-layout-moving');
    studio.root.dataset.paneMode = 'split';
    studio.source.dispatch({effects:renderMode.of(false)});
    // Make the already-parsed rendered document available before its column opens.
    this.refreshPreview();
    if (details) this.restoreDetails(details,false);
    studio.previewPane.inert = true;
    studio.previewPane.setAttribute('aria-hidden','true');
    if (this.anchor) studio.scrollSync.applyPreview(this.anchor);
    this.writePosition(to);
    const animate = studio.root.classList.contains('studio-ready') &&
      !studio.root.classList.contains('studio-resizing') && !reducedMotion() && Math.abs(to-from) > .001;
    if (!animate) { this.settle(); return; }
    const animation = studio.workspace.animate([
      {'--studio-position':String(from)}, {'--studio-position':String(to)}
    ], {duration:260, easing:'cubic-bezier(.25,.1,.25,1)', fill:'both'});
    this.animation = animation;
    animation.finished.then(() => {
      if (this.animation !== animation || studio.destroyed) return;
      this.animation = null;
      animation.cancel();
      this.settle();
    }, () => {});
  }
  refreshPreview() {
    const studio = this.studio;
    const blocks = studio.documentInfo?.blocks;
    if (blocks && studio.previewBlocks !== blocks) {
      studio.previewBlocks = blocks;
      studio.lazyPreview.update(blocks);
    }
  }
  details(rendered) {
    const studio = this.studio;
    const nodes = rendered ? studio.sourcePane.querySelectorAll('.studio-rendered-editable') : studio.lazyPreview.nodes;
    return new Map([...nodes].map(node => [rendered ? studio.source.posAtDOM(node) : node.block.from,
      [...node.querySelectorAll('details')].map(detail => detail.open)]));
  }
  restoreDetails(values, rendered) {
    const studio = this.studio;
    const nodes = rendered ? studio.sourcePane.querySelectorAll('.studio-rendered-editable') : studio.lazyPreview.nodes;
    for (const node of nodes) {
      const saved = values.get(rendered ? studio.source.posAtDOM(node) : node.block.from);
      if (saved) [...node.querySelectorAll('details')].forEach((detail,index) => {
        if (saved[index] != null && detail.open !== saved[index]) detail.open = saved[index];
      });
    }
  }
  resize() {
    this.stop();
    this.moving = false;
    const studio = this.studio;
    studio.root.classList.remove('studio-layout-moving');
    this.writePosition(positionFor(studio));
    studio.source.requestMeasure();
  }
  settle() {
    const studio = this.studio;
    this.writePosition(positionFor(studio));
    const details = studio.mode === 'render' ? this.details(false) : null;
    studio.root.dataset.paneMode = studio.mode;
    studio.source.dispatch({effects:renderMode.of(studio.mode === 'render')});
    if (details) this.restoreDetails(details,true);
    studio.previewPane.inert = studio.mode !== 'split';
    studio.previewPane.setAttribute('aria-hidden',String(studio.mode !== 'split'));
    studio.source.requestMeasure();
    const anchor = this.anchor;
    // Let CodeMirror measure the final column before restoring the same passage.
    this.restoreFrame = requestAnimationFrame(() => {
      this.restoreFrame = 0;
      if (studio.destroyed) return;
      if (anchor) {
        studio.scrollSync.applySource(anchor);
        if (studio.mode === 'split') studio.scrollSync.applyPreview(anchor);
      }
      this.moving = false;
      studio.root.classList.remove('studio-layout-moving');
      studio.root.classList.add('studio-ready');
      studio.scrollSync.schedule();
      const swap = this.queuedSwap;
      this.queuedSwap = null;
      if (swap && studio.mode === 'split') this.swap(swap);
    });
  }
  finish() {
    if (!this.moving) return;
    this.stop();
    this.settle();
  }
  destroy() {
    this.abort.abort();
    this.queuedSwap = null;
    for (const animation of this.swapAnimations || []) animation.cancel();
    this.swapAnimations = null;
    this.animation?.cancel();
    cancelAnimationFrame(this.restoreFrame);
  }
}