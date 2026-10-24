# 인트론글로벌 홈페이지

한·영 회사 홈페이지와 Cloudflare Worker 문의 API다. 메일 발송은 기존 업무용 Gmail `intron1101@gmail.com`을 사용한다.

## 현재 상태

2026-10-24 기존 Cloudflare Worker에 홈페이지와 Gmail 문의 API를 배포했다. Google 소유자 승인, Gmail 연결 비밀 3개와 Turnstile 비밀 등록을 확인했다. Turnstile은 실제 홈페이지 호스트만 허용한다. 공개 사이트 키는 세 문의 페이지에 반영돼 있다.

정식 홈페이지는 GitHub Pages의 `https://www.intronglobal.co.kr/`다. DNS는 가비아에서 관리하며 `www`는 기존 `intron-global.github.io` 연결을 유지한다. Cloudflare의 기존 Worker `intronglobal`은 `https://intronglobal.dlwnsdn0825.workers.dev`에서 문의 API와 홈페이지 사본을 제공한다. Google 프로젝트는 `INTRON GLOBAL Website` (`grand-appliance-512611-j6`)다. Worker에 별도 사용자 도메인과 라우트는 연결하지 않았다.

**검증 상태:** Google 앱의 프로덕션 전환과 새 연결키의 서버 등록을 확인했다. 등록 전 새 갱신 토큰으로 실제 Google 재인증과 소유자 확인을 통과했다. 초기 `GMAIL_AUTH_FAILED`의 원인은 Workers가 지원하지 않는 `redirect: "error"` 옵션이었다. 같은 Workers 실행 환경에서 실패를 재현하고 `manual`로 변경한 뒤 검사를 통과했다. 리디렉션 응답은 거절하며 연결키를 다른 주소로 전달하지 않는다. Turnstile `300030` 오류에는 안내와 재시도 버튼을 추가했고, 인증 완료 전 전송을 차단한다. 현재 25개 검사가 통과했다. 수정 배포 후 사용자가 실제 문의를 제출했고 홈페이지 정상 접수 표시와 업무용 Gmail 받은편지함 도착을 확인했다. 2026-10-24 21:09(KST) 사용자가 제공한 수신 화면에서 한국어·영문 문의 내용이 정상 표시됐다. 실제 답장 발송은 시험하지 않았다. Google 앱 게시 상태와 Google 검증 완료는 서로 다르며 검증 완료로 표시해서는 안 된다.

정식 도메인의 문의 페이지는 공개 API 주소 설정을 통해 Cloudflare 문의 API에 연결한다. 서버는 등록된 정확한 출처만 CORS로 허용하고 쿠키 인증은 사용하지 않는다. Turnstile은 정식 호스트 `www.intronglobal.co.kr`와 기존 Worker 호스트를 허용한다. GitHub Actions는 의존성 설치와 검사를 통과한 뒤 `public/`만 정식 홈페이지에 배포한다. Cloudflare의 기존 저장소 연결은 같은 `main`에서 Worker를 배포한다.

정식 도메인 문의 연결을 추가한 수동 Worker 배포 버전: `3437e9d5-0cb2-4d7d-9e30-208168fe84d0`. 이후 `main` 자동 배포의 최종 버전은 Cloudflare 배포 기록에서 확인한다. 문의 기능 추가 전 정적 홈페이지로 되돌릴 수 있는 버전: `ee9e45f9-da37-4cbc-bf86-b9b047bf6350`.

## 파일 위치

- `public/ko/app.js`, `public/ko/subpage.js`: 한글 문구
- `public/en/app.js`, `public/en/subpage.js`: 영문 문구
- `public/contact-api.js`: 공통 문의 양식과 오류 안내
- `public/mail-service.html`, `public/mail-privacy.html`: 문의 발송 앱과 정보 처리 방식 안내
- `public/design.css`: 공통 디자인과 반응형 화면
- `src/`: 서버에서만 실행할 문의 처리·Gmail 발송 코드
- `scripts/gmail-connect.mjs`: 소유자 Gmail 연결 도구
- `tests/`: 외부 메일을 보내지 않는 검증

언어 전환은 같은 이름의 페이지로 이동한다. GitHub Actions는 `public/`만 공개한다. 서버 소스와 연결키를 `public/`에 넣으면 안 된다.

## Gmail 연결 준비

Cloudflare 계정 외에 Google Cloud 프로젝트와 OAuth 클라이언트가 필요하다. 아버지가 관리할 수 있는 Google 계정으로 준비한다.

