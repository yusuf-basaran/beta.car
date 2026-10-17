import { params } from '../context.js';
import { $, $$, meta, notify, pageHead } from '../ui.js';
import { t } from '../i18n.js';
import { button, guard, inp, label, select } from '../forms.js';
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
  function draw() {
    $('#main').innerHTML =
      pageHead('signin') +
      `<div class="auth panel"><div class="tabs">${['signin', 'register', 'reset'].map((k) => `<button data-auth="${k}" class="${mode === k ? 'active' : ''}">${t(k)}</button>`).join('')}</div><form id="auth-form">${
        mode === 'register'
          ? `${label('name', inp('ad', 'text', '', 'required maxlength="100"'))}${label(
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
            )}<div id="company-fields" hidden>${label('companyName', inp('firma', 'text', '', 'maxlength="140"'))}${label('companyType', select('tur', ['galeri', 'yetkili_satici', 'parca_tedarikcisi', 'ekspertiz_merkezi'], 'galeri', false))}${label('tax', inp('vergi', 'text', '', 'maxlength="40"'))}</div>`
          : ''
      }${mode !== 'password' ? label('email', inp('email', 'email', '', 'required autocomplete="email"')) : ''}${mode !== 'reset' ? label('password', inp('password', 'password', '', 'required minlength="10" autocomplete="' + (mode === 'signin' ? 'current-password' : 'new-password') + '"')) : ''}${mode === 'register' ? `<label class="check"><input type="checkbox" required>${t('acceptTerms')}</label><div class="actions"><a href="sayfa.html?s=bireysel-uye-sozlesmesi">${t('personalTerms')}</a><a href="sayfa.html?s=kurumsal-uye-sozlesmesi">${t('businessTerms')}</a><a href="sayfa.html?s=gizlilik-politikasi">${t('privacy')}</a></div>` : ''}${button(mode === 'password' ? 'changePassword' : mode)}</form></div>`;
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
        notify(t('confirmEmail'));
      } else if (mode === 'reset') {
        r = await state.db.auth.resetPasswordForEmail(data.get('email'), {
          redirectTo: new URL('giris.html?mode=password', location.href).href,
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
