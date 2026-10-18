# Güvenlik incelemesi

Bu belge önceki Supabase kurulumu için korunur. Firebase kurulumu [kurulum belgesinde](kurulum.md) yer alır.

İnceleme kapsamı: istemci HTML çıktıları, iki temel SQL dosyası, e-posta SQL dosyası ve Vercel başlıkları. Düzeltmeler `20261017000400_0004_guvenlik.sql` dosyasındadır; temel SQL dosyaları korunmuştur.

## İstemci bulguları

| Konum                                                                                          | Bulgu ve düzeltme                                                                                                                             |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `js/pages/packages.js:72`, `:126`; `js/pages/admin.js:126`                                     | Referans kodları HTML metnine kaçış uygulanarak yazılır.                                                                                      |
| `js/pages/packages.js:74`, `:122`, `:212`; `js/pages/wanted.js:58`; `js/pages/valuation.js:48` | Para birimiyle birleşen fiyat çıktıları HTML sınırında kaçırılır.                                                                             |
| `js/ui.js:184`, `:342`                                                                         | Fiyat yardımcıları düz metin döndürür; textContent ve canvas kullanımlarında HTML varlıkları gösterilmez.                                     |
| `js/pages/account.js:278`                                                                      | Bildirim durumunun sözlükte bulunmayan değeri de kaçırılır.                                                                                   |
| `js/pages/posts.js:79`                                                                         | Paragraflar önce kaçırılır, ardından yalnızca sabit p/br etiketleri eklenir.                                                                  |
| `js/forms.js:20`, `js/ui.js:379`                                                               | HTML döndüren ortak yardımcıların metin alanları kaçırılır. input/body/extra parametreleri yalnızca kod içindeki HTML yardımcılarından gelir. |
| `js/pages/list.js:41`, `js/vehicle.js:143`                                                     | Harita ve kaporta işaretlemesi koddan gelir; içindeki metin ve öznitelikler ayrı kaçırılır.                                                   |

`esc` metin ve alıntılı öznitelikler içindir. URL kaynakları ayrıca http/https protokol denetiminden geçer. JSON-LD, JSON.stringify ile script.textContent üzerinden atanır. Sayısal görselleştirmeler Number/Intl üzerinden işlenir. Satır içi olay özniteliği ve style özniteliği eklenmemiştir.

## HTML yazma noktalarının envanteri

Modüllerde 92 HTML yazma noktası incelendi. Ortak HTML yardımcılarının alt ifadeleri de kapsama dahildir.

| Dosya                   | Satırlar                                             |
| ----------------------- | ---------------------------------------------------- |
| `js/forms.js`           | 45, 59, 104                                          |
| `js/navigation.js`      | 31                                                   |
| `js/pages/account.js`   | 26, 28, 33, 59, 155, 162, 209, 238, 283, 336         |
| `js/pages/admin.js`     | 11, 13, 17, 45, 79, 94, 121, 187, 258, 314, 398, 434 |
| `js/pages/compare.js`   | 10, 13, 55                                           |
| `js/pages/detail.js`    | 30, 40, 87, 320                                      |
| `js/pages/editor.js`    | 23, 25, 59, 163, 182, 276, 322, 387                  |
| `js/pages/firms.js`     | 27, 55, 97, 99, 108, 119                             |
| `js/pages/home.js`      | 44, 145, 276, 308                                    |
| `js/pages/legal.js`     | 12, 14, 19, 24, 32                                   |
| `js/pages/list.js`      | 99, 197, 208, 234                                    |
| `js/pages/login.js`     | 25                                                   |
| `js/pages/messages.js`  | 11, 13, 23, 46, 51, 66                               |
| `js/pages/packages.js`  | 24, 106, 160, 185, 227                               |
| `js/pages/photos.js`    | 12, 14, 23                                           |
| `js/pages/posts.js`     | 10, 12, 20, 26, 43, 53                               |
| `js/pages/profile.js`   | 14, 88                                               |
| `js/pages/valuation.js` | 13, 43                                               |
| `js/pages/wanted.js`    | 12, 51                                               |
| `js/ui.js`              | 55, 128                                              |
| `js/vehicle.js`         | 48, 64, 82                                           |

