# Kurulum

## Gereksinimler

Node.js 20.19+, GitHub deposuna erişim, Supabase projesi ve Vercel hesabı gerekir. Yerel geliştirme için `npm ci` ve `npm run dev` çalıştırılır. Tarayıcı HTTP üzerinden `http://127.0.0.1:4173` adresini açar.

## Supabase

[Migration sırası](../supabase/README.md) izlenir. Kök SQL dosyalarıyla migration kopyaları aynı veritabanına birlikte uygulanmaz. İlk yönetici SQL Editor üzerinden, e-postası doğrulanmış hesaba atanır.

- `pg_cron`, `pg_net` ve Vault kullanılabilir olmalıdır.
- Data API exposed schemas listesine `private` eklenmez.
- Auth Site URL gerçek HTTPS alan adı olur. `hesabim.html` ve `giris.html` yönlendirmeleri aynı alan adıyla tanımlanır.
- E-posta doğrulaması açılır; anonim üyelik kapatılır. Auth SMTP ve gönderen alan adı doğrulanır.
- Realtime publication: `bildirimler`, `mesajlar`, `konusmalar`, `ilanlar`.
- Storage: `dekontlar` özel 5 MB, `ekspertiz` özel 10 MB, `ilanlar` açık 10 MB, `firmalar` açık 5 MB. İzinli türler migration dosyalarında belirtilir.

`js/config.js` depoda boş kalır. Yerel bağlantı için yalnız geliştirme kopyasında URL ve public/anon anahtarı kullanılır. Vercel ortamında `SUPABASE_URL` ve `SUPABASE_ANON_KEY` tanımlandığında build bunları yalnız `.build/js/config.js` içine yazar. Service role anahtarı bu değişkenlerin yerine kullanılmaz.

## Paket ve yönetim ayarları

Yönetici `admin.html?sekme=ayarlar` üzerinden IBAN, banka, hesap sahibi, ödeme notu, iletişim telefonu, sosyal bağlantılar, kurlar, ücretsiz ilan limiti ve süreleri belirler. Paket adları, fiyatları ve kota değerleri paket yönetiminden gelir. Fiyatı boş pakette talep ödeme beklerken tutar yönetici tarafından girilir.

Talep sahibi banka bilgisini yalnız kendi ödeme bekleyen talebinde görür. Yönetici dekontu banka kaydıyla karşılaştırıp onaylar. Onay aboneliği aynı veritabanı işleminde açar. Kullanıcı kota, abonelik veya talep onayını değiştiremez. Kaldırma ve silme hak iadesi yapmaz.

Site içinde tahsilat, otomatik yenileme, kapora toplama veya fatura kesme bulunmaz. İade site dışında yürütülür; yönetici yalnız işlem notu tutar. Ödeme bilgisi genel sayfalara, ilanlara ve mesajlara yazılmaz.

## Telefon doğrulama

SMS sağlayıcısı etkin değilken `sms_zorunlu` false tutulur ve doğrulanmış e-posta kullanılır. Sağlayıcı açıldıktan sonra profil ekranından telefon değişikliği ve kod doğrulaması denenir. Ardından ayar true yapılır. Yayın RPC'si doğrulanmış Auth telefonu ile profil telefonunun eşleşmesini denetler.

## Araç sözlüğü

Tek seferlik `seed.js` ve `.seed-state.json` Git dışında tutulur. Betik işletmeciye özel olarak teslim edilir ve kökte çalıştırılır. Service role anahtarı yalnız bu işlemde ortam değişkeninden okunur; anahtar terminal geçmişine yazılmaz:

```bash
read -r SUPABASE_URL
read -r -s SUPABASE_SERVICE_ROLE_KEY
export SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
node seed.js
unset SUPABASE_SERVICE_ROLE_KEY
```

Betik vPIC üzerinden 1950'den çalıştırıldığı yıla kadar tarama yapar. Durum dosyası korunursa kaldığı yerden sürer. Ayrı proje veya yıl için `SEED_STATE` ile ayrı durum dosyası seçilir. Japonya ve İngiltere pazarı ekleri aynı tablolara yazılır. vPIC kapsamı deniz, arazi/iş makinesi ve bazı bölgesel modelleri bütünüyle kapsamaz; kayıtlar yönetici tarafından denetlenir.

## Bildirim e-postaları

Auth SMTP, uygulama bildirimlerini kendiliğinden göndermez. E-posta migration'ı ve Vault içindeki `beta_mail_url`, `beta_mail_key`, `beta_mail_from` kayıtları kullanılır. API HTTPS üzerinden Bearer doğrulamasıyla `from`, `to`, `subject`, `text` JSON alanlarını kabul eder. Anahtarlar dosyalara yazılmaz.

Profilde e-posta özeti açıksa bildirimler özel kuyruğa eklenir. Kayıtlı arama için ayrıca o aramanın e-posta seçeneği açık olmalıdır. `beta-car-eposta` işi iki dakikada bir çalışır, en fazla beş deneme yapar ve HTTP sonucunu izler. Teslimat sağlayıcının raporunda doğrulanır.

## Vercel

Depo Git entegrasyonu ile bağlanır. Framework Other, root depo kökü, build `npm run build`, çıktı `.build` olur. İstemci için yalnız URL ve public/anon anahtarı ortam ayarlarına girilir. Ortam değişikliği sonrası yeni deployment gerekir.

Build HTML, CSS, ES modülleri, logo, manifest, robots ve sitemap dosyalarını kopyalar. SQL, seed, belgeler, testler ve ortam dosyaları statik çıktıya girmez. `/kullanilmis`, `/sifir` ve `/parca` yolları liste sayfasına yönlenir.

Gerçek alan adı `robots.txt`, `sitemap.xml`, Auth URL'leri ve sosyal paylaşım adreslerinde tutarlı kullanılır. HTTPS ve 404 davranışı kontrol edilir. Manifest ana ekrana eklemeyi destekler; servis çalışanı ve çevrimdışı önbellek kullanılmaz.

Yayın öncesi [kontrol listesi](yayin-kontrol-listesi.md) ve [kabul senaryoları](kabul-testleri.md) tamamlanır.
