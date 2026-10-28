export const compactQuery = '(max-width: 760px)';

// Follow the visible viewport when a mobile keyboard or browser chrome resizes it.
export function installResponsiveViewport() {
  let frame;
  const abort = new AbortController();
  const update = () => {
    frame = 0;
    const viewport = window.visualViewport;
    if (viewport && Math.abs(viewport.scale - 1) > .05) return;
    const values = {height:viewport?.height || window.innerHeight, top:viewport?.offsetTop || 0};
    for (const [name,value] of Object.entries(values)) {
      const property = `--admin-viewport-${name}`;
      const pixels = `${Math.round(value)}px`;
      if (document.documentElement.style.getPropertyValue(property) !== pixels) document.documentElement.style.setProperty(property,pixels);
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('resize',schedule,{signal:abort.signal});
  window.visualViewport?.addEventListener('resize',schedule,{signal:abort.signal});
  window.visualViewport?.addEventListener('scroll',schedule,{signal:abort.signal});
  update();
  return () => {abort.abort();cancelAnimationFrame(frame);};
}

export class ResponsiveEditorLayout {
  constructor(studio) {
    this.studio = studio;
    this.abort = new AbortController();
    this.query = window.matchMedia(compactQuery);
    this.header = document.querySelector('[class*="ToolbarContainer"]');
    this.query.addEventListener('change',event => {
      if (studio.drag && studio.divider.hasPointerCapture(studio.drag.id)) studio.divider.releasePointerCapture(studio.drag.id);
      studio.compact = event.matches;
      studio.updateDivider();
      studio.toggleSidebar(studio.compact ? false : studio.desktopSidebarOpen);
      studio.source.requestMeasure();
      this.schedule();
    },{signal:this.abort.signal});
    this.resize = new ResizeObserver(() => this.schedule());
    if (this.header) this.resize.observe(this.header);
    window.addEventListener('resize',()=>this.schedule(),{signal:this.abort.signal});
    window.visualViewport?.addEventListener('resize',()=>this.schedule(),{signal:this.abort.signal});
    window.visualViewport?.addEventListener('scroll',()=>this.schedule(),{signal:this.abort.signal});
    window.addEventListener('keydown',event => {
      if (event.key === 'Escape' && !event.defaultPrevented && studio.compact && studio.root.classList.contains('studio-sidebar-open') && !studio.root.querySelector('dialog[open]')) {
        studio.toggleSidebar(false);
        studio.sidebarToggle.focus({preventScroll:true});
        event.preventDefault();
      }
    },{signal:this.abort.signal});
    this.update();
  }
  schedule() { if (!this.frame) this.frame = requestAnimationFrame(() => {this.frame=0;this.update();}); }
  update() {
    const top = window.visualViewport?.offsetTop || 0;
    const height = Math.max(0,(this.header?.getBoundingClientRect().bottom || 66)-top);
    const value = `${Math.round(height)}px`;
    if (this.studio.root.style.getPropertyValue('--studio-header-height') !== value) this.studio.root.style.setProperty('--studio-header-height',value);
    this.studio.metadataDock?.schedule();
  }
  destroy() {this.abort.abort();this.resize.disconnect();cancelAnimationFrame(this.frame);}
}
