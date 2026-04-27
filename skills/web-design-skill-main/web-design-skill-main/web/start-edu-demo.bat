@echo off
cd /d "%~dp0"
echo 正在启动教育数字人演示...
echo.
echo 演示说明:
echo - 点击屏幕或按空格键/右箭头前进
echo - 按左箭头后退
echo - 按 1-7 数字键跳转到对应章节
echo - 鼠标移到底部显示进度条
echo.
echo 正在安装依赖...
call npm install
echo.
echo 启动开发服务器...
start http://localhost:5174
npx vite edu-index.html --port 5174
