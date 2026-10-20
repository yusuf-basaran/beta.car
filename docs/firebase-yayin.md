# Firebase yayın kaydı

Yayın tarihi: 20 Ekim 2026. Proje: `beta-car-a019a9b0` · Bölge: `europe-west1` · Firestore Standard.

[Site](https://beta-car-a019a9b0.web.app) · [Firebase Console](https://console.firebase.google.com/project/beta-car-a019a9b0/overview)

| Bileşen                            | Durum                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| Firebase projesi ve web uygulaması | Hazır                                                                            |
| E-posta/parola girişi              | Etkin; anonim üyelik kapalı                                                      |
| Firestore                          | Veritabanı, kurallar ve indeksler yayında; silme koruması açık                   |
| Başlangıç verileri                 | Kategori, donanım, fiyatsız paket, ayar, araç sözlüğü ve içerik kayıtları mevcut |
| Web yapılandırması ve ikonlar      | Yayında; kaynak bağlantı alanları boş                                            |
| Faturalandırma                     | Açık hesap projeye bağlı; Blaze etkin                                            |
| Storage                            | `EUROPE-WEST1` varsayılan bucket ve kurallar yayında; genel IAM erişimi kapalı   |
| Functions                          | `api`, `bakim`, `temizlik`, `eposta`, `ilanBildirim`, `seo` etkin                |
| Cloud Scheduler                    | Bakım 15 dakikada bir, temizlik 03:20 UTC, e-posta iki dakikada bir              |
| Hosting                            | 19 sayfa, API yönlendirmesi ve güvenlik başlıkları yayında                       |

Blaze kullanım bazlı ücretlendirilir; ücretsiz kotalar bulunur. Google faturalandırma bilgileri depoda veya sitede tutulmaz. Artifact Registry işlev imajlarında otomatik silme kapalıdır; saklama politikası ayrıca yönetilir.

Yeniden yayın:

```bash
npm ci
npm ci --prefix functions
npm run firebase:deploy
```

Betik mevcut projeyi seçer; Auth, Firestore ve başlangıç kayıtlarını kontrol eder. Sunucu ve Storage dağıtımından sonra Hosting'i yayımlar. Başlangıç verilerindeki işlem işareti, tekrar çalıştırmada yönetici değişikliklerinin üzerine yazılmasını engeller. Yerel `INITIAL_ADMIN_EMAIL` ayarı Git dışındaki proje ortam dosyasında tutulur; ilgili hesap sitede kayıt olup e-postasını doğrulayınca ilk yönetici yetkisi bir kez atanır. İlk yönetici hesabının kaydı ve doğrulaması hesap sahibi tarafından tamamlanır.

Canlı tarayıcı kontrolünde 38 kategori, 20 donanım, 11 marka, 10 model ve üç yazı okundu. İkonlar, TR/EN geçişi, filtre/sıralama, paket tablosu, giriş/kayıt alan doğrulaması, 404 ve mobil genişlik kontrolü başarılıdır. Tarayıcı, CSP veya API sunucu hatası görülmedi. Banka RPC'si girişsiz isteği reddetti; özel talepler veri döndürmedi. Firestore banka/rol kayıtları ve Storage dosya listeleme isteği girişsiz erişime kapalıdır. Canlı kullanıcı ilanı, firma veya banka bilgisi eklenmedi.

Üç Scheduler işinin canlı çalıştırma sonucu başarılıdır. E-posta işlevi, sağlayıcı ayarlanmadığı sürece teslimat yapmaz. Storage hizmet hesabının Firestore kural erişimi `roles/firebaserules.firestoreServiceAgent` rolüyle sağlanır; yayın betiği eksik rolü tamamlar.

`robots.txt` ve `sitemap.xml` Hosting adresiyle eşleşir. Özel alan adı seçilirse Auth alan adları, robots ve sitemap birlikte güncellenir.

Açık sayfalar ve sitemap `seo` işlevinden sunulur. 54 TR/EN sitemap adresi, canonical, JSON-LD ve indeks dışı sayfalar canlıda kontrol edilmiştir. Search Console oturumu ek yetki gerektirir; mülk doğrulaması ve sitemap gönderimi tamamlanmamıştır. Ayrıntılar [SEO belgesindedir](seo.md).

İşletim için ilk yönetici, banka/paket ayarları ve onaylı yasal içerikler tamamlanır. Auth e-postaları Firebase Authentication kullanır; uygulama bildirim e-postası sağlayıcısı ve SMS henüz ayarlı değildir. Gerçek e-posta teslim testi ve tam araç kataloğu aktarımı ayrıca yapılır. Ayrıntılar [yayın kontrol listesinde](yayin-kontrol-listesi.md) yer alır.
