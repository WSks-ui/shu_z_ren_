@echo off
chcp 65001 >nul
title 教育数字人系统

echo ========================================
echo    教育数字人系统 - 启动中...
echo ========================================
echo.

cd /d "%~dp0"

:: 检查Python
py --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请先安装 Python 3.10+
    pause
    exit /b 1
)

:: 启动服务
echo [信息] 正在启动后端服务...
start /b py server.py --host 127.0.0.1 --port 3456

:: 等待服务启动
echo [信息] 等待服务启动...
timeout /t 5 /nobreak >nul

:: 检查服务是否启动
:check_service
curl -s http://127.0.0.1:3456/health >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto check_service
)

echo.
echo ========================================
echo    服务启动成功！
echo ========================================
echo.
echo    访问地址:
echo    - 独立界面: http://127.0.0.1:3456/education-digital-human.html
echo    - 主界面:   http://127.0.0.1:3456
echo.
echo ========================================
echo.

:: 打开浏览器
start http://127.0.0.1:3456/education-digital-human.html

echo [提示] 按 Ctrl+C 停止服务
echo.

:: 保持运行
pause
