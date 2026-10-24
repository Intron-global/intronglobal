@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title 인트론글로벌 자동입력 방지 연결
set WRANGLER_SEND_METRICS=false
set WRANGLER_WRITE_LOGS=false
set WRANGLER_LOG_SANITIZE=true
echo Cloudflare가 발급한 Turnstile 비밀 키를 아래 입력란에 붙여넣고 Enter를 눌러 주세요.
echo 등록 대상은 현재 계정의 intronglobal Worker입니다. 비밀 키는 화면에 표시되지 않습니다.
node node_modules\wrangler\bin\wrangler.js secret put TURNSTILE_SECRET
echo.
echo 키 등록 결과를 확인한 뒤 이 창을 닫아 주세요. 사이트 배포나 메일 발송은 하지 않았습니다.
pause
