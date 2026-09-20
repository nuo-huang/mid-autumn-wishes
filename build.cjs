// 从前端源文件生成独立离线 HTML；不会读取或修改数据库。
const fs=require('node:fs');const path=require('node:path');
const root=__dirname,front=path.join(root,'frontend');
let html=fs.readFileSync(path.join(front,'index.html'),'utf8');
html=html.replace('<html lang="zh-CN">','<html lang="zh-CN" data-standalone="true">');
html=html.replace('<link rel="stylesheet" href="styles.css">',()=>'<style>\n'+fs.readFileSync(path.join(front,'styles.css'),'utf8')+'\n</style>');
for(const name of ['config.js','message-api.js','animations.js','welcome.js','bubbles.js','guestbook.js']){
 const code=fs.readFileSync(path.join(front,name),'utf8');new Function(code);
 html=html.replace('<script src="'+name+'"></script>',()=>'<script>\n'+code+'\n</script>');
}
fs.writeFileSync(path.join(root,'mid-autumn.html'),html);
fs.writeFileSync(path.join(front,'offline-card.html'),html);
console.log('已生成 mid-autumn.html 和 frontend/offline-card.html；数据库未改动。');
