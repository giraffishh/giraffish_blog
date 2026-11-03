import {EditorSelection, Prec} from '@codemirror/state';
import {keymap} from '@codemirror/view';
import {isolateHistory} from '@codemirror/commands';
import {editingBlock} from './live-preview.js';
import {element, button} from './studio-ui.js';

export const markdownShortcuts = [
  ['Mod-b','加粗','bold'], ['Mod-i','斜体','italic'], ['Mod-u','下划线','underline'],
  ['Mod-Shift-x','删除线','strike'], ['Mod-e','行内代码','code'],
  ['Mod-k','链接','link'], ['Mod-Shift-i','图片','image'],
  ['Mod-Shift-k','代码块','fence'], ['Mod-Shift-m','公式块','math'],
  ...Array.from({length:6}, (_,i) => [`Mod-${i+1}`,`${i+1} 级标题`,`heading${i+1}`]),
  ['Mod-0','普通段落','heading0'], ['Mod-Shift-q','引用','quote'],
  ['Mod-Shift-7','有序列表','ordered'], ['Mod-Shift-8','无序列表','unordered']
];
const markers = {bold:'**',italic:'*',underline:'<u>',strike:'~~'};
function inlineChange(state, range, kind) {
  const text = state.sliceDoc(range.from, range.to);
  if (kind === 'link' || kind === 'image') {
    const label = text || (kind === 'link' ? '链接文字' : '图片描述');
    const prefix = kind === 'image' ? '![' : '[';
    const insert = `${prefix}${label}](https://)`;
    const from = range.from + (text ? prefix.length + label.length + 2 : prefix.length);
    return {changes:{from:range.from,to:range.to,insert},range:EditorSelection.range(from,from+(text ? 8 : label.length))};
  }
  if (kind === 'fence' || kind === 'math') {
    const longest = Math.max(0,...Array.from(text.matchAll(/`+/g), match=>match[0].length));
    const fence = kind === 'math' ? '$$' : '`'.repeat(Math.max(3,longest+1));
    const before = (range.from && state.sliceDoc(range.from-1,range.from) !== '\n' ? '\n' : '') + fence + '\n';
    const after = '\n' + fence + (range.to < state.doc.length && state.sliceDoc(range.to,range.to+1) !== '\n' ? '\n' : '');
    return {changes:{from:range.from,to:range.to,insert:before+text+after},range:EditorSelection.range(range.from+before.length,range.from+before.length+text.length)};
  }
  let open = markers[kind], close = kind === 'underline' ? '</u>' : open;
  if (kind === 'code') {
    open = close = '`'.repeat(Math.max(0,...Array.from(text.matchAll(/`+/g), match=>match[0].length))+1);
    // A selected code span can be toggled off just like other inline formats.
    const span = text.match(/^(`+)([\s\S]*?)\1$/);
    if (span) { open = close = span[1]; }
  }
  if (text.length >= open.length + close.length && text.startsWith(open) && text.endsWith(close)) {
    const insert = text.slice(open.length,-close.length);
    return {changes:{from:range.from,to:range.to,insert},range:EditorSelection.range(range.from,range.from+insert.length)};
  }
  if (range.from >= open.length && state.sliceDoc(range.from-open.length,range.from) === open && state.sliceDoc(range.to,range.to+close.length) === close) {
    return {changes:[{from:range.from-open.length,to:range.from},{from:range.to,to:range.to+close.length}],range:EditorSelection.range(range.from-open.length,range.to-open.length)};
  }
  if (kind === 'code') {
    const pad = /^`|`$/.test(text) || (/^ .+ $/s.test(text) && text.trim()) ? ' ' : '';
    const from = range.from + open.length + pad.length;
    return {changes:{from:range.from,to:range.to,insert:open+pad+text+pad+close},range:EditorSelection.range(from,from+text.length)};
  }
  // Whitespace outside emphasis markers keeps Markdown's delimiter rules valid.
  const leading = text.match(/^\s*/)[0].length;
  const trailing = text.length === leading ? 0 : text.match(/\s*$/)[0].length;
  const content = text.slice(leading,text.length-trailing);
  const insert = text.slice(0,leading)+open+content+close+(trailing ? text.slice(-trailing) : '');
  const from = range.from+leading+open.length;
  return {changes:{from:range.from,to:range.to,insert},range:EditorSelection.range(from,from+content.length)};
}
export function formatMarkdown(view, kind) {
  if (view.state.readOnly || view.composing) return false;
  const state = view.state;
  let spec;
  if (kind.startsWith('heading') || ['quote','ordered','unordered'].includes(kind)) {
    const lines = new Map();
    for (const range of state.selection.ranges) {
      const first = state.doc.lineAt(range.from).number;
      const last = state.doc.lineAt(range.to > range.from && state.doc.lineAt(range.to).from === range.to ? range.to-1 : range.to).number;
      for (let n=first;n<=last;n++) lines.set(n,state.doc.line(n));
    }
    const pattern = kind.startsWith('heading') ? /^#{1,6} / : kind === 'quote' ? /^> / : /^(?:[-+*]|\d+\.) /;
    const prefix = kind.startsWith('heading') ? '#'.repeat(Number(kind.slice(7))) : kind === 'quote' ? '>' : kind === 'ordered' ? '1.' : '-';
    const selected = [...lines.values()].sort((a,b)=>a.from-b.from);
    const remove = prefix && selected.every(line => kind === 'ordered' ? /^\d+\. /.test(line.text) : line.text.startsWith(prefix+' '));
    const changes = state.changes(selected.map((line,i) => ({from:line.from,to:line.from+(line.text.match(pattern)?.[0].length || 0),insert:remove || !prefix ? '' : (kind==='ordered' ? `${i+1}.` : prefix)+' '})));
    spec = {changes,selection:state.selection.map(changes)};
  } else spec = state.changeByRange(range => inlineChange(state,range,kind));
  view.dispatch(state.update({...spec,effects:editingBlock.of(true),annotations:isolateHistory.of('full'),scrollIntoView:true,userEvent:'input.format'}));
  return true;
}

let helpId = 0;
export class MarkdownShortcuts {
  constructor(studio, localFiles) {
    this.studio = studio;
    this.localFiles = localFiles;
    this.extension = Prec.high(keymap.of([
      ...markdownShortcuts.map(([key,,kind]) => ({key,run:view=>formatMarkdown(view,kind)})),
      {key:'F1',run:()=>{this.open();return true;}}
    ]));
  }
  open() {
    if (this.dialog?.open) return;
    const dialog = this.dialog = element('dialog','studio-dialog studio-shortcut-help');
    const header = element('div','studio-shortcut-head');
    const title = element('h2','','快捷键');
    title.id = `studio-shortcuts-${++helpId}`; title.tabIndex = -1;
    dialog.setAttribute('aria-labelledby',title.id);
    const platform = element('select'); platform.setAttribute('aria-label','快捷键系统');
    for (const [value,label] of [['win','Windows / Linux'],['mac','Mac']]) {
      const option = element('option','',label); option.value=value; platform.append(option);
    }
    platform.value = /Mac|iPhone|iPad/.test(navigator.platform) ? 'mac' : 'win';
    const close = button('×',()=>dialog.close()); close.setAttribute('aria-label','关闭快捷键说明');
    header.append(title,platform,close);
    const table = element('table');
    const rows = [...markdownShortcuts.map(([key,label])=>[key,label]),['Enter','预览：新段落 / 继续列表'],['Shift-Enter','预览：普通换行'],['Mod-f','查找 / 替换'],['Mod-z','撤销'],['Mod-Shift-z','重做'],['Mod-s','保存'],['F1','快捷键帮助']];
    if (this.localFiles) rows.push(['Mod-o','打开文件'],['Mod-Shift-s','另存为']);
    const keys = rows.map(([key,label])=>{
      const row=element('tr'), name=element('td','',label), cell=element('td'), keycap=element('kbd');
      cell.append(keycap); row.append(name,cell); table.append(row); return [key,keycap];
    });
    const update = () => {for (const [key,node] of keys) node.textContent = key.split('-').map(part=>part==='Mod' ? (platform.value==='mac' ? '⌘' : 'Ctrl') : part==='Shift' && platform.value==='mac' ? '⇧' : part.toUpperCase()).join(' + ');};
    platform.addEventListener('change',update); update();
    dialog.append(header,element('p','studio-shortcut-note','格式快捷键在正文编辑区使用；选中文字后操作，未选中时可插入标记继续输入。'),table);
    dialog.addEventListener('close',()=>{dialog.remove();this.dialog=null;},{once:true});
    this.studio.root.append(dialog); dialog.showModal(); title.focus();
  }
  destroy() { this.dialog?.remove(); this.dialog=null; }
}
