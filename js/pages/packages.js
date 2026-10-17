import { need, query, rpc, signed, table, uploadFile } from '../api.js';
import { state } from '../state.js';
import { locale, status, t } from '../i18n.js';
import { $, $$, box, clip, meta, money, pageHead } from '../ui.js';
import { esc } from '../utils.js';
import { button, guard, label, safeAction } from '../forms.js';

export async function myPackages(target) {
  const [subs, requests] = await Promise.all([
    query(
      table('abonelikler')
        .eq('kullanici_id', state.user.id)
        .order('baslangic', { ascending: false }),
    ),
    query(
      table(
        'paket_talepleri',
        'id,paket_id,referans_kodu,durum,dekont_dosya,kullanici_notu,admin_notu,ozet,son_odeme,olusturma',
      )
        .eq('kullanici_id', state.user.id)
        .order('olusturma', { ascending: false }),
    ),
  ]);
  target.innerHTML = `<a class="btn" href="paketler.html">${t('packages')}</a>${subs
    .filter((s) => s.durum === 'aktif')
    .map((s) =>
      box(
        'myPackages',
        `<p>${esc(requests.find((r) => r.id === s.talep_id)?.ozet.ad || '')}</p><dl class="spec-table"><div><dt>${t('listingQuota')}</dt><dd>${s.kalan_ilan}</dd></div><div><dt>${t('promotionQuota')}</dt><dd>${s.kalan_onecikarma}</dd></div><div><dt>${t('endDate')}</dt><dd>${new Date(s.bitis).toLocaleDateString(locale())}</dd></div><div><dt>${t('daysLeft')}</dt><dd>${Math.max(0, Math.ceil((new Date(s.bitis) - Date.now()) / 86400000))}</dd></div></dl><button class="btn" data-renew-package="${s.paket_id}">${t('renew')}</button>`,
      ),
    )
    .join(
      '',
    )}<h2 class="subheading">${t('requestHistory')}</h2>${requests.map((r) => `<section class="panel"><div class="section-head"><h2>${esc(r.ozet.ad)}</h2><span>${status(r.durum)}</span></div><p>${t('reference')}: <strong>${r.referans_kodu}</strong></p><p>${money(r.ozet.fiyat, r.ozet.para_birimi)}</p>${r.admin_notu ? `<p>${t('reason')}: ${esc(r.admin_notu)}</p>` : ''}<div id="bank-${r.id}"></div>${['odeme_bekliyor', 'reddedildi'].includes(r.durum) && r.son_odeme && new Date(r.son_odeme) > new Date() ? `<form data-receipt="${r.id}">${label('receipt', '<input type="file" name="receipt" accept="application/pdf,image/jpeg,image/png" required>')}<small>${t('receiptFile')}</small>${button('upload')}</form>` : ''}${r.dekont_dosya ? `<button class="text-btn" data-receipt-view="${esc(r.dekont_dosya)}">${t('report')}</button>` : ''}${['onaylandi', 'iptal', 'suresi_doldu'].includes(r.durum) ? `<button class="text-btn" data-renew-package="${r.paket_id}">${t('renew')}</button>` : ''}</section>`).join('')}`;
  for (const r of requests.filter(
    (r) => r.durum === 'odeme_bekliyor' && new Date(r.son_odeme) > new Date(),
  )) {
    const b = await rpc('banka_bilgisi', { p_talep: r.id });
    const box = $(`#bank-${r.id}`);
    if (box) {
      box.innerHTML = `<div class="bank-details"><p>${t('bank')}: ${esc(b.banka)}</p><p>${t('holder')}: ${esc(b.hesap_sahibi)}</p><p>IBAN: <strong>${esc(b.iban)}</strong> <button class="text-btn" data-copy-iban>${t('copy')}</button></p><p>${t('amount')}: ${money(b.tutar, b.para_birimi)}</p><strong>${t('transferRef')}: ${r.referans_kodu}</strong><p>${esc(b.odeme_notu)}</p></div>`;
      $('[data-copy-iban]', box).onclick = () => clip(b.iban);
    }
  }
  $$('[data-receipt]').forEach((f) =>
    guard(f, async (data) => {
      const file = data.get('receipt');
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type))
        throw Error(t('fileError'));
      const name = await uploadFile('dekontlar', file, f.dataset.receipt, 5242880);
      await rpc('dekont_ekle', { p_talep: f.dataset.receipt, p_dosya: name });
      await myPackages(target);
    }),
  );
  $$('[data-receipt-view]').forEach(
    (b) =>
      (b.onclick = safeAction(async () =>
        window.open(await signed('dekontlar', b.dataset.receiptView), '_blank', 'noopener'),
      )),
  );
  $$('[data-renew-package]').forEach(
    (b) =>
      (b.onclick = safeAction(async () => {
        await rpc('talep_ac', { p_paket: b.dataset.renewPackage });
        await myPackages(target);
      })),
  );
}

