(function(scope){
 'use strict';
 function create(document,window,options){
  const $=id=>document.getElementById(id),overlay=$('fileDropOverlay');
  let depth=0,lastMessage='';
  const fileItems=transfer=>Array.from(transfer?.items||[]).filter(item=>item.kind==='file');
  const hasFiles=transfer=>Array.from(transfer?.types||[]).includes('Files')||fileItems(transfer).length>0;
  function hide(){depth=0;overlay.hidden=true;lastMessage='';}
  function show(transfer){
   const blocked=options.blockedReason()||(fileItems(transfer).length>1?'每次只打开一个文件':'');
   const message=blocked||'导入思维导图';
   if(message!==lastMessage){$('fileDropTitle').textContent=message;overlay.dataset.blocked=String(!!blocked);lastMessage=message;}
   overlay.hidden=false;transfer.dropEffect=blocked?'none':'copy';
  }
  document.addEventListener('dragenter',event=>{
   if(!hasFiles(event.dataTransfer))return;event.preventDefault();depth++;show(event.dataTransfer);
  },true);
  document.addEventListener('dragover',event=>{
   if(!hasFiles(event.dataTransfer))return;event.preventDefault();show(event.dataTransfer);
  },true);
  document.addEventListener('dragleave',()=>{if(depth>0&&--depth===0)hide();},true);
  document.addEventListener('drop',event=>{
   if(!hasFiles(event.dataTransfer))return;
   event.preventDefault();event.stopPropagation();hide();
   const blocked=options.blockedReason();if(blocked){options.error(blocked);return;}
   const items=fileItems(event.dataTransfer),files=Array.from(event.dataTransfer.files||[]);
   if(Math.max(items.length,files.length)!==1){options.error('每次请拖入一个 Markdown 文件');return;}
   const item=items[0];let file;
   try{file=item?.getAsFile()||files[0];}catch{options.error('无法读取这个文件，请重新拖入或点击打开');return;}
   if(!file){options.error('请拖入文件，暂不支持文件夹');return;}
   // File handles must be captured synchronously while the drop event still owns the data.
   let handle=Promise.resolve(null);
   try{if(item?.getAsFileSystemHandle)handle=Promise.resolve(item.getAsFileSystemHandle()).then(value=>value?.kind==='file'?value:null).catch(()=>null);}catch{}
   Promise.resolve(options.open(file,handle)).catch(error=>options.error(error.message||'文件打开失败，请重试'));
  },true);
  document.addEventListener('dragend',hide,true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();},true);
  window.addEventListener('blur',hide);window.addEventListener('pagehide',hide);
  return {hide};
 }
 if(typeof module==='object'&&module.exports)module.exports={create};else scope.MindmapFileDrop={create};
})(typeof globalThis!=='undefined'?globalThis:this);
