import test from 'node:test';
import assert from 'node:assert/strict';
import {LayoutMotion} from '../src/layout-motion.js';

function fixture() {
  let reduce=false;
  globalThis.window={matchMedia:()=>({matches:reduce})};
  const classes=new Set(['studio-ready']);
  const motion=new LayoutMotion({classList:{contains:name=>classes.has(name)}});
  const calls=[];
  const element={animate(frames,options){
    let finish;
    const animation={finished:new Promise(resolve=>{finish=resolve;}),cancelled:false,cancel(){this.cancelled=true;finish();},finish};
    calls.push({animation,frames,options});
    return animation;
  }};
  return {motion,element,calls,classes,setReduce:value=>{reduce=value;}};
}
test('rapid content switches cancel older animations without clearing the newest animation',async()=>{
  const f=fixture();
  f.motion.reveal(f.element);
  f.motion.reveal(f.element);
  await Promise.resolve();
  assert.equal(f.calls[0].animation.cancelled,true);
  assert.equal(f.motion.animations.get(f.element),f.calls[1].animation);
  assert.equal(f.calls[1].options.duration,160);
  f.calls[1].animation.finish();
  await Promise.resolve();
  assert.equal(f.motion.animations.size,0);
});
test('dragging, initial load and reduced-motion preference skip content animation',()=>{
  const f=fixture();
  f.setReduce(true);f.motion.reveal(f.element);
  f.setReduce(false);f.classes.add('studio-resizing');f.motion.reveal(f.element);
  f.classes.delete('studio-resizing');f.classes.delete('studio-ready');f.motion.reveal(f.element);
  assert.equal(f.calls.length,0);
  f.classes.add('studio-ready');f.motion.reveal(f.element);
  f.motion.destroy();
  assert.equal(f.calls[0].animation.cancelled,true);
  assert.equal(f.motion.animations.size,0);
});
