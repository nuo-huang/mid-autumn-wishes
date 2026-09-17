(() => {
 'use strict';
 function connection(){
  const config=window.MOON_CONFIG || {provider:'local'};
  if(config.provider==='local')return {url:'/api/messages',headers:{}};
  if(config.provider!=='supabase')throw new Error('未知的留言服务配置');
  const project=new URL(config.supabaseUrl);
  if(project.protocol!=='https:'||project.username||project.password||project.pathname!=='/'||project.search||project.hash)throw new Error('请填写有效的 Supabase HTTPS 项目地址');
  const key=config.publishableKey;
  if(typeof key!=='string'||!key.startsWith('sb_publishable_'))throw new Error('请填写 Supabase publishable key，不要使用管理密钥');
  return {url:new URL('/functions/v1/guestbook',project).href,headers:{apikey:key}};
 }
 window.MoonMessages=Object.freeze({
  async request({method='GET',body,signal}={}){
   const {url,headers}=connection();
   if(body!==undefined)headers['Content-Type']='application/json';
   return fetch(url,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal,cache:'no-store',credentials:'omit'});
  }
 });
})();
