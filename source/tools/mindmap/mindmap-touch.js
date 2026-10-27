(function(scope){
 'use strict';
 function create(options){
  const points=new Map(),now=options.now||(()=>performance.now());
  let phase='idle',first=null,start=null,pinch=null,suppressUntil=0;
  function suppress(){suppressUntil=now()+800;}
  function pair(){const [a,b]=points.values();return {center:{x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2},distance:Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY))};}
  function beginPinch(){phase='pinch';pinch=pair();options.onPinchStart(pinch);}
  function down(e){
   if(e.pointerType!=='touch'||!options.accept(e))return;
   e.preventDefault();suppress();points.set(e.pointerId,e);
   if(points.size>=2){beginPinch();return;}
   first=e.pointerId;start=e;phase='pan';options.onPanStart(e);
  }
  function move(e){
   if(!points.has(e.pointerId))return;
   e.preventDefault();suppress();points.set(e.pointerId,e);
   if(phase==='pinch'){
    const current=pair();options.onPinchMove({...current,factor:current.distance/pinch.distance});
   }else if(phase==='pan'&&e.pointerId===first){
    options.onPanMove({x:e.clientX-start.clientX,y:e.clientY-start.clientY});
   }
  }
  function up(e){
   if(!points.has(e.pointerId))return;
   e.preventDefault();suppress();points.delete(e.pointerId);
   if(points.size>=2)beginPinch();else phase=points.size?'blocked':'idle';
  }
  function cancel(){points.clear();phase='idle';pinch=null;suppress();}
  return {down,move,up,cancel,get active(){return points.size>0;},
   suppressClick(e){return e.pointerType!=='mouse'&&now()<suppressUntil;}};
 }
 if(typeof module==='object'&&module.exports)module.exports={create};else scope.MindmapTouch={create};
})(typeof globalThis!=='undefined'?globalThis:this);
