import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {url:'https://example.test/admin/'});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
const {WritingStudio} = await import('../src/studio.js');
const {templates} = await import('../src/document.js');
const {createTemplateCard} = await import('../src/template-card.js');

function editor() {
  const studio = Object.create(WritingStudio.prototype);
  studio.root = document.createElement('div');
  studio.mode = 'source';
  studio.source = {dispatch() {}, requestMeasure() {}};
  studio.queueRender = () => {};
  studio.build();
  studio.workspace.getBoundingClientRect = () => ({left:100, width:1000});
  const captures = new Set();
  studio.divider.setPointerCapture = id => captures.add(id);
  studio.divider.hasPointerCapture = id => captures.has(id);
  studio.divider.releasePointerCapture = id => captures.delete(id);
  return studio;
}
function pointer(studio, type, x) {
  const event = new dom.window.Event(type);
  Object.assign(event, {pointerId:1, button:0, clientX:x});
  studio.divider.dispatchEvent(event);
}

test('dragging between both edges and split preserves the last interior width', () => {
  localStorage.clear();
  const studio = editor();
  studio.settleRatio(38);
  pointer(studio, 'pointerdown', 480);
  pointer(studio, 'pointermove', 100);
  pointer(studio, 'pointerup', 100);
  assert.equal(studio.mode, 'render');
  assert.equal(studio.divider.getAttribute('aria-valuenow'), '0');
  studio.setMode('split');
  assert.equal(studio.ratio, 38);
  studio.setMode('render');
  pointer(studio, 'pointerdown', 100);
  pointer(studio, 'pointermove', 720);
  pointer(studio, 'pointerup', 720);
  assert.equal(studio.mode, 'split');
  assert.equal(studio.ratio, 62);
  pointer(studio, 'pointerdown', 720);
  pointer(studio, 'pointermove', 1150);
  pointer(studio, 'pointerup', 1150);
  assert.equal(studio.mode, 'source');
  pointer(studio, 'pointerdown', 1100);
  pointer(studio, 'pointermove', 640);
  pointer(studio, 'pointerup', 640);
  assert.equal(studio.mode, 'split');
  assert.equal(studio.ratio, 54);
  assert.equal(localStorage.getItem('studio:ratio'), '54');
});

test('clicking an edge does not switch modes and cancelled drags restore the layout', () => {
  const studio = editor();
  studio.setMode('source');
  pointer(studio, 'pointerdown', 1100);
  pointer(studio, 'pointerup', 1100);
  assert.equal(studio.mode, 'source');
  pointer(studio, 'pointerdown', 1100);
  pointer(studio, 'pointermove', 700);
  assert.equal(studio.mode, 'split');
  pointer(studio, 'pointercancel', 700);
  assert.equal(studio.mode, 'source');
  assert.equal(studio.root.classList.contains('studio-resizing'), false);
  studio.divider.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key:'ArrowLeft'}));
  assert.equal(studio.mode, 'split');
  assert.equal(studio.ratio, 95);
  studio.divider.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key:'Home'}));
  assert.equal(studio.mode, 'render');
});

test('template previews insert once, have distinct effects, and cannot navigate', () => {
  const selectors = ['details', '.note-info', '.note-success', '.note-warning', '.fluid-label', '.fluid-button', '.fluid-checkbox', '.studio-template-gallery'];
  let i = 0;
  for (const [name, content] of Object.entries(templates)) {
    let inserted = '';
    const card = createTemplateCard(name, content, () => inserted += content);
    assert.ok(card.querySelector(selectors[i++]), name);
    assert.equal(card.querySelector('.studio-template-preview').inert, true);
    assert.equal(card.querySelectorAll('[href], img, input, script').length, 0);
    card.click();
    assert.equal(inserted, content);
  }
});
