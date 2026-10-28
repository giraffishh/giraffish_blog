import { safeImageUrl } from './document-utils.js';
const site = 'https://blog.giraffish.top';
export function normalizeMediaUrl(value) {
  const safe = safeImageUrl(typeof value === 'string' ? value.trim() : '');
  return safe ? new URL(safe, site).href : null;
}
export function articleTime(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  let text = String(value).trim().replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) text += 'T00:00:00';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(text)) text += '+08:00';
  const time = Date.parse(text);
  return Number.isFinite(time) ? time : null;
}
function metrics(uses) {
  const times = uses.map(use => use.time).filter(Number.isFinite);
  return {
    count: uses.reduce((sum, use) => sum + use.count, 0),
    time: times.length ? Math.max(...times) : null
  };
}
export function mediaCatalog(articles) {
  const images = new Map();
  for (const article of articles) {
    for (const reference of article.images) {
      const url = normalizeMediaUrl(reference.url);
      if (!url) continue;
      let item = images.get(url);
      if (!item) {
        const parsed = new URL(url);
        let name = parsed.pathname.split('/').pop() || parsed.hostname;
        try {
          name = decodeURIComponent(name);
        } catch {/* Retain malformed filename escapes. */}
        item = {
          url,
          name,
          alt: reference.alt || '',
          fields: [],
          domain: parsed.hostname,
          source: parsed.origin === site ? 'site' : 'external',
          format: (name.match(/\.([a-z0-9]+)$/i)?.[1] || '其他').toLowerCase(),
          uses: []
        };
        images.set(url, item);
      }
      if (!item.alt && reference.alt) item.alt = reference.alt;
      for (const field of reference.fields || []) if (!item.fields.includes(field)) item.fields.push(field);
      item.uses.push({
        id: article.id,
        title: article.title,
        url: article.url,
        time: article.time,
        count: reference.count,
        fields: reference.fields || []
      });
    }
  }
  return [...images.values()].map(image => ({
    ...image,
    ...metrics(image.uses)
  }));
}
export function filterMedia(items, {
  query = '',
  source = '',
  domain = '',
  article = '',
  format = '',
  sort = 'recent'
} = {}) {
  const needle = query.trim().toLocaleLowerCase();
  const result = [];
  for (const image of items) {
    if (source && image.source !== source || domain && image.domain !== domain || format && image.format !== format) continue;
    const uses = article ? image.uses.filter(use => use.id === article) : image.uses;
    if (!uses.length) continue;
    const fields = article ? [...new Set(uses.flatMap(use => use.fields))] : image.fields;
    if (needle && ![image.url, image.name, image.alt, ...fields, ...uses.map(use => use.title)].some(value => value.toLocaleLowerCase().includes(needle))) continue;
    result.push(article ? {
      ...image,
      uses,
      fields,
      ...metrics(uses)
    } : image);
  }
  return result.sort((a, b) => {
    let order = 0;
    if (sort === 'most' || sort === 'least') order = (a.count - b.count) * (sort === 'most' ? -1 : 1);else if (a.time === null || b.time === null) order = a.time === b.time ? 0 : a.time === null ? 1 : -1;else order = (a.time - b.time) * (sort === 'oldest' ? 1 : -1);
    return order || a.url.localeCompare(b.url);
  });
}
