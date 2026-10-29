import {preparePdf} from './pdf-export.js';
const host = window.parent !== window ? window.parent : null;
const token = window.location.hash.slice(1);
if (host && /^[\da-f-]{36}$/i.test(token)) {
  const send = (type, data = {}) => host.postMessage({type, token, ...data}, location.origin);
  const receive = async event => {
    if (event.source !== host || event.origin !== location.origin || event.data?.type !== 'studio-pdf-document' || event.data.token !== token || typeof event.data.text !== 'string' || typeof event.data.title !== 'string') return;
    window.removeEventListener('message', receive);
    history.replaceState(null, '', location.pathname);
    try {
      const result = await preparePdf(window, event.data);
      if (!result) return;
      window.addEventListener('afterprint', () => send('studio-pdf-complete'), {once:true});
      send('studio-pdf-printing', result);
      // Let the parent paint its status before the native dialog blocks JS.
      await new Promise(resolve => setTimeout(resolve, 50));
      window.focus();
      window.print();
    } catch (error) {
      send('studio-pdf-error', {message:'PDF 导出失败：' + error.message});
    }
  };
  window.addEventListener('message', receive);
  send('studio-pdf-ready');
}
