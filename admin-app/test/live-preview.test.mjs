import test from 'node:test';
import assert from 'node:assert/strict';
import { EditorState } from '@codemirror/state';
import { livePreview, renderMode, renderedBlocks, editingBlock } from '../src/live-preview.js';
import { markdown, renderBlocks, templates } from '../src/document.js';
import {search,openSearchPanel,SearchQuery,setSearchQuery,findNext} from '@codemirror/search';

test('render mode exposes the search hit while keeping other blocks rendered',()=>{
  const doc='# First\n\nNeedle text\n\n## Last';
  const blocks=renderBlocks(doc);
  const view={
    state:EditorState.create({doc,extensions:[search(),livePreview]}),
    dispatch(spec){this.state=this.state.update(spec).state;},
    announce(){},
    plugin(){return null;},
  };
  view.dispatch({effects:[renderMode.of(true),renderedBlocks.of(blocks)]});
  openSearchPanel(view);
  view.dispatch({effects:setSearchQuery.of(new SearchQuery({search:'Needle'}))});
  findNext(view);
  assert.equal(view.state.sliceDoc(view.state.selection.main.from,view.state.selection.main.to),'Needle');
  const value=view.state.field(livePreview);
  assert.equal(value.enabled,true);
  assert.equal(value.decorations.size,blocks.length-1);
});

test('selection-only and unrelated transactions reuse rendered decorations',()=>{
  let state=EditorState.create({doc:'# Heading\n\nText',extensions:[livePreview]});
  state=state.update({effects:[renderMode.of(true),renderedBlocks.of(renderBlocks(state.doc.toString()))]}).state;
  const value=state.field(livePreview);
  state=state.update({selection:{anchor:3}}).state;
  assert.equal(state.field(livePreview),value);
  state=state.update({}).state;
  assert.equal(state.field(livePreview),value);
  state=state.update({effects:editingBlock.of(true)}).state;
  assert.notEqual(state.field(livePreview).decorations,value.decorations);
});

test('unchanged rendered widgets survive edits preceding their source positions',()=>{
  let state=EditorState.create({doc:'# Heading\n\nText',extensions:[livePreview]});
  state=state.update({effects:[renderMode.of(true),renderedBlocks.of(renderBlocks(state.doc.toString()))]}).state;
  const before=state.field(livePreview).decorations.iter();
  before.next();
  const widget=before.value.spec.widget;
  state=state.update({changes:{from:2,insert:'Changed '}}).state;
  state=state.update({effects:renderedBlocks.of(renderBlocks(state.doc.toString()))}).state;
  const after=state.field(livePreview).decorations.iter();
  after.next();
  assert.ok(widget.eq(after.value.spec.widget));
});

test('rendered mode displays the whole document without rewriting its source',()=>{
  const doc='# 标题\n\n正文 **粗体**。\n\n$$\nx^2\n$$\n\n## 文末\n\n最后一段。\n';
  let state=EditorState.create({doc,extensions:[livePreview]});
  const blocks=renderBlocks(doc);
  state=state.update({effects:[renderedBlocks.of(blocks),renderMode.of(true)]}).state;
  assert.equal(state.doc.toString(),doc);
  assert.equal(state.field(livePreview).decorations.size,blocks.length);
  for(let i=0;i<3;i++){
    state=state.update({effects:renderMode.of(false)}).state;
    state=state.update({effects:renderMode.of(true)}).state;
  }
  assert.equal(state.doc.toString(),doc);
});

test('editing a rendered block changes only the selected source range',()=>{
  const doc='# 标题\n\n第一段。\n\n第二段。\n';
  const blocks=renderBlocks(doc);
  let state=EditorState.create({doc,extensions:[livePreview]});
  state=state.update({effects:[renderedBlocks.of(blocks),renderMode.of(true),editingBlock.of(true)],selection:{anchor:blocks[1].from+1}}).state;
  assert.equal(state.field(livePreview).decorations.size,blocks.length-1);
  const at=blocks[1].from+1;
  state=state.update({changes:{from:at,insert:'新增'}}).state;
  assert.equal(state.doc.toString(),doc.slice(0,at)+'新增'+doc.slice(at));
  assert.ok(state.field(livePreview).blocks[1].dirty);
});

test('Fluid templates render actual plugins rather than ordinary Markdown snippets',()=>{
  assert.deepEqual(Object.keys(templates),['折叠块','提示便签','成功便签','警告便签','行内标签','按钮链接','勾选框','组图']);
  for(const content of Object.values(templates))assert.ok(!markdown.render(content).includes('{%'));
  assert.match(markdown.render(templates['折叠块']),/<details.*<summary>/s);
  assert.match(markdown.render(templates['提示便签']),/note-info/);
  assert.match(markdown.render(templates['组图']),/fluid-gallery-row/);
});

test('Fluid blocks support nesting and ignore end tags inside code fences',()=>{
  const doc='{% fold info @外层 %}\n{% note warning %}\n注意 **事项**\n{% endnote %}\n```text\n{% endfold %}\n```\n{% endfold %}\n\n# 文末\n';
  const blocks=renderBlocks(doc);
  assert.equal(blocks.length,2);
  assert.ok(blocks[0].html.includes('note-warning'));
  assert.ok(blocks[0].html.includes('<strong>事项</strong>'));
  assert.ok(blocks[0].html.includes('{% endfold %}'));
  assert.ok(blocks[1].html.includes('文末'));
});

test('raw HTML details stay together across Markdown paragraphs',()=>{
  const doc='<details>\n<summary>展开</summary>\n\n**正文**\n\n</details>\n\n# 后续内容\n';
  const blocks=renderBlocks(doc);
  assert.equal(blocks.length,2);
  assert.ok(blocks[0].html.includes('</details>'));
  assert.ok(blocks[0].html.includes('<strong>正文</strong>'));
});

test('unsafe Fluid attributes are not treated as executable markup',()=>{
  const html=markdown.render('{% fold info @<img src=x onerror=bad()> %}\n正文\n{% endfold %}\n\n{% btn javascript:alert(1), 链接 %}');
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('href="javascript:'));
});

test('reference definitions stay hidden while links render normally',()=>{
  const doc='# 标题\n\n[正文链接][ref]\n\n[ref]: https://example.com/\n';
  const blocks=renderBlocks(doc);
  assert.ok(blocks.some(b=>b.html.includes('href="https://example.com/"')));
  const definition=blocks.find(b=>doc.slice(b.from,b.to).includes('[ref]:'));
  assert.ok(definition);
  assert.equal(definition.html.trim(),'');
});
