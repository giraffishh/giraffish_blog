import {readFile} from 'node:fs/promises';
import path from 'node:path';

function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw new Error(`Upstream adapter no longer matches: ${before}`);
  return source.replace(before,after);
}

// Only change import timing. Authentication, permissions and repository
// operations continue to use the version-checked upstream implementation.
export function lazyGateway(source) {
  const imports = [
    "import { GitHubBackend } from 'decap-cms-backend-github';",
    "import { GitLabBackend } from 'decap-cms-backend-gitlab';",
    "import { BitbucketBackend, API as BitBucketAPI } from 'decap-cms-backend-bitbucket';",
    "import GitHubAPI from './GitHubAPI';",
    "import GitLabAPI from './GitLabAPI';"
  ];
  for (const statement of imports) source=replaceOnce(source,statement,'');
  for (const [provider,load] of [
    ['github',"const [{GitHubBackend},{default:GitHubAPI}] = await Promise.all([import('decap-cms-backend-github'),import('./GitHubAPI')]);"],
    ['gitlab',"const [{GitLabBackend},{default:GitLabAPI}] = await Promise.all([import('decap-cms-backend-gitlab'),import('./GitLabAPI')]);"],
    ['bitbucket',"const {BitbucketBackend,API:BitBucketAPI} = await import('decap-cms-backend-bitbucket');"]
  ]) source=replaceOnce(source,`if (this.backendType === '${provider}') {`,`if (this.backendType === '${provider}') {\n        ${load}`);
  return source;
}

export async function studioAdapters(here,previews) {
  for (const [name,version] of [['decap-cms-core','3.20.2'],['decap-cms-backend-git-gateway','3.7.6']]) {
    const pkg=JSON.parse(await readFile(path.join(here,'node_modules',name,'package.json'),'utf8'));
    if(pkg.version!==version) throw new Error(`Review the studio adapter before upgrading ${name}.`);
  }
  return {
    name:'studio-adapters',
    setup(build) {
      build.onResolve({filter:/[\\/]EditorToolbar(?:\.js)?$/},args=>{
        if (!args.importer.replaceAll('\\','/').includes('/decap-cms-core/')) return;
        return {path:path.join(here,'src/cms-toolbar.jsx')};
      });
      build.onLoad({filter:/[\\/]decap-cms-backend-git-gateway[\\/]dist[\\/]esm[\\/]implementation\.js$/},async ({path:file})=>({contents:lazyGateway(await readFile(file,'utf8')),loader:'js'}));
      build.onResolve({filter:/^studio:template-previews$/},()=>({path:'templates',namespace:'studio'}));
      build.onLoad({filter:/.*/,namespace:'studio'},()=>({contents:`export default ${JSON.stringify(previews)}`,loader:'js'}));
      build.onLoad({filter:/[\\/]@jsquash[\\/]webp[\\/]codec[\\/].*\.js$/},async ({path:file})=>{
        let source=await readFile(file,'utf8'),imports='';
        source=source.replace(/new URL\(["']([^"']+\.wasm)["'],\s*import\.meta\.url\)/g,(_,name)=>{
          imports+=`import wasmAsset from './${name}';\n`;
          return 'new URL(wasmAsset,import.meta.url)';
        });
        return {contents:imports+source,loader:'js'};
      });
    }
  };
}