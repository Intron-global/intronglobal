# 문의 API 배포 설정 검토안

아래 내용은 초기 검토와 실제 반영 상태의 기록이다.

## 실제 반영 상태: 2026-10-24

- 기존 `intronglobal` Worker에 홈페이지와 문의 API를 배포했다.
- 현재 버전: `abbf6855-a172-4c33-b1ef-7c70102c7251`.
- 문의 API 추가 전 정적 홈페이지 버전: `ee9e45f9-da37-4cbc-bf86-b9b047bf6350`.
- 소유자가 Google 발송 및 기본 이메일 확인 권한을 승인했다. 메일 읽기·수정·삭제 권한은 요청하지 않는다.
- Cloudflare CLI 인증과 서버 비밀 `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `TURNSTILE_SECRET` 등록을 확인했다. 값은 이 기록에 포함하지 않는다.
- Turnstile은 관리형 모드, 정확한 홈페이지 호스트만 허용하며 사전 통과는 사용하지 않는다.
- 문의 서비스 설명과 개인정보 안내 페이지를 공개하고 Google 앱 정보에 연결했다.
- 소유자가 Google 앱을 프로덕션으로 전환했고 관리 화면의 게시 상태에서 확인했다. 이는 Google의 앱 검증 완료와는 다르다. 이후 새 토큰을 발급받아 실제 Google 재인증과 소유자 확인을 통과했다. 21:04에 새 연결키를 서버에 등록했고 배포 버전 `1a2b292a-cb4f-44ff-a9c1-bbe79a5d82b5`에서 확인했다. 이후 호환성 수정본을 배포했다. 실제 메일 수신까지 소유자가 확인했다.
- 사용자의 실제 문의에서 Turnstile 오류와 `GMAIL_AUTH_FAILED`가 관찰됐다. 세부 HTTP 상태가 없는 예외를 조사한 결과 Workers가 `redirect: "error"`를 지원하지 않아 Google 요청 생성 전에 실패한 것이 원인이었다. 실제 workerd의 Request 생성자로 동일 실패를 재현한 뒤 `manual`로 수정했다. 비정상 상태와 리디렉션 응답은 계속 차단한다.
- 자동입력 방지 실패·만료 시 입력을 보존하고 재시도할 수 있도록 수정했다. 인증 완료 전 전송을 차단한다. 서버 비밀이나 본문을 로그에 남기지 않는다.
- 연결 도구는 갱신 토큰 재인증과 소유 계정 확인까지 통과한 경우에만 서버 등록을 진행하도록 보완했다. 새 서버 로그는 허용 목록의 오류 원인과 HTTP 상태만 보존한다.
- 25개 자동 검사가 통과했다. 여기에는 실제 Workers 실행 환경의 Request 생성 검사가 포함된다. Google 응답은 모의 값이므로 실제 메일 수신 검증은 아니다.
- 수정 배포 후 사용자가 실제 문의를 제출했고 홈페이지에서 `문의가 정상적으로 접수되었습니다.` 표시를 확인했다. 소유자는 `접수됐고 메일도 왔어`라고 확인했고, 2026-10-24 21:09(KST) 업무용 Gmail 받은편지함의 문의 메일 화면도 제공했다. 한국어·영문 본문과 회사명·담당자명·작성자 이메일이 표시됐다. 실제 답장 발송은 시험하지 않았다.
- GitHub 저장소는 아직 갱신하지 않았다. 기존 연결 저장소의 자동 배포가 수동 배포를 덮어쓸 수 있다.

## 정식 홈페이지 배포 준비

- 정식 주소는 기존 GitHub Pages의 `https://www.intronglobal.co.kr/`이며 DNS는 가비아다. `www`의 기존 GitHub 연결과 HTTPS 설정을 유지한다.
- 현재 버전을 저장소 `main`에 반영해 GitHub Pages와 Cloudflare의 저장소 연결이 같은 소스를 배포하도록 준비했다.
- 세 문의 HTML에 공개 Worker API 주소를 설정하고 서버는 지정 출처의 POST와 Content-Type 사전 요청만 허용한다. 쿠키와 인증 헤더는 전달하지 않는다.
- Turnstile에 `www.intronglobal.co.kr`와 기존 Worker 호스트가 저장돼 있는 것을 확인했다. 관리형 모드와 사전 승인 없음 설정을 유지했다.
- 27개 검사가 통과했다. 별도로 14개 HTML의 로컬 파일 링크와 512px 파비콘을 검사했고, Git에 올릴 텍스트에서 연결키 패턴을 검사해 발견되지 않았다.
- 정식 도메인 허용 설정을 포함한 Worker 수동 배포 버전: `3437e9d5-0cb2-4d7d-9e30-208168fe84d0`.
- 이 기록 시점에는 정식 홈페이지 자동 배포와 정식 도메인에서의 실제 문의 수신 검증이 아직 남아 있다. 앞선 실제 수신 검증은 Worker 주소에서 수행했다.

