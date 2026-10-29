import {renderExportSnapshot, exportFilename, downloadText} from './export-utils.js';
import {populateRendered} from './rendered-document.js';
import {paperStyles} from './export-styles.js';

const site = 'https://blog.giraffish.top/';
function portableUrl(value) {
  if (!value || value.startsWith('#') || value.startsWith('data:')) return value;
  try {
    const url = new URL(value, site);
    if (['localhost','127.0.0.1'].includes(url.hostname)) return new URL(url.pathname + url.search + url.hash, site).href;
    return url.href;
  } catch { return value; }
}

// Serialize scoped HTML styles as declarative shadow roots, so downloaded HTML
// preserves custom cards without allowing their CSS to change the whole article.
function serializeScope(scope) {
  for (const node of scope.querySelectorAll('[src],[href],[poster]')) {
    for (const attr of ['src','href','poster']) if (node.hasAttribute(attr)) node.setAttribute(attr, portableUrl(node.getAttribute(attr)));
  }
  for (const img of scope.querySelectorAll('img')) {
    // Use the canonical src rather than a viewport-specific responsive candidate.
    img.removeAttribute('srcset'); img.removeAttribute('sizes');
  }
  for (const host of scope.querySelectorAll('*')) {
    if (!host.shadowRoot) continue;
    serializeScope(host.shadowRoot);
    const template = document.createElement('template');
    template.setAttribute('shadowrootmode', 'open');
    template.content.append(...[...host.shadowRoot.childNodes].map(child => child.cloneNode(true)));
    host.append(template);
  }
}

export async function downloadHtml(snapshot, signal) {
  const result = await renderExportSnapshot(snapshot.text, signal);
  if (signal.aborted) return;
  const doc = document.implementation.createHTMLDocument(snapshot.title);
  doc.documentElement.lang = 'zh-CN';
  const charset = doc.createElement('meta'); charset.setAttribute('charset', 'utf-8');
  const viewport = doc.createElement('meta'); viewport.name = 'viewport'; viewport.content = 'width=device-width,initial-scale=1';
  const referrer = doc.createElement('meta'); referrer.name = 'referrer'; referrer.content = 'no-referrer';
  const styles = doc.createElement('style');
  styles.textContent = paperStyles + '\n@media screen {.pdf-paper{width:min(900px,100%);margin:auto;padding:32px 24px} .katex-display{overflow:auto!important} @media(max-width:600px){.pdf-paper{padding:20px 16px}}}';
  const math = doc.createElement('link'); math.rel = 'stylesheet'; math.href = new URL('/admin/assets/katex/katex.min.css',site).href;
  doc.head.prepend(charset); doc.head.append(viewport,referrer,styles,math);
  const article = doc.createElement('article'); article.className = 'pdf-paper';
  for (const block of result.blocks || []) {
    const section = doc.createElement('div'); section.className = 'pdf-block';
    populateRendered(section, block.html);
    serializeScope(section);
    article.append(section);
  }
  doc.body.append(article);
  downloadText('<!doctype html>\n' + doc.documentElement.outerHTML, 'text/html;charset=utf-8', exportFilename(snapshot.title) + '.html');
}
