import { build } from 'esbuild';
import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, 'assets');
const relativeOutput = path.relative(here, out);
if (relativeOutput !== 'assets') throw new Error('Unexpected generated asset directory');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await Promise.all([
  cp(path.join(here, 'node_modules/decap-cms/dist'), `${out}/decap`, { recursive: true,
    filter: source => !source.endsWith('.map') && !/[/\\](?:\d+\.)?cms\.(?:js|js\.LICENSE\.txt)$/.test(source) }),
  cp(path.join(here, 'node_modules/katex/dist'), `${out}/katex`, { recursive: true, filter: source => !source.endsWith('.map') }),
  cp(path.join(here, 'node_modules/netlify-identity-widget/build/netlify-identity-widget.js'), `${out}/identity.js`),
]);
await build({ absWorkingDir: here, entryPoints: ['src/boot.js', 'src/entry.js', 'src/render-worker.js', 'src/identity-redirect.js'], outdir: out,
  bundle: true, minify: true, format: 'iife', target: ['es2022'], legalComments: 'linked' });
const pkg = JSON.parse(await readFile(path.join(here, 'package.json'), 'utf8'));
await writeFile(`${out}/versions.json`, JSON.stringify({ studio: pkg.version, dependencies: pkg.dependencies }, null, 2));
console.log('Writing Studio built: source/admin/assets (self-hosted CMS, editor, formulas and fonts)');
