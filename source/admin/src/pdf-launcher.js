// A rendered, off-screen frame keeps printing separate from the editor without
// opening a preview tab or changing the current document/scroll position.
export function startPdfExport(snapshot, notice) {
  const frame = document.createElement('iframe');
  const token = crypto.randomUUID();
  frame.className = 'studio-print-frame';
  frame.title = 'PDF 导出';
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  let timer, stopped = false;
  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    window.removeEventListener('message', receive);
    frame.remove();
  };
  const fail = message => { notice(message); cleanup(); };
  const receive = event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.token !== token) return;
    if (event.data.type === 'studio-pdf-ready') {
      frame.contentWindow.postMessage({type:'studio-pdf-document', token, ...snapshot}, location.origin);
      clearTimeout(timer);
      timer = setTimeout(() => fail('PDF 准备超时，请重新导出。'), 90000);
    } else if (event.data.type === 'studio-pdf-printing') {
      clearTimeout(timer);
      notice(event.data.warning || '已打开打印窗口');
    } else if (event.data.type === 'studio-pdf-complete') {
      // Keep the frame until the next export/unmount: some mobile browsers fire
      // afterprint before the system's share/save sheet has consumed the page.
      clearTimeout(timer);
      window.removeEventListener('message', receive);
    } else if (event.data.type === 'studio-pdf-error') {
      fail(event.data.message || 'PDF 导出失败，请重试。');
    }
  };
  window.addEventListener('message', receive);
  timer = setTimeout(() => fail('PDF 导出未能启动，请重试。'), 20000);
  frame.src = '/admin/print.html#' + token;
  notice('正在准备 PDF…');
  document.body.append(frame);
  return cleanup;
}
