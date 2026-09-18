
(() => {
 'use strict';
 // 保存初始文档；导出的贺卡不会带入动画中间状态。
 const template = document.documentElement.dataset.standalone === 'true' ? '<!DOCTYPE html>\n' + document.documentElement.outerHTML : null;
 const $ = id => document.getElementById(id);
 const defaults = {to:'亲爱的你',message:'愿你所念皆团圆，所行皆坦途。\n愿日子如月光，温柔又明亮。',from:'惦念你的人'};
 let card = {...defaults};
 try { const data=JSON.parse($('card-data').textContent); for(const key of Object.keys(defaults)) if(typeof data[key]==='string') card[key]=data[key].slice(0,key==='message'?160:24); } catch (_) {}
 function renderCard(){ $('to').textContent='致 · '+card.to; $('message').textContent=card.message; $('signature').textContent='—— '+card.from; }
 renderCard();
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 let paused=reduced.matches, phase='idle', elapsed=0, phaseElapsed=0, number=3, last=0, raf=0;
 const rain=$('rain'), rc=rain.getContext('2d'), canvas=$('particles'), ctx=canvas.getContext('2d');
 const air=$('atmosphere'),ac=air.getContext('2d');
 let vw=0,vh=0,w=0,h=0,dpr=1,stars=[],drops=[],points=[],sparks=[];
 const chars=Array.from('中秋快乐月圆人安万事胜意幸福团圆');
 const random=(a,b)=>a+Math.random()*(b-a);
 // 预绘灯笼和可平铺雾带，逐帧仅移动贴图；所有循环共用 elapsed，暂停后续播不跳帧。
 function lanternSprite(){
  const sprite=document.createElement('canvas');sprite.width=160;sprite.height=208;
  const c=sprite.getContext('2d');
  const glow=c.createRadialGradient(80,128,5,80,118,79);
  glow.addColorStop(0,'rgba(255,191,74,.35)');glow.addColorStop(.45,'rgba(250,142,49,.12)');glow.addColorStop(1,'rgba(250,142,49,0)');
  c.fillStyle=glow;c.fillRect(0,0,160,208);
  c.beginPath();c.moveTo(44,44);c.bezierCurveTo(54,30,106,30,116,44);c.bezierCurveTo(123,72,111,119,102,148);c.quadraticCurveTo(80,158,58,148);c.bezierCurveTo(49,120,37,72,44,44);c.closePath();
  const paper=c.createLinearGradient(0,35,0,153);paper.addColorStop(0,'#ce6d36');paper.addColorStop(.3,'#e89b4d');paper.addColorStop(.75,'#f7c06c');paper.addColorStop(1,'#ffe7a3');
  c.fillStyle=paper;c.fill();c.strokeStyle='rgba(255,224,158,.7)';c.lineWidth=1.1;c.stroke();
  c.save();c.clip();const light=c.createRadialGradient(80,133,0,80,133,67);light.addColorStop(0,'rgba(255,247,183,.85)');light.addColorStop(1,'rgba(255,231,143,0)');c.fillStyle=light;c.fillRect(38,34,85,125);
  c.strokeStyle='rgba(133,68,30,.26)';c.lineWidth=1.2;
  for(const x of [57,80,103]){c.beginPath();c.moveTo(x,37);c.quadraticCurveTo(x+(x-80)*.23,90,80+(x-80)*.64,153);c.stroke();}
  c.restore();
  c.beginPath();c.ellipse(80,149,22,5,0,0,Math.PI*2);c.fillStyle='#9d522b';c.fill();c.strokeStyle='#f4cc87';c.stroke();
  c.beginPath();c.moveTo(61,150);c.lineTo(99,150);c.moveTo(80,146);c.lineTo(80,158);c.strokeStyle='#e6ac61';c.stroke();
  c.beginPath();c.moveTo(80,155);c.bezierCurveTo(66,147,78,140,79,132);c.bezierCurveTo(83,139,94,149,80,155);c.fillStyle='#fff4be';c.fill();
  c.fillStyle='rgba(131,63,28,.66)';c.font='18px serif';c.textAlign='center';c.fillText('愿',80,99);
  return sprite;
 }
 function mistSprite(){
  const sprite=document.createElement('canvas');sprite.width=640;sprite.height=160;const c=sprite.getContext('2d');
  // 每个云团在左右各补一份，首尾像素连续，平铺移动时没有接缝。
  for(let i=0;i<19;i++){
   const x=i*640/19,y=74+Math.sin(i*2.3)*22,rx=65+Math.sin(i*1.7)*25,ry=22+Math.cos(i*1.2)*9;
   for(const shift of [-640,0,640]){
    c.save();c.translate(x+shift,y);c.scale(rx,ry);const g=c.createRadialGradient(0,0,0,0,0,1);
    g.addColorStop(0,'rgba(188,210,212,.28)');g.addColorStop(.4,'rgba(151,188,195,.15)');g.addColorStop(1,'rgba(117,161,174,0)');c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();
   }
  }
  return sprite;
 }
 const lanternArt=ctx?lanternSprite():null,mistArt=ctx?mistSprite():null;
 const lanterns=[
  {x:.12,offset:.22,duration:43,size:.17,alpha:.88},
  {x:.85,offset:.52,duration:51,size:.12,alpha:.7},
  {x:.24,offset:.73,duration:59,size:.09,alpha:.55},
  {x:.73,offset:.08,duration:39,size:.19,alpha:.92},
  {x:.09,offset:.88,duration:54,size:.10,alpha:.58},
  {x:.92,offset:.31,duration:46,size:.14,alpha:.8},
  {x:.64,offset:.83,duration:64,size:.075,alpha:.5},
  {x:.34,offset:.02,duration:48,size:.11,alpha:.68},
  {x:.45,offset:.38,duration:57,size:.09,alpha:.52},
  {x:.58,offset:.65,duration:61,size:.11,alpha:.58},
  {x:.03,offset:.57,duration:53,size:.12,alpha:.65},
  {x:.97,offset:.12,duration:47,size:.15,alpha:.72}
 ];
 function cloudBand(y,speed,offset,opacity,scale){
  const w=vw,h=vh;
  const tileWidth=w*1.45,tileHeight=h*scale;
  const shift=((elapsed*speed+offset)%tileWidth+tileWidth)%tileWidth;
  ac.save();ac.globalAlpha=opacity;
  for(let x=shift-tileWidth;x<w;x+=tileWidth)ac.drawImage(mistArt,x,y-tileHeight*.5,tileWidth,tileHeight);
  ac.restore();
 }
 function atmosphere(){
  // 氛围层独立覆盖整个视口，月亮和爱心仍使用贺卡内的局部坐标。
  const w=vw,h=vh;
  if(!ac)return;ac.clearRect(0,0,w,h);
  cloudBand(h*(.2+Math.sin(elapsed*.055)*.014),4,w*.18,.48,.38);
  for(const [i,lamp] of lanterns.entries()){
   const progress=(elapsed/(lamp.duration*1.65)+lamp.offset)%1;
   const fade=Math.min(1,progress/.12,(1-progress)/.15);
   const size=Math.min(w,h*1.1,700)*lamp.size*(1-progress*.24);
   const x=w*lamp.x+Math.sin(elapsed*.23+i*1.9)*w*.024;
   const y=h*(1.08-progress*1.2);
   ac.save();ac.globalAlpha=lamp.alpha*fade;ac.translate(x,y);ac.rotate(Math.sin(elapsed*.32+i)*.065);
   ac.drawImage(lanternArt,-size*.5,-size*.65,size,size*1.3);ac.restore();
  }
  cloudBand(h*(.54+Math.sin(elapsed*.043+2)*.018),-6,w*.7,.58,.44);
  cloudBand(h*(.86+Math.sin(elapsed*.038+4)*.012),7,w*.31,.72,.4);
 }
 function fitCanvas(c,width,height){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);c.getContext('2d').setTransform(dpr,0,0,dpr,0,0);}
 function resize(){
  dpr=Math.min(devicePixelRatio||1,2);vw=innerWidth;vh=innerHeight;fitCanvas(rain,vw,vh);
  const box=canvas.getBoundingClientRect();w=box.width;h=box.height;fitCanvas(canvas,w,h);
  if(ac)fitCanvas(air,vw,vh);
  stars=Array.from({length:Math.min(100,Math.floor(vw*vh/7000))},()=>({x:random(0,vw),y:random(0,vh),r:random(.5,1.3),o:random(.1,.7),p:random(0,7)}));
  drops=Array.from({length:Math.ceil(vw/30)},(_,i)=>({x:i*30+random(-5,5),y:random(-vh,vh),speed:random(14,34),len:Math.floor(random(4,12)),seed:Math.floor(random(0,chars.length))}));
  if(phase==='countdown') setTargets(String(number),true); else if(phase==='heart') setTargets('heart',true); else setTargets('moon',true);
  draw(0);
 }
 function targets(kind){
  const arr=[];const cx=w*.5,cy=h*.45;
  if(kind==='heart'){
   const scale=Math.min(w*.022,h*.027);
   for(let i=0;i<600;i++){const t=i/600*Math.PI*2;const spread=random(.94,1.055);arr.push({x:cx+16*Math.pow(Math.sin(t),3)*scale*spread,y:cy-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))*scale*spread});}
  }else if(kind==='moon'){
   for(let i=0;i<180;i++){const a=random(0,Math.PI*2),r=w*random(.29,.37);arr.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*.88});}
  }else{
   const off=document.createElement('canvas');off.width=Math.ceil(w);off.height=Math.ceil(h);const c=off.getContext('2d');c.fillStyle='#fff';c.font='600 '+Math.floor(h*.52)+'px Georgia,serif';c.textAlign='center';c.textBaseline='middle';c.fillText(kind,cx,cy);
   const data=c.getImageData(0,0,off.width,off.height).data;const step=Math.max(3,Math.round(w/105));
   for(let y=0;y<off.height;y+=step)for(let x=0;x<off.width;x+=step)if(data[(y*off.width+x)*4+3]>120)arr.push({x,y});
  }
  return arr;
 }
 function setTargets(kind,instant=false){
  const arr=targets(kind);points=arr.map((p,i)=>{const old=points[i%Math.max(points.length,1)];return {tx:p.x,ty:p.y,x:instant?p.x:(old?old.x:random(0,w)),y:instant?p.y:(old?old.y:random(0,h)),r:random(.65,1.6),seed:random(0,Math.PI*2)};});
 }
 function background(dt){
  rc.clearRect(0,0,vw,vh);
  for(const s of stars){rc.globalAlpha=s.o*(.7+.3*Math.sin(elapsed*.7+s.p));rc.fillStyle='#f6deac';rc.beginPath();rc.arc(s.x,s.y,s.r,0,Math.PI*2);rc.fill();}
  rc.font='10px serif';rc.textAlign='center';
  for(const d of drops){if(dt)d.y+=d.speed*dt*(phase==='countdown'?1.8:1);if(d.y-d.len*15>vh)d.y=-30;
   for(let i=0;i<d.len;i++){const y=d.y-i*15;if(y<0||y>vh)continue;const edge=Math.abs(d.x-vw/2)/(vw/2);rc.globalAlpha=(1-i/d.len)*(phase==='countdown'?.34:.11)*(.25+.75*edge);rc.fillStyle=i===0?'#ffebbf':'#d9ba7b';rc.fillText(chars[(d.seed+i)%chars.length],d.x,y);}
  }rc.globalAlpha=1;
 }
 function draw(dt){
  if(!rc||!ctx)return;background(dt);ctx.clearRect(0,0,w,h);atmosphere();ctx.fillStyle='#f6d899';
  const easing=1-Math.exp(-dt*6);const beat=phase==='heart'?1+Math.sin(elapsed*1.8)*.012:1;
  for(const p of points){p.x+=(p.tx-p.x)*easing;p.y+=(p.ty-p.y)*easing;ctx.globalAlpha=phase==='idle'?.25+.32*Math.sin(elapsed+p.seed)**2:.68+.3*Math.sin(elapsed*1.5+p.seed)**2;const x=w/2+(p.x-w/2)*beat,y=h*.45+(p.y-h*.45)*beat;ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
  for(let i=sparks.length-1;i>=0;i--){const p=sparks[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=15*dt;if(p.life<=0){sparks.splice(i,1);continue;}ctx.globalAlpha=Math.min(1,p.life);ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 }
 function complete(instant=false){phase='heart';$('scene').classList.add('active','complete');setTargets('heart',instant);$('start').disabled=false;$('startText').textContent='再看一次月光';$('caption').textContent='愿你与所爱，岁岁共团圆';$('status').textContent='中秋快乐，愿灯火与月光捎去我的惦念';$('scene').setAttribute('aria-label','孔明灯与云雾之间，金色粒子组成爱心，中间写着中秋快乐');if(!instant)burst(w*.5,h*.45);draw(0);}
 function tick(now){raf=0;if(paused||document.hidden)return;const dt=last?Math.min((now-last)/1000,.05):0;last=now;elapsed+=dt;
  if(phase==='countdown'){phaseElapsed+=dt;if(phaseElapsed>=1.25){phaseElapsed-=1.25;number--;if(number===0)complete();else{setTargets(String(number));$('status').textContent='月光正在聚拢 · '+number;}}}
  draw(dt);raf=requestAnimationFrame(tick);
 }
 function schedule(){if(!raf&&!paused&&!document.hidden){last=0;raf=requestAnimationFrame(tick);}}
 function motionUI(){document.body.classList.toggle('paused',paused||document.hidden);$('motion').setAttribute('aria-pressed',String(paused));$('motion').setAttribute('aria-label',paused?'开启动态效果':'暂停动态效果');}
 function setPaused(value){paused=value;motionUI();if(paused){cancelAnimationFrame(raf);raf=0;draw(0);}else schedule();}
 $('motion').addEventListener('click',()=>setPaused(!paused));
 $('start').addEventListener('click',()=>{
  if(!ctx||!rc){$('status').textContent='中秋快乐，愿你与所爱岁岁团圆';return;}
  $('scene').classList.remove('complete');$('scene').classList.add('active');
  if(reduced.matches||paused){complete(true);return;}
  phase='countdown';number=3;phaseElapsed=0;sparks=[];setTargets('3');$('start').disabled=true;$('startText').textContent='月光正在抵达';$('status').textContent='月光正在聚拢 · 3';$('scene').setAttribute('aria-label','金色粒子正在倒计时');schedule();
 });
 function burst(x,y){if(paused)return;for(let i=0;i<65;i++){const a=random(0,Math.PI*2),v=random(25,95);sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:random(.7,1.8),r:random(.8,2)});}sparks=sparks.slice(-160);}
 $('scene').addEventListener('pointerdown',e=>{const rect=canvas.getBoundingClientRect();burst(e.clientX-rect.left,e.clientY-rect.top);});
 document.addEventListener('visibilitychange',()=>{motionUI();if(document.hidden){cancelAnimationFrame(raf);raf=0;}else schedule();});
 if(reduced.addEventListener)reduced.addEventListener('change',e=>{setPaused(e.matches);if(e.matches&&phase==='countdown')complete(true);});
 let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,120);});
 let toastTimer;function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4200);}
 let wasPaused=false;
 $('edit').addEventListener('click',()=>{$('recipient').value=card.to;$('greeting').value=card.message;$('sender').value=card.from;wasPaused=paused;setPaused(true);$('editor').showModal();});
 function closeEditor(){$('editor').close();}
 $('close').addEventListener('click',closeEditor);
 $('editor').addEventListener('close',()=>setPaused(wasPaused));
 $('editor').addEventListener('click',e=>{if(e.target===$('editor')){const b=$('editor').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)closeEditor();}});
 $('editForm').addEventListener('submit',e=>{e.preventDefault();card={to:$('recipient').value.trim()||defaults.to,message:$('greeting').value.trim()||defaults.message,from:$('sender').value.trim()||defaults.from};renderCard();closeEditor();toast('写好了，月光里有你的心意。');});
 $('download').addEventListener('click',async()=>{
  const button=$('download');button.disabled=true;
  try {
  let source=template;
  if(!source){const response=await fetch(new URL('offline-card.html',location.href),{cache:'no-store'});if(!response.ok)throw new Error();source=await response.text();}
  const json=JSON.stringify(card).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  const html=source.replace(/(<script id="card-data" type="application\/json">)[\s\S]*?(<\/script>)/,(_all,open,close)=>open+json+close);
  const blob=new Blob([html],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='中秋快乐-孔明灯月夜.html';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('已生成网页文件，请在浏览器下载中查看。');
  }catch{toast('暂时无法保存，请检查网络后重试。');}finally{button.disabled=false;}
 });
 if(ctx&&rc){resize();motionUI();schedule();}else{$('motion').hidden=true;$('status').textContent='月色与你，皆是温柔。';}
})();
