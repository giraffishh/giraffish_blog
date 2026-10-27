(function(scope){
 'use strict';
 function rgbToHex(values){
  if(values.length!==3||values.some(v=>v==null||String(v).trim()===''||!Number.isInteger(Number(v))||Number(v)<0||Number(v)>255))throw Error('RGB 请输入 0–255 的整数');
  return '#'+values.map(v=>Number(v).toString(16).padStart(2,'0')).join('');
 }
 function create(document,palette){
  const $=id=>document.getElementById(id),dialog=$('branchColorDialog'),inputs=['colorR','colorG','colorB'].map($);
  let apply=null;
  function update(){
   try{
    const value=rgbToHex(inputs.map(input=>input.value));
    $('colorPreview').style.backgroundColor=value;$('colorHex').textContent=value.toUpperCase();$('colorError').textContent='';
    for(const button of $('colorSwatches').children)button.setAttribute('aria-pressed',String(button.dataset.color===value));
    return value;
   }catch(error){$('colorError').textContent=error.message;return null;}
  }
  function select(value){inputs.forEach((input,i)=>input.value=parseInt(value.slice(1+i*2,3+i*2),16));update();}
  for(const value of palette){
   const button=document.createElement('button');button.type='button';button.dataset.color=value;
   button.style.backgroundColor=value;button.title=value.toUpperCase();button.setAttribute('aria-label','选择颜色 '+value.toUpperCase());
   button.onclick=()=>select(value);$('colorSwatches').append(button);
  }
  for(const input of inputs)input.addEventListener('input',update);
  $('colorForm').addEventListener('submit',event=>{
   event.preventDefault();const value=update();if(!value)return;
   const commit=apply;apply=null;dialog.close();commit?.(value);
  });
  $('colorCancel').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{apply=null;});
  return {open(value,commit){if(dialog.open)return;select(value);apply=commit;dialog.showModal();inputs[0].focus({preventScroll:true});}};
 }
 if(typeof module==='object'&&module.exports)module.exports={create,rgbToHex};else scope.MindmapColor={create,rgbToHex};
})(typeof globalThis!=='undefined'?globalThis:this);
