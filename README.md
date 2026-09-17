# 月夜来信

中秋祝福网页：全屏孔明灯与云雾循环、粒子倒计时和爱心、自定义贺卡、共享留言。手机与电脑自适应。

已上线：https://nuo-huang.github.io/mid-autumn-wishes/ 。手机和电脑打开同一链接即可共享留言。网页由 GitHub Pages 托管，留言保存于 Supabase 云数据库。

## 本机运行

需要 Node.js 24 LTS，无需安装第三方依赖。

```sh
npm run build
npm test
npm start
```

浏览器打开 http://127.0.0.1:8787 。Windows 也可双击 `启动网站.bat`。SQLite 数据保存在 `data/messages.sqlite`；不要把数据库提交至 GitHub。

## 两种使用方式

- **离线贺卡**：浏览器打开 `mid-autumn.html`；可播放动画、编辑和保存独立贺卡，公共留言不可用。
- **在线留言网站**：运行随附 Node/SQLite 服务，或部署到 GitHub Pages + Supabase。所有人访问同一服务时，留言共享且持久保存。

## 修改与上线

- 改前端：见 [前后端修改指南](前后端修改指南.md)，源文件在 `frontend/`。
- 自有服务器部署：见 [部署说明](部署说明.md)。
- GitHub Pages + Supabase：见 [云端部署步骤](云端部署步骤.md)。工作流已放在 `.github/workflows/`。
- 修改前端后运行 `npm run build`，不会修改数据库。

GitHub Pages 工作流需要仓库 Variables 中配置 `SUPABASE_URL` 和 `SUPABASE_PUBLISHABLE_KEY`（公开密钥）。构建期间生成云端配置；本地配置仍可保留 `provider: 'local'`。云函数和数据库需按部署步骤先建立，不能只发布前端就获得公共留言服务。

## 验证范围

`npm test` 覆盖真实 SQLite 写入/重启、留言 API、资源隔离、云函数本地校验与错误处理、前端连接层、留言读取/提交并发和离线构建。另已在本地 PGlite PostgreSQL 引擎验证 SQL 和角色权限；仍不能代替 Supabase 托管环境与线上跨域验证。详见“验收记录.md”。

2026-09-17 已完成 Supabase 建表、Edge Function 部署、GitHub Pages 发布及真实网页留言验证：浏览器提交后，新页面和独立客户端均读到同一条记录；直接匿名访问数据库被拒绝。未进行两部实体手机测试。压缩包不包含真实数据库、访问令牌或密码。
