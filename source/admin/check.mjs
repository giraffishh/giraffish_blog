await import('./check-local-document.mjs');
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {lazyGateway} from './build-adapters.mjs';
import {DocumentAnalysis,markdown} from './src/document.js';
import {collectArticleImages,articleRecord} from './src/article-record.js';
import {mediaCatalog,filterMedia} from './src/media-catalog.js';
import {modeAtRatio,dividerRatio} from './src/layout-utils.js';

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


// Widget ranges must match CodeMirror's normalized document, including CRLF files.
{
  const {renderBlocks} = await import('./src/document.js');
  const text = '## 标题\n\n中文正文 😀\n\n***\n\n$$\nh_t=f(h_{t-1})\n$$\n\n末尾';
  const expected = renderBlocks(text);
  for (const separator of ['\r\n', '\r']) {
    const original = text.replaceAll('\n', separator);
    const editorText = EditorState.create({doc:original}).doc.toString();
    const blocks = renderBlocks(original);
    assert.equal(editorText, text);
    assert.deepEqual(blocks, expected);
    let cursor = 0;
    for (const block of blocks) {
      assert.equal(editorText.slice(cursor, block.from).trim(), '');
      assert.ok(block.to <= editorText.length);
      cursor = block.to;
    }
    assert.equal(editorText.slice(cursor).trim(), '');
  }
  for (const source of ['行内 \\(x_t\\) 与行末', 'Policy \\[ a_t=\\pi_\\theta(z_t) \\]，概率分布', '\\[\nx_t=1\n\n+y_t\n\\]']) {
    assert.match(markdown.render(source), /class="katex"/);
    assert.ok(!markdown.render(source).includes('katex-error'));
  }
  const standalone = renderBlocks('前文\n\\[\nx_t=1\n\\]\n后文');
  assert.equal(standalone.length, 3);
  assert.deepEqual(standalone.map(b=>b.line), [1,2,5]);
  for (const source of ['`\\(x\\)`', '~~~tex\n\\[x\\]\n~~~', '    \\[x\\]', '\\\\[x\\]', '\\[not closed']) {
    assert.ok(!markdown.render(source).includes('class="katex"'), source);
  }
  assert.match(markdown.render('**SimNorm: **正文'), /\*\*SimNorm: \*\*/);
}
// Crossing a rendered block must reveal it before native vertical navigation.
{
  const {livePreview, renderedBlocks, renderMode, editingBlock, moveRenderedLine} = await import('./src/live-preview.js');
  const {EditorSelection} = await import('@codemirror/state');
  for (const forward of [false,true]) for (const extend of [false,true]) for (const gap of ['\n','\n\n']) {
    const doc = forward ? gap + '## Heading\n' : '## Heading' + gap;
    const block = new DocumentAnalysis().analyze(doc).blocks[0];
    const start = forward ? gap.length - 1 : doc.length - gap.length + 1;
    const target = forward ? block.from : block.to;
    const view = {
      state:EditorState.create({doc, selection:{anchor:start}, extensions:[livePreview]}),
      moveToLineBoundary:(range, direction) => {
        const line = view.state.doc.lineAt(range.head);
        return EditorSelection.cursor(direction ? line.to : line.from);
      },
      moveVertically:range => {
        view.state.field(livePreview).decorations.between(block.from,block.to,(from,to,deco)=>assert.ok(!deco.spec.widget, 'Target must be editable before native motion'));
        assert.equal(range.head, start, 'Native motion must start at the original cursor');
        return EditorSelection.cursor(target);
      },
      dispatch:transaction => {
        view.state = (transaction.state ? transaction : view.state.update(transaction)).state;
      }
    };
    view.dispatch({effects:[renderedBlocks.of([block]),renderMode.of(true),editingBlock.of(true)]});
    assert.equal(view.state.field(livePreview).decorations.size, 1);
    assert.equal(moveRenderedLine(view, forward, extend), true);
    assert.equal(view.state.selection.main.head, target);
    assert.equal(view.state.selection.main.anchor, extend ? start : target);
    assert.equal(view.state.doc.toString(), doc);
    assert.equal(view.state.field(livePreview).revealed.length, 0);
    view.state.field(livePreview).decorations.between(block.from,block.to,(from,to,deco)=>assert.ok(!deco.spec.widget));
    view.dispatch({effects:renderMode.of(false)});
    assert.equal(moveRenderedLine(view, forward), false);
  }
  // A wrapped visual row still belongs to normal CodeMirror navigation.
  const doc = '## Heading\nlong wrapped source';
  let state = EditorState.create({doc, selection:{anchor:doc.length}, extensions:[livePreview]});
  state = state.update({effects:[renderedBlocks.of(new DocumentAnalysis().analyze(doc).blocks),renderMode.of(true),editingBlock.of(true)]}).state;
  const wrapped = {state, moveToLineBoundary:() => EditorSelection.cursor(doc.length - 3), dispatch:() => assert.fail('Do not intercept wrapped-row motion')};
  assert.equal(moveRenderedLine(wrapped, false), false);
}
// Shared formatting commands: toggles, selection/caret placement and undo in both modes.
{
  const {formatMarkdown,markdownShortcuts} = await import('./src/markdown-shortcuts.js');
  const {history,undo,redo} = await import('@codemirror/commands');
  const {EditorSelection} = await import('@codemirror/state');
  const {livePreview,renderMode,renderedBlocks} = await import('./src/live-preview.js');
  function editor(doc, from=0, to=doc.length, render=false) {
    const view={state:EditorState.create({doc,selection:{anchor:from,head:to},extensions:[history(),livePreview]}),
      dispatch:tr=>{view.state=(tr.state ? tr : view.state.update(tr)).state;}};
    view.dispatch({effects:[renderedBlocks.of(new DocumentAnalysis().analyze(doc).blocks),renderMode.of(render)]});
    return view;
  }
  for (const render of [false,true]) {
    for (const [kind,wrapped] of [['bold','**文字**'],['italic','*文字*'],['underline','<u>文字</u>'],['strike','~~文字~~'],['code','`文字`']]) {
      const view=editor('文字',0,2,render);
      assert.equal(formatMarkdown(view,kind),true);
      assert.equal(view.state.doc.toString(),wrapped);
      assert.equal(view.state.sliceDoc(view.state.selection.main.from,view.state.selection.main.to),'文字');
      if(render) assert.equal(view.state.field(livePreview).decorations.size,0);
      formatMarkdown(view,kind); assert.equal(view.state.doc.toString(),'文字');
      undo(view); assert.equal(view.state.doc.toString(),wrapped);
      undo(view); assert.equal(view.state.doc.toString(),'文字');
      redo(view); assert.equal(view.state.doc.toString(),wrapped);
    }
    const empty=editor('',0,0,render);formatMarkdown(empty,'bold');
    assert.equal(empty.state.doc.toString(),'****'); assert.equal(empty.state.selection.main.head,2);
  }
  const spaced=editor(' text ');formatMarkdown(spaced,'bold');assert.equal(spaced.state.doc.toString(),' **text** ');
  const url=editor('标题');formatMarkdown(url,'link');assert.equal(url.state.doc.toString(),'[标题](https://)');
  assert.equal(url.state.sliceDoc(url.state.selection.main.from,url.state.selection.main.to),'https://');
  const quote=editor('第一行\n第二行\n第三行',0,8);formatMarkdown(quote,'quote');
  assert.equal(quote.state.doc.toString(),'> 第一行\n> 第二行\n第三行');
  formatMarkdown(quote,'quote');assert.equal(quote.state.doc.toString(),'第一行\n第二行\n第三行');
  const heading=editor('## 原标题');formatMarkdown(heading,'heading3');assert.equal(heading.state.doc.toString(),'### 原标题');
  formatMarkdown(heading,'heading0');assert.equal(heading.state.doc.toString(),'原标题');
  const list=editor('a\nb');formatMarkdown(list,'ordered');assert.equal(list.state.doc.toString(),'1. a\n2. b');
  formatMarkdown(list,'unordered');assert.equal(list.state.doc.toString(),'- a\n- b');
  const fence=editor('a\n```\nb');formatMarkdown(fence,'fence');assert.match(fence.state.doc.toString(),/^````\na\n```\nb\n````$/);
  // Enable multiple selections explicitly; ordinary editor defaults keep one selection.
  const multiple={state:EditorState.create({doc:'a b',extensions:[EditorState.allowMultipleSelections.of(true)],selection:EditorSelection.create([EditorSelection.range(0,1),EditorSelection.range(2,3)])}),dispatch:tr=>{multiple.state=tr.state;}};
  formatMarkdown(multiple,'bold');assert.equal(multiple.state.doc.toString(),'**a** **b**');
  const tick=editor('a`');formatMarkdown(tick,'code');assert.ok(markdown.render(tick.state.doc.toString()).includes('<code>a`</code>'));
  formatMarkdown(tick,'code');assert.equal(tick.state.doc.toString(),'a`');
  const bracketed=editor('标题 [A]');formatMarkdown(bracketed,'link');assert.ok(bracketed.state.doc.toString().includes('\\[A\\]'));
  const locked={state:EditorState.create({doc:'locked',extensions:[EditorState.readOnly.of(true)]}),dispatch:()=>assert.fail('read-only')};
  assert.equal(formatMarkdown(locked,'bold'),false);
  assert.equal(new Set(markdownShortcuts.map(s=>s[0])).size,markdownShortcuts.length);
}
// Preview Enter creates paragraphs, but preserves literal blocks and list continuation.
{
  const {previewNewline,livePreview,renderMode} = await import('./src/live-preview.js');
  const {history,undo} = await import('@codemirror/commands');
  const cases = [
    ['正文§','正文\n\n'], ['前§后','前\n\n后'], ['## 标题§','## 标题\n\n'],
    ['正文\n\n§','正文\n\n\n'], ['§','\n'],
    ['- 第一项§','- 第一项\n- '], ['1. 第一项§','1. 第一项\n2. '],
    ['> 引用§','> 引用\n> '],
    ['```js\nvalue§\n```','```js\nvalue\n\n```'],
    ['$$\nx_t=1§\n$$','$$\nx_t=1\n\n$$'],
    ['\\[\nx_t=1§\n\\]','\\[\nx_t=1\n\n\\]'],
    ['$$\nx=1\n$$§','$$\nx=1\n$$\n\n'],
    ['```\n$$\n```\n\n正文§','```\n$$\n```\n\n正文\n\n']
  ];
  function editor(marked, enabled=true) {
    const pos=marked.indexOf('§'), doc=marked.replace('§','');
    const view={state:EditorState.create({doc,selection:{anchor:pos},extensions:[sourceMarkdown(),livePreview,history()]}),dispatch:tr=>{view.state=(tr.state?tr:view.state.update(tr)).state;}};
    view.dispatch({effects:renderMode.of(enabled)}); return view;
  }
  for (const [marked,expected] of cases) {
    const view=editor(marked);
    assert.equal(previewNewline(view),true,marked);
    assert.equal(view.state.doc.toString(),expected,marked);
    undo(view);assert.equal(view.state.doc.toString(),marked.replace('§',''));
  }
  const soft=editor('前§后'); previewNewline(soft,true);assert.equal(soft.state.doc.toString(),'前\n后');
  const plain=editor('正文§',false);assert.equal(previewNewline(plain),false);assert.equal(plain.state.doc.toString(),'正文');
  const exiting=editor('- 第一项\n- §');previewNewline(exiting);assert.ok(!exiting.state.doc.toString().endsWith('- '));
}
{
  const {savePresentation,saveIconPaths} = await import('./src/studio-ui.js');
  assert.deepEqual(savePresentation(true,false),{state:'dirty',label:'未保存',icon:'save'});
  assert.deepEqual(savePresentation(false,false),{state:'saved',label:'已保存',icon:'saved'});
  assert.deepEqual(savePresentation(true,true),{state:'saving',label:'保存中',icon:'saving'});
  for (const icon of ['save','saved','saving']) assert.ok(saveIconPaths[icon]);
}
// Quote containers survive multi-line paste, list formatting, and math Enter.
{
  const {quotedPaste,previewNewline,livePreview,renderMode} = await import('./src/live-preview.js');
  const {formatMarkdown} = await import('./src/markdown-shortcuts.js');
  const create = (doc,position=doc.length) => EditorState.create({doc,selection:{anchor:position},extensions:[sourceMarkdown(),livePreview]});
  const math = '$$\n\\begin{aligned}\nx&=1\\\\\n\ny&=2\n\\end{aligned}\n$$';
  const quoted = '> '+quotedPaste(math,create('> '));
  assert.equal(quoted,math.split('\n').map(line=>'> '+line).join('\n'));
  const html = markdown.render(quoted+'\n\n后文');
  assert.ok(!html.includes('katex-error'));
  assert.match(html,/<blockquote>[\s\S]*class="katex-display"[\s\S]*<\/blockquote>\s*<p>后文<\/p>/);
  const lists = '> '+quotedPaste('- 一\n- 二\n\n1. 三\n2. 四',create('> '));
  assert.match(markdown.render(lists),/<blockquote>[\s\S]*<ul>[\s\S]*<ol>[\s\S]*<\/blockquote>/);
  assert.equal(quotedPaste('> 一\n> 二',create('> ')),'一\n> 二');
  assert.equal(quotedPaste('a\nb',create('> > ')),'a\n> > b');
  assert.equal(quotedPaste('$$\nx=1\n$$',create('> - ')),'$$\n>   x=1\n>   $$');
  assert.equal(quotedPaste('$$\nx=1\n$$',create('> 说明')),'\n> \n> $$\n> x=1\n> $$');
  assert.equal(quotedPaste('a\nb',create('> ```\n> code')),'a\nb');
  assert.equal(quotedPaste('a\nb',create('正文')),'a\nb');
  for (const enabled of [false,true]) {
    const view={state:create('> 第一行\n> 第二行'),dispatch:tr=>{view.state=(tr.state?tr:view.state.update(tr)).state;}};
    view.dispatch({selection:{anchor:2,head:view.state.doc.length},effects:renderMode.of(enabled)});
    formatMarkdown(view,'ordered');assert.equal(view.state.doc.toString(),'> 1. 第一行\n> 2. 第二行');
    formatMarkdown(view,'unordered');assert.equal(view.state.doc.toString(),'> - 第一行\n> - 第二行');
    formatMarkdown(view,'unordered');assert.equal(view.state.doc.toString(),'> 第一行\n> 第二行');
    for (const [text,expected] of [['> $$\n> x=1','> $$\n> x=1\n> '],['> - $$','> - $$\n>   '],['> $$\n> ','> $$\n> \n> '],['> > $$\n> > x','> > $$\n> > x\n> > ']]) {
      view.state=create(text);view.dispatch({effects:renderMode.of(enabled)});
      assert.equal(previewNewline(view),true);
      assert.equal(view.state.doc.toString(),expected);
    }
    for (const kind of ['math','fence']) {
      view.state=create('> x=1\n> y=2');
      view.dispatch({selection:{anchor:2,head:view.state.doc.length}});
      formatMarkdown(view,kind);
      const delimiter=kind==='math' ? '$$' : '```';
      assert.equal(view.state.doc.toString(),`> ${delimiter}\n> x=1\n> y=2\n> ${delimiter}`);
      const rendered=markdown.render(view.state.doc.toString());
      assert.ok(!rendered.includes('katex-error'));
      assert.ok(rendered.startsWith('<blockquote>'));
    }
    view.state=create('> - 引用内文本');view.dispatch({effects:renderMode.of(enabled)});
    assert.equal(previewNewline(view,true),true);assert.equal(view.state.doc.toString(),'> - 引用内文本\n>   ');
    if (enabled) {
      for (const [text,expected] of [['> - 一','> - 一\n> - '],['> 1. 一','> 1. 一\n> 2. '],['> $$\n> x\n\n外部','> $$\n> x\n\n外部\n\n']]) {
        view.state=create(text);view.dispatch({effects:renderMode.of(true)});previewNewline(view);
        assert.equal(view.state.doc.toString(),expected);
      }
    }
  }
}
// Mouse selection must not open or close any block, including its endpoints.
{
  const {livePreview,renderMode,renderedBlocks,editingBlock,previewPointer,createRenderedTextMap} = await import('./src/live-preview.js');
  const text=Array.from({length:40},(_,i)=>`## Heading ${i}\n\nParagraph ${i}`).join('\n\n');
  const blocks=new DocumentAnalysis().analyze(text).blocks;
  let state=EditorState.create({doc:text,extensions:[livePreview]});
  state=state.update({effects:[renderedBlocks.of(blocks),renderMode.of(true)]}).state;
  const widgets=state.field(livePreview).decorations.size;
  state=state.update({effects:[previewPointer.of({active:true}),editingBlock.of(true)]}).state;
  state=state.update({selection:{anchor:5,head:text.length-3}}).state;
  assert.equal(state.field(livePreview).decorations.size,widgets,'Dragging keeps every rendered block, including endpoints');
  assert.deepEqual(state.field(livePreview).pointerBlocks,[],'Dragging must not expose new source blocks');
  state=state.update({effects:previewPointer.of({active:false})}).state;
  assert.equal(state.field(livePreview).decorations.size,widgets,'Release preserves the preview selection');
  state=state.update({effects:previewPointer.of({active:true})}).state;
  state=state.update({selection:{anchor:blocks[2].from+3}}).state;
  assert.equal(state.field(livePreview).decorations.size,widgets,'A new press still does not expand anything');
  state=state.update({effects:previewPointer.of({active:false,edit:true,layout:{from:blocks[2].from,to:blocks[2].to,heading:true,style:'min-height:64px'}})}).state;
  assert.equal(state.field(livePreview).pointerFrozen,false,'Only a confirmed click enters editing');
  assert.ok(state.field(livePreview).layouts.some(layout=>layout.from===blocks[2].from));
  const clicked=state.field(livePreview).decorations.size;
  state=state.update({effects:previewPointer.of({active:true})}).state;
  state=state.update({selection:{anchor:blocks[2].from+3,head:blocks[7].to}}).state;
  assert.equal(state.field(livePreview).decorations.size,clicked,'Dragging from an open source line also freezes layout');
  state=state.update({effects:previewPointer.of({active:false})}).state;
  assert.equal(state.field(livePreview).decorations.size,clicked);
  state=state.update({changes:{from:0,insert:'x'}}).state;
  assert.equal(state.field(livePreview).pointerFrozen,false,'Typing/formatting releases the selection layout lock');
  assert.equal(state.field(livePreview).layouts[0].to,blocks[2].to+1);
  state=state.update({effects:renderMode.of(false)}).state;
  assert.equal(state.field(livePreview).decorations.size,0);
  assert.equal(createRenderedTextMap('## Hello **world**, world',['Hello ','world',', world']).sourceOffset(2,7),25);
  assert.equal(createRenderedTextMap('> Quote\n> - item',['\n','Quote','\n','item']).sourceOffset(1,2),4);
  assert.equal(createRenderedTextMap('Say "hello"',['Say “hello”']).sourceOffset(0,5),5);
  assert.equal(createRenderedTextMap('A &amp; B',['A & B'],markdown.utils.unescapeAll).sourceOffset(0,3),7);
  assert.equal(createRenderedTextMap('A &#x1f600; B',['A 😀 B'],markdown.utils.unescapeAll).sourceOffset(0,4),11);
  assert.equal(createRenderedTextMap('a\\*b',['a*b']).sourceOffset(0,2),3);

}
// Heading styling/copying must be independent of whether its widget was clicked.
{
  const {livePreview,renderMode,renderedBlocks,editingBlock,previewPointer,copyPreviewMarkdown}=await import('./src/live-preview.js');
  const text='## DinoWM - 2024\n\nBody\n\n### Next';
  const blocks=new DocumentAnalysis().analyze(text).blocks;
  let state=EditorState.create({doc:text,extensions:[livePreview]});
  state=state.update({effects:[renderedBlocks.of(blocks),renderMode.of(true),editingBlock.of(true)]}).state;
  const headingLevel=()=>{let level;state.field(livePreview).decorations.between(0,blocks[0].to,(from,to,deco)=>{level ||= deco.spec.attributes?.['data-heading-level'];});return level;};
  assert.equal(headingLevel(),'2','Heading style exists without click measurements');
  state=state.update({effects:editingBlock.of(false)}).state;
  state=state.update({effects:editingBlock.of(true)}).state;
  assert.equal(headingLevel(),'2','Blur/refocus cannot shrink a heading');
  state=state.update({effects:previewPointer.of({active:true})}).state;
  state=state.update({effects:previewPointer.of({active:false,edit:true})}).state;
  assert.equal(headingLevel(),'2','Repeated clicks do not need a connected old widget');
  for(const [anchor,head,expected] of [[3,16,'## DinoWM - 2024'],[16,3,'## DinoWM - 2024'],[3,9,'DinoWM'],[0,16,'## DinoWM - 2024'],[3,22,'## DinoWM - 2024\n\nBody']]) {
    state=state.update({selection:{anchor,head}}).state;
    const raw=state.sliceDoc(Math.min(anchor,head),Math.max(anchor,head));
    assert.equal(copyPreviewMarkdown(raw,state),expected);
  }
  state=state.update({effects:renderMode.of(false),selection:{anchor:3,head:16}}).state;
  assert.equal(copyPreviewMarkdown('DinoWM - 2024',state),'DinoWM - 2024','Source/split copy stays verbatim');
}
// Cached text maps preserve source boundaries in both directions, including code.
{
  const {createRenderedTextMap,previewSelectionRange}=await import('./src/live-preview.js');
  let decodes=0;
  const mapped=createRenderedTextMap('A &amp; B', ['A & B'],entity=>{decodes++;return markdown.utils.unescapeAll(entity);});
  assert.equal(mapped.sourceOffset(0,3),7);
  assert.deepEqual(mapped.textPoint(7),{index:0,offset:3});
  for(let i=0;i<100;i++) {mapped.sourceOffset(0,3);mapped.textPoint(7);}
  assert.equal(decodes,1,'Repeated pointer lookups must not decode the source again');
  const raw=String.raw`a\*b &amp; c`;
  const code=createRenderedTextMap(raw,[{text:raw,literal:true}]);
  for(let i=0;i<=raw.length;i++) {
    assert.equal(code.sourceOffset(0,i),i);
    assert.deepEqual(code.textPoint(i),{index:0,offset:i});
  }
  const mixed=createRenderedTextMap('Text `a\\*b &amp;` end',[
    {text:'Text '},{text:String.raw`a\*b &amp;`,literal:true},{text:' end'}
  ],markdown.utils.unescapeAll);
  assert.equal(mixed.sourceOffset(1,3),9);
  assert.equal(mixed.sourceOffset(2,4),21);
  const state=EditorState.create({doc:'first line\nsecond line\nthird line'});
  assert.deepEqual([previewSelectionRange(state,3,17,3).anchor,previewSelectionRange(state,3,17,3).head],[0,22]);
  assert.deepEqual([previewSelectionRange(state,17,3,3).anchor,previewSelectionRange(state,17,3,3).head],[22,0]);
  const word=previewSelectionRange(state,7,2,2);
  assert.equal(state.sliceDoc(word.from,word.to),'first line');
}
// Frozen dragging updates the selection without rebuilding 2,000 block widgets.
{
  const {livePreview,renderMode,renderedBlocks,editingBlock,previewPointer}=await import('./src/live-preview.js');
  const text=Array.from({length:2000},(_,i)=>`Paragraph ${i}`).join('\n\n');
  let position=0;
  const blocks=text.split('\n\n').map(text=>{const block={from:position,to:position+text.length,html:`<p>${text}</p>`,height:40};position+=text.length+2;return block;});
  let state=EditorState.create({doc:text,extensions:[livePreview]});
  state=state.update({effects:[renderedBlocks.of(blocks),renderMode.of(true),previewPointer.of({active:true}),editingBlock.of(true)]}).state;
  const decorations=state.field(livePreview).decorations;
  for(let i=1;i<200;i++) {
    state=state.update({selection:{anchor:3,head:blocks[i].from+4}}).state;
    assert.equal(state.field(livePreview).decorations,decorations);
  }
  state=state.update({effects:previewPointer.of({active:false})}).state;
  assert.equal(state.field(livePreview).pointerFrozen,true);
  state=state.update({effects:renderMode.of(false)}).state;
  assert.equal(state.field(livePreview).pointerFrozen,false);
  assert.equal(state.field(livePreview).decorations.size,0);
}
// Italic must not remove half of an existing bold delimiter.
{
  const {formatMarkdown}=await import('./src/markdown-shortcuts.js');
  const {livePreview,renderMode}=await import('./src/live-preview.js');
  for(const enabled of [false,true]) {
    const view={state:EditorState.create({doc:'**word**',selection:{anchor:2,head:6},extensions:[livePreview]}),dispatch(tr){this.state=(tr.state?tr:this.state.update(tr)).state;}};
    view.dispatch({effects:renderMode.of(enabled)});
    formatMarkdown(view,'italic');assert.equal(view.state.doc.toString(),'***word***');
    formatMarkdown(view,'italic');assert.equal(view.state.doc.toString(),'**word**');
    view.dispatch({selection:{anchor:0,head:8}});
    formatMarkdown(view,'italic');assert.equal(view.state.doc.toString(),'***word***');
  }
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
const {reloadDocumentImages}=await import('./src/images.js');
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
// Editor backup compatibility and lifecycle: old drafts, cancelled timers and blocked storage.
{
  const {EditorBackup, preference, storePreference} = await import('./src/studio-storage.js');
  const records = new Map();
  let writes = 0, body = 'original';
  const notices = [];
  const storage = {getItem:key => records.get(key) ?? null,
    setItem:(key,value) => { records.set(key,value); writes++; }, removeItem:key => records.delete(key)};
  const backup = new EditorBackup({entryKey:'posts/example', value:body, getValue:() => body,
    notice:message => notices.push(message), storage:() => storage});
  const key = 'studio:backup:v1:posts/example:body';
  records.set(key, JSON.stringify({version:1, body:'older draft', base:'original', time:123}));
  assert.equal(backup.read().body, 'older draft');
  assert.equal(new EditorBackup({entryKey:'posts/other', value:body, getValue:() => body,
    notice:() => {}, storage:() => storage}).read(), null);
  for (const invalid of ['{bad', JSON.stringify({version:2,body:'draft',time:123}),
    JSON.stringify({version:1,body:'original\n',time:123}), JSON.stringify({version:1,body:'draft',time:null})]) {
    records.set(key, invalid);
    assert.equal(backup.read(), null);
  }
  body = 'changed'; backup.changed(); backup.flush();
  assert.equal(JSON.parse(records.get(key)).body, body);
  assert.equal(JSON.parse(records.get(key)).base, 'original');
  body = 'original'; backup.changed(); backup.flush();
  assert.equal(records.has(key), false);
  body = 'saved body'; backup.changed(); backup.saved();
  assert.equal(records.has(key), false);
  body = 'edit after save'; backup.changed(); backup.destroy();
  assert.equal(JSON.parse(records.get(key)).base, 'saved body');
  assert.equal(JSON.parse(records.get(key)).body, body);
  const savedWrites = writes;
  // A disposed editor or completed CMS save must not leave delayed writes.
  await new Promise(resolve => setTimeout(resolve, 550));
  assert.equal(writes, savedWrites);
  backup.saved(); assert.equal(records.has(key), false);
  const blocked = new EditorBackup({entryKey:'blocked', value:'', getValue:() => 'draft',
    storage:() => {throw Error('storage disabled');}, notice:message => notices.push(message)});
  assert.equal(blocked.read(), null);
  blocked.changed(); blocked.destroy();
  assert.match(notices.at(-1), /本地空间不足或不可用/);
  assert.doesNotThrow(() => blocked.saved());
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', {configurable:true, get:() => storage});
    storePreference('mode', 'split');
    assert.equal(records.get('studio:mode'), 'split');
    assert.equal(preference('mode', 'render'), 'split');
    Object.defineProperty(globalThis, 'localStorage', {configurable:true, get:() => {throw Error('blocked');}});
    assert.equal(preference('mode', 'render'), 'render');
    assert.doesNotThrow(() => storePreference('mode', 'source'));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
}
console.log('Passed: editor draft compatibility, save/disposal timer cancellation and storage failure fallback.');
console.log('Passed: guarded gateway imports; Markdown/Fluid/math/HTML; media indexing/filtering; split endpoints; worker priority/coalescing/cache/failure/retry/disposal; source/render syntax highlighting; export snapshots/cancellation/names; image reload deduplication/concurrency/cancellation.');