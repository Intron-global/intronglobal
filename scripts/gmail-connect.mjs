import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { GMAIL_SEND_SCOPE, getGmailAuthorization, hasSendOnlyScopes } from "../src/gmail.js";

export const ACCOUNT = "intron1101@gmail.com";
export const REDIRECT_URI = "http://127.0.0.1:53682/oauth2/callback";
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATUS_FILE = path.join(PROJECT_ROOT, '.wrangler', 'gmail-connection-status.json');

async function connectionStatus(status, error) {
  await mkdir(path.dirname(STATUS_FILE), { recursive: true });
  const details = { status, updatedAt: new Date().toISOString() };
  if (error?.name === 'GmailDeliveryError') {
    details.code = error.code;
    if (error.status) details.httpStatus = error.status;
    if (error.reason) details.reason = error.reason;
  }
  await writeFile(STATUS_FILE, JSON.stringify(details), 'utf8');
}

export function parseGoogleClientJson(value) {
  const client = value?.web;
  if (client?.project_id !== "grand-appliance-512611-j6"
    || typeof client.client_id !== "string" || !client.client_id.endsWith(".apps.googleusercontent.com")
    || /\s/.test(client.client_id)
    || typeof client.client_secret !== "string" || !client.client_secret.trim() || /[\r\n]/.test(client.client_secret)
    || !Array.isArray(client.redirect_uris) || !client.redirect_uris.includes(REDIRECT_URI)) {
    throw new Error("INVALID_CLIENT_FILE");
  }
  return { clientId: client.client_id, clientSecret: client.client_secret };
}

export function createAuthorizationRequest(clientId) {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: `openid email ${GMAIL_SEND_SCOPE}`,
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: "false",
    login_hint: ACCOUNT,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256"
  }).toString();
  return { url: url.toString(), state, verifier };
}

export function validateCallback(requestUrl, expectedState) {
  const url = new URL(requestUrl, REDIRECT_URI);
  if (url.origin !== new URL(REDIRECT_URI).origin || url.pathname !== "/oauth2/callback"
    || url.searchParams.getAll("state").length !== 1) throw new Error("INVALID_CALLBACK");
  const state = Buffer.from(url.searchParams.get("state") || "");
  const expected = Buffer.from(expectedState);
  if (state.length !== expected.length || !timingSafeEqual(state, expected)) throw new Error("STATE_MISMATCH");
  if (url.searchParams.has("error")) throw new Error("CONSENT_NOT_GRANTED");
  const code = url.searchParams.get("code");
  if (!code || code.length > 4096 || url.searchParams.getAll("code").length !== 1) throw new Error("CODE_MISSING");
  return code;
}

async function googleJson(url, options) {
  try {
    const result = await fetch(url, { ...options, redirect: "error", signal: AbortSignal.timeout(15_000) });
    if (!result.ok) throw new Error();
    return await result.json();
  } catch {
    throw new Error("GOOGLE_AUTH_FAILED");
  }
}

async function authorize(clientId, clientSecret, authorization) {
  return new Promise((resolve, reject) => {
    let consumed = false;
    const finish = (error, tokens) => {
      clearTimeout(timeout);
      server.close();
      if (error) reject(error); else resolve(tokens);
    };
    const server = createServer(async (request, response) => {
      response.setHeader("Content-Type", "text/plain; charset=utf-8");
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
      response.setHeader("Referrer-Policy", "no-referrer");
      response.setHeader("X-Content-Type-Options", "nosniff");
      if (request.headers.host !== "127.0.0.1:53682" || request.method !== "GET") {
        response.writeHead(400).end("요청을 확인할 수 없습니다.");
        return;
      }
      if (!request.url?.startsWith("/oauth2/callback?")) {
        response.writeHead(404).end("연결 승인용 주소가 아닙니다.");
        return;
      }
      if (consumed) { response.writeHead(409).end("이미 처리한 연결 요청입니다."); return; }
      let code;
      try { code = validateCallback(request.url, authorization.state); }
      catch (error) {
        response.writeHead(400).end("연결 요청을 확인하지 못했습니다. 터미널에서 다시 시작해 주세요.");
        if (error.message === "CONSENT_NOT_GRANTED") finish(error);
        return;
      }
      consumed = true;
      try {
        const tokens = await googleJson("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            code_verifier: authorization.verifier,
            redirect_uri: REDIRECT_URI,
            grant_type: "authorization_code"
          }).toString()
        });
        if (!tokens.access_token || !tokens.refresh_token || !hasSendOnlyScopes(tokens.scope)) {
          throw new Error("SEND_ONLY_PERMISSION_REQUIRED");
        }
        const identity = await googleJson("https://openidconnect.googleapis.com/v1/userinfo", {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        if (identity.email !== ACCOUNT || identity.email_verified !== true) throw new Error("OWNER_ACCOUNT_REQUIRED");
        response.end("업무용 Gmail 주소와 발송 권한을 확인했습니다. 터미널로 돌아가 서버 등록을 완료해 주세요. 이 창은 닫아도 됩니다.");
        finish(null, tokens);
      } catch (error) {
        response.writeHead(400).end("Gmail 연결을 완료하지 못했습니다. 터미널의 안내를 확인해 주세요.");
        finish(error);
      }
    });
    const timeout = setTimeout(() => finish(new Error("APPROVAL_TIMED_OUT")), 10 * 60 * 1000);
    server.once("error", () => finish(new Error("LOCAL_CALLBACK_UNAVAILABLE")));
    server.listen(53682, "127.0.0.1", () => {
      console.log("\n아래 링크를 브라우저에서 열고 intron1101@gmail.com 계정으로 직접 승인해 주세요.");
      console.log("요청 권한: 메일 발송 + 로그인한 이메일 주소 확인. 메일 읽기/삭제 권한은 요청하지 않습니다.");
      console.log(authorization.url);
      if (process.platform === "win32") {
        // Open the owner's consent screen; the owner still grants permission in Google.
        const browser = spawn("rundll32.exe", ["url.dll,FileProtocolHandler", authorization.url], { windowsHide: true, stdio: "ignore" });
        browser.on("error", () => console.log("브라우저를 열지 못했습니다. 위 Google 링크를 직접 열어 주세요."));
        browser.unref();
      }
    });
  });
}

