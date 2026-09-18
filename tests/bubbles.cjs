const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={window:{},document:{getElementById(){return null;}}};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../frontend/bubbles.js'),'utf8'),context);
let time=0;const shown=[],removed=[],visible=new Set();
const queue=context.window.createMoonBubbleQueue({show(message,slot){const node={id:message.id,slot,start:time};shown.push(node);visible.add(node);return node;},remove(node){removed.push({...node,end:time});visible.delete(node);},paint(){}});
const items=Array.from({length:23},(_,id)=>({id,name:'月下',body:'祝福'+id}));
queue.setMessages(items);
function advance(seconds){for(let n=0;n<seconds*10;n++){time+=.1;queue.tick(.1);assert(visible.size<=10);assert.equal(new Set([...visible].map(x=>x.id)).size,visible.size);}}
advance(7.3);assert.equal(shown.length,10);assert(shown[9].start-shown[0].start<=5);
advance(10);assert.equal(removed.length,10);for(const item of removed)assert(Math.abs(item.end-item.start-10)<.11);
advance(6);assert.equal(shown.length,20);assert.equal(new Set(shown.map(x=>x.id)).size,20,'next group uses different messages');
queue.setMessages([]);assert.equal(visible.size,0,'removed cloud messages leave bubbles too');
advance(20);assert.equal(shown.length,20,'empty guestbook generates no fake wishes');
queue.setMessages(items.slice(0,2));advance(12);assert.equal(visible.size,0);
console.log('PASS: 10-message batches stagger within 5s, each expires after 10s, groups rotate without duplicates, deletion/empty list clear bubbles.');
