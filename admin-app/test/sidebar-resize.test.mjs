import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {SidebarResize} from '../src/sidebar-resize.js';

const dom = new JSDOM('<!doctype html><body></body>');
globalThis.AbortController = dom.window.AbortController;
globalThis.ResizeObserver = class {
  constructor(callback){this.callback=callback;}
  observe(){}
  disconnect(){this.disconnected=true;}
};
function setup(initialWidth=240) {
  const body=dom.window.document.createElement('div');
  const handle=dom.window.document.createElement('div');
  let container=1200;
  body.getBoundingClientRect=()=>({width:container});
  const captures=new Set();
  handle.setPointerCapture=id=>captures.add(id);
  handle.hasPointerCapture=id=>captures.has(id);
  handle.releasePointerCapture=id=>captures.delete(id);
  const saved=[];
  const resize=new SidebarResize({body,handle,initialWidth,onCommit:width=>saved.push(width)});
  const pointer=(type,x)=>{
    const event=new dom.window.Event(type);
    Object.assign(event,{pointerId:1,button:0,clientX:x});
    handle.dispatchEvent(event);
  };
  return {body,handle,resize,saved,pointer,setContainer(width){container=width;resize.observer.callback();}};
}
test('sidebar drag adjusts its width and saves only the completed width',()=>{
  const f=setup();
  f.pointer('pointerdown',240);
  f.pointer('pointermove',390);
  assert.equal(f.resize.width,390);
  assert.deepEqual(f.saved,[]);
  f.pointer('pointerup',390);
  assert.deepEqual(f.saved,[390]);
  assert.equal(f.handle.getAttribute('aria-valuenow'),'390');
  assert.equal(setup(f.saved[0]).resize.width,390);
  f.pointer('pointerdown',390);
  f.pointer('pointermove',500);
  f.pointer('pointercancel',500);
  assert.equal(f.resize.width,390);
  assert.deepEqual(f.saved,[390]);
});
test('narrow windows preserve room for the editor without overwriting the preferred width',()=>{
  const f=setup(420);
  f.setContainer(601);
  assert.equal(f.resize.width,300);
  assert.equal(f.resize.preferredWidth,420);
  f.setContainer(1200);
  assert.equal(f.resize.width,420);
  assert.deepEqual(f.saved,[]);
});
test('sidebar keyboard bounds, double-click reset, and cleanup work',()=>{
  const f=setup(320);
  for(const [key,width] of [['ArrowRight',336],['Home',160],['End',560]]) {
    f.handle.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key}));
    assert.equal(f.resize.width,width);
  }
  f.handle.dispatchEvent(new dom.window.Event('dblclick'));
  assert.equal(f.resize.width,240);
  f.resize.destroy();
  assert.equal(f.resize.observer.disconnected,true);
  f.handle.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'End'}));
  assert.equal(f.resize.width,240);
});
