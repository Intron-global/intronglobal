@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title 인트론글로벌 Gmail 연결
set WRANGLER_SEND_METRICS=false
set WRANGLER_WRITE_LOGS=false
set WRANGLER_LOG_SANITIZE=true
echo Cloudflare 승인 후 Google 클라이언트 ID와 보안 비밀을 이 창에 직접 입력해 주세요.
echo 채팅에는 비밀번호나 연결키를 보내지 마세요. 이 도구는 사이트를 배포하거나 메일을 보내지 않습니다.
node node_modules\wrangler\bin\wrangler.js login --use-keyring --scopes account:read user:read workers_scripts:write
if errorlevel 1 goto failed
node node_modules\wrangler\bin\wrangler.js whoami
if errorlevel 1 goto failed
node scripts\gmail-connect.mjs --downloaded-client
if errorlevel 1 goto failed
echo.
echo 연결 도구를 종료합니다. 배포와 실제 수신 확인은 별도로 진행합니다.
pause
exit /b 0
:failed
echo.
echo 연결을 완료하지 못했습니다. 위 오류를 확인해 주세요. 연결키는 채팅에 보내지 마세요.
pause
exit /b 1