1. [Google Cloud Console](https://console.cloud.google.com/)에서 홈페이지 전용 프로젝트를 만든다.
2. **API 및 서비스 → 라이브러리**에서 **Gmail API**를 찾아 사용 설정한다.
3. **Google Auth Platform**에서 앱 이름, 지원 이메일, 연락처와 대상 사용자를 설정한다. 일반 Gmail 계정은 외부 사용자를 선택한다.
4. 데이터 액세스 권한은 `openid`, `email`, `https://www.googleapis.com/auth/gmail.send`만 설정한다. `gmail.send`가 목록에 안 보이면 직접 추가한다. 이메일 주소 확인은 로그인 계정을 확인하기 위한 기본 권한이다. Gmail 읽기·수정·삭제 권한은 추가하지 않는다.
5. 처음에는 테스트 사용자로 `intron1101@gmail.com`을 추가한다. **외부 앱의 테스트 상태에서는 Gmail 갱신 토큰이 7일 만에 만료된다.** 운영 전에 게시 상태와 Google에서 요구하는 검증 절차를 확인한다. 테스트 상태로 연결한 토큰은 운영 상태 전환 후 다시 발급받는다. Google이 미검증 앱 경고나 검증 요구를 표시하면 원인을 확인하고 필요한 절차를 완료한다.
6. **클라이언트 → 클라이언트 만들기 → 웹 애플리케이션**을 선택한다. 승인된 리디렉션 URI에 다음 주소를 정확히 추가한다. 자바스크립트 원본은 이 도구에 필요하지 않다.

```text
http://127.0.0.1:53682/oauth2/callback
```

클라이언트 ID와 클라이언트 보안 비밀은 Google 화면에서 확인한다. 채팅·소스 코드·GitHub에 붙여넣지 않는다. 다운로드한 클라이언트 JSON도 공개 폴더에 넣지 않는다.

## 소유자 승인과 서버 등록

프로젝트 폴더에서 직접 입력 가능한 터미널을 연다.

```powershell
npx wrangler login --use-keyring --scopes account:read user:read workers_scripts:write
npx wrangler whoami
npm run gmail:connect
```

1. Cloudflare 계정이 홈페이지를 관리하는 계정인지 확인한다.
2. 연결 도구에 OAuth 클라이언트 ID와 보안 비밀을 입력한다. 보안 비밀은 화면에 표시되지 않는다.
3. 도구가 출력한 Google 링크를 열고 **아버지가 직접 `intron1101@gmail.com`으로 승인**한다. 메일 발송과 로그인 이메일 주소 확인만 요청하는지 확인한다.
4. 브라우저에 연결 확인 메시지가 뜨면 터미널로 돌아온다.
5. 등록 대상이 기존 계정의 `intronglobal`인지 확인하고 `등록`을 입력한다. 클라이언트 ID·보안 비밀·갱신 토큰은 Cloudflare Worker Secrets로 전달된다. 도구는 연결키를 로컬 파일에 저장하지 않으며 메일 전송이나 사이트 배포도 하지 않는다.

Windows에서는 루트 폴더의 `Gmail-연결.cmd`를 실행하면 위 순서로 진행된다. 이 실행 파일은 다운로드 폴더의 가장 최근 `client_secret*.json`을 읽고 홈페이지 전용 프로젝트와 승인 주소가 맞는지 검사한 뒤 사용한다. 키 값은 출력하지 않으며 사용자가 내려받은 원본 파일은 그대로 남는다. 수동 입력은 `npm run gmail:connect`, 파일을 직접 지정하려면 `npm run gmail:connect -- --client-file <경로>`를 사용한다. Cloudflare 승인 권한은 계정·사용자 정보 확인과 Workers 스크립트 관리로 제한했다. Workers 스크립트 권한은 계정 내 다른 Worker에도 적용될 수 있으므로 승인 화면을 확인한다. `--use-keyring`은 Cloudflare 로그인 자격 증명을 OS 보안 저장소를 이용해 보호하며, 처음 실행하면 Wrangler가 공식 npm 패키지 설치를 물을 수 있다. 계정과 키를 확인하기 전에는 실제 배포하지 않는다.

이미 Cloudflare에 로그인했다면 `Gmail-재연결.cmd`로 Google 연결만 갱신할 수 있다. 새 갱신 토큰으로 재인증하고 업무용 계정을 확인한 뒤 등록한다. `.wrangler/gmail-connection-status.json`에는 단계·시각과 허용한 오류 코드만 기록하며 연결키나 문의 내용은 저장하지 않는다. 서버 비밀 등록 명령은 기존 Worker에 즉시 반영될 수 있으므로 등록 대상을 확인한다.

다른 Gmail 계정으로 승인하거나 메일 읽기 등 추가 권한이 포함되면 등록/발송을 차단한다. 취소한 연결의 승인까지 해제하려면 [Google 계정 연결 관리](https://myaccount.google.com/connections)에서 해당 앱을 삭제한다.

## Turnstile과 배포

1. Cloudflare Turnstile에서 홈페이지용 위젯을 만들고 `www.intronglobal.co.kr`, `intronglobal.dlwnsdn0825.workers.dev`를 허용 호스트로 등록한다. 공유 상위 도메인 전체 대신 실제 홈페이지 호스트만 등록한다.
2. 공개 **사이트 키**로 `public/contact.html`, `public/en/contact.html`, `public/ko/contact.html`의 `REPLACE_WITH_TURNSTILE_SITE_KEY`를 교체한다.
3. **비밀 키**는 다음 명령으로 서버에만 등록한다.

```powershell
npx wrangler secret put TURNSTILE_SECRET
```

4. `wrangler.jsonc`의 발신·수신 주소, 출처와 호스트를 확인한다. 발신·수신 주소는 모두 `intron1101@gmail.com`이다. 방문자 주소는 답장 주소에만 사용한다.
5. 정식 홈페이지는 기존 GitHub Pages 도메인을 유지한다. 세 문의 HTML의 `contact-api-endpoint`는 Worker의 HTTPS `/api/contact`를 가리킨다. 새 호스트를 사용할 때는 소유와 DNS를 확인하고 API 허용 출처·호스트, Turnstile 허용 호스트를 함께 변경한다.
6. 다음 검사 후 기존 Worker를 배포한다. 현재 연결 저장소는 `Intron-global/intronglobal`, 운영 브랜치는 `main`, Cloudflare 배포 명령은 `npx wrangler deploy`다. 자산 폴더는 `public/`다. `--assets .` 또는 `--assets ./`로 서버 파일까지 공개하지 않는다. 기존 GitHub Pages 워크플로도 `public/`만 공개하지만, 그 배포만으로 Cloudflare 문의 API가 갱신되지는 않는다.

```powershell
npm test
npx wrangler deploy --dry-run
npm run deploy
```

공개 홈페이지에서 소유자가 허용한 테스트 문의를 1회 보내고 Gmail의 실제 수신·답장 주소를 확인해야 연결 완료다. 테스트 코드와 배포 검사는 실제 수신을 보장하지 않는다. Gmail API 성공은 Google의 발송 접수이며 최종 수신함 도착을 보장하지 않는다.

## 보안과 운영

- 메일 관련 권한은 발송만 요청한다. 일반 Gmail 비밀번호와 앱 비밀번호는 사용하지 않는다. 단, 발송 토큰이 유출되면 메일 발송에 악용될 수 있으므로 연결키는 비밀로 관리한다.
- 문의 내용은 Cloudflare에서 처리한 뒤 Google로 전달된다. Gmail의 보낸편지함과 수신 메일에는 내용이 남는다. 별도 문의 DB는 사용하지 않으며 앱 로그에 본문이나 연결키를 기록하지 않는다.
- Turnstile, 입력 검증, 허용 출처 확인, IP별 분당 5회 제한을 적용한다. 첨부파일은 받지 않는다. Gmail 계정의 발송 한도와 Google 정책도 적용되므로 대량 발송 용도로 사용하지 않는다.
- 오류 때 자동 재발송하지 않는다. 응답을 받기 전에 전송이 끝났을 가능성이 있으므로 재시도 전 수신함을 확인한다.
- Gmail 연결이 끊기면 Google 권한 해제 여부·비밀번호 변경·테스트 토큰 만료·앱 게시 상태를 확인하고 `npm run gmail:connect`로 다시 연결한다.
- 기존 Resend 연결키가 남아 있다면 Gmail 전환을 검증한 뒤 Cloudflare의 `RESEND_API_KEY`와 Resend에서 키를 폐기한다. 새 코드는 Resend를 호출하지 않는다.

## 로컬 확인

```powershell
npm test
npm run dev
```

로컬에서 실제 API까지 확인하려면 `.dev.vars.example`을 참고해 비공개 `.dev.vars`를 준비하고 Turnstile의 공식 테스트 키와 로컬 허용 호스트 설정을 별도로 사용한다. 실제 Gmail 키를 넣으면 로컬에서도 실제 발송될 수 있다. 화면 미리보기용 `127.0.0.1:4174` 정적 서버는 메일 API를 실행하지 않는다.

## 공식 문서

- [Gmail API 발송](https://developers.google.com/workspace/gmail/api/guides/sending)
- [Gmail 권한 범위](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Google 웹 서버 OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google 토큰 만료 조건](https://developers.google.com/identity/protocols/oauth2#expiration)
