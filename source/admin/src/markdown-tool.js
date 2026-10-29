import { WritingStudio } from './studio.js';
import { LocalDocument, fileStore, validateMarkdownFile } from './local-document.js';
import { installResponsiveViewport } from './responsive-layout.js';
import { downloadText } from './export-utils.js';
import { codeStyles } from './code-theme.js';
import './studio.css';
import './responsive.css';
import './toolbar.css';
import './markdown-tool.css';

const DRAFT_KEY = 'giraffish.tools.markdown.draft.v1';
const types = [{description:'Markdown 文档', accept:{'text/markdown':['.md', '.markdown', '.txt']}}];
const root = document.getElementById('markdown-editor');
const store = fileStore(window.indexedDB);
let current = new LocalDocument(), studio, operation = false, draftTimer, saveTimer;
let associationId = '', draftStored = true, storageWarning = '', pendingRecovery;
const style = document.createElement('style');
style.textContent = codeStyles;
document.head.append(style);
installResponsiveViewport();

function button(label, action, className = '') {
  const node = document.createElement('button');
  node.type = 'button';
  node.textContent = label;
  node.className = className;
  node.addEventListener('click', action);
  return node;
}
function updateStatus(message) {
  filename.textContent = current.name + (current.dirty ? ' •' : '');
  filename.title = current.name;
  document.title = `${current.dirty ? '• ' : ''}${current.name} · Markdown`;
  storageStatus.textContent = storageWarning || (current.automatic ? '自动保存到原文件' : current.handle ? '文件已关联 · 点击保存以恢复自动保存' : '草稿');
  saveButton.disabled = operation || current.busy;
  if (message) studio.notice(message);
}
function rememberDraft() {
  if (pendingRecovery) return;
  clearTimeout(draftTimer);
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({version:1, text:current.text, base:current.base, name:current.name, associationId, time:Date.now()}));
    draftStored = true;
    storageWarning = '';
  } catch {
    draftStored = false;
    storageWarning = '草稿备份失败，请及时保存文件';
  }
  updateStatus();
}
function scheduleSave() {
  clearTimeout(saveTimer);
  if (current.automatic && current.dirty) saveTimer = setTimeout(() => save(false, true), 800);
}
async function rememberAssociation() {
  if (!current.handle) { associationId = ''; return; }
  if (!associationId) associationId = crypto.randomUUID();
  try { await store.save(associationId, current.handle); }
  catch { studio.notice('文件已关联，但浏览器无法记住关联；刷新后请重新打开文件。'); }
}
function showError(error) {
  if (error?.name === 'AbortError') return;
  const message = error?.name === 'NotAllowedError' ? '未获得文件读写权限，当前内容已保留。请重试保存或另存为。'
    : error?.name === 'NotFoundError' ? '原文件已移动或删除，当前内容已保留。请另存为。'
    : error.message || '文件操作失败，当前内容已保留。';
  updateStatus(message);
}
function confirmReplace() {
  if (pendingRecovery) {
    studio.notice('请先恢复或忽略上次草稿。');
    return false;
  }
  return !current.dirty || window.confirm('当前内容尚未保存到文件，确定放弃这些修改吗？');
}
const compactFileActions = window.matchMedia('(max-width:760px)');
function placeFileActions() {
  if (compactFileActions.matches) {
    studio.actionsSlot.append(saveButton);
    studio.extraActionsSlot.append(newButton, openButton, copyButton);
  } else {
    studio.actionsSlot.append(newButton, openButton, saveButton, copyButton);
  }
}
compactFileActions.addEventListener('change', () => placeFileActions());
function mount() {
  studio?.destroy();
  root.replaceChildren();
  studio = new WritingStudio(root, {
    value:current.text, metadata:false, backup:false, cmsToolbar:false,
    documentTitle:() => current.name.replace(/\.(md|markdown|txt)$/i, ''),
    onChange:text => {
      current.text = text;
      draftStored = false;
      clearTimeout(draftTimer);
      draftTimer = setTimeout(rememberDraft, 300);
      updateStatus();
      scheduleSave();
    }
  });
  root.classList.add('studio-toolbar-integrated', 'markdown-tool');
  const back = document.createElement('a');
  back.href = '/tools/';
  back.className = 'markdown-back';
  back.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M19 12H5m6-6-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  back.title = '返回工具集';
  back.setAttribute('aria-label', '返回工具集');
  studio.exitSlot.append(back);
  studio.leadingActionsSlot.append(filename);
  placeFileActions();
  studio.footer.prepend(storageStatus);
  updateStatus();
}
const filename = document.createElement('span');
filename.className = 'markdown-filename';
const storageStatus = document.createElement('span');
storageStatus.className = 'markdown-storage';
storageStatus.setAttribute('role', 'status');
const saveButton = button('保存', () => save(), 'markdown-save');
saveButton.title = '保存（Ctrl / ⌘ + S）';
const openButton = button('打开', () => openFile());
const copyButton = button('另存为', () => save(true));
const newButton = button('新建', () => {
  if (operation || current.busy || !confirmReplace()) return;
  clearTimeout(saveTimer);
  current = new LocalDocument();
  associationId = '';
  mount();
  rememberDraft();
});
for (const action of [newButton, openButton, saveButton, copyButton]) action.classList.add('markdown-file-action');
const input = document.createElement('input');
input.type = 'file';
input.accept = '.md,.markdown,.txt';
input.hidden = true;
document.body.append(input);
input.addEventListener('change', () => {
  const file = input.files[0];
  input.value = '';
  if (file) openFile({file});
});