async function uploadSecrets(values) {
  const executable = path.join(PROJECT_ROOT, "node_modules", "wrangler", "bin", "wrangler.js");
  return new Promise((resolve, reject) => {
    // Pipe secrets through stdin; never expose them in process arguments, files or terminal output.
    const child = spawn(process.execPath, [executable, "secret", "bulk"], {
      cwd: PROJECT_ROOT,
      windowsHide: true,
      env: { ...process.env, WRANGLER_WRITE_LOGS: "false", WRANGLER_LOG_SANITIZE: "true", WRANGLER_SEND_METRICS: "false" },
      stdio: ["pipe", "ignore", "ignore"]
    });
    child.on("error", () => reject(new Error("CLOUDFLARE_SECRET_UPLOAD_FAILED")));
    child.stdin.on("error", () => {});
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error("CLOUDFLARE_SECRET_UPLOAD_FAILED")));
    child.stdin.end(JSON.stringify(values));
  });
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("Gmail 연결 도구: npm run gmail:connect");
    console.log(`업무 계정: ${ACCOUNT}\n등록할 OAuth 리디렉션 주소: ${REDIRECT_URI}`);
    console.log("Google Cloud에서 Gmail API 활성화 및 웹 애플리케이션 OAuth 클라이언트 생성 후 실행하세요.");
    console.log("준비: npx wrangler login. 승인된 연결키는 사용자 확인 후 Cloudflare Worker Secrets에만 저장합니다.");
    console.log("이 도구는 실제 문의 메일을 보내거나 사이트를 배포하지 않습니다.");
    console.log("Google에서 내려받은 웹 클라이언트 JSON을 사용하려면 --client-file <파일 경로>를 추가하세요. 키 값은 출력하지 않습니다.");
    console.log("--downloaded-client는 다운로드 폴더의 가장 최근 client_secret JSON을 읽고 홈페이지 프로젝트인지 검사합니다.");
    return;
  }
  if (!process.stdin.isTTY) throw new Error("INTERACTIVE_TERMINAL_REQUIRED");
  console.log("Gmail 문의 발송 연결 — 비밀번호와 앱 비밀번호는 사용하지 않습니다.");
  console.log("Google Cloud의 웹 애플리케이션 OAuth 클라이언트를 준비해 주세요.");
  console.log(`등록할 리디렉션 주소: ${REDIRECT_URI}`);
  let muted = false;
  const output = new Writable({ write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding);
    callback();
  } });
  const input = createInterface({ input: process.stdin, output, terminal: true });
  const ask = async (label, secret = false) => {
    process.stdout.write(label);
    muted = secret;
    const value = await new Promise((resolve) => input.question("", resolve));
    muted = false;
    if (secret) process.stdout.write("\n");
    return value.trim();
  };
  try {
    let imported;
    const fileOption = process.argv.indexOf("--client-file");
    const useDownloadedClient = process.argv.includes("--downloaded-client");
    if (fileOption !== -1 || useDownloadedClient) {
      try {
        let clientFile = fileOption === -1 ? null : process.argv[fileOption + 1];
        if (useDownloadedClient && fileOption === -1) {
          const downloads = path.join(homedir(), "Downloads");
          const entries = (await readdir(downloads, { withFileTypes: true })).filter(entry => entry.isFile() && /^client_secret.*\.json$/i.test(entry.name));
          const files = await Promise.all(entries.map(async entry => {
            const file = path.join(downloads, entry.name);
            return { file, modified: (await stat(file)).mtimeMs };
          }));
          clientFile = files.sort((a, b) => b.modified - a.modified)[0]?.file;
        }
        if (!clientFile || clientFile.startsWith("--")) throw new Error();
        imported = parseGoogleClientJson(JSON.parse(await readFile(clientFile, "utf8")));
      } catch {
        throw new Error("INVALID_CLIENT_FILE");
      }
      console.log("Google에서 내려받은 홈페이지 전용 설정 파일을 확인했습니다. 연결키는 화면에 표시하지 않습니다.");
    }
    const clientId = imported?.clientId || await ask("OAuth 클라이언트 ID: ");
    if (!clientId.endsWith(".apps.googleusercontent.com") || /\s/.test(clientId)) throw new Error("INVALID_CLIENT_ID");
    const clientSecret = imported?.clientSecret || await ask("OAuth 클라이언트 보안 비밀 (입력 내용 숨김): ", true);
    if (!clientSecret) throw new Error("CLIENT_SECRET_REQUIRED");
    await connectionStatus('awaiting_authorization');
    const tokens = await authorize(clientId, clientSecret, createAuthorizationRequest(clientId));
    // Check the refresh grant as well as the initial authorization before storing it.
    await getGmailAuthorization({
      GMAIL_CLIENT_ID: clientId,
      GMAIL_CLIENT_SECRET: clientSecret,
      GMAIL_REFRESH_TOKEN: tokens.refresh_token,
      GMAIL_ACCOUNT_EMAIL: ACCOUNT,
      CONTACT_TO_EMAIL: ACCOUNT
    });
    await connectionStatus('awaiting_registration');
    console.log(`\n${ACCOUNT} 계정과 발송 권한을 확인했습니다. 테스트 메일은 보내지 않았습니다.`);
    console.log("등록 대상: Cloudflare 계정 721b3e3614eca747991c7719f9ae1ec9의 기존 Worker intronglobal.");
    console.log("클라이언트 ID/보안 비밀/갱신 토큰 3개를 Cloudflare Secrets로 등록합니다. 로컬 파일에는 저장하지 않습니다.");
    const answer = await ask("이 대상이 맞으면 '등록'을 입력하세요. 다른 입력은 취소합니다: ");
    if (answer !== "등록") { await connectionStatus('canceled'); console.log("등록을 취소했습니다. 키는 저장하지 않았습니다."); return; }
    await uploadSecrets({ GMAIL_CLIENT_ID: clientId, GMAIL_CLIENT_SECRET: clientSecret, GMAIL_REFRESH_TOKEN: tokens.refresh_token });
    await connectionStatus('connected');
    console.log("갱신 토큰으로 재인증까지 확인한 뒤 Gmail 연결키를 등록했습니다. 실제 메일 수신은 홈페이지에서 별도로 확인해 주세요.");
  } finally {
    input.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(async (error) => {
    await connectionStatus('failed', error).catch(() => {});
    const messages = {
      OWNER_ACCOUNT_REQUIRED: "intron1101@gmail.com 계정으로 승인해야 합니다.",
      SEND_ONLY_PERMISSION_REQUIRED: "메일 발송 권한과 기본 이메일 주소 확인 권한만 허용해야 합니다. 갱신 토큰 발급도 필요합니다.",
      CONSENT_NOT_GRANTED: "Google 연결 승인을 취소했습니다.",
      APPROVAL_TIMED_OUT: "승인 대기 시간이 지났습니다. 다시 실행해 주세요.",
      LOCAL_CALLBACK_UNAVAILABLE: "로컬 승인 주소를 열 수 없습니다. 53682 포트의 사용 여부를 확인해 주세요.",
      CLOUDFLARE_SECRET_UPLOAD_FAILED: "Cloudflare 키 등록에 실패했습니다. npx wrangler login과 계정/Worker 권한을 확인한 뒤 다시 연결해 주세요.",
      INTERACTIVE_TERMINAL_REQUIRED: "직접 입력할 수 있는 터미널에서 npm run gmail:connect를 실행해 주세요.",
      INVALID_CLIENT_ID: "Google Cloud의 OAuth 클라이언트 ID를 입력해 주세요.",
      CLIENT_SECRET_REQUIRED: "OAuth 클라이언트 보안 비밀이 필요합니다.",
      INVALID_CLIENT_FILE: "내려받은 JSON이 홈페이지 전용 웹 클라이언트 파일인지, 승인 주소가 일치하는지 확인해 주세요. 키 값은 출력하지 않았습니다."
    };
    console.error(messages[error.message] || "Google 연결을 완료하지 못했습니다. OAuth 설정, Gmail API 활성화와 인터넷 연결을 확인해 주세요.");
    process.exitCode = 1;
  });
}
