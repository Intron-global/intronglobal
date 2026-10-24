import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";
import { buildGmailRaw, GMAIL_SEND_SCOPE, getGmailAuthorization, hasSendOnlyScopes, isGmailConfigured, sendGmail } from "../src/gmail.js";
import { ACCOUNT, createAuthorizationRequest, parseGoogleClientJson, REDIRECT_URI, validateCallback } from "../scripts/gmail-connect.mjs";

const env = {
  GMAIL_ACCOUNT_EMAIL: "intron1101@gmail.com",
  CONTACT_TO_EMAIL: "intron1101@gmail.com",
  GMAIL_CLIENT_ID: "test-client.apps.googleusercontent.com",
  GMAIL_CLIENT_SECRET: "test-client-secret",
  GMAIL_REFRESH_TOKEN: "test-refresh-token",
  TURNSTILE_SECRET: "test-turnstile-secret",
  ALLOWED_ORIGINS: "https://intronglobal.co.kr",
  ALLOWED_HOSTNAMES: "intronglobal.co.kr",
  CONTACT_RATE_LIMITER: { limit: async () => ({ success: true }) }
};
const contact = {
  company: "인트론글로벌",
  name: "문의 담당자",
  email: "visitor@example.com",
  message: "유리섬유 수출입과 공급 조건에 관해 문의드립니다. 😊",
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  turnstileToken: "test-token",
  website: "",
  privacyConsent: true
};
const scopes = `openid https://www.googleapis.com/auth/userinfo.email ${GMAIL_SEND_SCOPE}`;
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

function googleMock(overrides = {}) {
  const calls = [];
  const fetcher = async (url, options = {}) => {
    const address = String(url);
    calls.push({ url: address, options });
    if (address.endsWith("/token")) return json(overrides.token || { access_token: "test-access-token", token_type: "Bearer", scope: scopes });
    if (address.endsWith("/userinfo")) return json(overrides.identity || { email: env.GMAIL_ACCOUNT_EMAIL, email_verified: true });
    if (address.endsWith("/messages/send")) return json(overrides.sent ?? { id: "test-message-id" }, overrides.sendStatus || 200);
    if (address.endsWith("/siteverify")) return json({ success: true, action: "contact", hostname: "intronglobal.co.kr" });
    throw new Error("Unexpected network request");
  };
  return { calls, fetcher };
}

test("Gmail 발송 외의 메일 읽기·삭제 권한을 거절한다", () => {
  assert.equal(hasSendOnlyScopes(scopes), true);
  for (const extra of ["https://mail.google.com/", "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.modify"]) {
    assert.equal(hasSendOnlyScopes(`${scopes} ${extra}`), false);
  }
  assert.equal(hasSendOnlyScopes("openid email"), false);
});

test("연결키 누락과 외부 수신 주소 설정을 비활성 상태로 판단한다", () => {
  assert.equal(isGmailConfigured(env), true);
  assert.equal(isGmailConfigured({ ...env, GMAIL_REFRESH_TOKEN: "" }), false);
  assert.equal(isGmailConfigured({ ...env, GMAIL_REFRESH_TOKEN: "replace_with_token" }), false);
  assert.equal(isGmailConfigured({ ...env, CONTACT_TO_EMAIL: "other@example.com" }), false);
});

test("방문자는 수신 주소를 바꿀 수 없고 한국어와 이모지는 그대로 전달한다", () => {
  const raw = buildGmailRaw({ ...contact, to: "attacker@example.com", from: "attacker@example.com" }, env);
  assert.match(raw, /^[A-Za-z0-9_-]+$/);
  const message = Buffer.from(raw, "base64url").toString("utf8");
  const [headers, body] = message.split("\r\n\r\n");
  assert.match(headers, /^From: INTRON GLOBAL Website <intron1101@gmail.com>\r\n/);
  assert.match(headers, /\r\nTo: intron1101@gmail.com\r\n/);
  assert.match(headers, /\r\nReply-To: visitor@example.com\r\n/);
  assert.match(headers, /Content-Type: text\/plain; charset=UTF-8/);
  const text = Buffer.from(body.replace(/\s/g, ""), "base64").toString("utf8");
  assert.ok(text.includes(contact.company));
  assert.ok(text.includes(contact.name));
  assert.ok(text.includes(contact.message));
  assert.doesNotMatch(headers, /attacker@example.com/);
});

