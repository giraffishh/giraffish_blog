// Metadata fields remain in Decap's React tree above the editor. Put open
// toolbar menus in the browser's top layer without reparenting React nodes.
export class ToolbarMenus {
  constructor(studio) {
    this.studio = studio;
    this.menus = new Set();
    this.abort = new AbortController();
    this.query = window.matchMedia('(max-width:1200px)');
    this.query.addEventListener('change', () => studio.toggleToolbarTools(false), {signal:this.abort.signal});
    this.observer = new MutationObserver(() => this.schedule());
    this.observer.observe(studio.nav, {childList:true, subtree:true});
    window.addEventListener('resize', () => this.schedule(), {signal:this.abort.signal});
    window.visualViewport?.addEventListener('resize', () => this.schedule(), {signal:this.abort.signal});
  }
  tools(open) {
    const panel = this.studio.toolbarTools;
    if (typeof panel.showPopover !== 'function') {
      if (open && this.query.matches && this.studio.activeSide === 'metadata') this.studio.toggleSidebar(false);
      return;
    }
    if (open && this.query.matches) {
      panel.setAttribute('popover', 'manual');
      if (!panel.matches(':popover-open')) panel.showPopover();
      panel.style.setProperty('--toolbar-tools-top', `${this.studio.nav.getBoundingClientRect().bottom + 3}px`);
    } else {
      for (const menu of this.menus) if (panel.contains(menu)) this.hide(menu);
      this.hide(panel);
    }
  }
  hide(node) {
    if (typeof node.hidePopover !== 'function') return;
    if (node.matches(':popover-open')) node.hidePopover();
    node.removeAttribute('popover');
  }
  schedule() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => { this.frame = 0; this.update(); });
  }
  update() {
    this.tools(this.studio.root.classList.contains('studio-tools-open'));
    for (const menu of this.menus) if (!menu.isConnected) this.menus.delete(menu);
    for (const menu of this.studio.nav.querySelectorAll('[role=menu]')) {
      if (typeof menu.showPopover !== 'function') {
        if (this.studio.activeSide === 'metadata') this.studio.toggleSidebar(false);
        continue;
      }
      if (this.query.matches && this.studio.toolbarTools.contains(menu) && !this.studio.root.classList.contains('studio-tools-open')) continue;
      const anchor = menu.parentElement.querySelector(':scope > [role=button], :scope > button, :scope > a') || menu.parentElement;
      const rect = anchor.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      this.menus.add(menu);
      menu.classList.add('studio-native-menu');
      menu.setAttribute('popover', 'manual');
      if (!menu.matches(':popover-open')) menu.showPopover();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop || 0;
      const height = viewport?.height || innerHeight;
      menu.style.setProperty('--toolbar-menu-height', `${Math.max(60,height - 16)}px`);
      const box = menu.getBoundingClientRect();
      menu.style.setProperty('--toolbar-menu-left', `${Math.max(8,Math.min(rect.left,innerWidth - box.width - 8))}px`);
      menu.style.setProperty('--toolbar-menu-top', `${Math.max(top + 8,Math.min(rect.bottom + 4,top + height - box.height - 8))}px`);
    }
  }
  destroy() {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.abort.abort();
    this.hide(this.studio.toolbarTools);
    for (const menu of this.menus) this.hide(menu);
    this.menus.clear();
  }
}
