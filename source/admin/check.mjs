await import('./check-local-document.mjs');
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {lazyGateway} from './build-adapters.mjs';
import {DocumentAnalysis,markdown} from './src/document.js';
import {collectArticleImages,articleRecord} from './src/article-record.js';
import {mediaCatalog,filterMedia} from './src/media-catalog.js';
import {modeAtRatio,dividerRatio} from './src/split-layout.js';

const toolbar=await import('./src/toolbar-bridge.js');
toolbar.configureToolbar({show_preview_links:false});assert.equal(toolbar.previewLinksEnabled,false);
toolbar.configureToolbar({});assert.equal(toolbar.previewLinksEnabled,true);
toolbar.configureToolbar({collections:[
  {name:'posts',fields:[{name:'body',widget:'studio-markdown'}]},
  {name:'pages',files:[{name:'about',fields:[{name:'body',widget:'studio-markdown'}]}]},
  {name:'settings',fields:[{name:'title',widget:'string'}]}
]});
for (const name of ['posts','pages']) assert.equal(toolbar.usesStudioEditor({get:()=>name}),true);
assert.equal(toolbar.usesStudioEditor({get:()=> 'settings'}),false);
toolbar.configureToolbar({collections:[]});
assert.equal(toolbar.usesStudioEditor({get:()=> 'posts'}),false);


const gateway=await readFile(new URL('./node_modules/decap-cms-backend-git-gateway/dist/esm/implementation.js',import.meta.url),'utf8');
const lazy=lazyGateway(gateway);
for(const provider of ['github','gitlab','bitbucket']) {
  assert.ok(lazy.includes(`import('decap-cms-backend-${provider}')`));
  assert.ok(!lazy.includes(`from 'decap-cms-backend-${provider}'`));
}
assert.ok(lazy.includes('await this.api.hasWriteAccess()'));
assert.throws(()=>lazyGateway(gateway.replace("if (this.backendType === 'github') {",'if (unexpected) {')));

