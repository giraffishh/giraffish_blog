import assert from 'node:assert/strict';
import {LocalDocument, validateMarkdownFile} from './src/local-document.js';
import {writeCheckedFile, writeFileContent, createFileStore, hasFilePermission} from '../tools/shared/local-files.mjs';

function file(name, text) {
  return {
    name, text, writes:0, fail:false,
    async getFile() { return {text:async () => this.text}; },
    async isSameEntry(other) { return other === this; },
    async createWritable() {
      let value;
      return {
        write:async text => { value = text; },
        close:async () => { if (this.fail) throw Error('Disk full'); this.text = value; this.writes++; },
        abort:async () => {}
      };
    }
  };
}
const original = file('test.md', '# Original');
const doc = new LocalDocument({text:original.text, name:original.name, handle:original});
doc.text = '# Edited';
await doc.save();
assert.equal(original.text, doc.text);
assert.equal(doc.dirty, false);
assert.equal(doc.automatic, true);
assert.equal(doc.saved, true);
original.text = '# External edit';
doc.text = '# Local edit';
await assert.rejects(() => doc.save(), {name:'ConflictError'});
assert.equal(original.text, '# External edit');
assert.equal(doc.text, '# Local edit');
assert.equal(doc.automatic, false);
assert.equal(doc.dirty, true);
const copy = file('copy.md', '');
await doc.save(copy, true);
assert.equal(copy.text, '# Local edit');
assert.equal(doc.handle, original);
assert.equal(doc.dirty, true);
const failed = file('failed.md', 'existing');
failed.fail = true;
await assert.rejects(() => doc.save(failed), /Disk full/);
assert.equal(doc.handle, original);
assert.equal(failed.text, 'existing');
assert.equal(doc.busy, false);
await doc.save(copy);
assert.equal(doc.handle, copy);
assert.equal(doc.dirty, false);
// Edits during an asynchronous write must remain dirty and save on the next pass.
let release;
copy.createWritable = async () => ({
  write:async () => new Promise(resolve => {release = resolve;}),
  close:async () => {}, abort:async () => {}
});
doc.text = '# Snapshot';
const saving = doc.save();
while (!release) await new Promise(resolve => setImmediate(resolve));
doc.text = '# Typed while saving';
await assert.rejects(() => doc.save(), /正在保存/);
release();
await saving;
assert.equal(doc.base, '# Snapshot');
assert.equal(doc.dirty, true);
assert.equal(doc.text, '# Typed while saving');
// An unchanged or already-saved document requires no write.
const unchanged = file('same.md', 'same');
await writeCheckedFile(unchanged, 'old', 'same');
assert.equal(unchanged.writes, 0);
validateMarkdownFile({name:'中文.MD', size:100});
assert.throws(() => validateMarkdownFile({name:'image.png', size:100}));
assert.throws(() => validateMarkdownFile({name:'huge.md', size:11 * 1024 * 1024}));


// Interrupted writes must not be treated as a cancelled file picker.
let aborted = false;
await assert.rejects(() => writeFileContent({createWritable:async () => ({
  write:async () => {throw Object.assign(Error('Interrupted'), {name:'AbortError'});},
  abort:async () => {aborted = true;}
})}, 'text'), {name:'WriteInterruptedError'});
assert.equal(aborted, true);
await assert.rejects(() => createFileStore(undefined, 'test').load('id'), /无法保存文件关联/);
console.log('Local Markdown file checks passed: save, conflict, copies, failed writes and concurrent edits.');

