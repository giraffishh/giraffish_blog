import MarkdownIt from 'markdown-it';
import math from '@traptitech/markdown-it-katex';

export const markdown = new MarkdownIt({ html: true, linkify: true, breaks: true, typographer: true, quotes: '“”‘’' })
  .use(math, { throwOnError: false, trust: false, strict: false, maxExpand: 1000, maxSize: 20 });

export function inspectDocument(text) {
  const tokens = markdown.parse(text, {});
  const headings = [];
  const images = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'heading_open') {
      headings.push({ level: Number(token.tag[1]), text: tokens[i + 1].content, line: token.map[0] + 1 });
    }
    const visit = (children, line) => {
      for (const child of children || []) {
        if (child.type === 'image') images.push({ url: child.attrGet('src'), alt: child.content, line });
        visit(child.children, line);
      }
    };
    visit(token.children, (token.map?.[0] ?? 0) + 1);
    if (token.type === 'html_block' || token.type === 'inline') {
      for (const match of token.content.matchAll(/<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi)) {
        images.push({ url: match[2], alt: 'HTML 图片', line: (token.map?.[0] ?? 0) + 1 });
      }
    }
  }
  return { headings, images: [...new Map(images.map(image => [image.url, image])).values()] };
}

export function documentSections(text) {
  const offsets = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') offsets.push(i + 1);
  const starts = inspectDocument(text).headings.map(h => ({ title: h.text, from: offsets[h.line - 1] }));
  if (!starts.length || starts[0].from !== 0) starts.unshift({ title: '开篇', from: 0 });
  return starts.map((section, i) => ({ ...section, to: starts[i + 1]?.from ?? text.length }));
}

export function safeImageUrl(value) {
  const text = value.trim();
  if (/^\/(?!\/)/.test(text)) return text;
  try {
    const url = new URL(text);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
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
  } catch { /* Storage may be unavailable or a previous record may be corrupt. */ }
  return null;
}

export const templates = {
  '论文笔记': '## 论文信息\n\n**作者**：\n**会议 / 年份**：\n**链接**：[论文](https://arxiv.org/) · [代码](https://github.com/)\n\n## 一句话总结\n\n\n## 核心贡献\n\n1. \n\n## 方法\n\n\n## 实验与结果\n\n| 方法 | 指标 | 结果 |\n| --- | --- | --- |\n|  |  |  |\n\n## 局限与思考\n\n\n## 参考资料\n\n',
  '课程笔记': '## 本节目标\n\n- [ ] \n\n## 核心概念\n\n\n## 推导与例题\n\n$$\n\n$$\n\n## 易错点\n\n> \n\n## 练习\n\n- [ ] \n\n',
  '代码示例': '```python\n# 在这里输入代码\n```\n',
  '公式': '$$\nE = mc^2\n$$\n',
  '表格': '| 项目 | 说明 |\n| --- | --- |\n|  |  |\n',
  '折叠笔记': '<details>\n<summary>展开查看</summary>\n\n在这里补充推导或旁注。\n\n</details>\n',
};
