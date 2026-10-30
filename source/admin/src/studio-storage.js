// Keep the existing keys and record schema so older drafts/preferences survive.
export function preference(key, fallback) {
  try { return localStorage.getItem(`studio:${key}`) || fallback; }
  catch { return fallback; }
}
export function storePreference(key, value) {
  try { localStorage.setItem(`studio:${key}`, value); }
  catch { /* Preferences are optional. */ }
}

export class EditorBackup {
  constructor({entryKey, name = 'body', value, getValue, notice, storage = () => localStorage}) {
    this.key = `studio:backup:v1:${entryKey}:${name}`;
    this.base = value;
    this.getValue = getValue;
    this.notice = notice;
    this.storage = storage;
    this.edited = false;
  }
  read() {
    try {
      const record = JSON.parse(this.storage().getItem(this.key));
      if (record?.version === 1 && typeof record.body === 'string' &&
          record.body.trimEnd() !== this.getValue().trimEnd() && Number.isFinite(record.time)) return record;
    } catch { /* Storage may be unavailable or the previous record corrupt. */ }
    return null;
  }
  changed() {
    this.edited = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 500);
  }
  clear() {
    try { this.storage().removeItem(this.key); }
    catch { /* Optional cleanup. */ }
  }
  saved() {
    clearTimeout(this.timer);
    this.base = this.getValue();
    this.edited = false;
    this.clear();
  }
  flush() {
    clearTimeout(this.timer);
    if (!this.edited) return;
    const body = this.getValue();
    if (body === this.base) { this.clear(); return; }
    try {
      this.storage().setItem(this.key, JSON.stringify({version:1, body, base:this.base, time:Date.now()}));
      this.notice('已备份到本机');
    } catch {
      this.notice('本地空间不足或不可用，请及时保存到仓库或导出正文。');
    }
  }
  destroy() { this.flush(); }
}
