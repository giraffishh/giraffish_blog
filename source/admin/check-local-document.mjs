import assert from 'node:assert/strict';
import {LocalDocument, validateMarkdownFile} from './src/local-document.js';
import {writeCheckedFile, writeFileContent, createFileStore} from '../tools/shared/local-files.mjs';

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
