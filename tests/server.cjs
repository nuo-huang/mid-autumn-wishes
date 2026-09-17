const {spawn}=require('node:child_process');
const {once}=require('node:events');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'moon-tests-'));
const db=path.join(temp,'messages.sqlite');let child,base;
function start(){return new Promise((resolve,reject)=>{
 child=spawn(process.execPath,[path.join(root,'server.cjs')],{env:{...process.env,PORT:'0',HOST:'127.0.0.1',DB_PATH:db},stdio:['ignore','pipe','pipe']});
 let output='';const timeout=setTimeout(()=>reject(Error('Server start timeout')),10000);
 child.once('error',e=>{clearTimeout(timeout);reject(e);});
 child.once('exit',code=>{clearTimeout(timeout);reject(Error('Server exited '+code));});
 child.stdout.on('data',b=>{output+=b;const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){base=match[0];clearTimeout(timeout);resolve();}});
 child.stderr.on('data',b=>process.stderr.write(b));
});}
async function stop(){if(child&&child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}}
async function post(value,headers={}){return fetch(base+'/api/messages',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(value)});}
(async()=>{
 try{
  await start();
  assert.equal((await fetch(base+'/data/messages.sqlite')).status,404);
  assert.equal((await fetch(base+'/supabase/config.toml')).status,404);
  for(const file of ['','styles.css','config.js','message-api.js','animations.js','guestbook.js','offline-card.html'])assert.equal((await fetch(base+'/'+file)).status,200);
  let r=await post({name:'月下测试',body:'重启后依然团圆'});assert.equal(r.status,201);const saved=(await r.json()).message;
  const injection={name:"小月'); DROP TABLE messages;--".slice(0,24),body:'<img src=x onerror=alert(1)> 中秋快乐'};
  assert.equal((await post(injection)).status,201);
  assert.equal((await post({name:'a',body:'x'.repeat(281)})).status,400);
  assert.equal((await post({name:'a',body:'hi'},{Origin:'https://untrusted.example'})).status,403);
  assert.equal((await post({name:'a',body:'x'.repeat(5000)})).status,413);
  const rows=(await(await fetch(base+'/api/messages')).json()).messages;assert.equal(rows.length,2);assert.equal(rows[0].body,injection.body);
  await stop();await start();
  const after=(await(await fetch(base+'/api/messages')).json()).messages;assert.equal(after.length,2);assert(after.some(m=>m.id===saved.id&&m.body===saved.body));
  for(let i=0;i<6;i++)assert.equal((await post({name:'限流',body:String(i)})).status,201);
  assert.equal((await post({name:'限流',body:'too many'})).status,429);
  console.log('PASS: SQLite persistence, API validation, rate limits, file isolation, frontend assets.');
 }finally{await stop();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
