const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateContactPayload(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, code: "INVALID_BODY" };
  }

  const value = {
    company: cleanString(input.company),
    name: cleanString(input.name),
    email: cleanString(input.email).toLowerCase(),
    message: cleanString(input.message),
    turnstileToken: cleanString(input.turnstileToken),
    requestId: cleanString(input.requestId),
    website: cleanString(input.website),
    privacyConsent: input.privacyConsent === true
  };

  if (value.website) return { ok: false, code: "SPAM" };
  if (value.company.length < 2 || value.company.length > 100) return { ok: false, code: "INVALID_COMPANY" };
  if (value.name.length < 2 || value.name.length > 80) return { ok: false, code: "INVALID_NAME" };
  if (value.email.length > 254 || !EMAIL_PATTERN.test(value.email)) return { ok: false, code: "INVALID_EMAIL" };
  if (value.message.length < 20 || value.message.length > 5000) return { ok: false, code: "INVALID_MESSAGE" };
  if (!value.turnstileToken || value.turnstileToken.length > 2048) return { ok: false, code: "INVALID_CHALLENGE" };
  if (!UUID_PATTERN.test(value.requestId)) return { ok: false, code: "INVALID_REQUEST_ID" };
  if (!value.privacyConsent) return { ok: false, code: "PRIVACY_CONSENT_REQUIRED" };

  return { ok: true, value };
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function splitCsv(value) {
  return new Set(String(value || "").split(",").map((item) => item.trim()).filter(Boolean));
}
