@echo off
chcp 65001 >nul
echo ========================================
echo   教育数字人系统 - HTTPS 启动脚本
echo ========================================
echo.

:: 设置魔珐星云配置（请修改为你的实际值）
set XINGYUN_APP_ID=
set XINGYUN_APP_SECRET=

:: 设置 SSL 证书路径（可选，默认使用项目目录下的 certs/）
:: set SSL_KEYFILE=C:\path\to\key.pem
:: set SSL_CERTFILE=C:\path\to\cert.pem

echo 配置已加载，正在启动服务...
echo.

:: 启动服务器
py server.py --host 127.0.0.1 --port 3456

pause
