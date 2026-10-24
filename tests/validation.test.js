import assert from "node:assert/strict";
import test from "node:test";
import { buildEmailPayload } from "../src/email.js";
import { escapeHtml, validateContactPayload } from "../src/validation.js";

const validPayload = {
  company: "INTRON GLOBAL",
  name: "홍길동",
  email: "USER@example.com",
  message: "문의 내용이 스무 글자를 충분히 넘도록 작성한 테스트 메시지입니다.",
  turnstileToken: "token",
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  website: "",
  privacyConsent: true
};

test("정상 문의를 정규화한다", () => {
  const result = validateContactPayload(validPayload);
  assert.equal(result.ok, true);
  assert.equal(result.value.email, "user@example.com");
});

test("허니팟 입력을 거절한다", () => {
  const result = validateContactPayload({ ...validPayload, website: "spam.example" });
  assert.deepEqual(result, { ok: false, code: "SPAM" });
});

test("개인정보 처리 동의가 필요하다", () => {
  const result = validateContactPayload({ ...validPayload, privacyConsent: false });
  assert.equal(result.code, "PRIVACY_CONSENT_REQUIRED");
});

test("HTML을 이스케이프한다", () => {
  assert.equal(escapeHtml('<script>alert("x")</script>'), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
});

test("메일 본문에 원본 HTML을 넣지 않는다", () => {
  const result = validateContactPayload({ ...validPayload, company: "<b>INTRON</b>" });
  const email = buildEmailPayload(result.value, {
    CONTACT_FROM_EMAIL: "Website <website@example.com>",
    CONTACT_TO_EMAIL: "contact@example.com"
  });
  assert.doesNotMatch(email.html, /<b>INTRON<\/b>/);
  assert.match(email.html, /&lt;b&gt;INTRON&lt;\/b&gt;/);
});