## Veritabanı bulguları

| Alan          | Sonuç                                                                                                                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RLS           | public/private uygulama tablolarında açık; kart ve piyasa view'ları security_invoker kullanır. Yetkiler oturum kimliğiyle denetlenir; kullanıcı metadata alanı yönetici yetkisi vermez.            |
| Fonksiyonlar  | SECURITY DEFINER fonksiyonlarında boş search_path kullanılır. Yeni trigger fonksiyonlarının istemci execute yetkileri kaldırılmıştır; mevcut RPC yetkileri korunur.                                |
| Paket ve kota | Kullanıcı talep durumu/kota/abonelik yazamaz. Kota profil ve abonelik kilitleri altında sunucuda düşer. Banka bilgisi yalnızca ödeme bekleyen kendi talebinin RPC'sinden alınır.                   |
| Özel şema     | Şemada CREATE yetkisi verilmez; yardımcı RPC'ler için USAGE gerekir. Supabase API exposed schemas listesinde private bulunmamalıdır; canlı ayar dağıtım sırasında doğrulanır.                      |
| Mesaj         | Katılımcı/engel ve 15/dakika kontrollerine ek olarak tekrar ve 500/gün sınırı eklendi.                                                                                                             |
| Formlar       | Talep, randevu, iletişim ve öneri uzunluk sınırları; 5/dakika, 100/gün, aynı içerik için 5 dakika aralık. Aranan araç talebi mevcut talep işlevini karşılar; ayrı parasal teklif tablosu bulunmaz. |
| Şikâyet       | Mesajın karşı katılımcısına veya görünür ilana erişim doğrulanır; not sınırı ve mevcut 3/dakika sınırı uygulanır.                                                                                  |
| Kayıtlı arama | Geçersiz filtre yayın işlemini durdurabiliyordu. Yeni filtreler sorguyla doğrulanır; eski geçersiz filtreler bildirim döngüsünde atlanır.                                                          |
| Telefon       | Satıcı RPC'si artık ilanı/firması olmayan ilgisiz profillerin telefonunu döndürmez.                                                                                                                |
| Ekspertiz     | Kaydedilen dosyanın ilan sahibinin dizininde ve Storage'da olması zorunlu.                                                                                                                         |
| Storage       | dekontlar özel 5 MB, ekspertiz özel 10 MB, PDF/JPEG/PNG; ilanlar açık 10 MB ve firmalar açık 5 MB, JPEG/PNG/WebP. Ayarlar mevcut bucket'larda da uygulanır.                                        |

Yeni CHECK kuralları NOT VALID eklenmiştir: eski kayıtlar değiştirilmez; yeni veya güncellenen kayıtlar kurallara tabidir. Canlı geçişte eski kayıtlar taranıp düzeltildikten sonra VALIDATE CONSTRAINT çalıştırılmalıdır.

## Başlıklar ve doğrulama

CSP'de frame-ancestors 'none', object-src 'none', script-src 'self' ve sabit CDN kaynağı, style-src 'self' korunur. HSTS bir yıl ve includeSubDomains ile eklenmiştir. Alt alan adları da HTTPS sunmalıdır. Referrer-Policy, Permissions-Policy ve X-Content-Type-Options korunur.

Yerel PostgreSQL motorunda Auth, Storage, cron, Vault ve e-posta HTTP sınırları taklit edilerek 68 mevcut yetki/akış doğrulaması geçti. Canlı Auth, SMS, Storage dosya kabulü, cron ve e-posta teslimatı bu yerel kontrolün kapsamında değildir; yayın kontrol listesinde ayrıca doğrulanır.
