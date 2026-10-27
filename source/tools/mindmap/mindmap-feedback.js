(function(scope){
 'use strict';
 function create(document,actions){
  const $=id=>document.getElementById(id),notice=$('appNotice'),dialog=$('appConfirm');
  let fingerprint='',category='',pending=null;
  function show(options){
   const next=JSON.stringify(options);
   if(!notice.hidden&&next===fingerprint)return;
   fingerprint=next;category=options.category||'save';
   $('noticeTitle').textContent=options.title;
   $('noticeMessage').textContent=options.message;
   $('noticeActions').hidden=options.actions===false;
   $('noticeRetry').textContent=category==='copy'?'重试另存为':'重试保存';
   $('noticeCopy').hidden=category==='copy';
   notice.dataset.kind=options.kind||'error';notice.hidden=false;
  }
  function clear(onlyCategory){
   if(onlyCategory&&onlyCategory!==category)return;
   notice.hidden=true;fingerprint='';category='';
  }
  function settle(value){
   if(!pending)return;
   const resolve=pending;pending=null;
   if(dialog.open)dialog.close();
   resolve(value);
  }
  function confirm(options){
   if(pending)return Promise.resolve(false);
   $('confirmTitle').textContent=options.title;
   $('confirmMessage').textContent=options.message;
   $('confirmAccept').textContent=options.accept||'继续';
   return new Promise(resolve=>{pending=resolve;dialog.showModal();$('confirmCancel').focus({preventScroll:true});});
  }
  $('noticeClose').onclick=()=>clear();
  $('noticeRetry').onclick=()=>category==='copy'?actions.copy():actions.retry();
  $('noticeCopy').onclick=()=>actions.copy();
  // Keep a node edit focused until the action explicitly commits it.
  $('noticeActions').addEventListener('pointerdown',e=>e.preventDefault());
  $('confirmAccept').onclick=()=>settle(true);
  $('confirmCancel').onclick=()=>settle(false);
  dialog.addEventListener('cancel',e=>{e.preventDefault();settle(false);});
  dialog.addEventListener('close',()=>settle(false));
  return {show,clear,confirm,get confirmOpen(){return dialog.open;},
   setBusy(busy){$('noticeRetry').disabled=busy;$('noticeCopy').disabled=busy;}};
 }
 if(typeof module==='object'&&module.exports)module.exports={create};else scope.MindmapFeedback={create};
})(typeof globalThis!=='undefined'?globalThis:this);