const parser=new DocumentAnalysis();
const body='# 标题\n\n正文 $x^2$\n\n{% fold info @详情 %}\n内容\n{% endfold %}\n\n<iframe src="/widgets/demo.html"></iframe>';
const first=parser.analyze(body);
assert.ok(first.blocks.some(block=>block.html.includes('katex')));
assert.ok(first.blocks.some(block=>block.html.includes('details')));
assert.ok(first.blocks.some(block=>block.html.includes('iframe')));
assert.equal(first.blocks,parser.analyze(body).blocks);
assert.equal(parser.analyze(body,false).blocks,undefined);
assert.notEqual(first.blocks,parser.analyze(body+'\n新内容').blocks);
assert.equal(first.headings[0].text,'标题');
assert.ok(markdown.render('**粗体**').includes('<strong>粗体</strong>'));
const fences=[
  ['python','def greet(name):\n    return "hello"'],['C++','int main() { return 42; }'],
  ['java','public class Demo { int value = 2; }'],['postgresql','SELECT * FROM users WHERE id = 1;'],
  ['bash','if true; then echo "hello"; fi'],['powershell','function Test { return "hello" }'],
  ['javascript','const value = "hello";'],['json','{"value":42}'],['yaml','value: true'],
  ['r','function(x) { return(42) }'],['html','<div class="card">hello</div>']
];
for(const [language,code] of fences) {
  const rendered=markdown.render('~~~'+language+'\n'+code+'\n~~~');
  assert.match(rendered,/class="hljs-/,'Missing rendered highlighting: '+language);
}
assert.ok(!markdown.render('~~~text\nSELECT * FROM users\n~~~').includes('hljs-'));
const escaped=markdown.render('~~~unknown\n<script>alert(1)</script>\n~~~');
assert.ok(escaped.includes('&lt;script&gt;'));assert.ok(!escaped.includes('<script>'));
const {highlightCode}=await import('./src/code-highlight.js');
assert.equal(highlightCode('x'.repeat(100001),'python'),'');
const {sourceCodeLanguage}=await import('./src/source-code.js');
const {highlightTree,classHighlighter}=await import('@lezer/highlight');
const {EditorState}=await import('@codemirror/state');
const {ensureSyntaxTree}=await import('@codemirror/language');
const {markdown:sourceMarkdown}=await import('@codemirror/lang-markdown');
for(const [language,code] of fences) {
  const doc='~~~'+language+'\n'+code+'\n~~~';
  const state=EditorState.create({doc,extensions:[sourceMarkdown({codeLanguages:sourceCodeLanguage})]});
  const ranges=[];
  highlightTree(ensureSyntaxTree(state,doc.length,1000),classHighlighter,(from,to,classes)=>{
    if(from>doc.indexOf('\n')&&to<doc.lastIndexOf('\n'))ranges.push(classes);
  });
  assert.ok(ranges.length,'Missing source highlighting: '+language);
}


const url='https://example.com/a.webp';
const images=collectArticleImages(`![A](${url})\n\n<img src="${url}"/>\n\n\`\`\`md\n![忽略](https://example.com/code.png)\n\`\`\``,{banner_img:url});
assert.equal(images.length,1);
assert.equal(images[0].count,3);
assert.deepEqual(images[0].fields,['banner_img']);
const articles=[articleRecord('a',{title:'文章甲',date:'2026-01-01',body:`![A](${url})`,banner_img:url}),articleRecord('b',{title:'文章乙',date:'2026-02-01',body:'![B](https://example.com/b.png)'})];
const catalog=mediaCatalog(articles);
assert.equal(filterMedia(catalog,{sort:'recent'})[0].name,'b.png');
assert.equal(filterMedia(catalog,{sort:'most'})[0].count,2);
assert.equal(filterMedia(catalog,{query:'banner_img'}).length,1);
assert.equal(filterMedia(catalog,{article:'b',format:'webp'}).length,0);
assert.equal(modeAtRatio(0),'render');assert.equal(modeAtRatio(50),'split');assert.equal(modeAtRatio(100),'source');
assert.equal(dividerRatio('source',50),100);assert.equal(dividerRatio('render',50),0);
for(const reversed of [false,true]) for(const mode of ['source','render']) assert.equal(modeAtRatio(dividerRatio(mode,50,reversed),reversed),mode);
assert.equal(dividerRatio('split',35,true),35);

const originalWorker=globalThis.Worker;
const workers=[];
class FakeWorker {
  constructor(){this.messages=[];workers.push(this);}
  postMessage(message){this.messages.push(message);}
  terminate(){this.terminated=true;}
  reply(data={}){this.onmessage({data:{id:this.messages.at(-1).id,...data}});}
}
try {
  globalThis.Worker=FakeWorker;
  const {DocumentRenderer,requestArticleRecord}=await import('./src/analysis-client.js');
  const articleA=requestArticleRecord('a',{}),articleB=requestArticleRecord('b',{});
  const results=[];const renderer=new DocumentRenderer(result=>results.push(result));
  renderer.request(1,'old',true);renderer.request(2,'latest',true);
  const worker=workers[0];worker.reply({article:{id:'a'}});
  assert.equal(worker.messages.at(-1).text,'latest'); // Interactive work wins.
  worker.onmessage({data:{id:-1,blocks:[]}});assert.equal(results.length,0);
  worker.reply({blocks:[],headings:[],images:[]});
  assert.equal(results[0].id,2);
  assert.equal(worker.messages.at(-1).articleId,'b');worker.reply({article:{id:'b'}});
  await Promise.all([articleA,articleB]);
  const count=worker.messages.length;renderer.request(3,'latest',true);await Promise.resolve();
  assert.equal(worker.messages.length,count);assert.equal(results.at(-1).id,3);
  renderer.request(4,'fails',true);worker.onerror();assert.ok(results.at(-1).error);
  renderer.request(5,'retry',true);assert.equal(workers.length,2);workers[1].reply({blocks:[]});assert.equal(results.at(-1).id,5);
  renderer.request(6,'destroyed',true);renderer.destroy();const before=results.length;workers[1].reply({blocks:[]});assert.equal(results.length,before);
  const {renderExportSnapshot,exportFilename}=await import('./src/export-utils.js');
  assert.equal(exportFilename('论文: A/B?'), '论文_ A_B_');
  assert.equal(exportFilename('...  '), '文章正文');
  const exported=renderExportSnapshot('export body');
  workers.at(-1).reply({blocks:[{html:'<p>export body</p>'}]});
  assert.equal((await exported).blocks[0].html,'<p>export body</p>');
  const cancelled=new AbortController();
  const pendingExport=renderExportSnapshot('cancelled export',cancelled.signal);
  cancelled.abort();await assert.rejects(pendingExport,/导出已取消/);
  workers.at(-1).reply({blocks:[]});
  const messageCount=workers.at(-1).messages.length;
  await assert.rejects(renderExportSnapshot('never queued',cancelled.signal),/导出已取消/);
  assert.equal(workers.at(-1).messages.length,messageCount);
  const failedExport=renderExportSnapshot('broken export');
  workers.at(-1).reply({error:'解析失败'});
  await assert.rejects(failedExport,/解析失败/);
  globalThis.Worker=class {constructor(){throw new Error('blocked worker');}};
  const failed=await import('./src/analysis-client.js?constructor-failure');
  await assert.rejects(failed.requestArticleRecord('failure',{}),/解析器加载失败/);
  globalThis.Worker=FakeWorker;
  const recovered=failed.requestArticleRecord('recovered',{});workers.at(-1).reply({article:{id:'recovered'}});
  assert.equal((await recovered).id,'recovered');
} finally {globalThis.Worker=originalWorker;}
const {reloadDocumentImages}=await import('./src/image-reload.js');
const originalFetch=globalThis.fetch;
try {
  let inFlight=0,peak=0;
  const requests=[];
  globalThis.fetch=async (url,options)=>{
    requests.push({url,options});peak=Math.max(peak,++inFlight);
    await Promise.resolve();inFlight--;
    return {blob:async()=>new Blob()};
  };
  const root={querySelectorAll:()=>[]};
  const records=Array.from({length:7},(_,i)=>({url:'https://images.example/'+i+'.png?signature=keep'}));
  const count=await reloadDocumentImages(root,[...records,records[0]],new AbortController().signal,()=>{});
  assert.equal(count,7);assert.equal(requests.length,7);assert.ok(peak<=4);
  assert.equal(requests[0].url,records[0].url);
  assert.ok(requests.every(({options})=>options.cache==='reload' && options.credentials==='omit'));
  const cancelled=new AbortController();cancelled.abort();
  await reloadDocumentImages(root,records,cancelled.signal,()=>{});
  assert.equal(requests.length,7);
} finally {globalThis.fetch=originalFetch;}
console.log('Passed: guarded gateway imports; Markdown/Fluid/math/HTML; media indexing/filtering; split endpoints; worker priority/coalescing/cache/failure/retry/disposal; source/render syntax highlighting; export snapshots/cancellation/names; image reload deduplication/concurrency/cancellation.');