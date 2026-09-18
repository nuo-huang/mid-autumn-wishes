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
 let cells=[];
 function scatter(node){
  const mobile=innerWidth<760,columns=mobile?2:5,rows=10/columns;
  const cellWidth=document.documentElement.clientWidth/columns,cellHeight=(innerHeight-104)/rows;
  const cell=Number(node.dataset.cell),variation=Number(node.dataset.variation);
  node.style.width=Math.max(90,Math.min(cellWidth-22,mobile?182:240)*(.88+variation*.12))+'px';
  const width=node.offsetWidth,height=node.offsetHeight;
  // 每条仍有独立的安全区域，但在其中随机错位，避免气泡相互覆盖。
  const x=cell%columns*cellWidth+10+(cellWidth-width-20)*Number(node.dataset.horizontal);
  const y=80+Math.floor(cell/columns)*cellHeight+8+Math.max(0,cellHeight-height-20)*variation;
  node.style.left=x+'px';node.style.top=y+'px';
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
 window.MoonBubbles={setMessages:items=>queue.setMessages(items)};
 let last=performance.now();
 setInterval(()=>{
  const now=performance.now(),dt=Math.min((now-last)/1000,.5);last=now;
  const typing=!!document.activeElement?.closest('input,textarea,dialog')||!!document.querySelector('.wish-history[open]');
  const blocked=document.hidden||document.body.classList.contains('paused')||reduced.matches||typing;
  layer.hidden=blocked;
  if(layoutDirty&&!blocked){for(const node of layer.children)scatter(node);layoutDirty=false;}
  if(!blocked)queue.tick(dt);
 },100);
})();