// Exercise the actual tool controller with an outstanding recovery prompt.
{
  const {readFile} = await import('node:fs/promises');
  const {runInNewContext} = await import('node:vm');
  const source = await readFile(new URL('./src/markdown-tool.js', import.meta.url), 'utf8');
  const controller = source.slice(source.indexOf('initializeStudioUI();'));
  const oldDraft = JSON.stringify({version:1,text:'old draft',base:'',name:'note.md',time:1});
  function setup(picker, handle = null, draft = oldDraft) {
    const app = {stored:draft, selected:0, buttons:new Map()};
    const node = () => ({append(){},replaceChildren(){},remove(){},classList:{add(){},remove(){}}});
    const window = {indexedDB:null,confirm:() => true,addEventListener(){}};
    app.window = window;
    if (picker) window.showOpenFilePicker = picker;
    runInNewContext(controller, {
      window, document:{getElementById:node,createElement:node,addEventListener(){}},
      LocalDocument, validateMarkdownFile, hasFilePermission, initializeStudioUI(){},
      createFileStore:() => ({save:async()=>{},load:async()=>handle}),
      button:(label,action) => {app.buttons.set(label,action);return {label,action};},
      WritingStudio:class {
        constructor(root,options) { this.recovery=node(); this.notice=()=>{}; this.destroy=()=>{}; app.editor=options; }
      },
      MarkdownToolbar:class {
        constructor(actions) {app.actions=actions;}
        update(status) {app.status=status;}
        mount() {}
        chooseFile() {app.selected++;}
      },
      localStorage:{getItem:() => app.stored,setItem:(key,value) => {app.stored=value;}},
      setTimeout:()=>1,clearTimeout(){},setInterval(){},crypto:{randomUUID:()=> 'test'},downloadText(){}
    });
    return app;
  }
  const imported = {name:'new.md',size:10,text:async()=> '# new file'};
  const cancelled = setup(async()=> {throw Object.assign(Error('cancel'),{name:'AbortError'});});
  await cancelled.actions.onOpen();
  assert.equal(cancelled.stored, oldDraft);
  assert.equal(cancelled.editor.value, '');
  const failed = setup();
  await failed.actions.onOpen({file:{...imported,text:async()=>{throw Error('read failed');}}});
  assert.equal(failed.stored, oldDraft);
  const fallback = setup();
  await fallback.actions.onOpen();
  assert.equal(fallback.selected, 1);
  assert.equal(fallback.stored, oldDraft);
  await fallback.actions.onOpen({file:imported});
  assert.equal(fallback.editor.value, '# new file');
  assert.equal(JSON.parse(fallback.stored).name, 'new.md');
  const native = setup(async()=> [{getFile:async()=>imported,requestPermission:async()=> 'denied'}]);
  await native.actions.onOpen();
  assert.equal(native.editor.value, '# new file');
  assert.equal(JSON.parse(native.stored).text, '# new file');
  assert.equal(native.status.busy, false);
  const dirty = setup();
  dirty.editor.onChange('new unsaved edits');
  dirty.window.confirm = () => false;
  await dirty.actions.onOpen({file:imported});
  assert.equal(dirty.status.dirty, true);
  assert.equal(dirty.stored, oldDraft);
  // Edits made while reading still require confirmation before replacement.
  const reading = setup();
  let finishRead;
  const opening = reading.actions.onOpen({file:{...imported,text:()=>new Promise(resolve=>{finishRead=resolve;})}});
  reading.editor.onChange('typed while loading');
  reading.window.confirm = () => false;
  finishRead('# new file');
  await opening;
  assert.equal(reading.status.dirty, true);
  assert.equal(reading.stored, oldDraft);
  for (const permission of ['granted','prompt']) {
    const recovery = setup(null, {queryPermission:async()=>permission,getFile:async()=>({name:'note.md',size:7,text:async()=> 'current'})}, JSON.stringify({version:1,text:'cached',base:'cached',name:'note.md',associationId:'test',time:1}));
    await recovery.buttons.get('恢复草稿')();
    assert.equal(recovery.editor.value,permission==='granted' ? 'current' : 'cached');
    assert.equal(recovery.status.status,permission==='granted' ? '关联本地文件' : '草稿');
  }
  const initial = setup();
  assert.equal(initial.status.unsaved,true);
  assert.equal(initial.status.saving,false);
  assert.equal(fallback.status.unsaved,false);
  fallback.editor.onChange('changed after opening');
  assert.equal(fallback.status.unsaved,true);
  initial.actions.onNew();
  await initial.actions.onSave();
  assert.equal(initial.status.unsaved,false);
  assert.equal(JSON.parse(initial.stored).saved,true);
  assert.equal(initial.status.saving,false);
  const copying = setup();
  copying.actions.onNew();
  await copying.actions.onSave(true);
  assert.equal(copying.status.unsaved,true);
  const creating = setup();
  creating.actions.onNew();
  assert.equal(JSON.parse(creating.stored).text, '');
}
// Restore like Mindmap: silent permission check, read current file, no cached writes.
{
  let prompts = 0, writes = 0, disk = 'disk current', permission = 'granted';
  const handle = {
    name:'note.md', queryPermission:async()=>permission,
    requestPermission:async()=>{prompts++;return 'granted';},
    getFile:async()=>({name:'note.md',size:disk.length,text:async()=>disk}),
    createWritable:async()=>{writes++;throw Error('Restore must not write');}
  };
  const clean = new LocalDocument({text:'old disk',handle});
  assert.equal(await clean.restoreAssociation(),true);
  assert.equal(clean.text,disk);assert.equal(clean.base,disk);assert.equal(clean.automatic,true);
  const changed = new LocalDocument({text:'unsaved draft',base:'old disk',handle});
  assert.equal(await changed.restoreAssociation(),false);
  assert.equal(changed.text,'unsaved draft');assert.equal(changed.automatic,false);
  disk='unsaved draft';
  assert.equal(await changed.restoreAssociation(),true);assert.equal(changed.dirty,false);
  for (permission of ['prompt','denied']) {
    const paused = new LocalDocument({text:'cached',handle});
    assert.equal(await paused.restoreAssociation(),false);
    assert.equal(paused.text,'cached');assert.equal(paused.automatic,false);
  }
  assert.equal(prompts,0);assert.equal(writes,0);
  assert.equal(await hasFilePermission(handle,{request:true}),true);assert.equal(prompts,1);
  permission='granted';
  assert.equal(await hasFilePermission(handle,{request:true}),true);assert.equal(prompts,1);
  assert.equal(await hasFilePermission(null),false);
  const missing = new LocalDocument({text:'keep',handle:{...handle,getFile:async()=>{throw Object.assign(Error('missing'),{name:'NotFoundError'});}}});
  await assert.rejects(()=>missing.restoreAssociation(),{name:'NotFoundError'});
  assert.equal(missing.text,'keep');assert.equal(missing.automatic,false);
}