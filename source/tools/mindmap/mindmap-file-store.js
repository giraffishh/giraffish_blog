(function (scope) {
  'use strict';
  function create(indexedDB) {
    function open() {
      return new Promise((resolve, reject) => {
        if (!indexedDB) return reject(new Error('此浏览器无法保存文件关联'));
        let settled = false;
        const request = indexedDB.open('giraffish.tools.mindmap', 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('files')) request.result.createObjectStore('files');
        };
        request.onerror = () => { settled = true; reject(request.error); };
        request.onblocked = () => { settled = true; reject(new Error('文件关联存储被其他页面占用')); };
        request.onsuccess = () => {
          if (settled) request.result.close();
          else resolve(request.result);
        };
      });
    }
    async function transact(mode, action) {
      const db = await open();
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
      save: (id, handle) => transact('readwrite', store => store.put({ id, handle }, 'active')),
      async load(id) {
        const record = await transact('readonly', store => store.get('active'));
        return record?.id === id ? record.handle : null;
      }
    };
  }
  if (typeof module === 'object' && module.exports) module.exports = { create };
  else scope.MindmapFileStore = { create };
})(typeof globalThis !== 'undefined' ? globalThis : this);
