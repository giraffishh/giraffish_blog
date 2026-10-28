import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><body></body>');
globalThis.window=dom.window;
globalThis.document=dom.window.document;
class Observer {
  nodes=new Set();
  constructor(callback){this.callback=callback;}
  observe(node){this.nodes.add(node);}
  unobserve(node){this.nodes.delete(node);}
  disconnect(){this.nodes.clear();}
}
globalThis.ResizeObserver=Observer;
globalThis.IntersectionObserver=Observer;
const {LazyDocument}=await import('../src/rendered-document.js');
const block=(html,from)=>({html,from,to:from+9,height:40});
function fixture(){const root=document.createElement('div');document.body.append(root);return new LazyDocument(root);}

test('editing one block retains connected images and expanded folds with updated offsets',()=>{
  const preview=fixture();
  const blocks=[block('<p>Original</p>',0),block('<details><summary>Fold</summary><img src="https://example.test/a.png"></details>',10)];
  preview.update(blocks);
  preview.nodes.forEach(node=>preview.mount(node));
  const kept=preview.nodes[1];
  const image=kept.querySelector('img');
  kept.querySelector('details').open=true;
  preview.root.scrollTop=37;
  const result=preview.update([block('<p>Changed paragraph</p>',0),{...blocks[1],from:30,to:39}]);
  assert.deepEqual(result,{created:1,reused:1,removed:1});
  assert.equal(preview.nodes[1],kept);
  assert.equal(kept.querySelector('img'),image);
  assert.equal(kept.querySelector('details').open,true);
  assert.equal(kept.dataset.from,'30');
  assert.equal(preview.root.scrollTop,37);
  assert.equal(preview.nodes[0].dataset.mounted,'true');
  preview.destroy();
});

test('identical blocks remain distinct and removed or destroyed nodes cannot remount',()=>{
  const preview=fixture();
  const blocks=[block('<p>Same</p>',0),block('<p>Same</p>',10),block('<p>Other</p>',20)];
  preview.update(blocks);
  const [a,b,removed]=preview.nodes;
  assert.deepEqual(preview.update([blocks[0],blocks[1]]),{created:0,reused:2,removed:1});
  assert.deepEqual(preview.nodes,[a,b]);
  assert.equal(preview.observer.nodes.has(removed),false);
  preview.mount(removed);
  assert.equal(removed.dataset.mounted,undefined);
  preview.destroy();
  preview.observer.callback([{target:a,isIntersecting:true}]);
  assert.equal(preview.root.childElementCount,0);
  assert.equal(preview.resizeObserver.nodes.size,0);
  assert.equal(a.dataset.mounted,undefined);
});
