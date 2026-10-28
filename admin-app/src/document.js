import MarkdownIt from 'markdown-it';
import math from '@traptitech/markdown-it-katex';
import { fluidTags } from './fluid.js';
export { fluidTemplates as templates } from './fluid.js';

export const markdown = new MarkdownIt({ html: true, linkify: true, breaks: true, typographer: true, quotes: '“”‘’' })
  .use(math, { throwOnError: false, trust: false, strict: false, maxExpand: 1000, maxSize: 20 })
  .use(fluidTags);

export function inspectDocument(text) {
  const tokens = markdown.parse(text, {});
  const headings = [];
  const images = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'fluid_block') {
      const nested=inspectDocument(token.content);
      headings.push(...nested.headings.map(h=>({...h,line:h.line+token.meta.contentLine})));
      images.push(...nested.images.map(image=>({...image,line:image.line+token.meta.contentLine})));
    }
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

export function renderBlocks(text) {
  const env={};
  const tokens=markdown.parse(text,env);
  const offsets=[0];
  for(let i=0;i<text.length;i++) if(text[i]==='\n')offsets.push(i+1);
  const result=[];
  for(let i=0;i<tokens.length;) {
    const first=tokens[i];
    if(!first.map || first.level!==0 || first.nesting<0) {i++;continue;}
    const start=i;
    const from=offsets[first.map[0]];
    let endLine=first.map[1];
    const stack=[];
    do {
      const token=tokens[i];
      if(token.map)endLine=Math.max(endLine,token.map[1]);
      if(token.type==='heading_open') {
        const heading=tokens[i+1]?.content || '';
        token.attrSet('id',heading.toLowerCase().trim().replace(/[^\p{L}\p{N}_-]+/gu,'-'));
      }
      if(token.type==='html_block') {
        for(const match of token.content.matchAll(/<(\/?)(details|div|section|article|figure|table)\b[^>]*>/gi)) {
          const tag=match[2].toLowerCase();
          if(!match[1])stack.push(tag);
          else {const at=stack.lastIndexOf(tag);if(at>=0)stack.splice(at);}
        }
      }
      i++;
    } while(i<tokens.length && (stack.length || tokens[i-1].nesting===1 || tokens[i-1].level>0));
    let to=offsets[endLine]??text.length;
    if(text[to-1]==='\n')to--;
    if(text[to-1]==='\r')to--;
    if(to<=from)continue;
    const html=markdown.renderer.render(tokens.slice(start,i),markdown.options,env);
    const heading=first.type==='heading_open';
    const image=html.includes('<img');
    const lines=endLine-first.map[0];
    const height=heading?64:image?240:Math.max(40,Math.min(1800,Math.max(lines,Math.ceil((to-from)/65))*25));
    result.push({from,to,line:first.map[0]+1,html,height});
  }
  const complete=[];
  let cursor=0;
  for(const block of [...result,{from:text.length,to:text.length}]) {
    if (block.from>cursor && text.slice(cursor,block.from).trim()) {
      const html=markdown.render(text.slice(cursor,block.from),env);
      complete.push({from:cursor,to:block.from,line:text.slice(0,cursor).split('\n').length,html,height:html.trim()?40:0});
    }
    if(block.html!==undefined)complete.push(block);
    cursor=block.to;
  }
  return complete;
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