test("회사명과 이메일을 이용한 메일 헤더 삽입을 막는다", () => {
  const message = Buffer.from(buildGmailRaw({ ...contact, company: "회사\r\nBcc: attacker@example.com" }, env), "base64url").toString();
  assert.doesNotMatch(message.split("\r\n\r\n")[0], /\r\nBcc:/);
  assert.throws(() => buildGmailRaw({ ...contact, email: "visitor@example.com\r\nBcc: attacker@example.com" }, env));
  assert.throws(() => buildGmailRaw({ ...contact, requestId: "boundary\r\nBcc: attacker" }, env));
});

test("긴 한국어 제목을 UTF-8 손상 없이 접어 보낸다", () => {
  const company = "가".repeat(79) + "😊마지막회사명";
  const message = Buffer.from(buildGmailRaw({ ...contact, company }, env), "base64url").toString();
  const header = message.match(/Subject: ([\s\S]*?)\r\nDate:/)[1];
  const words = [...header.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)];
  assert.ok(words.length > 1);
  assert.ok(words.every(([word]) => word.length <= 75));
  const decoded = words.map(([, value]) => Buffer.from(value, "base64").toString("utf8")).join("");
  assert.equal(decoded, `홈페이지 문의 | ${Array.from(company).slice(0, 80).join("")}`);
  assert.doesNotMatch(decoded, /\uFFFD/);
});

test("Google 토큰·주소 확인 후 Gmail API에 한 번만 전달한다", async () => {
  const mock = googleMock();
  assert.deepEqual(await sendGmail(contact, env, mock.fetcher), { id: "test-message-id" });
  assert.deepEqual(mock.calls.map((call) => new URL(call.url).hostname), ["oauth2.googleapis.com", "openidconnect.googleapis.com", "gmail.googleapis.com"]);
  assert.equal(new URLSearchParams(mock.calls[0].options.body).get("refresh_token"), "test-refresh-token");
  assert.equal(mock.calls[2].options.headers.Authorization, "Bearer test-access-token");
  assert.equal(typeof JSON.parse(mock.calls[2].options.body).raw, "string");
});

test("서버 등록 전 갱신 토큰과 소유 계정을 확인하되 메일을 보내지 않는다", async () => {
  const mock = googleMock();
  assert.equal(await getGmailAuthorization(env, mock.fetcher), "Bearer test-access-token");
  assert.deepEqual(mock.calls.map(call => new URL(call.url).hostname), ["oauth2.googleapis.com", "openidconnect.googleapis.com"]);
});

test("Google 인증 오류는 허용한 원인 코드와 상태만 보존한다", async () => {
  for (const reason of ["invalid_grant", "private-provider-secret"]) {
    await assert.rejects(getGmailAuthorization(env, async () => json({ error: reason, error_description: "private response details" }, 400)), error => {
      assert.equal(error.code, "GMAIL_AUTH_FAILED");
      assert.equal(error.status, 400);
      assert.equal(error.reason, reason === "invalid_grant" ? reason : undefined);
      assert.doesNotMatch(JSON.stringify(error), /private/);
      return true;
    });
  }
});

test("Google의 리디렉션 응답을 따라가거나 연결키를 다른 호스트로 보내지 않는다", async () => {
  let calls = 0;
  await assert.rejects(getGmailAuthorization(env, async (_url, options) => {
    calls++;
    assert.equal(options.redirect, 'manual');
    return new Response(null, {status:302,headers:{Location:'https://untrusted.example/'}});
  }), {code:'GMAIL_AUTH_FAILED',status:302});
  assert.equal(calls, 1);
});

