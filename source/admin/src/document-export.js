import {element as el, button, compactAction} from './studio-ui.js';
import {downloadText, exportFilename} from './export-utils.js';

let dialogId = 0;
// Own export UI/lifetimes; the editor supplies a fresh snapshot at each click.
export class DocumentExport {
  constructor({root, snapshot, notice, signal}) {
    this.root = root;
    this.snapshot = snapshot;
    this.signal = signal;
    this.notice = message => { if (!this.destroyed && !signal.aborted) notice(message); };
  }
  open() {
    this.closeDialog?.();
    const dialog = el('dialog', 'studio-dialog studio-export-dialog');
    const title = el('h2', '', '导出');
    title.id = `studio-export-title-${++dialogId}`;
    dialog.setAttribute('aria-labelledby', title.id);
    const formats = el('div', 'studio-export-formats');
    const markdown = button('Markdown (.md)', () => {
      const snapshot = this.snapshot();
      dialog.close();
      downloadText(snapshot.text, 'text/markdown;charset=utf-8', exportFilename(snapshot.title) + '.md');
    });
    const pdf = button('PDF (.pdf)', () => {
      const snapshot = this.snapshot();
      this.closePdf?.();
      this.closePdf = startPdfExport(snapshot, this.notice);
      dialog.close();
    });
    const html = button('HTML (.html)', async () => {
      const snapshot = this.snapshot();
      dialog.close();
      this.notice('正在导出 HTML…');
      try {
        const {downloadHtml} = await import('./html-export.js');
        await downloadHtml(snapshot, this.signal);
        this.notice('HTML 已导出');
      } catch (error) {
        this.notice('HTML 导出失败：' + error.message);
      }
    });
    formats.append(compactAction(markdown, 'source'), compactAction(pdf, 'render'), compactAction(html, 'source'));
    const actions = el('div', 'studio-dialog-actions');
    actions.append(button('取消', () => dialog.close()));
    dialog.append(title, formats, actions);
    this.root.append(dialog);
    const cleanup = () => { dialog.remove(); if (this.closeDialog === cleanup) this.closeDialog = null; };
    this.closeDialog = cleanup;
    dialog.addEventListener('close', cleanup, {once:true});
    dialog.showModal();
    markdown.focus();
  }
  destroy() {
    this.destroyed = true;
    this.closeDialog?.();
    this.closePdf?.();
  }
}

// A rendered, off-screen frame keeps printing separate from the editor without
// opening a preview tab or changing the current document/scroll position.
function startPdfExport(snapshot, notice) {
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
