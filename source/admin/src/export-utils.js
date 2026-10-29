import {DocumentRenderer} from './analysis-client.js';

// Export a stable full-document snapshot through the same cached parser used by
// the editor. Cancellation must release its queued work and timeout together.
export function renderExportSnapshot(text, signal) {
  return new Promise((resolve, reject) => {
    let timer, settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      renderer.destroy();
      signal?.removeEventListener('abort', abort);
      error ? reject(error) : resolve(result);
    };
    const abort = () => finish(new Error('导出已取消'));
    const renderer = new DocumentRenderer(result => finish(result.error ? new Error(result.error) : null, result));
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener('abort', abort, {once:true});
    timer = setTimeout(() => finish(new Error('文章解析超时，请重试')), 45000);
    renderer.request(1, text, true);
  });
}

export function exportFilename(title) {
  const name = String(title || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0,120).replace(/[.\s]+$/g,'');
  return name || '文章正文';
}

export function downloadText(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
