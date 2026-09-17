import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHandler} from '../supabase/functions/guestbook/handler.mjs';
const origin='https://moon.example',calls=[];
const handle=createHandler({allowedOrigins:[origin],rpc:async(name,value)=>{calls.push({name,value});return name==='moon_list_messages'?{messages:[]}:{message:{id:1,name:value.p_name,body:value.p_body,createdAt:new Date().toISOString()}};}});
const request=(method,body,source=origin)=>new Request('https://project.supabase.co/functions/v1/guestbook',{method,headers:{Origin:source,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
let response=await handle(request('GET'));assert.equal(response.status,200);assert.deepEqual(await response.json(),{messages:[]});assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
response=await handle(request('OPTIONS'));assert.equal(response.status,204);
response=await handle(request('GET',undefined,'https://unknown.example'));assert.equal(response.status,403);
response=await handle(request('POST',{name:' 小月 ',body:'<b>中秋快乐</b>'}));assert.equal(response.status,201);assert.equal((await response.json()).message.body,'<b>中秋快乐</b>');assert.deepEqual(calls.at(-1),{name:'moon_add_message',value:{p_name:'小月',p_body:'<b>中秋快乐</b>'}});
response=await handle(request('POST',{name:' ',body:'你好'}));assert.equal(response.status,400);
response=await handle(request('POST',{name:'小月',body:'x'.repeat(5000)}));assert.equal(response.status,413);
const limited=createHandler({allowedOrigins:[origin],rpc:async()=>({status:429,error:'稍后重试'})});response=await limited(request('POST',{name:'a',body:'b'}));assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'60');
const failed=createHandler({allowedOrigins:[origin],rpc:async()=>{throw Error('private secret');}});response=await failed(request('GET'));assert.equal(response.status,503);assert(!(await response.text()).includes('private secret'));
const unconfigured=createHandler({allowedOrigins:[],rpc:()=>{throw Error();}});assert.equal((await unconfigured(request('GET'))).status,503);
const code=fs.readFileSync('frontend/message-api.js','utf8'),sent=[];
const context={window:{MOON_CONFIG:{provider:'local'}},URL,fetch:async(url,options)=>{sent.push({url,options});return {};}};
vm.runInNewContext(code,context);await context.window.MoonMessages.request();assert.equal(sent.at(-1).url,'/api/messages');
context.window.MOON_CONFIG={provider:'supabase',supabaseUrl:'https://example.supabase.co',publishableKey:'sb_publishable_test'};
await context.window.MoonMessages.request({method:'POST',body:{name:'a',body:'b'}});assert.equal(sent.at(-1).url,'https://example.supabase.co/functions/v1/guestbook');assert.equal(sent.at(-1).options.headers.apikey,'sb_publishable_test');
context.window.MOON_CONFIG.publishableKey='sb_secret_test';await assert.rejects(()=>context.window.MoonMessages.request());
for(const file of ['animations.js','guestbook.js','message-api.js','config.js'])new Function(fs.readFileSync('frontend/'+file,'utf8'));
const standalone=fs.readFileSync('mid-autumn.html','utf8');assert(standalone.includes('data-standalone="true"'));assert(!/<script src=|<link rel="stylesheet"/.test(standalone));
for(const m of standalone.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){if(m[1].includes('application/json'))JSON.parse(m[2]);else new Function(m[2]);}
console.log('PASS: cloud handler API/CORS/validation/errors, local/cloud transport parity, secret-key rejection, standalone build. Real PostgreSQL and hosted Supabase are NOT exercised by this test.');

