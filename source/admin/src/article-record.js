import { markdown } from './document.js';
import { normalizeMediaUrl, articleTime } from './media-catalog.js';
const site = 'https://blog.giraffish.top';
function htmlImages(html, add) {
  const visible = html.replace(/<!--[\s\S]*?-->|<(script|style|textarea)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  for (const tag of visible.matchAll(/<img\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)) {
    const attributes = {};
    for (const attr of tag[0].matchAll(/\s(src|alt)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      attributes[attr[1].toLowerCase()] = markdown.utils.unescapeAll(attr[2] ?? attr[3] ?? attr[4]);
    }
    add(attributes.src, attributes.alt);
  }
}
export function collectArticleImages(body, metadata = {}) {
  const images = new Map();
  const add = (value, alt = '', field) => {
    const url = normalizeMediaUrl(value);
    if (!url) return;
    const item = images.get(url) || {
      url,
      alt: '',
      count: 0,
      fields: []
    };
    item.count++;
    if (!item.alt && alt) item.alt = String(alt);
    if (field && !item.fields.includes(field)) item.fields.push(field);
    images.set(url, item);
  };
  const env = {};
  const visit = tokens => {
    for (const token of tokens) {
      if (token.type === 'image') {
        add(token.attrGet('src'), token.content);
        continue;
      }
      if (token.type === 'html_block' || token.type === 'html_inline') htmlImages(token.content, add);
      if (token.type === 'fluid_block') visit(markdown.parse(token.content, env));
      if (token.children) visit(token.children);
    }
  };
  visit(markdown.parse(body || '', env));
  for (const key of ['index_img', 'banner_img']) if (metadata[key]) add(metadata[key], '', key);
  return [...images.values()];
}
export function articleRecord(id, data) {
  const time = articleTime(data.updated) ?? articleTime(data.date);
  const url = data.abbrlink != null ? `${site}/post/${encodeURIComponent(String(data.abbrlink))}/` : `${site}/admin/#/collections/posts/entries/${encodeURIComponent(id)}`;
  return {
    id,
    title: String(data.title || id),
    time,
    url,
    images: collectArticleImages(data.body, data)
  };
}
