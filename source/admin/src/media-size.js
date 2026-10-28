export function formatFileSize(bytes) {
  if (!Number.isSafeInteger(bytes) || bytes < 0) return '大小未知';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return `${Number(value.toFixed(value < 10 ? 1 : 0))} ${units[unit]}`;
}

// Read metadata only. Never fetch a remote response body to calculate its size.
export class MediaSizeLoader {
  constructor(cache = new Map()) {
    this.cache = cache;
    this.pending = new Map();
    this.queue = [];
    this.running = 0;
    this.abort = new AbortController();
  }
  get(url, knownBytes) {
    if (Number.isSafeInteger(knownBytes) && knownBytes >= 0) return Promise.resolve(knownBytes);
    if (this.abort.signal.aborted || !url) return Promise.resolve(null);
    let parsed;
    try { parsed = new URL(url); } catch { return Promise.resolve(null); }
    if (!['http:', 'https:', 'blob:'].includes(parsed.protocol) || parsed.username || parsed.password) return Promise.resolve(null);
    const cached = this.cache.get(url);
    if (cached && cached.expires > Date.now()) return Promise.resolve(cached.bytes);
    if (this.pending.has(url)) return this.pending.get(url);
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    this.pending.set(url, promise);
    this.queue.push({url, resolve});
    this.pump();
    return promise;
  }
  pump() {
    while (!this.abort.signal.aborted && this.running < 3 && this.queue.length) {
      const job = this.queue.shift();
      this.running++;
      this.read(job.url).then(bytes => {
        if (!this.abort.signal.aborted) {
          this.cache.delete(job.url);
          this.cache.set(job.url, {bytes, expires:Date.now() + (bytes === null ? 60000 : 600000)});
          if (this.cache.size > 256) this.cache.delete(this.cache.keys().next().value);
        }
        job.resolve(bytes);
      }).finally(() => { this.pending.delete(job.url); this.running--; this.pump(); });
    }
  }
  async read(url) {
    try {
      const localBlob = url.startsWith('blob:');
      const response = await fetch(url, {
        method:localBlob ? 'GET' : 'HEAD',
        credentials:'omit', referrerPolicy:'no-referrer',
        signal:AbortSignal.any([this.abort.signal, AbortSignal.timeout(6000)])
      });
      if (!response.ok) return null;
      // Blob URLs already belong to the browser's loaded upload preview.
      if (localBlob) return (await response.blob()).size;
      if (/^text\/html\b/i.test(response.headers.get('content-type') || '')) return null;
      const length = response.headers.get('content-length');
      if (!length || !/^\d+$/.test(length)) return null;
      const bytes = Number(length);
      return Number.isSafeInteger(bytes) ? bytes : null;
    } catch { return null; }
  }
  destroy() {
    this.abort.abort();
    for (const job of this.queue.splice(0)) { this.pending.delete(job.url); job.resolve(null); }
  }
}

export function showFileSize(element, bytes) {
  element.textContent = formatFileSize(bytes);
  element.title = bytes === null ? '图床未提供可读取的文件大小' : `${bytes.toLocaleString()} 字节`;
}

export class NativeMediaSizes {
  constructor(modal, store, loader) {
    this.modal = modal; this.store = store; this.loader = loader;
    this.grid = modal.querySelector('[class*="CardGridContainer"]');
    this.records = new WeakMap();
    if (!this.grid) return;
    this.observer = new MutationObserver(records => {
      if (records.some(record => !record.target.closest?.('.studio-native-size'))) this.schedule();
    });
    this.observer.observe(this.grid, {childList:true, subtree:true, attributes:true, attributeFilter:['src']});
  }
  schedule() {
    if (this.frame || this.destroyed) return;
    this.frame = requestAnimationFrame(() => { this.frame=0; this.update(); });
  }
  update() {
    if (!this.grid || this.destroyed || this.modal.dataset.studioMedia !== 'files') return;
    for (const title of this.grid.querySelectorAll('[class*="CardText"]')) {
      const card = title.parentElement;
      const name = title.textContent;
      const candidates = (this.store.files || []).filter(file => file.name === name || file.name.split('/').pop() === name);
      const src = card.querySelector('img')?.src;
      const known = this.store.fileSizes?.get(src) ?? (candidates.length === 1 ? candidates[0].bytes : undefined);
      const key = JSON.stringify([name, src, known]);
      if (this.records.get(card)?.key === key) continue;
      let label = card.querySelector('.studio-native-size');
      if (!label) { label=document.createElement('span'); label.className='studio-native-size'; card.append(label); }
      card.dataset.studioFileCard = '';
      label.textContent = '大小…';
      const record = {key,label}; this.records.set(card,record);
      this.loader.get(src, src?.startsWith('blob:') ? undefined : known).then(bytes => {
        if (!this.destroyed && card.isConnected && this.records.get(card) === record) showFileSize(label,bytes);
      });
    }
  }
  destroy() {
    this.destroyed=true;cancelAnimationFrame(this.frame);this.observer?.disconnect();
    for (const label of this.grid?.querySelectorAll('.studio-native-size') || []) label.remove();
    for (const card of this.grid?.querySelectorAll('[data-studio-file-card]') || []) delete card.dataset.studioFileCard;
  }
}
