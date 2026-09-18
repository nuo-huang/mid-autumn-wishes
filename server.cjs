'use strict';
// Node.js 24 LTS；仅使用内置模块，无需 npm install。
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';
const dbPath = path.resolve(process.env.DB_PATH || path.join(__dirname, 'data', 'messages.sqlite'));
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS messages (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL
 );`);
const recent = db.prepare('SELECT id, name, body, created_at AS createdAt FROM messages ORDER BY id DESC LIMIT 50');
const insert = db.prepare('INSERT INTO messages (name, body, created_at) VALUES (?, ?, ?)');
const total = db.prepare('SELECT count(*) AS count FROM messages');
const rate = new Map();
const cleanup = setInterval(() => {
 const now=Date.now();for(const [ip,entry] of rate)if(now-entry.start>60000)rate.delete(ip);
},60000).unref();
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));}
function allowPost(req){
 // 默认不信任 X-Forwarded-For，避免访客伪造地址绕过限流。
 const ip=req.socket.remoteAddress || 'unknown',now=Date.now();
 let entry=rate.get(ip);
 if(!entry||now-entry.start>60000){if(rate.size>=10000)return false;entry={start:now,count:0};rate.set(ip,entry);}
 return ++entry.count<=6;
}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','same-origin');
 res.setHeader('Cache-Control','no-store');
 let url;try{url=new URL(req.url,'http://localhost');}catch{return json(res,400,{error:'请求地址无效'});}
 if(url.pathname==='/api/messages'){
  if(req.method==='GET'){
   try{return json(res,200,{messages:recent.all()});}catch{return json(res,503,{error:'暂时无法读取留言，请稍后重试'});}
  }
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return json(res,405,{error:'不支持此操作'});}
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return json(res,415,{error:'请求格式不正确'});
  if(req.headers.origin){
   try{if(new URL(req.headers.origin).host!==req.headers.host)return json(res,403,{error:'请从本站提交留言'});}
   catch{return json(res,403,{error:'请求来源无效'});}
  }
  if(!allowPost(req)){res.setHeader('Retry-After','60');return json(res,429,{error:'发得有点快，请一分钟后再试'});}
  try{
   let bytes=0,chunks=[];
   for await(const chunk of req){bytes+=chunk.length;if(bytes>4096){json(res,413,{error:'留言太长了'});return;}chunks.push(chunk);}
   let value;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return json(res,400,{error:'留言格式无效'});}
   if(!value||typeof value.name!=='string'||typeof value.body!=='string')return json(res,400,{error:'请填写昵称和祝福'});
   const name=value.name.trim(),body=value.body.trim();
   if(!name||name.length>24||!body||body.length>280||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(name+body))return json(res,400,{error:'昵称限24字，祝福限280字，且不能为空'});
   if(total.get().count>=10000)return json(res,503,{error:'留言板暂时已满，请联系站点主人'});
   const createdAt=new Date().toISOString();
   const result=insert.run(name,body,createdAt);
   return json(res,201,{message:{id:Number(result.lastInsertRowid),name,body,createdAt}});
  }catch(error){if(!res.headersSent)json(res,503,{error:'留言未保存，请稍后重试'});return;}
 }
 const assets={
  '/':['frontend/index.html','text/html'], '/index.html':['frontend/index.html','text/html'],
  '/styles.css':['frontend/styles.css','text/css'],
  '/config.js':['frontend/config.js','text/javascript'],
  '/message-api.js':['frontend/message-api.js','text/javascript'],
  '/animations.js':['frontend/animations.js','text/javascript'],
  '/guestbook.js':['frontend/guestbook.js','text/javascript'],
  '/bubbles.js':['frontend/bubbles.js','text/javascript'],
  '/offline-card.html':['frontend/offline-card.html','text/html'],
  '/mid-autumn.html':['mid-autumn.html','text/html']
 };
 if(req.method==='GET'&&Object.hasOwn(assets,url.pathname)){
  const [file,type]=assets[url.pathname];
  try{const content=fs.readFileSync(path.join(__dirname,file));res.writeHead(200,{'Content-Type':type+'; charset=utf-8'});res.end(content);}
  catch{json(res,500,{error:'网页文件未找到，请先运行 node build.cjs'});}return;
 }
 if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
 json(res,404,{error:'页面不存在'});
});
server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(port,host,()=>console.log(`中秋祝福网站：http://${host}:${server.address().port}\n数据库：${dbPath}`));
function stop(){clearInterval(cleanup);server.close(()=>{db.close();process.exit(0);});}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
