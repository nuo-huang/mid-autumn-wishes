(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 // 通过统一连接层读写；离线贺卡不连接数据库。
 const online=/^https?:$/.test(location.protocol);let activeLoad=null,sending=false,lastMessages='',loadedOnce=false,currentMessages=[];
 function guestStatus(text){$('guestbookStatus').textContent=text;}
 function renderMessages(messages){
  const key=JSON.stringify(messages);if(key===lastMessages)return;lastMessages=key;currentMessages=messages;
  const list=$('guestbookList');list.replaceChildren();
  if(!messages.length){const item=document.createElement('li');item.className='empty';item.textContent='还没有留言，来留下第一份祝福吧。';list.appendChild(item);return;}
  for(const message of messages){const item=document.createElement('li'),name=document.createElement('strong'),time=document.createElement('time'),body=document.createElement('p');name.textContent=message.name;time.dateTime=message.createdAt;time.textContent=new Date(message.createdAt).toLocaleString('zh-CN',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});body.textContent=message.body;item.append(name,time,body);list.appendChild(item);}
 }
 function loadMessages(quiet=false,afterSubmit=false){
  if(!online||(sending&&!afterSubmit))return Promise.resolve(false);
  if(activeLoad)return activeLoad;
  $('refreshMessages').disabled=true;
  if(!quiet)guestStatus('正在读取大家的祝福…');
  activeLoad=(async()=>{
   try{const response=await window.MoonMessages.request({signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error();const data=await response.json();if(!Array.isArray(data.messages))throw new Error();renderMessages(data.messages);loadedOnce=true;if(!quiet&&!sending)guestStatus('已同步，换台设备也能看到这里的留言。');return true;}
   catch{if(!sending)guestStatus(loadedOnce?'暂时无法同步，下面保留上次读取的留言。':'暂时连接不到留言板。请通过站点主人提供的在线地址访问，或稍后重试。');return false;}
   finally{activeLoad=null;$('refreshMessages').disabled=sending;}
  })();
  return activeLoad;
 }
 $('refreshMessages').addEventListener('click',()=>loadMessages());
 $('guestbookForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!online||sending)return;
  const name=$('guestName').value.trim(),body=$('guestMessage').value.trim();if(!name||!body){guestStatus('请填写昵称和祝福。');return;}
  sending=true;$('refreshMessages').disabled=true;$('sendMessage').disabled=true;$('guestName').disabled=true;$('guestMessage').disabled=true;guestStatus('正在保存你的祝福…');
  try{
   // 等待读取结束，避免旧列表晚到而覆盖刚提交的留言。
   if(activeLoad)await activeLoad;
   const response=await window.MoonMessages.request({method:'POST',body:{name,body},signal:AbortSignal.timeout(10000)});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'留言未保存，请稍后重试');
   if(!data.message||!Number.isInteger(data.message.id))throw new Error('服务响应异常，请先刷新留言确认是否已保存');
   $('guestMessage').value='';renderMessages([data.message,...currentMessages.filter(m=>m.id!==data.message.id)].slice(0,50));loadedOnce=true;
   const synced=await loadMessages(true,true);guestStatus(synced?'祝福已保存，大家都能在这里看到。':'祝福已保存；其他留言暂时同步失败，可稍后刷新。');
  }catch(error){guestStatus(error.name==='TimeoutError'||error instanceof TypeError?'网络中断，请先刷新留言确认是否已保存，再决定是否重试。':error.message||'未能提交，请稍后再试。');}
  finally{sending=false;$('refreshMessages').disabled=false;$('sendMessage').disabled=false;$('guestName').disabled=false;$('guestMessage').disabled=false;}
 });
 if(online){loadMessages();setInterval(()=>{if(!document.hidden)loadMessages(true);},30000);}
 else{for(const id of ['guestName','guestMessage','sendMessage','refreshMessages'])$(id).disabled=true;guestStatus('这是离线贺卡。要查看或留下公共留言，请打开站点主人分享的在线网址。');}
})();
