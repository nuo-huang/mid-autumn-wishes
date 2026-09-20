(() => {
 'use strict';
 const dialog=document.getElementById('rabbitWelcome');
 if(!dialog||typeof dialog.showModal!=='function')return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const replay=document.getElementById('replayWelcome'),skip=document.getElementById('skipWelcome');
 let timer=0,age=0,last=0,returnFocus=null;
 function finish(){
  clearInterval(timer);timer=0;
  if(dialog.open)dialog.close();
  document.body.classList.remove('welcoming');
  dialog.classList.remove('welcome-leaving','welcome-held');
  try{sessionStorage.setItem('moon-rabbit-seen','true');}catch{}
  if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
 }
 function open(){
  if(dialog.open)return;
  returnFocus=document.activeElement===replay?replay:document.getElementById('start');
  age=0;last=performance.now();
  dialog.classList.toggle('welcome-still',reduced.matches);
  dialog.classList.remove('welcome-leaving');
  dialog.showModal();document.body.classList.add('welcoming');
  dialog.classList.toggle('welcome-held',document.hidden);
  timer=setInterval(()=>{
   const now=performance.now(),dt=Math.min((now-last)/1000,.3);last=now;
   if(document.hidden)return;
   age+=dt;
   const duration=reduced.matches?3:5.4;
   if(age>=duration)finish();
   else if(!reduced.matches&&age>=duration-.55)dialog.classList.add('welcome-leaving');
  },100);
 }
 skip.addEventListener('click',finish);
 dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});
 replay.addEventListener('click',open);
 document.addEventListener('visibilitychange',()=>{last=performance.now();dialog.classList.toggle('welcome-held',document.hidden);});
 reduced.addEventListener('change',e=>{dialog.classList.toggle('welcome-still',e.matches);});
 let seen=false;try{seen=sessionStorage.getItem('moon-rabbit-seen')==='true';}catch{}
 if(!seen)open();
})();
