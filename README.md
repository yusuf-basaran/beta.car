# BETA.CAR

BETA.CAR, Kuzey Kıbrıs için araç ve parça ilan platformudur. Kullanılmış araç, sıfır araç ve parça ilanlarını bireysel ve kurumsal satıcılarla bir araya getirir. Marka sloganı: **Luxury & Prestige Gallery**.

## Özellikler

- İlan arama, ayrıntılı filtreler, ilçe düzeyinde harita, kaporta ve donanım bilgileri
- Bireysel ve kurumsal üyelik, favoriler, kayıtlı aramalar ve bildirimler
- Site dışında havale ile yürütülen paket talebi, özel dekont, kota ve süre yönetimi
- Firma sayfaları, site içi mesajlaşma, araç karşılaştırma ve piyasa verisine dayalı değerleme
- Yönetim paneli, içerik ve şikâyet yönetimi, Türkçe ve İngilizce arayüz

## Mimari

```text
Tarayıcı: HTML + CSS + ES modülleri
    │ Supabase istemcisi, yalnız public/anon anahtarı
    ▼
Supabase: Auth · Postgres/RLS/RPC · Storage · Realtime · pg_cron

GitHub → Vercel → .build statik dosyaları
```

Kota, abonelik ve yetki denetimleri Postgres üzerinde çalışır. İstemci yönetici yetkisi veya kota belirlemez. Supabase istemcisi CDN'den sabit `2.118.0` sürümüyle yüklenir; uygulamada arayüz framework'ü bulunmaz.

## Dosya düzeni

```text
*.html, style.css, app.js, logo.png
js/                 Ortak yardımcılar ve sözlük
js/pages/           Sayfa modülleri
scripts/            Statik build, yerel sunucu ve ekran görüntüsü betikleri
tests/              Saf fonksiyon, veritabanı ve tarayıcı testleri
supabase/migrations/ Sıralı SQL dosyaları
docs/               Kurulum, inceleme, yayın ve kabul belgeleri
```

## Yerel çalıştırma

Node.js 20.19 veya üstü gerekir.

```bash
npm ci
npm run dev
```

Adres: `http://127.0.0.1:4173`. HTML dosyaları HTTP üzerinden açılır. `npm run format` kod biçimini düzenler.

## Ortam ayarları

Depodaki `js/config.js` dosyasında `cfg.url` ve `cfg.anon` boş tutulur. Supabase bağlantısı için yerel veya dağıtım kopyasında projenin URL'si ve public/anon anahtarı kullanılır. Vercel için `SUPABASE_URL` ve `SUPABASE_ANON_KEY` ortam değişkenleri tanımlanır; build bunları yalnız `.build/js/config.js` içine yazar. Dolu yapılandırma depoya gönderilmez. Service role anahtarı tarayıcıya veya statik çıktıya girmez.

Şema ve roller için [veritabanı belgesi](supabase/README.md), Auth/Storage/Realtime ve yayın ayarları için [kurulum](docs/kurulum.md) izlenir. Gerçek servis bağlantısı, SMTP, SMS, banka ve alan adı ayarları işletmeci tarafından yapılır.

## Test

```bash
npm run lint
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

Sistemde kurulu Chromium kullanılacaksa yürütülebilir dosya yolu `CHROMIUM_PATH` ile verilir. Yapılandırmada makineye özgü yol bulunmaz. Tarayıcı testleri Supabase istemcisini taklit eder; canlı servise bağlanmaz. Veritabanı testleri geçici PGlite üzerinde Auth/Storage/cron/Vault/HTTP sınırlarını taklit eder. CI, push ve pull request işlemlerinde aynı kontrolleri çalıştırır.

## Dağıtım

Vercel'e `yusuf-basaran/beta.car` deposu bağlanır. Framework **Other**, build komutu `npm run build`, çıktı dizini `.build` seçilir. Ayarlar `vercel.json` içindedir. Build yalnız istemci dosyalarını kopyalar; SQL, belgeler, testler ve seed çıktıda yer almaz.

Supabase migration'ları sırayla uygulanır. Kök SQL dosyaları aynı içeriğin korunmuş kaynaklarıdır; aynı veritabanına ikinci kez uygulanmaz. Yayın öncesi [kontrol listesi](docs/yayin-kontrol-listesi.md) ve [kabul senaryoları](docs/kabul-testleri.md) tamamlanır.

## Güvenlik

RLS ve dar kolon/RPC yetkileri erişimi sınırlar. Dekont ve ekspertiz bucket'ları özeldir; süreli bağlantıyla açılır. Banka bilgisi yalnız giriş yapmış talep sahibine, kendi talebi ödeme beklerken verilir. Site para tahsil etmez ve kapora toplamaz.

CSP satır içi script ve stillere izin vermez. HSTS, frame-ancestors ve diğer güvenlik başlıkları Vercel'de uygulanır. `seed.js`, `.seed-state.json` ve `.env*` Git dışındadır. Ayrıntılar: [güvenlik incelemesi](docs/guvenlik-incelemesi.md), [bildirim kanalı](SECURITY.md), [istemci bağımlılığı seçenekleri](docs/istemci-bagimliliklari.md).

## Ekran görüntüleri

Görüntüler kurmaca test kayıtlarıyla alınmıştır; canlı kişi, dekont veya banka verisi içermez. Yenilemek için `npm run screenshots` çalıştırılır.

| Ana sayfa                            | İlan listesi                               |
| ------------------------------------ | ------------------------------------------ |
| ![Ana sayfa](docs/img/ana-sayfa.png) | ![İlan listesi](docs/img/ilan-listesi.png) |

| İlan detayı                              | Yönetim paneli                                 |
| ---------------------------------------- | ---------------------------------------------- |
| ![İlan detayı](docs/img/ilan-detayi.png) | ![Yönetim paneli](docs/img/yonetim-paneli.png) |

## Lisans

Tüm hakları saklıdır. © 2026 Yusuf Basaran. Kullanım koşulları [LICENSE](LICENSE) dosyasındadır. Üçüncü taraf bileşenlerin lisansları kendi koşullarına tabidir.
