export const DEFAULT_SOURCE_FIRST = true;

export function clampRatio(value) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 50));
}

export function dividerRatio(mode, ratio, sourceFirst = DEFAULT_SOURCE_FIRST) {
  if (mode === 'split') return clampRatio(ratio);
  return (mode === 'render') !== sourceFirst ? 100 : 0;
}

export function modeAtRatio(value, sourceFirst = DEFAULT_SOURCE_FIRST) {
  const ratio = clampRatio(value);
  return ratio <= 4 ? (sourceFirst ? 'render' : 'source') : ratio >= 96 ? (sourceFirst ? 'source' : 'render') : 'split';
}
export function reducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export class LayoutMotion {
  constructor(root) { this.root=root; this.animations=new Map(); }
  cancel(element) {
    this.animations.get(element)?.cancel();
    this.animations.delete(element);
  }
  animate(element, frames, options) {
    this.cancel(element);
    if (!element?.animate || !this.root.classList.contains('studio-ready') || this.root.classList.contains('studio-resizing') || reducedMotion()) return;
    const animation=element.animate(frames,options);
    this.animations.set(element,animation);
    const cleanup=()=>{if(this.animations.get(element)===animation)this.animations.delete(element);};
    animation.finished.then(cleanup,cleanup);
  }
  reveal(element) {
    this.animate(element,[{opacity:.45},{opacity:1}],{duration:160,easing:'ease-out'});
  }
  destroy() {
    for (const animation of this.animations.values()) animation.cancel();
    this.animations.clear();
  }
}
