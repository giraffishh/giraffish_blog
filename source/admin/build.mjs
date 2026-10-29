import { build } from 'esbuild';
import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parse } from 'yaml';
import { buildMediaIndex } from './build-media-index.mjs';
import { studioAdapters } from './build-adapters.mjs';
import { markdown } from './src/document.js';
import { templates } from './src/templates.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, 'assets');
if (path.relative(here, out) !== 'assets') throw new Error('Unexpected generated asset directory');
await rm(out, {recursive:true, force:true});
await mkdir(`${out}/static`, {recursive:true});
await buildMediaIndex(here, out);
const identity = await readFile(path.join(here, 'node_modules/netlify-identity-widget/build/netlify-identity-widget.js'));
const identityName = `identity-${createHash('sha256').update(identity).digest('hex').slice(0,12)}.js`;
await Promise.all([
  writeFile(`${out}/static/${identityName}`, identity),
  cp(path.join(here, 'node_modules/katex/dist/fonts'), `${out}/katex/fonts`, {recursive:true}),
  cp(path.join(here, 'node_modules/katex/dist/katex.min.css'), `${out}/katex/katex.min.css`),
  writeFile(`${out}/config.json`, JSON.stringify(parse(await readFile(path.join(here,'config.yml'),'utf8'))))
]);
const previews = Object.fromEntries(Object.entries(templates).map(([name,source])=>[name,markdown.render(source)]));
const result = await build({
  absWorkingDir:here,
  entryPoints:['src/boot.js','src/cms.js','src/entry.js','src/render-worker.js','src/print.js','src/markdown-tool.js'],
  outdir:out, bundle:true, minify:true, format:'esm', splitting:true,
  entryNames:'chunks/[name]-[hash]', chunkNames:'chunks/[name]-[hash]', assetNames:'static/[name]-[hash]',
  publicPath:'/admin/assets', target:['es2022'], legalComments:'linked', metafile:true,
  logOverride:{'css-syntax-error':'error'},
  define:{'process.env.NODE_ENV':'"production"', __IDENTITY_URL__:JSON.stringify(`/admin/assets/static/${identityName}`)},
  loader:{'.wasm':'file'},
  plugins:[await studioAdapters(here,previews)]
});
// Tiny revalidated entry files point to immutable content-addressed bundles.
for (const [file, meta] of Object.entries(result.metafile.outputs)) {
  if (!meta.entryPoint || !['boot.js','cms.js','entry.js','render-worker.js','print.js','markdown-tool.js'].includes(path.basename(meta.entryPoint)) || !file.endsWith('.js')) continue;
  const name = path.basename(meta.entryPoint);
  const relative = path.relative(out,path.resolve(here,file)).replaceAll(path.sep,'/');
  await writeFile(path.join(out,name), `export * from './${relative}';\n`);
  if (name === 'entry.js' && meta.cssBundle) await cp(path.resolve(here,meta.cssBundle),`${out}/entry.css`);
  if (name === 'markdown-tool.js' && meta.cssBundle) await cp(path.resolve(here,meta.cssBundle),`${out}/markdown-tool.css`);
}
// The blog's login redirect is a classic script, independent of the admin app.
await build({absWorkingDir:here,entryPoints:['src/identity-redirect.js'],outdir:out,bundle:true,minify:true,format:'iife',target:['es2022']});
const pkg = JSON.parse(await readFile(path.join(here,'package.json'),'utf8'));
await writeFile(`${out}/versions.json`,JSON.stringify({studio:pkg.version,dependencies:pkg.dependencies},null,2));
if (process.env.STUDIO_BUILD_STATS) await writeFile(process.env.STUDIO_BUILD_STATS,JSON.stringify(result.metafile,null,2));
console.log('Writing Studio built: modular CMS, lazy editor, shared parser worker');
