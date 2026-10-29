// Same checked-write and copy semantics as tools/mindmap: keep the association
// until close succeeds, and never overwrite a file changed by another editor.
export async function writeFileContent(handle, text) {
  let writer;
  try {
    writer = await handle.createWritable();
    await writer.write(text);
    await writer.close();
  } catch (error) {
    try { await writer?.abort(); } catch { /* Best effort rollback. */ }
    if (error?.name === 'AbortError') throw new Error('文件写入被中断，当前内容已保留，请重试保存。');
    throw error;
  }
}

export async function writeCheckedFile(handle, expected, updated) {
  const current = await (await handle.getFile()).text();
  if (current !== expected && current !== updated) {
    throw Object.assign(new Error('原文件已在其他地方修改，已暂停自动保存。请另存为副本，或重新打开原文件。'), {name:'ConflictError'});
  }
  if (current !== updated) await writeFileContent(handle, updated);
}

export function validateMarkdownFile(file) {
  if (!/\.(md|markdown|txt)$/i.test(file.name)) throw new Error('请选择 .md、.markdown 或 .txt 文件。');
  if (file.size > 10 * 1024 * 1024) throw new Error('文件超过 10 MB，请打开较小的 Markdown 文件。');
}

export class LocalDocument {
  constructor({text = '', name = '未命名.md', base = text, handle = null} = {}) {
    Object.assign(this, {text, name, base, handle, automatic:false, busy:false});
  }
  get dirty() { return this.text !== this.base; }
  async save(chosen = this.handle, copy = false) {
    if (this.busy) throw new Error('正在保存，请稍候。');
    if (!chosen) throw new Error('请先选择保存位置。');
    this.busy = true;
    const snapshot = this.text;
    let same = chosen === this.handle;
    try {
      if (!same && this.handle && chosen.isSameEntry) same = await chosen.isSameEntry(this.handle);
      if (same) await writeCheckedFile(chosen, this.base, snapshot);
      else await writeFileContent(chosen, snapshot);
      if (!copy || same) {
        Object.assign(this, {handle:chosen, name:chosen.name, base:snapshot, automatic:true});
      }
    } catch (error) {
      if (same) this.automatic = false;
      throw error;
    } finally {
      this.busy = false;
    }
  }
}

// File handles require structured clone (IndexedDB), not JSON/localStorage.
// The id ties a saved handle to its draft so a stale association cannot be used.
export function fileStore(indexedDB) {
  async function transact(mode, action) {
    const db = await new Promise((resolve, reject) => {
      let settled = false;
      const request = indexedDB.open('giraffish.tools.markdown', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('files');
      request.onerror = () => { settled = true; reject(request.error); };
      request.onblocked = () => { settled = true; reject(new Error('文件关联存储被其他页面占用')); };
      request.onsuccess = () => { if (settled) request.result.close(); else resolve(request.result); };
    });
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction('files', mode);
        const request = action(transaction.objectStore('files'));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onabort = () => reject(transaction.error || new Error('文件关联未保存'));
        transaction.onerror = () => reject(transaction.error || request.error);
      });
    } finally { db.close(); }
  }
  return {
    save: (id, handle) => transact('readwrite', store => store.put({id, handle}, 'active')),
    async load(id) {
      const record = await transact('readonly', store => store.get('active'));
      return record?.id === id ? record.handle : null;
    }
  };
}