test("업무 계정이 아니거나 읽기 권한이 포함된 토큰이면 메일을 보내지 않는다", async () => {
  for (const override of [
    { identity: { email: "other@gmail.com", email_verified: true } },
    { identity: { email: env.GMAIL_ACCOUNT_EMAIL, email_verified: false } },
    { token: { access_token: "token", token_type: "Bearer", scope: `${scopes} https://mail.google.com/` } }
  ]) {
    const mock = googleMock(override);
    await assert.rejects(sendGmail(contact, env, mock.fetcher));
    assert.equal(mock.calls.some((call) => call.url.endsWith("/messages/send")), false);
  }
});

test("Gmail 실패·불완전 응답은 성공으로 처리하거나 자동 재전송하지 않는다", async () => {
  for (const override of [{ sent: { error: "provider error" }, sendStatus: 403 }, { sent: {} }]) {
    const mock = googleMock(override);
    await assert.rejects(sendGmail(contact, env, mock.fetcher), { code: "GMAIL_SEND_FAILED" });
    assert.equal(mock.calls.filter((call) => call.url.endsWith("/messages/send")).length, 1);
  }
});

function request(body = contact, origin = env.ALLOWED_ORIGINS) {
  return new Request("https://intronglobal.co.kr/api/contact", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
}

test("문의 API는 보안 확인 뒤에만 Google을 호출한다", async (t) => {
  const mock = googleMock();
  t.mock.method(globalThis, "fetch", mock.fetcher);
  const result = await worker.fetch(request(), env);
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { ok: true });
  assert.equal(mock.calls[0].url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
});

test("외부 출처·동의 누락·발송 제한·연결키 누락은 메일 발송 전에 차단한다", async (t) => {
  const mock = googleMock();
  t.mock.method(globalThis, "fetch", mock.fetcher);
  assert.equal((await worker.fetch(request(contact, "https://untrusted.example"), env)).status, 403);
  assert.equal((await worker.fetch(request({ ...contact, privacyConsent: false }), env)).status, 400);
  assert.equal((await worker.fetch(request(), { ...env, GMAIL_REFRESH_TOKEN: "" })).status, 503);
  assert.equal((await worker.fetch(request(), { ...env, CONTACT_RATE_LIMITER: { limit: async () => ({ success: false }) } })).status, 429);
  assert.equal(mock.calls.length, 0);
});

test('정식 도메인의 CORS 사전 요청만 허용하고 Google이나 메일 발송을 호출하지 않는다', async (t) => {
  const mock = googleMock();
  t.mock.method(globalThis, 'fetch', mock.fetcher);
  const production = {...env,ALLOWED_ORIGINS:'https://www.intronglobal.co.kr,https://intronglobal.co.kr'};
  const options = (origin, method='POST', headers='content-type') => new Request('https://intronglobal.dlwnsdn0825.workers.dev/api/contact', {
    method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':method,'Access-Control-Request-Headers':headers}
  });
  for (const origin of production.ALLOWED_ORIGINS.split(',')) {
    const result = await worker.fetch(options(origin),production);
    assert.equal(result.status,204);
    assert.equal(result.headers.get('Access-Control-Allow-Origin'),origin);
    assert.equal(result.headers.get('Access-Control-Allow-Credentials'),null);
    assert.equal(result.headers.get('Access-Control-Allow-Methods'),'POST');
    assert.equal(result.headers.get('Vary'),'Origin');
  }
  const rejected = await worker.fetch(options('https://untrusted.example'),production);
  assert.equal(rejected.status,403);
  assert.equal(rejected.headers.get('Access-Control-Allow-Origin'),null);
  assert.equal((await worker.fetch(options('https://www.intronglobal.co.kr','DELETE'),production)).status,405);
  assert.equal((await worker.fetch(options('https://www.intronglobal.co.kr','POST','authorization'),production)).status,403);
  assert.equal(mock.calls.length,0);
});

test('정식 도메인 문의의 성공과 오류 응답에 해당 출처만 반환한다', async (t) => {
  const mock = googleMock();
  t.mock.method(globalThis,'fetch',mock.fetcher);
  const origin = 'https://www.intronglobal.co.kr';
  const production = {...env,ALLOWED_ORIGINS:origin};
  const accepted = await worker.fetch(request(contact,origin),production);
  assert.equal(accepted.status,200);
  assert.equal(accepted.headers.get('Access-Control-Allow-Origin'),origin);
  const invalid = await worker.fetch(request({...contact,privacyConsent:false},origin),production);
  assert.equal(invalid.status,400);
  assert.equal(invalid.headers.get('Access-Control-Allow-Origin'),origin);
});

test("Gmail 오류 응답과 로그에 문의 내용이나 연결키를 노출하지 않는다", async (t) => {
  const mock = googleMock({ sent: { error: "private provider details" }, sendStatus: 403 });
  t.mock.method(globalThis, "fetch", mock.fetcher);
  const logs = [];
  t.mock.method(console, "error", (...values) => logs.push(values));
  const result = await worker.fetch(request(), env);
  assert.equal(result.status, 502);
  assert.deepEqual(await result.json(), { ok: false, code: "MAIL_SERVICE_ERROR" });
  const logged = JSON.stringify(logs);
  for (const secret of [env.GMAIL_REFRESH_TOKEN, env.GMAIL_CLIENT_SECRET, contact.message, contact.email, "private provider details"]) {
    assert.equal(logged.includes(secret), false);
  }
});

test("OAuth 연결 도구는 발송·기본 주소 확인만 요청하고 PKCE와 일회용 상태를 사용한다", () => {
  const first = createAuthorizationRequest("test.apps.googleusercontent.com");
  const second = createAuthorizationRequest("test.apps.googleusercontent.com");
  const url = new URL(first.url);
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("redirect_uri"), REDIRECT_URI);
  assert.equal(url.searchParams.get("login_hint"), ACCOUNT);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(hasSendOnlyScopes(url.searchParams.get("scope")), true);
  assert.notEqual(first.state, second.state);
  assert.notEqual(first.verifier, second.verifier);
});

