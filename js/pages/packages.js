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
  target.innerHTML =
    `<a class="btn" href="paketler.html">` +
    `${esc(t('packages'))}` +
    `</a>` +
    `${subs
      .filter((s) => s.durum === 'aktif')
      .map((s) =>
        box(
          'myPackages',
          `<p>` +
            `${esc(requests.find((r) => r.id === s.talep_id)?.ozet.ad || '')}` +
            `</p><dl class="spec-table"><div><dt>` +
            `${esc(t('listingQuota'))}` +
            `</dt><dd>` +
            `${esc(s.kalan_ilan)}` +
            `</dd></div><div><dt>` +
            `${esc(t('promotionQuota'))}` +
            `</dt><dd>` +
            `${esc(s.kalan_onecikarma)}` +
            `</dd></div><div><dt>` +
            `${esc(t('endDate'))}` +
            `</dt><dd>` +
            `${esc(new Date(s.bitis).toLocaleDateString(locale()))}` +
            `</dd></div><div><dt>` +
            `${esc(t('daysLeft'))}` +
            `</dt><dd>` +
            `${esc(Math.max(0, Math.ceil((new Date(s.bitis) - Date.now()) / 86400000)))}` +
            `</dd></div></dl><button class="btn" data-renew-package="` +
            `${esc(s.paket_id)}` +
            `">` +
            `${esc(t('renew'))}` +
            `</button>`,
        ),
      )
      .join('')}` +
    `<h2 class="subheading">` +
    `${esc(t('requestHistory'))}` +
    `</h2>` +
    `${requests
      .map(
        (r) =>
          `<section class="panel"><div class="section-head"><h2>` +
          `${esc(r.ozet.ad)}` +
          `</h2><span>` +
          `${esc(status(r.durum))}` +
          `</span></div><p>` +
          `${esc(t('reference'))}` +
          `: <strong>` +
          `${esc(r.referans_kodu)}` +
          `</strong></p><p>` +
          `${esc(money(r.ozet.fiyat, r.ozet.para_birimi))}` +
          `</p>` +
          `${r.admin_notu ? `<p>${esc(t('reason'))}: ${esc(r.admin_notu)}</p>` : ''}` +
          `<div id="bank-` +
          `${esc(r.id)}` +
          `"></div>` +
          `${
            ['odeme_bekliyor', 'reddedildi'].includes(r.durum) &&
            r.son_odeme &&
            new Date(r.son_odeme) > new Date()
              ? `<form data-receipt="` +
                `${esc(r.id)}` +
                `">` +
                `${label('receipt', '<input type="file" name="receipt" accept="application/pdf,image/jpeg,image/png" required>')}` +
                `<small>` +
                `${esc(t('receiptFile'))}` +
                `</small>` +
                `${button('upload')}` +
                `</form>`
              : ''
          }` +
          `${r.dekont_dosya ? `<button class="text-btn" data-receipt-view="${esc(r.dekont_dosya)}">${esc(t('report'))}</button>` : ''}` +
          `${['onaylandi', 'iptal', 'suresi_doldu'].includes(r.durum) ? `<button class="text-btn" data-renew-package="${esc(r.paket_id)}">${esc(t('renew'))}</button>` : ''}` +
          `</section>`,
      )
      .join('')}`;
  for (const r of requests.filter(
    (r) => r.durum === 'odeme_bekliyor' && new Date(r.son_odeme) > new Date(),
  )) {
    const b = await rpc('banka_bilgisi', { p_talep: r.id });
    const box = $(`#bank-${r.id}`);
    if (box) {
      box.innerHTML =
        `<div class="bank-details"><p>` +
        `${esc(t('bank'))}` +
        `: ` +
        `${esc(b.banka)}` +
        `</p><p>` +
        `${esc(t('holder'))}` +
        `: ` +
        `${esc(b.hesap_sahibi)}` +
        `</p><p>IBAN: <strong>` +
        `${esc(b.iban)}` +
        `</strong> <button class="text-btn" data-copy-iban>` +
        `${esc(t('copy'))}` +
        `</button></p><p>` +
        `${esc(t('amount'))}` +
        `: ` +
        `${esc(money(b.tutar, b.para_birimi))}` +
        `</p><strong>` +
        `${esc(t('transferRef'))}` +
        `: ` +
        `${esc(r.referans_kodu)}` +
        `</strong><p>` +
        `${esc(b.odeme_notu)}` +
        `</p></div>`;
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
  meta(t('seoPackagesTitle'), t('seoPackagesDescription'));
  $('#main').innerHTML =
    pageHead('packages') +
    (`<p class="warning">` +
      `${esc(t('packageNote'))}` +
      `</p><div class="tabs"><button data-package-target="bireysel">` +
      `${esc(t('personal'))}` +
      `</button><button data-package-target="kurumsal">` +
      `${esc(t('business'))}` +
      `</button></div><div id="package-list"></div>` +
      `${box(
        'faq',
        [
          ['faqPay', 'faqPayA'],
          ['faqApproval', 'faqApprovalA'],
          ['faqEnd', 'faqEndA'],
        ]
          .map(([q, a]) => `<details><summary>${esc(t(q))}</summary><p>${esc(t(a))}</p></details>`)
          .join(''),
      )}`);
  let target = state.me?.tip || 'bireysel';
  const list = state.db ? await query(table('paketler').eq('aktif', true).order('sira')) : [];
  function draw() {
    $$('[data-package-target]').forEach((b) =>
      b.classList.toggle('active', b.dataset.packageTarget === target),
    );
    $('#package-list').innerHTML = list.length
      ? `<div class="table-scroll"><table><thead><tr><th>` +
        `${esc(t('packages'))}` +
        `</th><th>` +
        `${esc(t('listingQuota'))}` +
        `</th><th>` +
        `${esc(t('promotionQuota'))}` +
        `</th><th>` +
        `${esc(t('duration'))}` +
        `</th><th>` +
        `${esc(t('amount'))}` +
        `</th><th></th></tr></thead><tbody>` +
        `${list
          .filter((p) => p.hedef === target)
          .map(
            (p) =>
              `<tr><th>` +
              `${esc(p.ad)}` +
              `<small>` +
              `${esc(p.aciklama)}` +
              `</small></th><td>` +
              `${esc(p.ilan_kotasi)}` +
              `</td><td>` +
              `${esc(p.onecikarma_hakki)}` +
              `</td><td>` +
              `${esc(p.sure_gun)}` +
              `</td><td>` +
              `${esc(money(p.fiyat, p.para_birimi))}` +
              `</td><td><button class="btn" data-package="` +
              `${esc(p.id)}` +
              `">` +
              `${esc(t('requestPackage'))}` +
              `</button></td></tr>`,
          )
          .join('')}` +
        `</tbody></table></div>`
      : `<p class="empty">${esc(t(state.db ? 'empty' : 'connect'))}</p>`;
    $$('[data-package]').forEach(
      (b) =>
        (b.onclick = safeAction(() => {
          need();
          const d = document.createElement('dialog');
          d.innerHTML =
            `<form><h2>` +
            `${esc(list.find((p) => p.id === b.dataset.package).ad)}` +
            `</h2>` +
            `${label('note', '<textarea name="notu" maxlength="2000"></textarea>')}` +
            `<p>` +
            `${esc(t('packageNote'))}` +
            `</p>` +
            `${button('requestPackage')}` +
            `<button type="button" class="text-btn">` +
            `${esc(t('cancel'))}` +
            `</button></form>`;
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
