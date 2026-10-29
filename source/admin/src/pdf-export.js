import {renderExportSnapshot, exportFilename} from './export-utils.js';
import {populateRendered} from './rendered-document.js';
import {paperStyles} from './export-styles.js';

function resourceReady(node, popup) {
  return new Promise(resolve => {
    const image = node.tagName === 'IMG';
    const finish = ok => {
      clearTimeout(timer);
      node.removeEventListener('load', loaded); node.removeEventListener('error', failed);
      popup.removeEventListener('pagehide', failed);
      resolve(ok);
    };
    const loaded = () => finish(!image || node.naturalWidth > 0);
    const failed = () => finish(false);
    const timer = setTimeout(failed, 20000);
    node.addEventListener('load', loaded, {once:true}); node.addEventListener('error', failed, {once:true});
    popup.addEventListener('pagehide', failed, {once:true});
    if (image && node.complete) loaded();
    else if (!image && node.sheet) loaded();
  });
}

function allScopes(root) {
  const result = [root];
  for (const element of root.querySelectorAll('*')) if (element.shadowRoot) result.push(...allScopes(element.shadowRoot));
  return result;
}

export async function preparePdf(popup, {text, title}) {
  const abort = new AbortController();
  const cancel = () => abort.abort();
  popup.addEventListener('pagehide', cancel, {once:true});
  let result;
  try { result = await renderExportSnapshot(text, abort.signal); }
  finally { popup.removeEventListener('pagehide', cancel); }
  if (popup.closed) return;
  const doc = popup.document;
  doc.documentElement.lang = 'zh-CN';
  const filename = exportFilename(title);
  doc.head.replaceChildren(); doc.body.replaceChildren();
  doc.title = filename;
  const node = (tag, className, value) => {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    if (value) element.textContent = value;
    return element;
  };
  const viewport = node('meta'); viewport.name = 'viewport'; viewport.content = 'width=device-width,initial-scale=1';
  const style = node('style', '', paperStyles);
  const mathStyle = node('link'); mathStyle.rel = 'stylesheet'; mathStyle.href = new URL('/admin/assets/katex/katex.min.css', window.location.origin).href;
  const mathReady = resourceReady(mathStyle, popup);
  doc.head.append(viewport, style, mathStyle);
  const article = node('article', 'pdf-paper');
  // Keep the current unsaved text, independent of editor virtualization/scroll.
  for (const block of result.blocks || []) {
    const section = node('div', 'pdf-block');
    populateRendered(section, block.html, () => {}, {print:true});
    article.append(section);
  }
  const scopes = allScopes(article);
  for (const scope of scopes) {
    if (scope !== article) {
      if (scope.querySelector('.katex')) scope.append(mathStyle.cloneNode());
      scope.append(node('style', '', paperStyles));
    }
    for (const details of scope.querySelectorAll('details')) details.open = true;
    for (const media of scope.querySelectorAll('video,audio,object,embed,.pdf-embed-link')) media.remove();
    for (const link of scope.querySelectorAll('a')) link.rel = 'noopener noreferrer';
  }
  const resources = scopes.flatMap(scope => [...scope.querySelectorAll('img,link[rel=stylesheet]')]);
  const pending = resources.map(resource => resourceReady(resource, popup));
  doc.body.append(article);
  const loaded = await Promise.all([mathReady, ...pending]);
  if (popup.closed) return;
  // Layout starts font loading; wait boundedly so a failed font cannot hang export.
  article.getBoundingClientRect();
  let fontTimer;
  const fontsReady = await Promise.race([doc.fonts.ready.then(() => true), new Promise(resolve => {fontTimer=setTimeout(() => resolve(false), 10000);})]);
  clearTimeout(fontTimer);
  if (popup.closed) return;
  // Fit wide equations to the printable column instead of clipping their RHS.
  const fitMath = () => {
    for (const scope of scopes) for (const formula of scope.querySelectorAll('.katex-display > .katex')) {
      formula.style.fontSize = '';
      const width = formula.parentElement.clientWidth;
      if (width && formula.scrollWidth > width) formula.style.fontSize = `${width / formula.scrollWidth}em`;
    }
  };
  fitMath(); popup.addEventListener('beforeprint', () => {
    for (const scope of scopes) for (const details of scope.querySelectorAll('details')) details.open = true;
    fitMath();
  });
  popup.addEventListener('afterprint', fitMath);
  popup.addEventListener('resize', fitMath);
  const failed = loaded.filter(ok => !ok).length + (fontsReady ? 0 : 1);
  for (const scope of scopes) for (const img of scope.querySelectorAll('img')) {
    if (!img.complete || !img.naturalWidth) img.remove();
  }
  return {warning:failed ? failed + ' 项图片、样式或字体未加载完成。' : ''};
}
