export class SidebarResize {
  constructor({body, handle, initialWidth = 240, onResize = () => {}, onCommit = () => {}}) {
    this.body = body;
    this.handle = handle;
    this.onResize = onResize;
    this.onCommit = onCommit;
    this.preferredWidth = Number.isFinite(initialWidth) ? initialWidth : 240;
    this.abort = new AbortController();
    const listen = (type, callback) => handle.addEventListener(type, callback, {signal:this.abort.signal});
    handle.tabIndex = 0;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-label', '调整侧栏宽度');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.title = '拖动调整侧栏宽度，双击恢复默认';
    listen('pointerdown', event => {
      if (event.button !== 0 || this.drag) return;
      this.drag = {id:event.pointerId, x:event.clientX, width:this.width, preferred:this.preferredWidth};
      handle.setPointerCapture(event.pointerId);
      handle.focus();
      this.body.classList.add('studio-sidebar-resizing');
      event.preventDefault();
    });
    listen('pointermove', event => {
      if (this.drag?.id === event.pointerId) this.apply(this.drag.width + event.clientX - this.drag.x);
    });
    const finish = (event, cancelled = false) => {
      if (this.drag?.id !== event.pointerId) return;
      const drag = this.drag;
      this.drag = null;
      this.body.classList.remove('studio-sidebar-resizing');
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      if (cancelled) this.apply(drag.preferred);
      else this.commit(this.width);
    };
    listen('pointerup', event => finish(event));
    listen('pointercancel', event => finish(event, true));
    listen('lostpointercapture', event => finish(event, true));
    listen('dblclick', () => this.commit(240));
    listen('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      this.commit(event.key === 'Home' ? 160 : event.key === 'End' ? this.maxWidth() : this.width + (event.key === 'ArrowLeft' ? -16 : 16));
    });
    this.apply(this.preferredWidth);
    this.observer = new ResizeObserver(() => this.apply(this.preferredWidth));
    this.observer.observe(body);
  }
  maxWidth() {
    const width = this.body.getBoundingClientRect().width;
    return width > 0 ? Math.floor(Math.max(160, Math.min(560, width / 2, width - 240))) : 560;
  }
  apply(value) {
    const max = this.maxWidth();
    const width = Math.round(Math.max(160, Math.min(max, value)));
    this.handle.setAttribute('aria-valuemin', '160');
    this.handle.setAttribute('aria-valuemax', String(Math.floor(max)));
    this.handle.setAttribute('aria-valuenow', String(width));
    this.handle.setAttribute('aria-valuetext', `${width} 像素`);
    if (width === this.width) return;
    this.width = width;
    this.body.style.setProperty('--studio-sidebar-width', `${width}px`);
    this.onResize();
  }
  commit(value) {
    this.apply(value);
    this.preferredWidth = this.width;
    this.onCommit(this.width);
  }
  destroy() {
    this.observer.disconnect();
    this.abort.abort();
    this.body.classList.remove('studio-sidebar-resizing');
  }
}
