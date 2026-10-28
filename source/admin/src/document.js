import MarkdownIt from 'markdown-it';
import math from '@traptitech/markdown-it-katex';
import { fluidTags } from './fluid.js';

export const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
  typographer: true,
  quotes: '“”‘’'
}).use(math, {
  throwOnError: false,
  trust: false,
  strict: false,
  maxExpand: 1000,
  maxSize: 20
}).use(fluidTags);
function parseDocument(text) {
  const env = {};
  return {
    tokens: markdown.parse(text, env),
    env
  };
}
export function inspectDocument(text, tokens = markdown.parse(text, {})) {
  const headings = [];
  const images = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'fluid_block') {
      const nested = inspectDocument(token.content);
      headings.push(...nested.headings.map(h => ({
        ...h,
        line: h.line + token.meta.contentLine
      })));
      images.push(...nested.images.map(image => ({
        ...image,
        line: image.line + token.meta.contentLine
      })));
    }
    if (token.type === 'heading_open') {
      headings.push({
        level: Number(token.tag[1]),
        text: tokens[i + 1].content,
        line: token.map[0] + 1
      });
    }
    const visit = (children, line) => {
      for (const child of children || []) {
        if (child.type === 'image') images.push({
          url: child.attrGet('src'),
          alt: child.content,
          line
        });
        visit(child.children, line);
      }
    };
    visit(token.children, (token.map?.[0] ?? 0) + 1);
    if (token.type === 'html_block' || token.type === 'inline') {
      for (const match of token.content.matchAll(/<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi)) {
        images.push({
          url: match[2],
          alt: 'HTML 图片',
          line: (token.map?.[0] ?? 0) + 1
        });
      }
    }
  }
  return {
    headings,
    images: [...new Map(images.map(image => [image.url, image])).values()]
  };
}
export function renderBlocks(text, parsed = parseDocument(text)) {
  const {
    tokens,
    env
  } = parsed;
  // Stylesheet declarations can be separated from their HTML by blank lines.
  // Repeat them only for raw HTML blocks; the view scopes them in a shadow root.
  const htmlStyles = [...new Set(tokens.filter(token => token.type === 'html_block')
    .flatMap(token => token.content.match(/<link\b[^>]*>|<style\b[^>]*>[\s\S]*?<\/style\s*>/gi) || []))].join('\n');
  const offsets = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') offsets.push(i + 1);
  const result = [];
  for (let i = 0; i < tokens.length;) {
    const first = tokens[i];
    if (!first.map || first.level !== 0 || first.nesting < 0) {
      i++;
      continue;
    }
    const start = i;
    const from = offsets[first.map[0]];
    let endLine = first.map[1];
    const stack = [];
    do {
      const token = tokens[i];
      if (token.map) endLine = Math.max(endLine, token.map[1]);
      if (token.type === 'heading_open') {
        const heading = tokens[i + 1]?.content || '';
        token.attrSet('id', heading.toLowerCase().trim().replace(/[^\p{L}\p{N}_-]+/gu, '-'));
      }
      if (token.type === 'html_block') {
        for (const match of token.content.matchAll(/<(\/?)(details|div|section|article|figure|table)\b[^>]*>/gi)) {
          const tag = match[2].toLowerCase();
          if (!match[1]) stack.push(tag);else {
            const at = stack.lastIndexOf(tag);
            if (at >= 0) stack.splice(at);
          }
        }
      }
      i++;
    } while (i < tokens.length && (stack.length || tokens[i - 1].nesting === 1 || tokens[i - 1].level > 0));
    let to = offsets[endLine] ?? text.length;
    if (text[to - 1] === '\n') to--;
    if (text[to - 1] === '\r') to--;
    if (to <= from) continue;
    const rendered = markdown.renderer.render(tokens.slice(start, i), markdown.options, env);
    const html = first.type === 'html_block' && htmlStyles ? `${htmlStyles}\n${rendered}` : rendered;
    const heading = first.type === 'heading_open';
    const image = html.includes('<img');
    const lines = endLine - first.map[0];
    const height = heading ? 64 : image ? 240 : Math.max(40, Math.min(1800, Math.max(lines, Math.ceil((to - from) / 65)) * 25));
    result.push({
      from,
      to,
      line: first.map[0] + 1,
      html,
      height
    });
  }
  const complete = [];
  let cursor = 0;
  for (const block of [...result, {
    from: text.length,
    to: text.length
  }]) {
    if (block.from > cursor && text.slice(cursor, block.from).trim()) {
      const html = markdown.render(text.slice(cursor, block.from), env);
      complete.push({
        from: cursor,
        to: block.from,
        line: text.slice(0, cursor).split('\n').length,
        html,
        height: html.trim() ? 40 : 0
      });
    }
    if (block.html !== undefined) complete.push(block);
    cursor = block.to;
  }
  return complete;
}

// One document per worker: mode changes reuse parsing and rendering without
// retaining a history of large articles. An edit replaces the cached document.
export class DocumentAnalysis {
  analyze(text, preview = true) {
    if (text !== this.text) {
      const parsed = parseDocument(text);
      const info = inspectDocument(text, parsed.tokens);
      this.text = text;
      this.parsed = parsed;
      this.info = info;
      this.blocks = null;
    }
    if (preview && this.blocks === null) this.blocks = renderBlocks(text, this.parsed);
    return {
      blocks: preview ? this.blocks : undefined,
      ...this.info
    };
  }
}
