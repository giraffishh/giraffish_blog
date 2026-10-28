import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import YAML from 'yaml';
import { markdown, inspectDocument, imageMarkdown, safeImageUrl, readBackup, renderBlocks } from '../src/document.js';

test('external images support parentheses, references and HTML, excluding fenced examples', () => {
  const text = '# 真实标题\n\n![inline](https://example.com/a_(b).png)\n\n![ref][asset]\n\n[asset]: https://example.com/ref.webp\n\n<img src="https://example.com/html.png">\n\n```md\n# not a heading\n![example](https://example.com/ignore.png)\n```';
  const data = inspectDocument(text);
  assert.deepEqual(data.headings.map(h => h.text), ['真实标题']);
  assert.deepEqual(data.images.map(i => i.url), ['https://example.com/a_(b).png', 'https://example.com/ref.webp', 'https://example.com/html.png']);
});

test('image insertion validates schemes and escapes Markdown syntax', () => {
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', '//evil.example/a', 'https://user:pass@example.com/a']) assert.equal(safeImageUrl(bad), null);
  const value = imageMarkdown('https://example.com/a_(b).png?q=x&size=2', '图[1]');
  const parsed = inspectDocument(value).images[0];
  assert.equal(parsed.url, 'https://example.com/a_(b).png?q=x&size=2');
  assert.equal(parsed.alt, '图\\[1\\]');
  assert.equal(safeImageUrl('/images/a.png'), '/images/a.png');
});

test('preview sanitizes active HTML while retaining formulas and tables', () => {
  const window = new JSDOM('').window;
  const purify = createDOMPurify(window);
  const html = purify.sanitize(markdown.render('$x^2$\n\n<img src="x" onerror="alert(1)"><script>alert(1)</script>\n\n|a|b|\n|-|-|\n|1|2|'));
  assert.ok(html.includes('katex'));
  assert.ok(html.includes('<table>'));
  assert.ok(!html.includes('onerror'));
  assert.ok(!html.includes('<script'));
  window.close();
});

test('recovery ignores equivalent saved content and handles unavailable storage', () => {
  const storage = body => ({ getItem: () => JSON.stringify({version:1,body,time:1}) });
  assert.equal(readBackup(storage('正文'), 'key', '正文\n'), null);
  assert.equal(readBackup(storage('另一份正文'), 'key', '正文').body, '另一份正文');
  assert.equal(readBackup({getItem:()=>{throw new Error('denied');}}, 'key', ''), null);
  assert.equal(readBackup({getItem:()=>'{broken'}, 'key', ''), null);
});

test('all existing articles render without altering their original source', async () => {
  const dir = new URL('../../source/_posts/', import.meta.url);
  const files = (await readdir(dir)).filter(file => file.endsWith('.md'));
  let longest = 0;
  const start = performance.now();
  for (const file of files) {
    const source = await readFile(new URL(file, dir), 'utf8');
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
    assert.ok(match, `front matter: ${file}`);
    const data = YAML.parse(match[1]);
    assert.ok(data.title, `title: ${file}`);
    const body = match[2];
    longest = Math.max(longest, body.length);
    const html = markdown.render(body);
    assert.equal(typeof html, 'string');
    inspectDocument(body);
    const blocks=renderBlocks(body);
    if (body.trim()) assert.ok(blocks.length>0, file);
    for(let i=0;i<blocks.length;i++) {
      assert.ok(blocks[i].from<blocks[i].to && blocks[i].to<=body.length, file);
      if(i)assert.ok(blocks[i-1].to<=blocks[i].from, file);
    }
    assert.equal(await readFile(new URL(file, dir), 'utf8'), source);
  }
  console.log(`Corpus: ${files.length} articles; largest ${longest} characters; ${Math.round(performance.now()-start)} ms`);
});

test('CMS configuration retains publish flow and stable post URLs', async () => {
  const config = YAML.parse(await readFile(new URL('../../source/admin/config.yml', import.meta.url), 'utf8'));
  assert.equal(config.backend.name, 'git-gateway');
  assert.equal(config.backend.branch, 'main');
  assert.equal(config.publish_mode, 'editorial_workflow');
  const posts = config.collections.find(c => c.name === 'posts');
  assert.equal(posts.folder, 'source/_posts');
  assert.equal(posts.fields.find(f => f.name === 'abbrlink').widget, 'hidden');
  assert.equal(posts.fields.find(f => f.name === 'body').widget, 'studio-markdown');
  assert.equal(posts.fields.find(f => f.name === 'index_img').widget, 'image-url');
  assert.equal(posts.fields.find(f => f.name === 'date').date_format, 'YYYY-MM-DD');
});