export async function packagesPage() {
  meta(t('packages'));
  $('#main').innerHTML =
    pageHead('packages') +
    `<p class="warning">${t('packageNote')}</p><div class="tabs"><button data-package-target="bireysel">${t('personal')}</button><button data-package-target="kurumsal">${t('business')}</button></div><div id="package-list"></div>${box(
      'faq',
      [
        ['faqPay', 'faqPayA'],
        ['faqApproval', 'faqApprovalA'],
        ['faqEnd', 'faqEndA'],
      ]
        .map(([q, a]) => `<details><summary>${t(q)}</summary><p>${t(a)}</p></details>`)
        .join(''),
    )}`;
  let target = state.me?.tip || 'bireysel';
  const list = state.db ? await query(table('paketler').eq('aktif', true).order('sira')) : [];
  function draw() {
    $$('[data-package-target]').forEach((b) =>
      b.classList.toggle('active', b.dataset.packageTarget === target),
    );
    $('#package-list').innerHTML = list.length
      ? `<div class="table-scroll"><table><thead><tr><th>${t('packages')}</th><th>${t('listingQuota')}</th><th>${t('promotionQuota')}</th><th>${t('duration')}</th><th>${t('amount')}</th><th></th></tr></thead><tbody>${list
          .filter((p) => p.hedef === target)
          .map(
            (p) =>
              `<tr><th>${esc(p.ad)}<small>${esc(p.aciklama)}</small></th><td>${p.ilan_kotasi}</td><td>${p.onecikarma_hakki}</td><td>${p.sure_gun}</td><td>${money(p.fiyat, p.para_birimi)}</td><td><button class="btn" data-package="${p.id}">${t('requestPackage')}</button></td></tr>`,
          )
          .join('')}</tbody></table></div>`
      : `<p class="empty">${t(state.db ? 'empty' : 'connect')}</p>`;
    $$('[data-package]').forEach(
      (b) =>
        (b.onclick = safeAction(() => {
          need();
          const d = document.createElement('dialog');
          d.innerHTML = `<form><h2>${esc(list.find((p) => p.id === b.dataset.package).ad)}</h2>${label('note', '<textarea name="notu" maxlength="2000"></textarea>')}<p>${t('packageNote')}</p>${button('requestPackage')}<button type="button" class="text-btn">${t('cancel')}</button></form>`;
          document.body.append(d);
          $('button[type=button]', d).onclick = () => d.close();
          d.onclose = () => d.remove();
          guard($('form', d), async (f) => {
            await rpc('talep_ac', { p_paket: b.dataset.package, p_not: f.get('notu') });
            location.href = 'hesabim.html?sekme=paketler';
          });
          d.showModal();
        })),
    );
  }
  $$('[data-package-target]').forEach(
    (b) =>
      (b.onclick = () => {
        target = b.dataset.packageTarget;
        draw();
      }),
  );
  draw();
}
