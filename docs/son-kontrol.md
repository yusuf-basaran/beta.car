# Son kontrol

Kontrol tarihi: 17 Ekim 2026. Yerel komutlar ve GitHub Actions kontrolleri başarılıdır. CI, Node.js 24 ve Ubuntu 24.04 üzerinde çalışır.

| Komut                    | Sonuç                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `npm run lint`           | Başarılı                                                                                   |
| `npm test`               | 10 test başarılı; saf yardımcılar, migration sırası/kopyaları, RLS ve işlem akışları dahil |
| `npm run test:browser`   | 9 test başarılı; Supabase istemcisi taklit edildi                                          |
| `npm run build`          | 19 HTML sayfası ve istemci dosyaları .build içinde                                         |
| `npx prettier --check .` | Başarılı                                                                                   |
| `git diff --check`       | Başarılı                                                                                   |

Tarama, izlenen metin dosyalarını, paket kilidini ve commit açıklamalarını kapsar. İstenmeyen atıf veya ek yazar kaydı bulunmadı. SQL kimlik sütunu tanımları korunmuştur. Logonun ek meta verileri temizlenmiş, PNG görüntü verisinin aynı kaldığı kontrol toplamıyla doğrulanmıştır.

`cfg.url` ve `cfg.anon` kaynakta boştur. seed, durum dosyası ve ortam dosyaları Git dışındadır. Build yalnız public/anon anahtarı kabul eder. Kök SQL dosyaları ile ilk üç migration kopyası aynı içeriğe sahiptir; kök dosyalar korunur.

## Commit geçmişi

Geçmişi koruma kararı gereği önceki dört commit'in yazarı değiştirilmemiştir. Yeni commit'lerde Yusuf Basaran kimliği ve belirtilen e-posta kullanılır. Bu rapordan önceki kayıtlar:

| Commit  | Yazar         | Mesaj                                                    |
| ------- | ------------- | -------------------------------------------------------- |
| cec8b3f | Bet4 LIVE     | BETA.CAR ilk aşama: Supabase altyapısı ve ana sayfa      |
| 964690b | Bet4 LIVE     | Marka logosunu ekle ve header görünümünü düzenle         |
| 35b12ff | Bet4 LIVE     | İlan, üyelik, paket, firma ve yönetim akışlarını tamamla |
| ae1879d | Bet4 LIVE     | Logoyu yeni PNG ile güncelle                             |
| 5f52dfd | Yusuf Basaran | Depo durumunu kaydet                                     |
| f3d5e6e | Yusuf Basaran | İstemci kodunu ES modüllerine ayır                       |
| 20b5db8 | Yusuf Basaran | HTML çıktılarını ve sunucu kontrollerini güçlendir       |
| 537ef9c | Yusuf Basaran | Testleri ve sürekli kontrol akışını ekle                 |
| acdcae3 | Yusuf Basaran | SQL dosyalarını sıralı migration düzenine al             |
| 655a113 | Yusuf Basaran | Depo belgelerini ve paylaşım görsellerini düzenle        |
| 5763874 | Yusuf Basaran | Yasal sayfa şablonlarını ve içerik kontrollerini ekle    |
| e737f7d | Yusuf Basaran | Yayın ve kabul kontrol listelerini tamamla               |

## Yayın öncesi açık maddeler

- Supabase proje seçimi, migration uygulaması ve canlı Auth/Storage/Realtime/cron kontrolü.
- Auth SMTP, bildirim API'si/Vault ve gerekiyorsa SMS sağlayıcısının gerçek teslim testleri.
- Yasal yer tutucular, veri saklama/aktarım ayrıntıları ve hukuk incelemesi; şablonlar otomatik yayımlanmaz.
- Paket fiyatları, kota/süreler, banka ve işletme iletişim ayarları.
- Gerçek alan adı, Vercel Git bağlantısı/ortam ayarları, robots/sitemap ve Search Console.
- Manifest için kare uygulama ikonları ve cihazda ana ekrana ekleme kontrolü; kaynak logo korunur.
- [Kabul senaryolarının](kabul-testleri.md) gerçek test projesinde uygulanması.

Ayrıntılı adımlar [yayın kontrol listesinde](yayin-kontrol-listesi.md), veritabanı sırası [Supabase belgesinde](../supabase/README.md) yer alır. Yerel test sonuçları canlı servis teslimatı veya hukuki uygunluk doğrulaması anlamına gelmez.
