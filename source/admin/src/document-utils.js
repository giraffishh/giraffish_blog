export function safeImageUrl(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (/^\/(?!\/)/.test(text)) return text;
  try {
    const url = new URL(text);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
export function imageMarkdown(url, alt = '') {
  const valid = safeImageUrl(url);
  if (!valid) throw new Error('请输入 http(s) 图片地址或以 / 开头的站内路径。');
  return `![${alt.replace(/[\\\[\]]/g, '\\$&').replace(/[\r\n]/g, ' ')}](<${valid.replace(/>/g, '%3E').replace(/</g, '%3C')}>)`;
}
export function readBackup(storage, key, current) {
  try {
    const record = JSON.parse(storage.getItem(key));
    if (record?.version === 1 && typeof record.body === 'string' && record.body.trimEnd() !== current.trimEnd() && Number.isFinite(record.time)) return record;
  } catch {/* Storage may be unavailable or a previous record may be corrupt. */}
  return null;
}

export { templates } from './templates.js';
