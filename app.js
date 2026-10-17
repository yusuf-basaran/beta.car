const cfg = { url: '', anon: '' };
const D = {
 skip:['İçeriğe geç','Skip to content'],used:['Kullanılmış Araçlar','Used Vehicles'],new:['Sıfır Araçlar','New Vehicles'],parts:['Parça & Donanım','Parts & Equipment'],packages:['Paketler','Packages'],search:['Ara','Search'],lang:['Dil','Language'],notifications:['Bildirimler','Notifications'],messages:['Mesajlar','Messages'],login:['Giriş yap / Üye ol','Sign in / Register'],sell:['Aracını Sat','Sell Your Vehicle'],home:['Ana Sayfa','Home'],favs:['Favoriler','Favourites'],account:['Hesabım','My Account'],firms:['Firmalar','Businesses'],
 gallery:['Luxury & Prestige Gallery','Luxury & Prestige Gallery'],island:['KUZEY KIBRIS / ARAÇ İLANLARI','NORTHERN CYPRUS / VEHICLE LISTINGS'],hero:['Doğru araç. Net bilgi.','The right vehicle. Clear details.'],intro:['Kullanılmış araçlar, sıfır araçlar ve donanım. KKTC genelinde ilanları incele.','Browse used vehicles, new vehicles and equipment across Northern Cyprus.'],usedShort:['Kullanılmış','Used'],newShort:['Sıfır','New'],type:['Araç Tipi','Vehicle Type'],make:['Marka','Make'],model:['Model','Model'],year:['Yıl','Year'],any:['Tümü','All'],other:['Diğer','Other'],otherMake:['Markayı yaz','Enter make'],otherModel:['Modeli yaz','Enter model'],keywords:['Marka, model veya ilan no','Make, model or listing number'],keywordsLabel:['Kelime veya ilan no ile ara','Search by keyword or listing number'],budget:['Bütçene göre incele','Browse by budget'],under:['10.000 GBP altı','Under GBP 10,000'],middle:['10-25.000 GBP','GBP 10,000–25,000'],over:['25.000 GBP üstü','Over GBP 25,000'],usedCount:['Kullanılmış Araç','Used Vehicles'],newCount:['Sıfır Araç','New Vehicles'],partCount:['Parça İlanı','Parts Listings'],firmCount:['Kayıtlı Firma','Registered Businesses'],
 featured:['Seçkin İlanlar','Select Listings'],quick:['Hızlı Satış','Quick Sale'],latest:['Yeni Gelenler','New Arrivals'],recent:['Son Baktıklarım','Recently Viewed'],galleries:['Öne Çıkan Galeriler','Featured Galleries'],dealers:['Öne Çıkan Satıcılar','Featured Dealers'],journal:['Garaj Yazıları','Garage Journal'],all:['Tümünü Gör','View All'],empty:['Şu anda gösterilecek ilan yok.','There are no listings to show.'],noRecent:['İncelediğin son 10 ilan burada görünür.','Your last 10 viewed listings appear here.'],noFirm:['Firma kayıtları burada listelenir.','Business profiles will appear here.'],noArticle:['Yeni yazılar burada yayımlanır.','New articles will appear here.'],offline:['İlan bağlantısı henüz açılmadı.','The listing connection is not configured yet.'],error:['Veriler alınamadı. Tekrar deneyin.','Unable to load data. Please try again.'],retry:['Tekrar dene','Retry'],
 priceCall:['Fiyat İçin Arayınız','Call for Price'],original:['Tamamı orijinal','All panels original'],painted:['boyalı','painted'],replaced:['değişen','replaced'],damaged:['hasarlı','damaged'],bodyUnknown:['Kaporta belirtilmemiş','Body condition not specified'],expert:['Ekspertizli','Inspection Report'],verified:['Doğrulanmış Satıcı','Verified Seller'],prestige:['Prestij','Prestige'],highlight:['Vurgulu','Highlighted'],dropped:['Fiyatı Düştü','Price Reduced'],sold:['Satıldı','Sold'],compare:['Karşılaştır','Compare'],compareMax:['En çok 3 araç karşılaştırılabilir.','You can compare up to 3 vehicles.'],saved:['Favorilere eklendi','Added to favourites'],removed:['Favorilerden çıkarıldı','Removed from favourites'],track:['Fiyat takibi','Price tracking'],noPhoto:['Görsel eklenmemiş','No photo provided'],view:['İlanı incele','View listing'],
 beta:['BETA.CAR','BETA.CAR'],contracts:['Sözleşmeler','Agreements'],privacyGroup:['Gizlilik ve Veri','Privacy & Data'],help:['Yardım Merkezi','Help Centre'],about:['Hakkımızda','About Us'],advertise:['Reklam Ver','Advertise'],contact:['İletişim','Contact'],personalTerms:['Bireysel Üye Sözleşmesi','Individual Membership Agreement'],businessTerms:['Kurumsal Üye Sözleşmesi','Business Membership Agreement'],rules:['İlan Kuralları','Listing Rules'],packageTerms:['Paket ve Üyelik Koşulları','Package & Membership Terms'],privacy:['Gizlilik Politikası','Privacy Policy'],cookies:['Çerez Politikası','Cookie Policy'],data:['KVKK Aydınlatma Metni','Personal Data Notice'],safeBuy:['Güvenli Alım','Buying Safely'],safeSell:['Güvenli Satış','Selling Safely'],faq:['SSS','FAQ'],cookieText:['Oturum ve dil tercihi için gerekli tarayıcı kayıtları kullanılır. İsteğe bağlı çerezler kapalıdır.','Essential browser storage is used for your session and language preference. Optional cookies are disabled.'],cookieOnly:['Yalnızca gerekli','Essential only'],
 notFound:['Sayfa bulunamadı','Page not found'],notFoundText:['Adres değişmiş veya sayfa kaldırılmış olabilir.','The address may have changed or the page may have been removed.'],backHome:['Ana Sayfaya Dön','Back to Home'],results:['Arama önerileri','Search suggestions'],listingNo:['İlan no','Listing number'],
 automatic:['Otomatik','Automatic'],manual:['Manuel','Manual'],petrol:['Benzin','Petrol'],diesel:['Dizel','Diesel'],hybrid:['Hibrit','Hybrid'],electric:['Elektrik','Electric'],mild:['Mild hibrit','Mild hybrid'],plugin:['Plug-in hibrit','Plug-in hybrid'],km:['km','km'],
 otomobil:['Binek Araçlar','Passenger Cars'],suv:['SUV & Çift Kabin','SUVs & Pickups'],motosiklet:['Motor & Scooter','Motorcycles & Scooters'],minivan:['Aile & Van Araçları','Family Cars & Vans'],ticari:['Yük & Taşıt Araçları','Commercial Vehicles'],is_makinesi:['Şantiye Makineleri','Construction Machinery'],atv:['Arazi Motorları (ATV/UTV)','Off-road Vehicles (ATV/UTV)'],karavan:['Karavan & Kamp Araçları','Caravans & Campers'],nostalji:['Nostalji Araçlar','Classic Vehicles'],deniz:['Tekne & Deniz Araçları','Boats & Marine Vehicles'],carParts:['Binek Araç Parçaları','Car Parts'],motorParts:['Motor Parçaları','Motorcycle Parts'],truckParts:['Yük Aracı Parçaları','Commercial Vehicle Parts']
};
const $ = (s, p = document) => p.querySelector(s), $$ = (s, p = document) => [...p.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function read(key, fallback = []) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
let lang = read('bc-lang','tr') === 'en' ? 'en' : 'tr', db, user, cars = [], cats = [], firms = [], posts = [], banners = [], counts;
let lex = { markalar: [], modeller: [] }, mainCat = new URLSearchParams(location.search).get('kategori');
if(!['kullanilmis','sifir','parca'].includes(mainCat)) mainCat='kullanilmis';
const t = key => D[key]?.[lang === 'en' ? 1 : 0] ?? key;
const locale = () => lang === 'en' ? 'en-GB' : 'tr-TR';
const number = n => new Intl.NumberFormat(locale()).format(n);
const key = s => String(s).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const path = s => { try { const u = new URL(s,location.href); return ['https:','http:'].includes(u.protocol) ? esc(u.href) : ''; } catch { return ''; } };
const paths = {
 search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',message:'M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z',user:'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 5a4 4 0 1 1-8 0 4 4 0 0 1 8 0',plus:'M12 4v16M4 12h16',home:'M3 10l9-8 9 8v12h-7v-8h-4v8H3z',arrow:'M4 12h16m-6-6 6 6-6 6',pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',car:'M3 15V9l3-6h12l3 6v6M3 9h18M3 15h18M5 15v5M19 15v5M6 12h2M16 12h2'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"></path></svg>`;
const nav = [['kullanilmis','used'],['sifir','new'],['parca','parts']];
const types = ['otomobil','suv','motosiklet','minivan','ticari','is_makinesi','atv','karavan','deniz'];
const catKeys = ['otomobil','suv','motosiklet','minivan','ticari','is_makinesi','atv','karavan','nostalji','deniz'];
const slugs = ['binek','suv','motor','aile','yuk','santiye','atv','karavan','nostalji','deniz'];
const sections = [['featured','seckin'],['quick','hizli'],['latest',''],['recent',''],['galleries','galeri'],['dealers','yetkili_satici'],['parts','parca'],['journal','']];
const titleLink = (label, url) => `<div class="section-head"><h2>${t(label)}</h2><a href="${url}">${t('all')}${icon('arrow')}</a></div>`;
function notify(s) { const n = $('#notice'); n.textContent = s; n.classList.add('show'); clearTimeout(notify.timer); notify.timer = setTimeout(() => n.classList.remove('show'),3500); }
function chips() {
 const list = mainCat === 'parca' ? ['carParts','motorParts','truckParts'] : mainCat === 'sifir' ? ['otomobil','motosiklet','minivan','suv','deniz','ticari','is_makinesi'] : catKeys;
 return list.map((c,i) => `<a href="ilanlar.html?kategori=${mainCat}-${mainCat==='parca'?['binek','motor','yuk'][i]:slugs[catKeys.indexOf(c)]}">${t(c)}</a>`).join('');
}
function header() {
 $('#header').innerHTML = `<header class="header"><div class="header-inner"><a class="brand" href="index.html" aria-label="BETA.CAR"><img src="logo.png" alt="BETA.CAR" width="154" height="64"><span hidden>BETA<span>.CAR</span></span></a><nav class="main-nav" aria-label="${t('home')}">${nav.map(([s,k])=>`<a href="ilanlar.html?kategori=${s}" data-cat="${s}" class="${mainCat===s?'active':''}">${t(k)}</a>`).join('')}<a href="paketler.html">${t('packages')}</a><a href="firmalar.html">${t('firms')}</a></nav><div class="header-actions"><a class="icon-btn desktop" href="ilanlar.html" aria-label="${t('search')}">${icon('search')}</a><button id="language" class="language" aria-label="${t('lang')}">${lang.toUpperCase()}</button><a class="icon-btn desktop" href="hesabim.html?sekme=bildirimler" aria-label="${t('notifications')}">${icon('bell')}<span id="notification-count" class="count" hidden></span></a><a class="icon-btn desktop" href="mesajlar.html" aria-label="${t('messages')}">${icon('message')}</a><a class="login desktop" href="${user?'hesabim.html':'giris.html'}">${t(user?'account':'login')}</a><a class="btn sell" href="ilan-ver.html">${icon('plus')}${t('sell')}</a></div></div><nav id="chips" class="chips" aria-label="${t('type')}">${chips()}</nav></header><nav class="mobile-nav" aria-label="${t('home')}">${[['home','index.html','home'],['search','ilanlar.html','search'],['sell','ilan-ver.html','plus'],['favs','hesabim.html?sekme=favoriler','heart'],['account','hesabim.html','user']].map(([label,href,i])=>`<a href="${href}" class="${label==='sell'?'mobile-sell':''}">${icon(i)}<span>${t(label)}</span></a>`).join('')}</nav>`;
 $('.brand img').addEventListener('error', e => { e.target.hidden=true; $('.brand > span').hidden=false; });
 $('#language').onclick = () => { lang = lang === 'tr' ? 'en' : 'tr'; write('bc-lang',lang); render(); };
 $$('[data-cat]').forEach(a => a.onclick = e => { if(document.body.dataset.page !== 'home') return; e.preventDefault(); setCategory(a.dataset.cat); });
}
const footerGroups = [
 ['beta',[['about','hakkimizda'],['packages','paketler'],['advertise','reklam-ver'],['contact','iletisim']]],
 ['contracts',[['personalTerms','bireysel-uye-sozlesmesi'],['businessTerms','kurumsal-uye-sozlesmesi'],['rules','ilan-kurallari'],['packageTerms','paket-ve-uyelik-kosullari']]],
 ['privacyGroup',[['privacy','gizlilik-politikasi'],['cookies','cerez-politikasi'],['data','kvkk-aydinlatma']]],
 ['help',[['safeBuy','guvenli-alim'],['safeSell','guvenli-satis'],['faq','sss']]]
];
function footer() {
 $('#footer').innerHTML = `<footer class="footer"><div class="wrap footer-grid">${footerGroups.map(([k,links])=>`<div><h2>${t(k)}</h2>${links.map(([label,s])=>`<a href="${s==='paketler'?'paketler.html':`sayfa.html?s=${s}`}">${t(label)}</a>`).join('')}</div>`).join('')}</div><div class="wrap footer-bottom"><span>© ${new Date().getFullYear()} BETA.CAR</span><span>${t('gallery')}</span></div></footer>${read('bc-consent',null)?'':`<aside class="cookie" aria-label="${t('cookies')}"><p>${t('cookieText')} <a href="sayfa.html?s=cerez-politikasi">${t('cookies')}</a></p><div><button class="btn" data-consent="essential">${t('cookieOnly')}</button></div></aside>`}`;
 $$('[data-consent]').forEach(b => b.onclick = () => { write('bc-consent',{value:'essential',date:new Date().toISOString()}); $('.cookie').remove(); });
}
function bodySummary(c) {
 if(Number(c.parca_sayisi) === 13 && !Number(c.boyali) && !Number(c.degisen) && !Number(c.hasarli)) return t('original');
 return [[c.boyali,'painted'],[c.degisen,'replaced'],[c.hasarli,'damaged']].filter(([n])=>Number(n)>0).map(([n,k])=>`${n} ${t(k)}`).join(', ') || t('bodyUnknown');
}
function price(c) { return c.fiyat === null || c.fiyat === undefined ? t('priceCall') : `${number(c.fiyat)} ${esc(c.para_birimi)}`; }
function card(c) {
 const saved = read('bc-favs').includes(c.id), compared = read('bc-compare').includes(c.id), title = c.baslik || [c.marka,c.model].filter(Boolean).join(' ');
 const img = c.fotograflar?.[0], promoted = c.onecikarma && new Date(c.onecikarma_bitis)>new Date() ? c.onecikarma : '';
 const href = `ilan.html?id=${encodeURIComponent(c.id)}&s=${encodeURIComponent(key(title))}`, drop = c.onceki_fiyat>0&&c.fiyat!=null&&c.fiyat<c.onceki_fiyat?Math.round((1-c.fiyat/c.onceki_fiyat)*100):0;
 return `<article class="listing ${promoted==='prestij'?'prestige':promoted==='vurgulu'?'highlight':''}"><a class="listing-image" href="${href}" aria-label="${esc(title)}">${img?`<img src="${path(img)}" alt="${esc(title)}" width="320" height="220" loading="lazy">`:`<span class="no-photo">${icon('car')}<span>${t('noPhoto')}</span></span>`}${promoted==='hizli'?`<span class="badge urgent">${t('quick')}</span>`:promoted==='prestij'?`<span class="badge gold">${t('prestige')}</span>`:''}</a><div class="listing-info"><div class="listing-top"><span class="eyebrow">${esc([c.marka || c.diger_marka,c.model || c.diger_model].filter(Boolean).join(' / '))}</span><button class="icon-btn favourite ${saved?'selected':''}" data-fav="${c.id}" aria-label="${t('favs')}" aria-pressed="${saved}">${icon('heart')}</button></div><h3><a href="${href}">${esc(title)}</a></h3><div class="specs">${[c.yil,D[c.vites]?t(c.vites):c.vites,D[c.yakit]?t(c.yakit):c.yakit,c.km!=null?`${number(c.km)} ${t('km')}`:null].filter(Boolean).map(esc).join('<span>·</span>')}</div><div class="listing-badges">${drop?`<span>${t('dropped')} %${drop}</span>`:''}<span class="condition">${bodySummary(c)}</span>${c.ekspertizli?`<span>${t('expert')}</span>`:''}${c.dogrulandi?`<span>${t('verified')}</span>`:''}${c.durum==='satildi'?`<span>${t('sold')}</span>`:''}</div><div class="listing-bottom"><span class="location">${icon('pin')}${esc(c.sehir)}</span><strong class="price">${price(c)}</strong></div><div class="listing-tools"><label><input type="checkbox" data-compare="${c.id}" ${compared?'checked':''}>${t('compare')}</label>${saved?`<span>${t('track')}</span>`:''}</div></div></article>`;
}
const popular = ['mercedesbenz','bmw','toyota','honda','volkswagen','audi','landrover','ford','nissan','mazda'];
function vehicleForm() {
 return `<div class="vehicle-fields"><label>${t('type')}<select name="tip"><option value="">${t('any')}</option>${types.map(x=>`<option value="${x}">${t(x)}</option>`).join('')}</select></label><label>${t('make')}<input name="marka" list="makes" autocomplete="off" placeholder="${t('any')}"><datalist id="makes"></datalist></label><label>${t('model')}<input name="model" list="models" autocomplete="off" placeholder="${t('any')}"><datalist id="models"></datalist></label><label>${t('year')}<select name="yil"><option value="">${t('any')}</option></select></label><label class="other-field" hidden>${t('otherMake')}<input name="diger_marka" maxlength="80"></label><label class="other-field" hidden>${t('otherModel')}<input name="diger_model" maxlength="80"></label></div>`;
}
function bindVehicles(form) {
 const type = $('[name=tip]',form), make = $('[name=marka]',form), model = $('[name=model]',form), year = $('[name=yil]',form);
 let brands = [], models = [];
 const chosenMake = () => brands.find(m => key(m[1]) === key(make.value));
 function years() {
  const m = models.find(m => key(m[2]) === key(model.value)), first = m?.[3] || 1950, last = m?.[4] || new Date().getFullYear()+1, prev = year.value;
  year.innerHTML = `<option value="">${t('any')}</option>`+Array.from({length:Math.max(0,last-first+1)},(_,i)=>`<option>${last-i}</option>`).join('');
  year.value = prev;
  const other = key(model.value) === key(t('other'));
  $('[name=diger_model]',form).closest('label').hidden = !other;
  $('[name=diger_model]',form).required = other;
 }
 function updateModels(reset = true) {
  const m = chosenMake();
  make.dataset.id = m?.[0] || '';
  const ids=brands.filter(b=>key(b[1])===key(make.value)).map(b=>b[0]);
  models = lex.modeller.filter(x=>ids.includes(x[1]));
  $('datalist[id^=models]',form).innerHTML = models.map(m=>`<option value="${esc(m[2])}"></option>`).join('')+`<option value="${t('other')}"></option>`;
  if(reset) model.value='';
  const other = key(make.value) === key(t('other'));
  $('[name=diger_marka]',form).closest('label').hidden = !other;
  $('[name=diger_marka]',form).required = other;
  years();
 }
 function updateMakes(reset = true) {
  brands = lex.markalar.filter(m=>!type.value || m[2]===type.value).sort((a,b)=>{
   const pa=popular.indexOf(key(a[1])), pb=popular.indexOf(key(b[1]));
   return (pa<0?999:pa)-(pb<0?999:pb)||a[1].localeCompare(b[1],locale());
  });
  const seen=new Set();
  $('datalist[id^=makes]',form).innerHTML = brands.filter(m=>!seen.has(m[1])&&seen.add(m[1])).map(m=>`<option value="${esc(m[1])}"></option>`).join('')+`<option value="${t('other')}"></option>`;
  if(reset) make.value='';
  updateModels(reset);
 }
 type.onchange = () => updateMakes(); make.oninput = () => updateModels(); model.oninput = years;
 updateMakes(false);
 return () => { const m=models.find(m=>key(m[2])===key(model.value)); return {tip:type.value,marka:m?.[1] || make.dataset.id,model:m?.[0] || '',yil:year.value,diger_marka:$('[name=diger_marka]',form).value,diger_model:$('[name=diger_model]',form).value}; };
}
const drawing = () => `<svg class="hero-car" viewBox="0 0 840 300" fill="none" aria-hidden="true"><g stroke="currentColor" stroke-width="1.3"><path opacity=".25" d="M0 250H840M100 270H780M680 20V285M180 60V285M0 205H840"/><path d="M62 201l18-42 70-20 112-71q24-13 77-14h144q43 0 87 26l94 58 94 21 21 34-9 34h-68q0-63-50-63t-50 63H239q0-63-50-63t-50 63H73z"/><path d="M169 137h444l-69-45q-27-17-60-19H343q-36 0-58 12zM360 75l-18 61M466 76l35 61M322 147l-6 65h227l-4-65M570 146l19 25M273 145l-21 40M84 166h62l-13 15H77M708 164l37 10 9 17h-46M354 158h24M558 158h24M244 224h350"/><circle cx="189" cy="223" r="39"/><circle cx="189" cy="223" r="24"/><circle cx="189" cy="223" r="7"/><circle cx="652" cy="223" r="39"/><circle cx="652" cy="223" r="24"/><circle cx="652" cy="223" r="7"/><path opacity=".5" d="M189 186v74M152 223h74M652 186v74M615 223h74M70 282h690M70 278v8M760 278v8"/></g></svg>`;
function home() {
 $('#main').innerHTML = `<section class="hero"><div class="wrap hero-top"><div><p class="eyebrow">${t('island')}</p><h1>${t('hero')}</h1><p class="hero-intro">${t('intro')}</p><span class="signature">${t('gallery')}</span></div>${drawing()}</div><div class="wrap"><div class="search-box"><div class="search-tabs" role="tablist" aria-label="${t('search')}">${nav.map(([s,k],i)=>`<button type="button" role="tab" aria-selected="${s===mainCat}" data-tab="${s}">${t(['usedShort','newShort','parts'][i])}</button>`).join('')}</div><form id="search-form"><div class="keyword-row"><label class="keyword">${icon('search')}<input name="q" type="search" placeholder="${t('keywords')}" aria-label="${t('keywordsLabel')}" autocomplete="off" aria-controls="suggestions"></label><button class="btn search-submit" type="submit">${t('search')}${icon('arrow')}</button></div><div id="suggestions" class="suggestions" aria-label="${t('results')}" hidden></div>${vehicleForm()}</form></div><div class="budget"><span>${t('budget')}</span>${[['under','max=10000'],['middle','min=10000&max=25000'],['over','min=25000']].map(([k,q])=>`<a href="ilanlar.html?${q}&para_birimi=GBP">${t(k)}${icon('arrow')}</a>`).join('')}</div></div></section><div class="stats wrap">${[['kullanilmis','usedCount'],['sifir','newCount'],['parca','partCount'],['firma','firmCount']].map(([key,label])=>`<div><strong>${counts?number(counts[key]):'—'}</strong><span>${t(label)}</span></div>`).join('')}</div><div id="feed" class="wrap feed">${!db?`<p class="connection" role="status">${t('offline')}</p>`:''}${sections.map(([s,filter],i)=>section(s,filter)+(i===1?banner(1):i===5?banner(2):'')).join('')}</div>`;
 const form = $('#search-form'), values = bindVehicles(form);
 $$('[data-tab]').forEach(b=>b.onclick=()=>setCategory(b.dataset.tab));
 form.onsubmit = e => {
  e.preventDefault();
  const query = $('[name=q]',form).value.trim(), v = values(), exact = cars.find(c=>String(c.no) === query.replace(/^#/,'') && /^#?\d+$/.test(query));
  if(exact) { location.href=`ilan.html?id=${exact.id}`; return; }
  if(/^#?\d+$/.test(query)) { location.href=`ilan.html?no=${encodeURIComponent(query.replace(/^#/,''))}`; return; }
  const params = new URLSearchParams({kategori:mainCat,...v,q:query});
  for(const [k,val] of [...params]) if(!val) params.delete(k);
  const history=read('bc-searches').filter(s=>s.query!==params.toString()); history.unshift({query:params.toString(),date:Date.now()}); write('bc-searches',history.slice(0,10));
  location.href=`ilanlar.html?${params}`;
 };
 $('[name=q]',form).oninput = e => {
  const q=key(e.target.value), box=$('#suggestions');
  const matches=q.length>1?cars.filter(c=>key(c.baslik).includes(q)||String(c.no)===q).slice(0,5):[];
  box.hidden=!matches.length;
  box.innerHTML=matches.map(c=>`<a href="ilan.html?id=${c.id}"><span>${esc(c.baslik)}</span><small>${t('listingNo')} ${c.no}</small></a>`).join('');
 };
 $('[name=q]',form).onkeydown = e => { if(e.key==='Escape') $('#suggestions').hidden=true; };
 bindCards();
}
function section(s,filter) {
 const href = s==='galleries'||s==='dealers'?`firmalar.html?tur=${filter}`:s==='journal'?'yazilar.html':`ilanlar.html?${s==='parts'?'kategori=parca':filter?`onecikarma=${filter}`:s==='recent'?'son=1':''}`;
 let content;
 if(s==='galleries'||s==='dealers') {
  const list=firms.filter(f=>f.tur===filter);
  content=list.length?`<div class="firms">${list.map(f=>`<a class="firm-card" href="firma.html?id=${f.id}"><span class="firm-initial">${esc(f.ad.slice(0,1))}</span><div><h3>${esc(f.ad)}</h3><p>${esc(f.sehir)}</p>${f.dogrulandi?`<small>${t('verified')}</small>`:''}</div>${icon('arrow')}</a>`).join('')}</div>`:`<p class="empty">${t('noFirm')}</p>`;
 } else if(s==='journal') {
  content=posts.length?`<div class="articles">${posts.map(p=>`<a href="yazilar.html?s=${encodeURIComponent(p.slug)}"><span class="eyebrow">${esc(p.kategori)}</span><h3>${esc(lang==='en'?p.baslik_en:p.baslik)}</h3><p>${esc(lang==='en'?p.ozet_en:p.ozet)}</p>${icon('arrow')}</a>`).join('')}</div>`:`<p class="empty">${t('noArticle')}</p>`;
 } else {
  let list = s==='recent'?read('bc-recent').slice(0,10).map(id=>cars.find(c=>c.id===id)).filter(Boolean):s==='parts'?cars.filter(c=>cats.find(k=>k.id===c.kategori_id)?.slug.startsWith('parca')):filter?cars.filter(c=>c.onecikarma===filter&&new Date(c.onecikarma_bitis)>new Date()):cars.filter(c=>!cats.find(k=>k.id===c.kategori_id)?.slug.startsWith('parca'));
  content=list.length?`<div class="listing-list">${list.slice(0,s==='recent'?10:4).map(card).join('')}</div>`:`<p class="empty">${t(s==='recent'?'noRecent':'empty')}</p>`;
 }
 return `<section class="home-section" id="${s}">${titleLink(s,href)}${content}</section>`;
}
function banner(place) {
 const b=banners.find(b=>b.yer===place); if(!b) return '';
 const image=b.resim?`<img src="${path(b.resim)}" alt="" width="500" height="160" loading="lazy">`:'';
 return `<aside class="banner">${image}<div><h2>${esc(lang==='en'?b.baslik_en:b.baslik)}</h2><p>${esc(lang==='en'?b.metin_en:b.metin)}</p>${b.baglanti?`<a href="${path(b.baglanti)}" class="icon-btn" aria-label="${esc(lang==='en'?b.baslik_en:b.baslik)}">${icon('arrow')}</a>`:''}</div></aside>`;
}
function setCategory(cat) { mainCat=cat; header(); $('#chips').innerHTML=chips(); $$('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===cat))); }
function bindCards() {
 $$('[data-fav]').forEach(b=>b.onclick=async()=>{
  const id=b.dataset.fav, fav=read('bc-favs'), has=fav.includes(id);
  if(db&&user) {
   const r=has?await db.from('favoriler').delete().eq('kullanici_id',user.id).eq('ilan_id',id):await db.from('favoriler').upsert({kullanici_id:user.id,ilan_id:id,fiyat_takibi:true});
   if(r.error) {notify(t('error'));return;}
  }
  write('bc-favs',has?fav.filter(x=>x!==id):[...fav,id]);
  $$('[data-fav]').filter(n=>n.dataset.fav===id).forEach(n=>{n.classList.toggle('selected',!has);n.setAttribute('aria-pressed',String(!has));});notify(t(has?'removed':'saved'));
 });
 $$('[data-compare]').forEach(b=>b.onchange=()=>{
  let list=read('bc-compare').filter(id=>id!==b.dataset.compare);
  if(b.checked&&list.length>=3){b.checked=false;notify(t('compareMax'));return;}
  if(b.checked)list.push(b.dataset.compare);write('bc-compare',list);$$('[data-compare]').forEach(n=>n.checked=list.includes(n.dataset.compare));
 });
}
function render() {
 document.documentElement.lang=lang;
 header();footer();
 $$('[data-i]').forEach(n=>n.textContent=t(n.dataset.i));
 if(document.body.dataset.page==='home')home();
 else if(document.body.dataset.page==='404') { document.title=`${t('notFound')} | BETA.CAR`;$('#main').innerHTML=`<section class="wrap missing"><span class="error-code">404</span><h1>${t('notFound')}</h1><p>${t('notFoundText')}</p><a class="btn" href="index.html">${t('backHome')}${icon('arrow')}</a></section>`; }
}
async function load() {
 if(!db)return;
 const res=await Promise.allSettled([
  db.from('ilan_kartlari').select('*').in('durum',['yayinda','satildi']).order('yayin',{ascending:false}).limit(60),
  db.from('kategoriler').select('*').order('sira'),db.from('firmalar').select('*').eq('one_cikan',true).limit(12),db.from('yazilar').select('slug,baslik,baslik_en,ozet,ozet_en,kategori').eq('aktif',true).order('yayin',{ascending:false}).limit(3),db.from('bannerlar').select('*').eq('aktif',true),db.rpc('sayaclar')
 ]);
 const values=res.map(r=>r.status==='fulfilled'&&!r.value.error?r.value.data:null);
 [cars,cats,firms,posts,banners,counts]=values.map((r,i)=>r??(i===5?undefined:[]));
 home();
 if(res.some(r=>r.status==='rejected'||r.value.error)) { const p=document.createElement('div');p.className='connection';p.setAttribute('role','status');p.innerHTML=`${t('error')} <button class="text-btn">${t('retry')}</button>`;p.querySelector('button').onclick=load;$('#feed').prepend(p); }
}
async function start() {
 render();
 if(!cfg.url||!cfg.anon)return;
 try {
  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm');
  db=createClient(cfg.url,cfg.anon);
  const {data}=await db.auth.getUser();user=data?.user;
  let cached;try{cached=JSON.parse(sessionStorage.getItem('bc-vehicles')||'null');}catch{}
  if(cached?.url===cfg.url&&Date.now()-cached.time<86400000)lex=cached.data;
  else { const r=await db.rpc('arac_sozlugu');if(r.error)throw r.error;lex=r.data;try{sessionStorage.setItem('bc-vehicles',JSON.stringify({url:cfg.url,time:Date.now(),data:lex}));}catch{} }
  if(user) {
   const favs=read('bc-favs');
   if(favs.length) {const r=await db.from('favoriler').upsert(favs.map(id=>({kullanici_id:user.id,ilan_id:id,fiyat_takibi:true})),{onConflict:'kullanici_id,ilan_id',ignoreDuplicates:true});if(r.error)notify(t('error'));}
   const r=await db.from('favoriler').select('ilan_id').eq('kullanici_id',user.id);if(!r.error)write('bc-favs',r.data.map(f=>f.ilan_id));
  }
  if(document.body.dataset.page==='home')await load();else render();
  header();
  if(user) {
   const refresh=async()=>{const r=await db.from('bildirimler').select('id',{count:'exact',head:true}).eq('kullanici_id',user.id).eq('okundu',false);const n=$('#notification-count');if(n){n.hidden=!r.count;n.textContent=r.count>99?'99+':r.count;}};
   await refresh();db.channel(`notifications:${user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'bildirimler',filter:`kullanici_id=eq.${user.id}`},refresh).subscribe();
  }
 }catch {notify(t('error'));}
}
start();
export { db,user,t,esc,icon,card,bodySummary,bindVehicles,vehicleForm,notify,read,write,number,path };
