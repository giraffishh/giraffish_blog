// Keep the CMS controls in their original React tree. Only their layout changes;
// values, validation, conditional fields and unmounts remain owned by Decap.
export class MetadataDock {
  constructor(studio) {
    this.studio = studio;
    this.host = studio.root.closest('[class*="ControlContainer"]');
    this.form = this.host?.parentElement;
    if (!this.form?.className.includes('ControlPaneContainer')) {
      this.form = null;
      return;
    }
    this.abort = new AbortController();
    this.errorsDirty = true;
    this.resize = new ResizeObserver(() => this.schedule());
    for (const node of [studio.root, studio.body, studio.sidebar, studio.sidebar.querySelector('.studio-side-nav')]) this.resize.observe(node);
    this.mutations = new MutationObserver(records => {
      if (records.some(record => !studio.root.contains(record.target))) {
        this.errorsDirty = true;
        this.schedule();
      }
    });
    this.mutations.observe(this.form, {
      childList: true,
      subtree: true
    });
    this.form.addEventListener('focusin', event => {
      if (!studio.root.contains(event.target)) this.reveal();
    }, {
      signal: this.abort.signal
    });
    this.form.addEventListener('invalid', () => this.reveal(), {
      capture: true,
      signal: this.abort.signal
    });
    window.addEventListener('resize', () => this.schedule(), {
      signal: this.abort.signal
    });
    this.sync();
  }
  schedule() {
    if (!this.form || this.frame || this.destroyed) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.sync();
    });
  }
  reveal() {
    this.studio.toggleSidebar(true);
    if (this.studio.activeSide !== 'metadata') this.studio.showSidebar('metadata');
  }
  sync() {
    if (!this.form || this.destroyed) return;
    this.form.classList.add('studio-metadata-origin');
    this.host.classList.add('studio-editor-field');
    const records = this.mutations.takeRecords();
    if (records.some(record => !this.studio.root.contains(record.target))) this.errorsDirty = true;
    if (this.errorsDirty) {
      this.errorsDirty = false;
      this.fields = [...this.form.children].filter(node => node !== this.host);
      const errors = this.fields.reduce((total, node) => total + node.querySelectorAll('[class*="ControlErrorsList"] li').length, 0);
      const previousErrors = this.errorCount || 0;
      this.errorCount = errors;
      if (errors > previousErrors) this.reveal();
    }
    const open = this.studio.root.classList.contains('studio-sidebar-open');
    const closing = this.studio.root.classList.contains('studio-sidebar-closing');
    const active = this.studio.activeSide === 'metadata' && (open || closing);
    this.form.classList.toggle('studio-metadata-visible', active);
    this.form.classList.toggle('studio-metadata-leaving', closing && active);
    for (const field of this.fields) if (field.inert !== closing) field.inert = closing;
    if (!active) return;
    if (closing) return;
    const sidebar = this.studio.sidebar.getBoundingClientRect();
    const tabs = this.studio.sidebar.querySelector('.studio-side-nav').getBoundingClientRect();
    const layout = {
      left: sidebar.left,
      top: tabs.bottom,
      width: this.studio.sidebarResize?.width || sidebar.width,
      height: Math.max(0, sidebar.bottom - tabs.bottom)
    };
    for (const [name, value] of Object.entries(layout)) {
      const property = `--metadata-${name}`;
      const pixels = `${value}px`;
      if (this.form.style.getPropertyValue(property) !== pixels) this.form.style.setProperty(property, pixels);
    }
  }
  destroy() {
    this.destroyed = true;
    if (!this.form) return;
    cancelAnimationFrame(this.frame);
    this.abort.abort();
    this.resize.disconnect();
    this.mutations.disconnect();
    this.form.classList.remove('studio-metadata-origin', 'studio-metadata-visible', 'studio-metadata-leaving');
    for (const field of this.form.children) if (field !== this.host) field.inert = false;
    this.host.classList.remove('studio-editor-field');
    for (const name of ['left', 'top', 'width', 'height']) this.form.style.removeProperty(`--metadata-${name}`);
  }
}
