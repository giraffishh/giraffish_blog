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

test('unchanged sidebar data preserves its nodes and focused controls',()=>{
  const studio=editor();
  const headings=[{text:'Heading',level:2,line:1}];
  studio.documentInfo={headings};
  studio.showSidebar('outline');
  const heading=studio.sideContent.firstChild;
  studio.documentInfo={headings:headings.map(x=>({...x}))};
  studio.showSidebar('outline');
  assert.equal(studio.sideContent.firstChild,heading);
  studio.showSidebar('templates');
  const template=studio.sideContent.firstChild;
  studio.showSidebar('templates');
  assert.equal(studio.sideContent.firstChild,template);
  studio.documentInfo={images:[{url:'https://example.test/a.png',alt:'Picture',line:3}]};
  studio.showSidebar('images');
  const image=studio.sideContent.querySelector('img');
  studio.showSidebar('images');
  assert.equal(studio.sideContent.querySelector('img'),image);
  studio.documentInfo.images[0].line=5;
  studio.showSidebar('images');
  assert.equal(studio.sideContent.querySelector('img'),image);
  let located;
  studio.goToLine=line=>located=line;
  [...studio.sideContent.querySelectorAll('button')].find(button=>button.textContent==='定位').click();
  assert.equal(located,5);
});

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

test('outline follows source lines, distinguishes duplicate titles, and scrolls only its own sidebar', () => {
  const studio = editor();
  studio.documentInfo = {headings:Array.from({length:15}, (_,i)=>({text:'重复标题',level:2,line:i*20+1}))};
  studio.root.classList.add('studio-sidebar-open');
  studio.sidebar.getBoundingClientRect = () => ({top:0,bottom:200});
  Object.defineProperty(studio.sidebar.querySelector('.studio-side-nav'), 'offsetHeight', {value:40});
  studio.showSidebar('outline');
  for (let i=0;i<studio.outlineItems.length;i++) {
    studio.outlineItems[i].element.getBoundingClientRect=()=>({top:50+i*32-studio.sidebar.scrollTop,bottom:82+i*32-studio.sidebar.scrollTop});
  }
  studio.updateOutline(225);
  const active=studio.sideContent.querySelector('[aria-current=location]');
  assert.equal(active.dataset.line,'221');
  assert.equal(studio.sideContent.querySelectorAll('[aria-current]').length,1);
  assert.ok(studio.sidebar.scrollTop>0);
  assert.ok(active.getBoundingClientRect().bottom<=192);
  studio.updateOutline(25);
  assert.equal(studio.sideContent.querySelector('[aria-current]').dataset.line,'21');
  assert.ok(studio.sideContent.querySelector('[aria-current]').getBoundingClientRect().top>=48);
  studio.showSidebar('templates');
  studio.updateOutline(225);
  assert.equal(studio.activeSide,'templates');
  assert.equal(studio.sideContent.querySelectorAll('.studio-template').length,8);
});


test('outline expands only the active heading path and keeps other chapters collapsed', () => {
  const studio=editor();
  studio.documentInfo={headings:[
    {text:'章 A',level:2,line:1}, {text:'小节 A1',level:3,line:10}, {text:'细节',level:4,line:15},
    {text:'小节 A2',level:3,line:20}, {text:'章 B',level:2,line:30}, {text:'小节 B1',level:3,line:40},
  ]};
  studio.showSidebar('outline');
  studio.updateOutline(16);
  assert.deepEqual(studio.outlineItems.filter(x=>!x.element.hidden).map(x=>x.line),[1,10,15,20,30]);
  assert.equal(studio.outlineItems[0].element.getAttribute('aria-expanded'),'true');
  assert.equal(studio.outlineItems[4].element.getAttribute('aria-expanded'),'false');
  studio.updateOutline(42);
  assert.deepEqual(studio.outlineItems.filter(x=>!x.element.hidden).map(x=>x.line),[1,30,40]);
  assert.equal(studio.outlineItems[0].element.getAttribute('aria-expanded'),'false');
  assert.equal(studio.outlineItems[5].element.getAttribute('aria-current'),'location');
});

test('workspace starts expanded and exposes metadata plus a footer sidebar toggle',()=>{
  localStorage.clear();
  const studio=editor();
  assert.equal(studio.root.classList.contains('studio-focus'),true);
  assert.deepEqual(Object.keys(studio.sidebarButtons),['outline','metadata','images','templates']);
  assert.equal([...studio.root.querySelectorAll('button')].some(b=>['全屏','退出全屏','侧栏'].includes(b.textContent)),false);
  assert.equal(studio.footer.firstChild,studio.sidebarToggle);
  assert.equal(studio.footer.lastChild.lastChild,studio.count);
  studio.sidebarToggle.click();
  assert.equal(studio.sidebarToggle.getAttribute('aria-label'),'显示侧栏');
  studio.sidebarToggle.click();
  assert.equal(studio.sidebarToggle.getAttribute('aria-label'),'隐藏侧栏');
  studio.showSidebar('metadata');
  assert.equal(studio.sideContent.hidden,true);
  assert.equal(studio.metadataSlot.hidden,false);
  studio.showSidebar('outline');
  assert.equal(studio.sideContent.hidden,false);
});
