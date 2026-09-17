const fs=require('node:fs');const path=require('node:path');
const project=process.env.SUPABASE_URL||'',key=process.env.SUPABASE_PUBLISHABLE_KEY||'';
let url;try{url=new URL(project);}catch{console.error('请设置 SUPABASE_URL 仓库变量。');process.exit(1);}
if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!key.startsWith('sb_publishable_')){
 console.error('需要有效的 HTTPS 项目地址和 sb_publishable_ 公开密钥。不得使用管理密钥。');process.exit(1);
}
const config={provider:'supabase',supabaseUrl:url.origin,publishableKey:key};
fs.writeFileSync(path.join(__dirname,'../frontend/config.js'),'// 自动生成的公开云连接配置。\nwindow.MOON_CONFIG = Object.freeze('+JSON.stringify(config,null,2)+');\n');
console.log('云端公开配置已生成。');
