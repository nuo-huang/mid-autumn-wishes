@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 24 LTS，再双击此文件。
  pause
  exit /b 1
)
echo 启动后请在浏览器打开 http://127.0.0.1:8787
echo 按 Ctrl+C 可停止网站。
node build.cjs
if errorlevel 1 (
  pause
  exit /b 1
)
node server.cjs
pause
