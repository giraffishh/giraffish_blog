import test from 'node:test';
import assert from 'node:assert/strict';
import { WritingStudio } from '../src/studio.js';

test('saving immediately after typing captures text before the debounced input callback', () => {
  let saved;
  const editor = { mode:'ir', irReady:true, irBaseline:'原文\n', irEdited:false,
    vditor:{getValue:()=> '原文与刚输入的最后几个字\n'}, commitIR:text=>{saved=text;} };
  WritingStudio.prototype.flush.call(editor);
  assert.equal(saved,'原文与刚输入的最后几个字\n');
});

test('switching modes without edits does not persist normalized Markdown', () => {
  let changed = false;
  const editor = { mode:'ir', irReady:true, irBaseline:'规范化后的文本\n',
    vditor:{getValue:()=> '规范化后的文本\n'}, commitIR:()=>{changed=true;} };
  WritingStudio.prototype.flush.call(editor);
  assert.equal(changed,false);
});
