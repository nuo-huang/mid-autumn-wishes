const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync(require('node:path').join(__dirname,'../frontend/guestbook.js'),'utf8');
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function element(){return {value:'',textContent:'',disabled:false,children:[],listeners:{},addEventListener(n,fn){this.listeners[n]=fn;},replaceChildren(){this.children=[];},appendChild(e){this.children.push(e);},append(...children){this.children.push(...children);}};}
const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
const requests=[],celebrations=[];
vm.runInNewContext(code,{document:{getElementById:get,createElement:element,hidden:false},location:{protocol:'https:'},window:{MoonBubbles:{setMessages(){},celebrate(m){celebrations.push(m);}},MoonMessages:{request(options){const job=deferred();requests.push({options,...job});return job.promise;}}},AbortSignal,setInterval(){},Date,JSON,Number,TypeError,Promise});
const response=data=>({ok:true,json:async()=>data});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 assert.equal(requests.length,1);assert.equal(celebrations.length,0);
 get('guestName').value='月下';get('guestMessage').value='团圆';
 const submission=get('guestbookForm').listeners.submit({preventDefault(){}});
 assert(get('sendMessage').disabled);assert.equal(requests.length,1,'POST waits for old GET');
 requests[0].resolve(response({messages:[]}));await flush();assert.equal(requests.length,2);
 const saved={id:1,name:'月下',body:'团圆',createdAt:'2026-09-17T00:00:00Z'};
 requests[1].resolve(response({message:saved}));await flush();assert.equal(requests.length,3);
 assert.equal(celebrations.length,1);assert.equal(celebrations[0].id,saved.id);assert(get('sendMessage').disabled,'button stays disabled until synchronization completes');
 assert.equal(get('guestbookList').children[0].children[2].textContent,'团圆');
 requests[2].resolve({ok:false});await submission;
 assert(!get('sendMessage').disabled);assert(get('guestbookStatus').textContent.includes('已保存'));assert(get('guestbookStatus').textContent.includes('同步失败'));
 get('guestMessage').value='失败不应放灯';
 const failed=get('guestbookForm').listeners.submit({preventDefault(){}});
 requests[3].resolve({ok:false,json:async()=>({error:'服务暂不可用'})});await failed;
 assert.equal(celebrations.length,1,'failed submissions never celebrate');
 console.log('PASS: stale reads cannot overwrite submitted messages, duplicate submit disabled, saved data shown even when refresh fails.');
})().catch(e=>{console.error(e);process.exitCode=1;});
