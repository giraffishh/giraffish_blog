import test from 'node:test';
import assert from 'node:assert/strict';
import {ScrollSync} from '../src/scroll-sync.js';

function fixture(withEditorRoot=false) {
  const source = Object.assign(new EventTarget(), {scrollTop:0, scrollHeight:300, clientHeight:100, getBoundingClientRect:()=>({top:0})});
  const preview = Object.assign(new EventTarget(), {scrollTop:0, scrollHeight:750, clientHeight:100, getBoundingClientRect:()=>({top:0})});
  const blocks = [{from:0,to:99},{from:100,to:199},{from:200,to:299}];
  const heights = [300,50,400];
  const view = {
    scrollDOM:source,
    state:{doc:{length:299,lines:30,lineAt:pos=>({number:Math.floor(pos/10)+1})}},
    get documentTop(){return -source.scrollTop;},
    lineBlockAtHeight:y=>({from:Math.floor(y/10)*10}),
    lineBlockAt:pos=>({top:Math.floor(pos/10)*10,bottom:Math.floor(pos/10)*10+10}),
  };
  const studio = {mode:'split',source:view,previewPane:preview,
    updateOutline(line){this.line=line;},
    lazyPreview:{mount(){},nodes:blocks.map((block,index)=>({block,getBoundingClientRect:()=>({top:heights.slice(0,index).reduce((a,b)=>a+b,0)-preview.scrollTop,height:heights[index]})}))},
  };
  if(withEditorRoot) view.dom=new EventTarget();
  const sync = new ScrollSync(studio);
  sync.blocks = blocks;
  return {sync,studio,source,preview,heights};
}

test('search-panel input releases a pinned outline target without switching modes',()=>{
  const {sync,studio}=fixture(true);
  sync.schedule=()=>{};
  sync.navigate(100);
  assert.notEqual(sync.navigation,null);
  studio.source.dom.dispatchEvent(new Event('keydown'));
  assert.equal(sync.navigation,null);
  assert.equal(sync.leader,'source');
  assert.equal(studio.mode,'split');
});

test('source and preview track the same content block despite very different heights', () => {
  const {sync,source,preview,studio} = fixture();
  source.scrollTop=150;
  sync.sync();
  assert.equal(preview.scrollTop,315); // Same fraction in block 2, not whole-document percentage.
  assert.equal(studio.line,18);
  preview.dispatchEvent(new Event('wheel'));
  preview.scrollTop=350;
  sync.sync();
  assert.equal(source.scrollTop,185);
  assert.equal(studio.line,21);
});

test('only user input on the other pane changes which pane leads', () => {
  const {sync,source,preview} = fixture();
  let scheduled=0;
  sync.schedule=()=>scheduled++;
  source.dispatchEvent(new Event('scroll'));
  assert.equal(scheduled,1);
  preview.dispatchEvent(new Event('scroll'));
  assert.equal(scheduled,1);
  preview.dispatchEvent(new Event('pointerdown'));
  preview.dispatchEvent(new Event('scroll'));
  assert.equal(scheduled,2);
  source.dispatchEvent(new Event('scroll'));
  assert.equal(scheduled,2);
  source.dispatchEvent(new Event('keydown'));
  assert.equal(sync.leader,'source');
});

test('late image growth keeps source anchored, and both document ends remain reachable', () => {
  const {sync,source,preview,heights,studio} = fixture();
  source.scrollTop=150;
  heights[0]=600;
  preview.scrollHeight=1050;
  sync.sync();
  assert.equal(preview.scrollTop,615);
  source.scrollTop=200;
  sync.sync();
  assert.equal(preview.scrollTop,950);
  assert.equal(studio.line,30);
  preview.dispatchEvent(new Event('wheel'));
  preview.scrollTop=0;
  sync.sync();
  assert.equal(source.scrollTop,0);
});

test('outline navigation stays on its target while lazy images resize, until the reader scrolls', () => {
  const {sync,source,preview,heights,studio}=fixture();
  sync.schedule=()=>{};
  sync.navigate(100);
  sync.sync();
  assert.equal(preview.scrollTop,280);
  assert.equal(source.scrollTop,80);
  heights[0]=600;
  preview.scrollHeight=1050;
  sync.sync();
  assert.equal(preview.scrollTop,580);
  assert.equal(studio.line,11);
  preview.dispatchEvent(new Event('wheel'));
  assert.equal(sync.navigation,null);
});
