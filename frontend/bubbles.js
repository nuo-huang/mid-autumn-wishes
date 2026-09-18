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
     const message=batch[batchIndex],node=show(message,batchIndex++);paint(node,0);
     active.push({message,node,start:elapsed});
    }
   }
  };
 }
 window.createMoonBubbleQueue=createQueue;
 const layer=document.getElementById('wishBubbles');
 if(!layer)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let cells=[],hiddenByUser=false,celebration=null;
 const toggle=document.getElementById('toggleBubbles');
 try{hiddenByUser=localStorage.getItem('moon-hide-bubbles')==='true';}catch{}
 function toggleUI(){toggle.textContent=hiddenByUser?'显示气泡':'收起气泡';toggle.setAttribute('aria-pressed',String(hiddenByUser));layer.hidden=hiddenByUser;}
 toggle.addEventListener('click',()=>{hiddenByUser=!hiddenByUser;try{localStorage.setItem('moon-hide-bubbles',String(hiddenByUser));}catch{}toggleUI();});
 toggleUI();
 const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
 function scatter(node){
  const mobile=innerWidth<760,vw=document.documentElement.clientWidth,variation=Number(node.dataset.variation);
  node.style.width=Math.min(vw*.36,mobile?100:218)*(.88+variation*.12)+'px';
  const width=node.offsetWidth,height=node.offsetHeight;
  const obstacles=[...document.querySelectorAll('h1,.moon,.eyebrow,.subtitle,.message,.to,.signature,.heart-note,.scene-caption,.moon-label,.hint,.guestbook-head,.guestbook-note,.wish-celebration,button,input,textarea,summary,label')].flatMap(n=>{
   if(n.matches('h1,.subtitle,.message,.to,.signature,.guestbook-note,label')){
    const walker=document.createTreeWalker(n,NodeFilter.SHOW_TEXT),rects=[];
    while(walker.nextNode())if(walker.currentNode.textContent.trim()){const range=document.createRange();range.selectNodeContents(walker.currentNode);rects.push(...range.getClientRects());}
    return rects;
   }
   return [n.getBoundingClientRect()];
  }).filter(r=>r.width&&r.height&&r.bottom>0&&r.top<innerHeight);
  for(const other of layer.children)if(other!==node&&other.style.visibility!=='hidden')obstacles.push(other.getBoundingClientRect());
  const candidates=[];
  for(let y=76;y<innerHeight-height-22;y+=12){
   const left=6+variation*5,right=vw-width-6-variation*5;
   candidates.push({x:left,y},{x:right,y});
  }
  // 候选点只沿两侧移动，保留月亮与正文；空位不够时暂缓展示。
  candidates.sort((a,b)=>Math.abs(a.y-(76+Number(node.dataset.horizontal)*(innerHeight-150)))-Math.abs(b.y-(76+Number(node.dataset.horizontal)*(innerHeight-150))));
  if(Number(node.dataset.cell)%2)candidates.forEach((p,i)=>{if(i%2===0&&i+1<candidates.length)[candidates[i],candidates[i+1]]=[candidates[i+1],candidates[i]];});
  const spot=candidates.find(p=>!obstacles.some(r=>intersects({left:p.x-6,right:p.x+width+6,top:p.y-18,bottom:p.y+height+18},r)));
  node.style.visibility=spot?'visible':'hidden';
  if(spot){node.style.left=spot.x+'px';node.style.top=spot.y+'px';}
 }
 const queue=createQueue({
  batchSize:()=> (innerWidth<760?5:6)+Math.floor(Math.random()*3),
  show(message,slot){
   const bubble=document.createElement('div'),name=document.createElement('strong'),body=document.createElement('p');
   if(slot===0){cells=Array.from({length:10},(_,i)=>i);for(let i=9;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}}
   bubble.className='wish-bubble';bubble.dataset.cell=String(cells[slot]);bubble.dataset.variation=String(Math.random());bubble.dataset.horizontal=String(Math.random());bubble.dataset.drift=String(Math.random()*Math.PI*2);
   name.textContent=message.name+' · 寄来一份祝福';
   body.textContent=message.body;bubble.append(name,body);layer.append(bubble);scatter(bubble);return bubble;
  },
  remove:node=>node.remove(),
  paint(node,age){node.style.opacity=String(Math.max(0,Math.min(1,age/.9,(10-age)/1.2)));node.style.transform=`translate(${Math.sin(age*.55+Number(node.dataset.drift))*3}px,${8-age*1.6}px)`;}
 });
 let layoutDirty=false;
 addEventListener('resize',()=>{layoutDirty=true;});
 addEventListener('scroll',()=>{layoutDirty=true;},{passive:true});
 function celebrate(message){
  celebration?.node.remove();
  const node=document.createElement('div'),title=document.createElement('strong'),body=document.createElement('p');
  node.className='wish-celebration';title.textContent='你的祝福，已乘灯启程';body.textContent=message.body;node.append(title,body);
  document.querySelector('.send-row').after(node);celebration={node,age:0};layoutDirty=true;
  window.MoonAtmosphere?.releaseLantern();
 }
 window.MoonBubbles={setMessages:items=>queue.setMessages(items),celebrate};
 let last=performance.now();
 setInterval(()=>{
  const now=performance.now(),dt=Math.min((now-last)/1000,.5);last=now;
  const typing=!!document.activeElement?.closest('input,textarea,dialog')||!!document.querySelector('.wish-history[open]');
  const stopped=document.hidden||document.body.classList.contains('paused');
  if(celebration&&!document.hidden&&(!stopped||reduced.matches)){celebration.age+=dt;if(celebration.age>=10){celebration.node.remove();celebration=null;layoutDirty=true;}}
  const blocked=stopped||reduced.matches||typing||hiddenByUser;
  layer.hidden=blocked;
  if(layoutDirty&&!blocked){for(const node of layer.children)node.style.visibility='hidden';for(const node of layer.children)scatter(node);layoutDirty=false;}
  if(!blocked)queue.tick(dt);
 },100);
})();
