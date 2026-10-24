import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/contact-api.js', import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

async function formFixture() {
  const element = () => ({
    hidden: false, disabled: false, textContent: '', innerHTML: '문의 보내기',
    handlers: {}, setAttribute() {}, after() {},
    addEventListener(type, handler) { this.handlers[type] = handler; }
  });
  const button = element(), status = element(), widget = element(), created = [];
  const form = element();
  form.elements = Object.fromEntries(Object.entries({ company: '테스트 회사', name: '담당자', email: 'visitor@example.com', message: '수출입 문의를 위한 테스트 내용입니다.', website: '' }).map(([key, value]) => [key, { value }]));
  form.elements.privacyConsent = { checked: true };
  form.querySelector = selector => ({ 'button[type="submit"]': button, '.form-status': status, '.turnstile-field': widget })[selector];
  form.reset = () => { form.resetCount = (form.resetCount || 0) + 1; };
  const target = { querySelector: () => form };
  const state = { token: '', calls: 0, resets: 0, response: { ok: true, json: async () => ({ ok: true }) } };
  const turnstile = {
    render(_element, options) { state.options = options; return 1; },
    reset() { state.token = ''; state.resets++; },
    getResponse() { return state.token; }
  };
  const window = { turnstile, crypto: { randomUUID: () => '123e4567-e89b-42d3-a456-426614174000' } };
  vm.runInNewContext(source, {
    window,
    document: {
      querySelector: selector => selector === '.contact-page' ? target : { content: selector.includes('contact-api-endpoint') ? 'https://intronglobal.dlwnsdn0825.workers.dev/api/contact' : 'test-public-site-key' },
      createElement() { const result = element(); created.push(result); return result; }
    },
    fetch: async (url, options) => { state.calls++; state.url=url; state.credentials=options.credentials; return state.response; }
  });
  window.IntronContactForm.render('ko');
  await settle();
  return { state, button, status, form, challengeStatus: created[0], retry: created[1], submit: () => form.handlers.submit({ preventDefault() {} }) };
}

test('인증 실패·만료 시 전송을 막고 입력을 보존한 채 다시 인증할 수 있다', async () => {
  const f = await formFixture();
  assert.equal(f.button.disabled, true);
  f.state.options['error-callback']('300030');
  assert.equal(f.retry.hidden, false);
  assert.match(f.challengeStatus.textContent, /인증을 다시 시도/);
  await f.submit();
  assert.equal(f.state.calls, 0);
  f.retry.handlers.click();
  await settle();
  assert.equal(f.state.resets, 1);
  assert.equal(f.form.elements.company.value, '테스트 회사');
  f.state.token = 'test-token';
  f.state.options.callback('test-token');
  assert.equal(f.button.disabled, false);
  f.state.options['expired-callback']();
  f.state.token = '';
  assert.equal(f.button.disabled, true);
  await f.submit();
  assert.equal(f.state.calls, 0);
});

test('HTML 200 응답을 문의 성공으로 표시하지 않고 재인증 후에만 재전송한다', async () => {
  const f = await formFixture();
  f.state.token = 'test-token';
  f.state.options.callback('test-token');
  f.state.response = { ok: true, json: async () => { throw new SyntaxError('HTML response'); } };
  await f.submit();
  await settle();
  assert.equal(f.state.calls, 1);
  assert.equal(f.state.url, 'https://intronglobal.dlwnsdn0825.workers.dev/api/contact');
  assert.equal(f.state.credentials, 'omit');
  assert.equal(f.form.resetCount || 0, 0);
  assert.equal(f.status.className, 'form-status error');
  assert.equal(f.button.disabled, true);
  assert.equal(f.form.elements.company.value, '테스트 회사');
  await f.submit();
  assert.equal(f.state.calls, 1);
});
