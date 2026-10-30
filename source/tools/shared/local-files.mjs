// Shared file I/O for Markdown and Mindmap; document state and UI stay in each app.
export async function writeFileContent(handle, text) {
  let writer;
  try {
    writer = await handle.createWritable();
    await writer.write(text);
    await writer.close();
  } catch (error) {
    try { await writer?.abort(); } catch { /* Best effort rollback. */ }
    // An interrupted write must not be mistaken for a cancelled file picker.
    if (error?.name === 'AbortError') {
      throw Object.assign(new Error('文件写入被中断，当前内容已保留。请重试保存。'), {name:'WriteInterruptedError'});
    }
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

// Keep the existing database name and record shape so stored handles and
// drafts survive upgrades. The id prevents reconnecting an unrelated old file.
export function createFileStore(indexedDB, databaseName) {
  async function transact(mode, action) {
    const db = await new Promise((resolve, reject) => {
      if (!indexedDB) return reject(new Error('此浏览器无法保存文件关联'));
      let settled = false;
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('files')) request.result.createObjectStore('files');
      };
      request.onerror = () => { settled = true; reject(request.error); };
      request.onblocked = () => { settled = true; reject(new Error('文件关联存储被其他页面占用')); };
      request.onsuccess = () => { if (settled) request.result.close(); else resolve(request.result); };
    });
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction('files', mode);
        const request = action(transaction.objectStore('files'));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onabort = () => reject(transaction.error || new Error('未能保存文件关联'));
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