test("OAuth 콜백은 잘못된 상태·출처·중복 인증코드를 거절한다", () => {
  const auth = createAuthorizationRequest("test.apps.googleusercontent.com");
  const callback = `${REDIRECT_URI}?state=${auth.state}&code=valid-code`;
  assert.equal(validateCallback(callback, auth.state), "valid-code");
  assert.throws(() => validateCallback(callback, "wrong-state"));
  assert.throws(() => validateCallback(callback.replace("127.0.0.1", "attacker.example"), auth.state));
  assert.throws(() => validateCallback(callback + "&code=second-code", auth.state));
  assert.throws(() => validateCallback(`${REDIRECT_URI}?state=${auth.state}&error=access_denied`, auth.state));
});

test("내려받은 설정은 홈페이지 프로젝트와 정확한 승인 주소를 가진 웹 클라이언트만 허용한다", () => {
  const client = { project_id: "grand-appliance-512611-j6", client_id: "test.apps.googleusercontent.com", client_secret: "test-secret", redirect_uris: [REDIRECT_URI] };
  assert.deepEqual(parseGoogleClientJson({ web: client }), { clientId: client.client_id, clientSecret: client.client_secret });
  for (const invalid of [
    { installed: client },
    { web: { ...client, project_id: "other-project" } },
    { web: { ...client, redirect_uris: ["https://untrusted.example/callback"] } },
    { web: { ...client, client_secret: "" } }
  ]) assert.throws(() => parseGoogleClientJson(invalid), { message: "INVALID_CLIENT_FILE" });
});
