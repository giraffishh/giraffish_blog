import { build } from 'esbuild';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../source/admin/assets');
await mkdir(out, { recursive: true });
await Promise.all([
  cp(path.join(here, 'node_modules/decap-cms/dist'), `${out}/decap`, { recursive: true,
    filter: source => !source.endsWith('.map') && !/[/\\](?:\d+\.)?cms\.(?:js|js\.LICENSE\.txt)$/.test(source) }),
  cp(path.join(here, 'node_modules/vditor/dist'), `${out}/vditor/dist`, { recursive: true,
    filter: source => !source.endsWith('.map') && !source.endsWith('.ts') && !/[/\\](?:ts|types)(?:[/\\]|$)/.test(source) }),
  cp(path.join(here, 'node_modules/katex/dist'), `${out}/katex`, { recursive: true, filter: source => !source.endsWith('.map') }),
  cp(path.join(here, 'node_modules/netlify-identity-widget/build/netlify-identity-widget.js'), `${out}/identity.js`),
]);
// Use the patched KaTeX version in both source previews and Vditor's renderer.
await cp(path.join(here, 'node_modules/katex/dist'), `${out}/vditor/dist/js/katex`, { recursive: true, filter: source => !source.endsWith('.map') });
await build({ absWorkingDir: here, entryPoints: ['src/boot.js', 'src/entry.js', 'src/render-worker.js'], outdir: out,
  bundle: true, minify: true, format: 'iife', target: ['es2022'], legalComments: 'linked' });
const pkg = JSON.parse(await readFile(path.join(here, 'package.json'), 'utf8'));
await writeFile(`${out}/versions.json`, JSON.stringify({ studio: pkg.version, dependencies: pkg.dependencies }, null, 2));
console.log('Writing Studio built: source/admin/assets (self-hosted CMS, editor, formulas and fonts)');
