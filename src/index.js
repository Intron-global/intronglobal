import { GmailDeliveryError, isGmailConfigured, sendGmail } from "./gmail.js";
import { splitCsv, validateContactPayload } from "./validation.js";

const MAX_BODY_BYTES = 16 * 1024;

const API_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff"
};

function response(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...API_HEADERS, ...extraHeaders }
  });
}

function isAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  return Boolean(origin && splitCsv(env.ALLOWED_ORIGINS).has(origin));
}

function withCors(result, request, env) {
  const headers = new Headers(result.headers);
  headers.set('Vary', 'Origin');
  if (isAllowedOrigin(request, env)) headers.set('Access-Control-Allow-Origin', request.headers.get('Origin'));
  return new Response(result.body, { status:result.status, headers });
}

function preflight(request, env) {
  if (!isAllowedOrigin(request, env)) return response(403, {ok:false,code:'ORIGIN_NOT_ALLOWED'});
  if (request.headers.get('Access-Control-Request-Method') !== 'POST') {
    return response(405, {ok:false,code:'METHOD_NOT_ALLOWED'}, {Allow:'POST, OPTIONS'});
  }
  const requestedHeaders = (request.headers.get('Access-Control-Request-Headers') || '').toLowerCase().split(',').map(value=>value.trim()).filter(Boolean);
  if (requestedHeaders.some(value=>value !== 'content-type')) return response(403, {ok:false,code:'HEADERS_NOT_ALLOWED'});
  return new Response(null, {status:204,headers:{
    ...API_HEADERS,
    'Access-Control-Allow-Methods':'POST',
    'Access-Control-Allow-Headers':'Content-Type',
    'Access-Control-Max-Age':'600'
  }});
}

async function verifyTurnstile(secret, token, ip, allowedHostnames) {
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (ip !== "unknown") body.set("remoteip", ip);

  const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body
  });
  if (!verification.ok) return false;

  const result = await verification.json();
  return result.success === true
    && result.action === "contact"
    && allowedHostnames.has(result.hostname);
}

async function handleContact(request, env) {
  if (!isAllowedOrigin(request, env)) return response(403, { ok: false, code: "ORIGIN_NOT_ALLOWED" });
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    return response(415, { ok: false, code: "UNSUPPORTED_MEDIA_TYPE" });
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) return response(413, { ok: false, code: "BODY_TOO_LARGE" });

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return response(413, { ok: false, code: "BODY_TOO_LARGE" });
  }

  let input;
  try {
    input = JSON.parse(rawBody);
  } catch {
    return response(400, { ok: false, code: "INVALID_JSON" });
  }

  if (typeof input?.website === "string" && input.website.trim()) {
    return response(200, { ok: true });
  }

  const validated = validateContactPayload(input);
  if (!validated.ok) return response(400, { ok: false, code: validated.code });

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const rateLimit = await env.CONTACT_RATE_LIMITER.limit({ key: ip });
  if (!rateLimit.success) {
    return response(429, { ok: false, code: "RATE_LIMITED" }, { "Retry-After": "60" });
  }

  if (!env.TURNSTILE_SECRET || !isGmailConfigured(env)) {
    return response(503, { ok: false, code: "SERVICE_NOT_CONFIGURED" });
  }

  const challengeValid = await verifyTurnstile(
    env.TURNSTILE_SECRET,
    validated.value.turnstileToken,
    ip,
    splitCsv(env.ALLOWED_HOSTNAMES)
  );
  if (!challengeValid) return response(400, { ok: false, code: "CHALLENGE_FAILED" });

  await sendGmail(validated.value, env);
  return response(200, { ok: true });
}

async function handleApi(request, env) {
    if (request.method === 'OPTIONS') return preflight(request, env);
    if (request.method !== "POST") {
      return response(405, { ok: false, code: "METHOD_NOT_ALLOWED" }, { "Allow": "POST, OPTIONS" });
    }

    try {
      return await handleContact(request, env);
    } catch (error) {
      if (error instanceof GmailDeliveryError) {
        console.error("Contact mail delivery failed", { code: error.code, status: error.status, reason: error.reason });
        return response(502, { ok: false, code: "MAIL_SERVICE_ERROR" });
      }
      console.error("Contact API failed", { name: error?.name || "Error" });
      return response(500, { ok: false, code: "INTERNAL_ERROR" });
    }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/contact') return env.ASSETS.fetch(request);
    return withCors(await handleApi(request, env), request, env);
  }
};
