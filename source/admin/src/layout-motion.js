export function reducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export class LayoutMotion {
  constructor(root) { this.root=root; this.animations=new Map(); }
  reveal(element) {
    this.animations.get(element)?.cancel();
    this.animations.delete(element);
    if (!element?.animate || !this.root.classList.contains('studio-ready') || this.root.classList.contains('studio-resizing') || reducedMotion()) return;
    const animation=element.animate([{opacity:.45},{opacity:1}],{duration:160,easing:'ease-out'});
    this.animations.set(element,animation);
    const cleanup=()=>{if(this.animations.get(element)===animation)this.animations.delete(element);};
    animation.finished.then(cleanup,cleanup);
  }
  destroy() {
    for (const animation of this.animations.values()) animation.cancel();
    this.animations.clear();
  }
}
