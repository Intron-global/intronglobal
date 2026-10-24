import { buildEmailPayload } from "./email.js";

export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const IDENTITY_SCOPES = new Set(["openid", "email", "https://www.googleapis.com/auth/userinfo.email"]);
const MAILBOX = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/;
const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const IDENTITY_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const SEND_ENDPOINT = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const SAFE_GOOGLE_ERRORS = new Set(["invalid_grant", "invalid_client", "unauthorized_client", "access_denied", "invalid_scope", "server_error", "temporarily_unavailable"]);

export class GmailDeliveryError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = "GmailDeliveryError";
    this.code = code;
    if (Number.isInteger(details.status) && details.status >= 100 && details.status <= 599) this.status = details.status;
    if (SAFE_GOOGLE_ERRORS.has(details.reason)) this.reason = details.reason;
  }
}

export function hasSendOnlyScopes(scope) {
  const granted = String(scope || "").split(/\s+/).filter(Boolean);
  return granted.includes(GMAIL_SEND_SCOPE)
    && granted.every((item) => item === GMAIL_SEND_SCOPE || IDENTITY_SCOPES.has(item));
}

export function isGmailConfigured(env) {
  const required = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_ACCOUNT_EMAIL", "CONTACT_TO_EMAIL"];
  return required.every((key) => typeof env[key] === "string" && env[key].trim() && !/^replace_/i.test(env[key]))
    && MAILBOX.test(env.GMAIL_ACCOUNT_EMAIL)
    && env.GMAIL_ACCOUNT_EMAIL === env.CONTACT_TO_EMAIL;
}

function base64(value) {
  const bytes = new TextEncoder().encode(value);
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
}

function encodedSubject(subject) {
  // Keep each encoded word below the RFC 2047 limit without splitting UTF-8 characters.
  const chunks = [];
  let chunk = "";
  for (const character of subject) {
    if (new TextEncoder().encode(chunk + character).length > 42) {
      chunks.push(chunk);
      chunk = "";
    }
    chunk += character;
  }
  if (chunk) chunks.push(chunk);
  return chunks.map((part) => `=?UTF-8?B?${base64(part)}?=`).join("\r\n ");
}

export function buildGmailRaw(contact, env) {
  if (!MAILBOX.test(env.GMAIL_ACCOUNT_EMAIL || "")
    || env.GMAIL_ACCOUNT_EMAIL !== env.CONTACT_TO_EMAIL
    || !MAILBOX.test(contact.email || "")
    || !REQUEST_ID.test(contact.requestId || "")) {
    throw new GmailDeliveryError("GMAIL_INVALID_ENVELOPE");
  }
  const payload = buildEmailPayload(contact, { ...env, CONTACT_FROM_EMAIL: env.GMAIL_ACCOUNT_EMAIL });
  // The visitor controls only Reply-To and the plain-text message, never From or To.
  const message = [
    `From: INTRON GLOBAL Website <${env.GMAIL_ACCOUNT_EMAIL}>`,
    `To: ${env.CONTACT_TO_EMAIL}`,
    `Reply-To: ${contact.email}`,
    `Subject: ${encodedSubject(payload.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <contact.${contact.requestId}@intronglobal.co.kr>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64(payload.text).match(/.{1,76}/g).join("\r\n"),
    ""
  ].join("\r\n");
  return base64(message).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function googleJson(url, options, fetcher, failureCode) {
  let response;
  try {
    response = await fetcher(url, {
      ...options,
      // Workers rejects redirect:"error" before sending. Manual still prevents
      // forwarding credentials to a redirect target; non-2xx is rejected below.
      redirect: "manual",
      signal: AbortSignal.timeout(15_000)
    });
  } catch {
    throw new GmailDeliveryError(failureCode);
  }
  if (!response.ok) {
    let reason;
    try {
      const failure = await response.json();
      if (SAFE_GOOGLE_ERRORS.has(failure.error)) reason = failure.error;
    } catch { /* Never log Google's raw error response or credential details. */ }
    throw new GmailDeliveryError(failureCode, { status: response.status, reason });
  }
  try {
    return await response.json();
  } catch {
    throw new GmailDeliveryError(failureCode);
  }
}

export async function getGmailAuthorization(env, fetcher = fetch) {
  if (!isGmailConfigured(env)) throw new GmailDeliveryError("GMAIL_NOT_CONFIGURED");
  const token = await googleJson(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID,
      client_secret: env.GMAIL_CLIENT_SECRET,
      refresh_token: env.GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token"
    }).toString()
  }, fetcher, "GMAIL_AUTH_FAILED");

  if (typeof token.access_token !== "string" || !token.access_token
    || token.token_type?.toLowerCase() !== "bearer" || !hasSendOnlyScopes(token.scope)) {
    throw new GmailDeliveryError("GMAIL_SCOPE_MISMATCH");
  }
  const authorization = `Bearer ${token.access_token}`;
  // Verify only the signed-in address, using basic identity permission, not Gmail read access.
  const identity = await googleJson(IDENTITY_ENDPOINT, {
    headers: { Authorization: authorization }
  }, fetcher, "GMAIL_IDENTITY_FAILED");
  if (identity.email_verified !== true || identity.email !== env.GMAIL_ACCOUNT_EMAIL) {
    throw new GmailDeliveryError("GMAIL_ACCOUNT_MISMATCH");
  }
  return authorization;
}

export async function sendGmail(contact, env, fetcher = fetch) {
  if (!isGmailConfigured(env)) throw new GmailDeliveryError("GMAIL_NOT_CONFIGURED");
  const raw = buildGmailRaw(contact, env);
  const authorization = await getGmailAuthorization(env, fetcher);
  const sent = await googleJson(SEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ raw })
  }, fetcher, "GMAIL_SEND_FAILED");
  if (typeof sent.id !== "string" || !sent.id) throw new GmailDeliveryError("GMAIL_SEND_FAILED");
  // Do not persist bodies, tokens or mailbox data in the application.
  return { id: sent.id };
}
