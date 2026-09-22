(() => {
 'use strict';
 // 时间只在页面可见、动画开启且访客没有填写表单时推进。
 function createQueue({show,remove,paint,batchSize=()=>5+Math.floor(Math.random()*3)}) {
  let messages=[],pending=[],active=[],elapsed=0,nextAt=2.2,batch=[],batchIndex=0,batchStart=0;
  return {
   setMessages(items){
    const old=new Set(messages.map(m=>m.id));
    messages=items;
    const ids=new Set(items.map(m=>m.id));
    pending=pending.filter(m=>ids.has(m.id));
    for(const item of items.filter(m=>!old.has(m.id)).reverse())pending.unshift(item);
    active=active.filter(item=>{if(ids.has(item.message.id))return true;remove(item.node);return false;});
    batch=batch.filter((item,index)=>index<batchIndex||ids.has(item.id));
   },
   tick(dt){
    elapsed+=dt;
    active=active.filter(item=>{const age=elapsed-item.start;if(age>=10){remove(item.node);return false;}paint(item.node,age);return true;});
    if(!messages.length)return;
    if(elapsed>=nextAt&&!active.length&&batchIndex>=batch.length){
     if(!pending.length)pending=[...messages];
     batch=pending.splice(0,batchSize());batchIndex=0;batchStart=elapsed;
     nextAt=elapsed+15;
    }
    if(batchIndex<batch.length&&elapsed-batchStart>=batchIndex*.5){
     const message=batch[batchIndex],node=show(message,batchIndex++);
     // 没有阅读空间的祝福回到队列，真正出现后才开始计算十秒。
     if(node){paint(node,0);active.push({message,node,start:elapsed});}
     else pending.push(message);
    }
   }
  };
 }
 window.createMoonBubbleQueue=createQueue;
 const layer=document.getElementById('wishBubbles');
 if(!layer)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let hiddenByUser=false,celebration=null;
 const toggle=document.getElementById('toggleBubbles');
 try{hiddenByUser=localStorage.getItem('moon-hide-bubbles')==='true';}catch{}
 function toggleUI(){toggle.textContent=hiddenByUser?'显示气泡':'收起气泡';toggle.setAttribute('aria-pressed',String(hiddenByUser));layer.hidden=hiddenByUser;}
 toggle.addEventListener('click',()=>{hiddenByUser=!hiddenByUser;try{localStorage.setItem('moon-hide-bubbles',String(hiddenByUser));}catch{}toggleUI();});
 toggleUI();
 const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
 function scatter(node){
  const mobile=innerWidth<760,vw=document.documentElement.clientWidth,variation=Number(node.dataset.variation);
  node.style.width=Math.min(vw*(mobile?.44:.24),mobile?166:216)*(.94+variation*.06)+'px';
  const width=node.offsetWidth,height=node.offsetHeight;
  // 整段正文作为留白区，气泡不再挤进标题的字缝；互相避让时使用原始位置覆盖完整漂移幅度。
  const obstacles=[...document.querySelectorAll('.topbar,.intro,.letter,.moon,.heart-note,.scene-caption,.moon-label,.seal,.guestbook,.footer,.wish-celebration,button,input,textarea')]
   .map(n=>n.getBoundingClientRect()).filter(r=>r.width&&r.height&&r.bottom>0&&r.top<innerHeight);
  for(const other of layer.children)if(other!==node&&other.style.visibility!=='hidden'){
   const y=other.offsetTop+Number(other.dataset.scrollY)-scrollY;
   obstacles.push({left:other.offsetLeft-10,right:other.offsetLeft+other.offsetWidth+10,top:y-14,bottom:y+other.offsetHeight+14});
  }
  const scene=document.getElementById('scene').getBoundingClientRect();
  const inset=mobile?18:32;
  const top=Math.max(76,mobile?scene.top+8:76),bottom=Math.min(innerHeight-height-24,mobile?scene.bottom-height-8:innerHeight-height-24);
  const candidates=[];
  const preferRight=Number(node.dataset.slot)%2===1;
  const targetX=preferRight?vw-inset-width:inset;
  const targetY=scene.top+scene.height*(preferRight?.73:.04)+variation*12;
  const xs=mobile?[inset+variation*7,vw-inset-width-variation*7]:Array.from({length:9},(_,i)=>inset+(vw-width-inset*2)*i/8);
  for(let y=top;y<=bottom;y+=10){
   for(const x of xs)candidates.push({x,y});
  }
  // 补上留白边界，避免十像素采样恰好错过可以容纳长留言的位置。
  for(const y of [bottom,...obstacles.map(r=>r.bottom+12)]){
   if(y>=top&&y<=bottom)for(const x of xs)candidates.push({x,y});
  }
  const score=p=>Math.abs(p.y-targetY)+Math.abs(p.x-targetX)*.45;
  candidates.sort((a,b)=>score(a)-score(b));
  const spot=candidates.find(p=>!obstacles.some(r=>intersects({left:p.x-10,right:p.x+width+10,top:p.y-12,bottom:p.y+height+12},r)));
  node.style.visibility=spot?'visible':'hidden';
  if(spot){node.style.left=spot.x+'px';node.style.top=spot.y+'px';node.dataset.scrollY=String(scrollY);}
  return !!spot;
 }
 const ease=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
 const queue=createQueue({
  batchSize:()=> (innerWidth<760?5:6)+Math.floor(Math.random()*3),
  show(message,slot){
   if([...layer.children].filter(node=>node.style.visibility==='visible').length>=(innerWidth<760?3:5))return null;
   const bubble=document.createElement('div'),name=document.createElement('strong'),body=document.createElement('p');
   bubble.className='wish-bubble';bubble.dataset.slot=String(slot);bubble.dataset.variation=String(Math.random());bubble.dataset.drift=String(Math.random()*Math.PI*2);
   name.textContent=message.name;
   body.textContent=message.body;bubble.append(name,body);layer.append(bubble);
   if(!scatter(bubble)){bubble.remove();return null;}
   return bubble;
  },
  remove:node=>node.remove(),
  paint(node,age){
   node.style.opacity=String(Math.min(ease(age/1.4),ease((10-age)/1.6)));
   const y=Number(node.dataset.scrollY||scrollY)-scrollY+4-age*.8;
   node.style.transform=`translate3d(${Math.sin(age*.4+Number(node.dataset.drift))*2}px,${y}px,0)`;
  }
 });
 let layoutDirty=false,layoutAt=0;
 function invalidateLayout(){layoutDirty=true;layoutAt=performance.now();layer.style.opacity='0';}
 addEventListener('resize',invalidateLayout);
 // 滚动只改变合成层位移，不重新测量或打乱位置；尺寸变化淡出后再布局。
 function celebrate(message){
  celebration?.node.remove();
  const node=document.createElement('div'),title=document.createElement('strong'),body=document.createElement('p');
  node.className='wish-celebration';title.textContent='你的祝福，已乘灯启程';body.textContent=message.body;node.append(title,body);
  document.querySelector('.send-row').after(node);celebration={node,age:0};invalidateLayout();
  window.MoonAtmosphere?.releaseLantern();
 }
 window.MoonBubbles={setMessages:items=>queue.setMessages(items),celebrate};
 let last=0,frame=0;
 function tick(now){
  frame=0;
  const dt=last?Math.min((now-last)/1000,.05):0;last=now;
  const typing=!!document.activeElement?.closest('input,textarea,dialog')||!!document.querySelector('.wish-history[open]');
  const stopped=document.hidden||document.body.classList.contains('paused');
  if(celebration&&!document.hidden&&(!stopped||reduced.matches)){celebration.age+=dt;if(celebration.age>=10){celebration.node.remove();celebration=null;invalidateLayout();}}
  const blocked=stopped||reduced.matches||typing||hiddenByUser||document.body.classList.contains('welcoming');
  layer.hidden=blocked;
  if(layoutDirty&&!blocked&&now-layoutAt>=220){
   for(const node of layer.children)node.style.visibility='hidden';
   for(const node of layer.children)scatter(node);
   layoutDirty=false;layer.style.opacity='1';
  }
  if(!blocked)queue.tick(layoutDirty?0:dt);
  if(!document.hidden)frame=requestAnimationFrame(tick);
 }
 document.addEventListener('visibilitychange',()=>{
  cancelAnimationFrame(frame);frame=0;last=0;
  if(!document.hidden)frame=requestAnimationFrame(tick);
 });
 if(!document.hidden)frame=requestAnimationFrame(tick);
})();