아래는 최초 조사 때의 상태와 계획이며 위 실제 반영 상태가 우선한다.

## 최초 관리 화면에서 확인한 상태

- Google 프로젝트: `INTRON GLOBAL Website` / `grand-appliance-512611-j6`
- Gmail API 활성화 완료, 앱 정보 생성 완료
- 앱 요청 범위: `openid`, `userinfo.email`, `gmail.send`만 저장
- 테스트 사용자: `intron1101@gmail.com` 1명
- OAuth 웹 클라이언트는 입력을 마쳤으며 소유자가 생성 버튼을 누르는 단계
- Cloudflare 기존 Worker: `intronglobal`
- Cloudflare 계정 ID: `721b3e3614eca747991c7719f9ae1ec9`
- 현재 홈페이지: `https://intronglobal.dlwnsdn0825.workers.dev`
- 해당 Worker에 연결된 별도 도메인과 라우트 없음
- 정적 자산만 배포된 상태라 런타임 변수·비밀·바인딩이 아직 없음
- 연결 저장소: `Intron-global/intronglobal`, 운영 브랜치: `main`
- 자동 배포 명령: `npx wrangler deploy`, 루트: `/`
- 로컬 Wrangler는 아직 로그인되지 않음

## 승인받을 변경

| 항목 | 현재 로컬 설정 | 제안 |
| --- | --- | --- |
| Worker 이름 | `intronglobal-site` | 기존 `intronglobal` |
| Cloudflare 계정 | 자동 선택 | 위에서 확인한 계정으로 고정 |
| workers.dev | 비활성 | 현재 서비스 중인 주소를 유지하도록 활성 |
| 라우트 | `intronglobal.co.kr/api/*`, `www.intronglobal.co.kr/api/*` | 현재 Worker에 연결된 라우트가 없으므로 해당 가정 제거 |
| 문의 허용 출처·호스트 | 위 별도 도메인 | 실제 홈페이지의 정확한 workers.dev 호스트와 개발용 로컬 출처 |
| 공개 폴더 | `public/` | 유지 |
| Gmail 연결 도구 대상 | `intronglobal-site` | 기존 `intronglobal`로 일치시킴 |

이 로컬 설정을 실제 배포하면 기존 홈페이지 Worker가 새 홈페이지와 문의 API를 함께 제공하게 된다. 잘못된 설정을 배포하면 홈페이지나 문의가 중단될 수 있다. 기존 배포 버전은 Cloudflare에서 확인하고 문제가 생기면 이전 버전으로 되돌릴 수 있다. 현재는 로컬 설정만 반영한 상태다.

## 최초 작업 계획

1. 소유자가 Google 클라이언트를 생성하고 발송 권한을 승인한다. 키는 채팅에 보내지 않는다.
2. Google 테스트 모드의 갱신 토큰은 7일 만료이므로 운영 게시와 필요한 Google 절차를 확인한다.
3. Cloudflare CLI를 필요한 권한으로 연결하고 올바른 계정을 확인한다.
4. Turnstile은 실제 홈페이지 호스트만 허용하도록 구성한다.
5. Gmail 연결키와 Turnstile 비밀을 기존 Worker의 서버 비밀로 저장한다. 공개 사이트 키만 세 문의 HTML에 넣는다.
6. 검사와 배포 미리보기를 통과한 뒤 기존 홈페이지에 배포한다.
7. 소유자가 허용한 문의를 1회 보내고 실제 수신을 확인한다. 현재 실제 전송은 확인되지 않았다.