async function openFile(provided) {
  if (operation || current.busy || !confirmReplace()) return;
  if (!provided && !window.showOpenFilePicker) { input.click(); return; }
  operation = true;
  const replacingText = current.text;
  clearTimeout(saveTimer);
  updateStatus();
  try {
    let {file, handle} = provided || {};
    if (!provided) [handle] = await window.showOpenFilePicker({id:'markdown-open', multiple:false, types});
    if (handle) file = await handle.getFile();
    validateMarkdownFile(file);
    const text = await file.text();
    // Reading the chosen file may take time; recheck edits made while it loaded.
    if (current.text !== replacingText && current.dirty && !window.confirm('替换当前尚未保存的内容？')) return;
    let automatic = false;
    if (handle) {
      try { automatic = await handle.requestPermission({mode:'readwrite'}) === 'granted'; }
      catch { /* Read-only imports remain editable and can be saved explicitly. */ }
    }
    current = new LocalDocument({text, name:file.name, handle});
    current.automatic = automatic;
    associationId = '';
    mount();
    await rememberAssociation();
    rememberDraft();
    updateStatus('已打开 ' + file.name);
  } catch (error) { showError(error); }
  finally { operation = false; updateStatus(); scheduleSave(); }
}

async function save(copy = false, automatic = false) {
  if (operation || current.busy || pendingRecovery) return;
  if (automatic && (!current.automatic || !current.dirty)) return;
  operation = true;
  clearTimeout(saveTimer);
  updateStatus('正在保存…');
  try {
    let chosen = current.handle;
    if (copy || !chosen) {
      if (!window.showSaveFilePicker) {
        downloadText(current.text, 'text/markdown;charset=utf-8', current.name.replace(/\.(md|markdown|txt)$/i, '') + (copy ? ' - 副本' : '') + '.md');
        if (!copy) current.base = current.text;
        rememberDraft();
        updateStatus('已下载副本 · 当前浏览器不支持关联本地文件');
        return;
      }
      chosen = await window.showSaveFilePicker({id:'markdown-save', suggestedName:current.name.replace(/\.(md|markdown|txt)$/i, '') + (copy ? ' - 副本' : '') + '.md', types});
    } else if (!automatic && await chosen.requestPermission({mode:'readwrite'}) !== 'granted') {
      throw Object.assign(new Error('未获得写入权限'), {name:'NotAllowedError'});
    }
    await current.save(chosen, copy);
    await rememberAssociation();
    rememberDraft();
    updateStatus(copy ? '已另存为副本' : '已保存');
  } catch (error) {
    // Permission errors can happen before the checked write starts.
    if (!copy && error?.name !== 'AbortError') current.automatic = false;
    showError(error);
    rememberDraft();
  } finally {
    operation = false;
    updateStatus();
    scheduleSave();
  }
}

