import { esc } from '../utils.js';
import { params } from '../context.js';
import { $, $$, meta, notify, pageHead } from '../ui.js';
import { t } from '../i18n.js';
import { button, guard, inp, label, safeAction, select } from '../forms.js';
import { state } from '../state.js';
import { write } from '../utils.js';

export function nextUrl() {
  const value = params.get('next') || 'hesabim.html';
  try {
    const u = new URL(value, location.href);
    return u.origin === location.origin && u.pathname.endsWith('.html')
      ? u.href
      : new URL('hesabim.html', location.href).href;
  } catch {
    return 'hesabim.html';
  }
}

export async function loginPage() {
  meta(t('signin'));
  let mode = params.get('mode') || 'signin';
  const pending = await state.db?.auth.pendingEmail?.();
  if (pending?.error) throw pending.error;
  if (pending?.data) {
    await codeForm(pending.data);
    return;
  }
  function draw() {
    $('#main').innerHTML =
      pageHead('signin') +
      (`<div class="auth panel"><div class="tabs">` +
        `${['signin', 'register', 'reset'].map((k) => `<button data-auth="${esc(k)}" class="${mode === k ? 'active' : ''}">${esc(t(k))}</button>`).join('')}` +
        `</div><form id="auth-form">` +
        `${
          mode === 'register'
            ? `${label('name', inp('ad', 'text', '', 'required maxlength="100"'))}` +
              `${label(
                'type',
                select(
                  'tip',
                  [
                    ['bireysel', 'personal'],
                    ['kurumsal', 'business'],
                  ],
                  'bireysel',
                  false,
                ),
              )}` +
              `<div id="company-fields" hidden>` +
              `${label('companyName', inp('firma', 'text', '', 'maxlength="140"'))}` +
              `${label('companyType', select('tur', ['galeri', 'yetkili_satici', 'parca_tedarikcisi', 'ekspertiz_merkezi'], 'galeri', false))}` +
              `${label('tax', inp('vergi', 'text', '', 'maxlength="40"'))}` +
              `</div>`
            : ''
        }` +
        `${mode !== 'password' ? label('email', inp('email', 'email', '', 'required autocomplete="email"')) : ''}` +
        `${mode !== 'reset' ? label('password', inp('password', 'password', '', 'required minlength="10" autocomplete="' + (mode === 'signin' ? 'current-password' : 'new-password') + '"')) : ''}` +
        `${
          mode === 'register'
            ? `<label class="check"><input type="checkbox" required>` +
              `${esc(t('acceptTerms'))}` +
              `</label><div class="actions"><a href="sayfa.html?s=bireysel-uye-sozlesmesi">` +
              `${esc(t('personalTerms'))}` +
              `</a><a href="sayfa.html?s=kurumsal-uye-sozlesmesi">` +
              `${esc(t('businessTerms'))}` +
              `</a><a href="sayfa.html?s=gizlilik-politikasi">` +
              `${esc(t('privacy'))}` +
              `</a></div>`
            : ''
        }` +
        `${button(mode === 'password' ? 'changePassword' : mode)}` +
        `</form></div>`);
    $$('[data-auth]').forEach(
      (b) =>
        (b.onclick = () => {
          mode = b.dataset.auth;
          draw();
        }),
    );
    const f = $('#auth-form');
    if (f.tip)
      f.tip.onchange = () => {
        $('#company-fields').hidden = f.tip.value !== 'kurumsal';
        f.firma.required = f.tip.value === 'kurumsal';
      };
    guard(f, async (data) => {
      if (!state.db) throw Error(t('connect'));
      let r;
      if (mode === 'signin') {
        r = await state.db.auth.signInWithPassword({
          email: data.get('email'),
          password: data.get('password'),
        });
        if (r.error) throw r.error;
        if (r.data?.verification === 'code') {
          await codeForm(r.data.email);
          return;
        }
        location.href = nextUrl();
      } else if (mode === 'register') {
        r = await state.db.auth.signUp({
          email: data.get('email'),
          password: data.get('password'),
          options: {
            emailRedirectTo: new URL('hesabim.html', location.href).href,
            data: { ad: data.get('ad'), tip: data.get('tip') },
          },
        });
        if (r.error) throw r.error;
        if (data.get('tip') === 'kurumsal')
          write('bc-company', {
            email: data.get('email'),
            ad: data.get('firma'),
            tur: data.get('tur'),
            vergi: data.get('vergi'),
          });
        if (r.data?.verification === 'code') {
          await codeForm(r.data.email);
          return;
        }
        notify(t('confirmEmail'));
      } else if (mode === 'reset') {
        r = await state.db.auth.resetPasswordForEmail(data.get('email'), {
          redirectTo: new URL('giris.html', location.href).href,
        });
        if (r.error) throw r.error;
        notify(t('resetSent'));
      } else {
        r = await state.db.auth.updateUser({ password: data.get('password') });
        if (r.error) throw r.error;
        location.href = 'hesabim.html';
      }
    });
  }
  draw();
}

async function codeForm(email) {
  $('#main').innerHTML =
    pageHead('verifyEmail') +
    `<section class="auth panel email-code"><h2>${esc(t('enterEmailCode'))}</h2><p>${esc(email)}</p><p>${esc(t('emailCodeHelp'))}</p><p id="code-status" role="status" aria-live="polite"></p><form id="code-form">${label('emailCode', inp('code', 'text', '', 'inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required'))}${button('verifyEmail')}<p id="code-error" role="alert"></p></form><div class="actions"><button class="btn secondary" id="code-resend">${esc(t('resendCode'))}</button><button class="text-btn" id="code-exit">${esc(t('changeEmail'))}</button></div></section>`;
  const resend = $('#code-resend');
  let retryAt = 0;
  const send = async () => {
    if (Date.now() < retryAt) throw Error(t('codeWait'));
    const response = await state.db.auth.sendEmailCode(state.lang);
    if (response.error) throw response.error;
    retryAt = Date.now() + (response.data.retryAfter || 60) * 1000;
    $('#code-status').textContent = t('emailCodeSent');
    $('#code-error').textContent = '';
  };
  resend.onclick = safeAction(send);
  $('#code-exit').onclick = safeAction(async () => {
    await state.db.auth.signOut();
    location.href = 'giris.html';
  });
  guard($('#code-form'), async (data) => {
    const response = await state.db.auth.verifyEmailCode({ token: data.get('code') });
    if (response.error) {
      $('#code-error').textContent = response.error.message;
      return;
    }
    location.href = nextUrl();
  });
  try {
    await send();
  } catch (error) {
    $('#code-status').textContent = error.message;
  }
  $('#code-form input[name=code]').focus();
}
