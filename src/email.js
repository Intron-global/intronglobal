import { escapeHtml } from "./validation.js";

function cleanSubject(value) {
  return Array.from(value.replace(/[\r\n]+/g, " ")).slice(0, 80).join("");
}

export function buildEmailPayload(contact, env) {
  const company = cleanSubject(contact.company);
  const safe = {
    company: escapeHtml(contact.company),
    name: escapeHtml(contact.name),
    email: escapeHtml(contact.email),
    message: escapeHtml(contact.message).replaceAll("\n", "<br>")
  };

  return {
    from: env.CONTACT_FROM_EMAIL,
    to: [env.CONTACT_TO_EMAIL],
    reply_to: contact.email,
    subject: `홈페이지 문의 | ${company}`,
    text: [
      `회사명: ${contact.company}`,
      `담당자명: ${contact.name}`,
      `이메일: ${contact.email}`,
      "",
      contact.message
    ].join("\n"),
    html: `<h2>홈페이지 문의</h2><p><strong>회사명:</strong> ${safe.company}</p><p><strong>담당자명:</strong> ${safe.name}</p><p><strong>이메일:</strong> ${safe.email}</p><hr><p>${safe.message}</p>`
  };
}
