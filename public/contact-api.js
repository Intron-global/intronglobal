(function () {
  let turnstileLoader;

  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (turnstileLoader) return turnstileLoader;

    turnstileLoader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => {
        turnstileLoader = null;
        reject(new Error('TURNSTILE_LOAD_FAILED'));
      };
      document.head.append(script);
    });
    return turnstileLoader;
  }

  function requestId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
      const random = Math.random() * 16 | 0;
      const value = character === 'x' ? random : (random & 0x3 | 0x8);
      return value.toString(16);
    });
  }

  function messageFor(code, locale) {
    const messages = {
      RATE_LIMITED: ['요청이 너무 많습니다. 1분 후 다시 시도해 주세요.', 'Too many requests. Please try again in one minute.'],
      CHALLENGE_FAILED: ['자동입력 방지 확인을 완료하지 못했습니다. 다시 시도해 주세요.', 'Verification failed. Please try again.'],
      SERVICE_NOT_CONFIGURED: ['문의 서비스를 준비하고 있습니다. 이메일로 문의해 주세요.', 'The inquiry service is being configured. Please contact us by email.'],
      MAIL_SERVICE_ERROR: ['메일 전송을 완료하지 못했습니다. 잠시 후 다시 시도하거나 이메일로 문의해 주세요.', 'We could not complete email delivery. Please try again later or contact us by email.'],
      INVALID_MESSAGE: ['문의 내용은 20자 이상 입력해 주세요.', 'Please enter at least 20 characters in your message.'],
      PRIVACY_CONSENT_REQUIRED: ['개인정보 처리에 동의해 주세요.', 'Please agree to the privacy notice.']
    };
    const fallback = ['문의를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.', 'Sending failed. Please try again shortly.'];
    const pair = messages[code] || fallback;
    return locale === 'ko' ? pair[0] : pair[1];
  }

  function render(locale) {
    const ko = locale === 'ko';
    const copy = ko ? {
      company: '회사명', companyHint: '회사명을 입력해 주세요',
      name: '담당자 성함', nameHint: '성함을 입력해 주세요',
      email: '이메일', message: '문의 내용', messageHint: '필요한 제품, 수량, 수출입·유통 관련 문의를 적어 주세요',
      notice: '입력하신 정보는 문의에 답변드리는 데 사용합니다. <a href="/mail-privacy.html" target="_blank" rel="noopener">개인정보 안내</a>',
      consent: '문의 답변을 위해 회사명, 이름, 이메일, 문의 내용을 처리하는 데 동의합니다.',
      send: '문의 보내기 <span>↗</span>', sending: '전송 중...',
      success: '문의가 정상적으로 접수되었습니다.', setup: '문의 서비스를 준비하고 있습니다. 이메일로 문의해 주세요.'
    } : {
      company: 'COMPANY', companyHint: 'Your company',
      name: 'NAME', nameHint: 'Your name',
      email: 'EMAIL', message: 'MESSAGE', messageHint: 'Tell us about your product sourcing, quantity, import, export or distribution inquiry',
      notice: 'We process the submitted information to respond to your inquiry. <a href="/mail-privacy.html" target="_blank" rel="noopener" lang="ko">Privacy notice (Korean)</a>',
      consent: 'I agree to the processing of my company, name, email and message for an inquiry response.',
      send: 'Send inquiry <span>↗</span>', sending: 'Sending...',
      success: 'Your inquiry has been sent.', setup: 'The inquiry service is being configured. Please contact us by email.'
    };

    const target = document.querySelector('.contact-page');
    if (!target) return;

    target.innerHTML = `<form class="form inquiry-form"><div class="field"><label>${copy.company}</label><input name="company" required minlength="2" maxlength="100" autocomplete="organization" placeholder="${copy.companyHint}"></div><div class="field"><label>${copy.name}</label><input name="name" required minlength="2" maxlength="80" autocomplete="name" placeholder="${copy.nameHint}"></div><div class="field full"><label>${copy.email}</label><input name="email" required type="email" maxlength="254" autocomplete="email" placeholder="email@company.com"></div><div class="field full"><label>${copy.message}</label><textarea name="message" required minlength="20" maxlength="5000" placeholder="${copy.messageHint}"></textarea></div><input class="honeypot" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true"><label class="consent-field"><input name="privacyConsent" type="checkbox" required><span>${copy.consent}</span></label><div class="turnstile-field" aria-label="${ko ? '자동입력 방지 확인' : 'Robot verification'}"></div><p class="notice">${copy.notice}</p><p class="form-status" role="status" aria-live="polite"></p><button class="button button-primary" type="submit">${copy.send}</button></form>`;

    const form = target.querySelector('.inquiry-form');
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector('.form-status');
    const challengeStatus = document.createElement('p');
    challengeStatus.className = 'challenge-status';
    challengeStatus.setAttribute('role', 'status');
    challengeStatus.setAttribute('aria-live', 'polite');
    const retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.className = 'challenge-retry';
    retryButton.textContent = ko ? '인증 다시 시도' : 'Retry verification';
    retryButton.hidden = true;
    form.querySelector('.turnstile-field').after(challengeStatus, retryButton);
    const siteKey = document.querySelector('meta[name="turnstile-site-key"]')?.content.trim() || '';
    const apiEndpoint = document.querySelector('meta[name="contact-api-endpoint"]')?.content.trim() || '/api/contact';
    let widgetId = null;
    let challengeReady = false;
    let sending = false;
    button.disabled = true;

    function challengeMessage(message, failed = false) {
      challengeReady = false;
      button.disabled = true;
      challengeStatus.textContent = message;
      challengeStatus.className = failed ? 'challenge-status error' : 'challenge-status';
      retryButton.hidden = !failed;
    }

    function startVerification() {
      challengeMessage(ko ? '자동입력 방지 확인 중입니다. 잠시만 기다려 주세요.' : 'Verifying your browser. Please wait.');
      return loadTurnstile()
        .then((turnstile) => {
          if (widgetId !== null) {
            turnstile.reset(widgetId);
            return;
          }
          widgetId = turnstile.render(form.querySelector('.turnstile-field'), {
            sitekey: siteKey,
            action: 'contact',
            theme: 'light',
            callback: () => {
              challengeReady = true;
              challengeStatus.textContent = '';
              challengeStatus.className = 'challenge-status';
              retryButton.hidden = true;
              button.disabled = sending;
            },
            'error-callback': () => {
              challengeMessage(ko
                ? '자동입력 방지 확인에 실패했습니다. 인증을 다시 시도해 주세요. 계속 실패하면 다른 브라우저에서 열거나 intron1101@gmail.com으로 문의해 주세요.'
                : 'Verification failed. Please retry. If it keeps failing, try another browser or email intron1101@gmail.com.', true);
              return true;
            },
            'expired-callback': () => {
              challengeMessage(ko ? '인증 시간이 지나 다시 확인하고 있습니다.' : 'Verification expired. Checking again.', true);
            },
            'timeout-callback': () => {
              challengeMessage(ko ? '인증 시간이 초과되었습니다. 인증을 다시 시도해 주세요.' : 'Verification timed out. Please retry.', true);
            }
          });
        })
        .catch(() => {
          challengeMessage(ko
            ? '자동입력 방지 화면을 불러오지 못했습니다. 인증을 다시 시도하거나 intron1101@gmail.com으로 문의해 주세요.'
            : 'Could not load verification. Please retry or email intron1101@gmail.com.', true);
        });
    }

    retryButton.addEventListener('click', () => {
      if (!sending) startVerification();
    });

    if (!siteKey || siteKey.startsWith('REPLACE_')) {
      button.disabled = true;
      status.textContent = copy.setup;
      status.className = 'form-status error';
      return;
    }

    startVerification();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (form.elements.website.value.trim()) return;

      const turnstileToken = widgetId === null ? '' : window.turnstile?.getResponse(widgetId);
      if (!turnstileToken) {
        challengeMessage(ko ? '인증 시간이 지났습니다. 인증을 다시 시도해 주세요.' : 'Verification expired. Please retry.', true);
        return;
      }

      const original = button.innerHTML;
      sending = true;
      button.disabled = true;
      retryButton.disabled = true;
      button.textContent = copy.sending;
      status.textContent = '';
      status.className = 'form-status';

      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          credentials: 'omit',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: form.elements.company.value,
            name: form.elements.name.value,
            email: form.elements.email.value,
            message: form.elements.message.value,
            website: form.elements.website.value,
            privacyConsent: form.elements.privacyConsent.checked,
            turnstileToken,
            requestId: requestId()
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.ok !== true) throw new Error(data.code || 'SEND_FAILED');

        form.reset();
        startVerification();
        status.textContent = copy.success;
        status.className = 'form-status success';
      } catch (error) {
        startVerification();
        status.textContent = messageFor(error.message, locale);
        status.className = 'form-status error';
      } finally {
        sending = false;
        retryButton.disabled = false;
        button.disabled = !challengeReady;
        button.innerHTML = original;
      }
    });
  }

  window.IntronContactForm = { render };
}());
