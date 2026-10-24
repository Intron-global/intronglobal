@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title 인트론글로벌 Gmail 재연결
set WRANGLER_SEND_METRICS=false
set WRANGLER_WRITE_LOGS=false
set WRANGLER_LOG_SANITIZE=true
echo Google 화면에서 intron1101@gmail.com 계정을 선택해 주세요.
echo 발송과 기본 이메일 확인 권한만 요청합니다. 비밀번호나 연결키는 채팅에 보내지 마세요.
node scripts\gmail-connect.mjs --downloaded-client
if errorlevel 1 goto failed
echo.
echo Gmail 재연결을 완료했습니다. 이 도구는 메일을 보내지 않습니다.
pause
exit /b 0
:failed
echo.
echo 연결을 완료하지 못했습니다. 위 안내를 확인해 주세요.
pause
exit /b 1