// Capture the handle promise during drop, before the browser releases its store.
window.addEventListener('dragover', event => {
  if (Array.from(event.dataTransfer.types).includes('Files')) {
    event.preventDefault();
    root.classList.add('markdown-dragging');
  }
});
window.addEventListener('dragleave', event => { if (!event.relatedTarget) root.classList.remove('markdown-dragging'); });
window.addEventListener('drop', async event => {
  root.classList.remove('markdown-dragging');
  if (!Array.from(event.dataTransfer.types).includes('Files')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const files = Array.from(event.dataTransfer.files);
  if (files.length !== 1) { studio.notice('请一次拖入一个 Markdown 文件。'); return; }
  const item = Array.from(event.dataTransfer.items).find(item => item.kind === 'file');
  let handle;
  try { handle = await item?.getAsFileSystemHandle?.(); } catch { /* Fall back to File. */ }
  await openFile({file:files[0], handle:handle?.kind === 'file' ? handle : null});
}, {capture:true});
window.addEventListener('keydown', event => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  if (event.key.toLowerCase() === 's') { event.preventDefault(); save(event.shiftKey); }
  if (event.key.toLowerCase() === 'o') { event.preventDefault(); openFile(); }
}, {capture:true});
window.addEventListener('pagehide', rememberDraft);
window.addEventListener('beforeunload', event => {
  rememberDraft();
  if (current.busy || (current.dirty && (current.handle || !draftStored))) { event.preventDefault(); event.returnValue = ''; }
});

// Follow external edits only while the local document is clean. A dirty editor
// keeps its text and suspends writes instead of racing another application.
let polling = false;
async function checkExternalFile() {
  if (polling || operation || current.busy || !current.handle || !current.automatic || document.hidden) return;
  polling = true;
  const documentAtStart = current, base = current.base;
  try {
    const file = await current.handle.getFile();
    validateMarkdownFile(file);
    const text = await file.text();
    if (current !== documentAtStart || operation || current.busy || current.base !== base || text === base) return;
    if (current.dirty) {
      current.automatic = false;
      clearTimeout(saveTimer);
      updateStatus('原文件已在其他地方修改，已暂停自动保存。请另存为副本，或重新打开原文件。');
    } else {
      current.text = current.base = text;
      studio.setValue(text);
      rememberDraft();
      updateStatus('已同步原文件的外部修改');
    }
  } catch (error) {
    if (current === documentAtStart && !operation && !current.busy && current.base === base) {
      current.automatic = false;
      clearTimeout(saveTimer);
      showError(error);
    }
  } finally { polling = false; }
}
setInterval(checkExternalFile, 3000);
window.addEventListener('focus', checkExternalFile);
document.addEventListener('visibilitychange', checkExternalFile);

mount();
document.getElementById('studio-loading').remove();
try {
  const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
  if (draft?.version === 1 && typeof draft.text === 'string' && typeof draft.base === 'string' && typeof draft.name === 'string') pendingRecovery = draft;
} catch { /* Invalid or unavailable drafts do not block editing. */ }
if (pendingRecovery) {
  const draft = pendingRecovery;
  const message = document.createElement('span');
  message.textContent = `上次文档：${draft.name} · ${new Date(draft.time).toLocaleString('zh-CN')}`;
  studio.recovery.hidden = false;
  studio.recovery.append(message, button('恢复草稿', async () => {
    if (operation || (current.dirty && !window.confirm('恢复草稿将替换当前内容，是否继续？'))) return;
    operation = true;
    try {
      const handle = draft.associationId ? await store.load(draft.associationId).catch(() => null) : null;
      current = new LocalDocument({...draft, handle});
      associationId = handle ? draft.associationId : '';
      pendingRecovery = null;
      mount();
      rememberDraft();
      updateStatus(handle ? '草稿已恢复，点击保存确认文件权限并恢复自动保存。' : '草稿已恢复');
    } finally { operation = false; updateStatus(); }
  }), button('忽略草稿', () => {
    pendingRecovery = null;
    studio.recovery.hidden = true;
    rememberDraft();
    scheduleSave();
  }));
}
