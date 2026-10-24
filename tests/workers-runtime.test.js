import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { Miniflare } from 'miniflare';

test('실제 Workers 실행 환경에서 Google 인증 요청을 구성하며 리디렉션을 따라가지 않는다', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const entry = `
    import { getGmailAuthorization, GMAIL_SEND_SCOPE } from './src/gmail.js';
    export default { async fetch() {
      const modes = [];
      const mockGoogle = async (url, options) => {
        // Use workerd's actual Request constructor to detect unsupported options.
        const request = new Request(url, options);
        modes.push(request.redirect);
        return Response.json(url.includes('/token')
          ? { access_token:'test-token', token_type:'Bearer', scope:'openid email ' + GMAIL_SEND_SCOPE }
          : { email:'intron1101@gmail.com', email_verified:true });
      };
      try {
        await getGmailAuthorization({
          GMAIL_CLIENT_ID:'test.apps.googleusercontent.com', GMAIL_CLIENT_SECRET:'test-secret',
          GMAIL_REFRESH_TOKEN:'test-refresh', GMAIL_ACCOUNT_EMAIL:'intron1101@gmail.com',
          CONTACT_TO_EMAIL:'intron1101@gmail.com'
        }, mockGoogle);
        return Response.json({ok:true,modes});
      } catch (error) { return Response.json({ok:false,code:error.code}, {status:500}); }
    }};
  `;
  const runtime = new Miniflare({
    telemetry: { enabled:false },
    workers: [{
      config: {
        type:'worker',
        name:'gmail-runtime-check',
        compatibilityDate:'2026-09-10',
        manifest: {
          mainModule:'runtime-entry.js',
          modulesRoot:root,
          modules: {
            'runtime-entry.js': {type:'esm',contents:entry},
            ...Object.fromEntries(['src/gmail.js','src/email.js','src/validation.js'].map(file => [file,{type:'esm',contents:readFileSync(path.join(root,file),'utf8')}]))
          }
        }
      },
      dev: {rootPath:root}
    }]
  });
  try {
    const response = await runtime.dispatchFetch('http://localhost/');
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    assert.deepEqual(result, {ok:true,modes:['manual','manual']});
  } finally {
    await runtime.dispose();
  }
});
