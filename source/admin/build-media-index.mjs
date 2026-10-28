import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { articleRecord } from './src/article-record.js';
export async function buildMediaIndex(admin, output) {
  const root = path.resolve(admin, '../_posts');
  const articles = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, {
      withFileTypes: true
    })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(file);
        continue;
      }
      if (!/\.md$/i.test(entry.name)) continue;
      const text = await readFile(file, 'utf8');
      const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
      if (!match) throw new Error(`Missing article front matter: ${file}`);
      const data = parse(match[1]);
      if (data.published === false || data.draft === true) continue;
      const id = path.relative(root, file).replaceAll(path.sep, '/').replace(/\.md$/i, '');
      articles.push(articleRecord(id, {
        ...data,
        body: match[2]
      }));
    }
  }
  await walk(root);
  const files = [];
  const uploads = path.resolve(admin, '../images/uploads');
  async function uploadedFiles(directory) {
    let entries;
    try { entries = await readdir(directory, {withFileTypes:true}); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { await uploadedFiles(file); continue; }
      if (!entry.isFile()) continue;
      const name = path.relative(uploads, file).replaceAll(path.sep, '/');
      files.push({name, path:`/images/uploads/${name.split('/').map(encodeURIComponent).join('/')}`, bytes:(await stat(file)).size});
    }
  }
  await uploadedFiles(uploads);
  articles.sort((a, b) => a.id.localeCompare(b.id));
  await writeFile(path.join(output, 'article-media.json'), JSON.stringify({
    version: 1,
    generatedAt: new Date().toISOString(),
    articles,
    files
  }));
  console.log(`Article media index: ${articles.length} articles`);
}

