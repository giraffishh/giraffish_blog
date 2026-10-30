import {writeFileContent, writeCheckedFile} from '../../tools/shared/local-files.mjs';

export function validateMarkdownFile(file) {
  if (!/\.(md|markdown|txt)$/i.test(file.name)) throw new Error('请选择 .md、.markdown 或 .txt 文件。');
  if (file.size > 10 * 1024 * 1024) throw new Error('文件超过 10 MB，请打开较小的 Markdown 文件。');
}

export class LocalDocument {
  constructor({text = '', name = '未命名.md', base = text, handle = null} = {}) {
    Object.assign(this, {text, name, base, handle, automatic:false, busy:false});
  }
  get dirty() { return this.text !== this.base; }
  async save(chosen = this.handle, copy = false) {
    if (this.busy) throw new Error('正在保存，请稍候。');
    if (!chosen) throw new Error('请先选择保存位置。');
    this.busy = true;
    const snapshot = this.text;
    let same = chosen === this.handle;
    try {
      if (!same && this.handle && chosen.isSameEntry) same = await chosen.isSameEntry(this.handle);
      if (same) await writeCheckedFile(chosen, this.base, snapshot);
      else await writeFileContent(chosen, snapshot);
      if (!copy || same) {
        Object.assign(this, {handle:chosen, name:chosen.name, base:snapshot, automatic:true});
      }
    } catch (error) {
      if (same) this.automatic = false;
      throw error;
    } finally {
      this.busy = false;
    }
  }
}
