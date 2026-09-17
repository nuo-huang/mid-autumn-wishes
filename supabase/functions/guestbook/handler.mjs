// Web Request/Response 接口，可在 Deno 云函数与 Node 测试中共用。
export function createHandler({allowedOrigins,rpc}){
 const allowed=new Set(allowedOrigins);
 return async function handle(request){
  const origin=request.headers.get('origin')||'';
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
  const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
  if(!allowed.size)return reply(503,{error:'留言服务尚未配置访问来源'});
  if(!allowed.has(origin))return reply(403,{error:'请从本站提交或读取留言'});
  headers['Access-Control-Allow-Origin']=origin;
  headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS';
  headers['Access-Control-Allow-Headers']='content-type, apikey';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!['GET','POST'].includes(request.method))return reply(405,{error:'不支持此操作'});
  try{
   let data;
   if(request.method==='GET')data=await rpc('moon_list_messages',{});
   else{
    if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return reply(415,{error:'请求格式不正确'});
    if(Number(request.headers.get('content-length'))>4096)return reply(413,{error:'留言太长了'});
    const reader=request.body?.getReader();let bytes=0,parts=[];
    if(reader)for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>4096){await reader.cancel();return reply(413,{error:'留言太长了'});}parts.push(value);}
    const buffer=new Uint8Array(bytes);let offset=0;for(const part of parts){buffer.set(part,offset);offset+=part.length;}
    let value;try{value=JSON.parse(new TextDecoder().decode(buffer));}catch{return reply(400,{error:'留言格式无效'});}
    if(!value||typeof value.name!=='string'||typeof value.body!=='string')return reply(400,{error:'请填写昵称和祝福'});
    const name=value.name.trim(),body=value.body.trim();
    if(!name||name.length>24||!body||body.length>280||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(name+body))return reply(400,{error:'昵称限24字，祝福限280字，且不能为空'});
    data=await rpc('moon_add_message',{p_name:name,p_body:body});
   }
   if(data.error){const status=[400,429,503].includes(data.status)?data.status:503;if(status===429)headers['Retry-After']='60';return reply(status,{error:data.error});}
   return reply(request.method==='POST'?201:200,data);
  }catch{return reply(503,{error:'暂时无法连接留言数据库，请稍后再试'});}
 };
}
