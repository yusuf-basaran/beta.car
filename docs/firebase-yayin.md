# Firebase yayın kaydı

Proje: `beta-car-a019a9b0` · Bölge: `europe-west1` · Firestore Standard.

[Firebase Console](https://console.firebase.google.com/project/beta-car-a019a9b0/overview)

| Bileşen                            | Durum                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| Firebase projesi ve web uygulaması | Hazır                                                                            |
| E-posta/parola girişi              | Etkin; anonim üyelik kapalı                                                      |
| Firestore                          | Veritabanı, kurallar ve indeksler yayında; silme koruması açık                   |
| Başlangıç verileri                 | Kategori, donanım, fiyatsız paket, ayar, araç sözlüğü ve içerik kayıtları mevcut |
| Web yapılandırması ve ikonlar      | Yayın çıktısında hazır; kaynak bağlantı alanları boş                             |
| Storage                            | Blaze planının etkinleştirilmesini bekliyor                                      |
| Functions ve Cloud Scheduler       | Blaze planının etkinleştirilmesini bekliyor                                      |
| Hosting                            | Tam uygulama yayını henüz yapılmadı                                              |

Firebase CLI, `artifactregistry.googleapis.com` hizmetini açmak ve sunucu işlevlerini yayımlamak için Blaze planını zorunlu tutar. Projede faturalandırma kapalıdır. Plan [Firebase Console üzerinden](https://console.firebase.google.com/project/beta-car-a019a9b0/usage/details) etkinleştirilir. Blaze kullanım bazlı ücretlendirilir; ücretsiz kotalar bulunur. Google faturalandırma bilgileri depoya veya siteye yazılmaz.

Plan etkinleştirildikten sonra:

```bash
npm ci
npm ci --prefix functions
npm run firebase:deploy
```

Betik mevcut projeyi seçer; Auth, Firestore ve başlangıç kayıtlarını güvenle kontrol eder. Sunucu ve Storage dağıtımından sonra Hosting'i yayımlar. Başlangıç verilerindeki işlem işareti, tekrar çalıştırmada yönetici değişikliklerinin üzerine yazılmasını engeller. Yerel `INITIAL_ADMIN_EMAIL` ayarı Git dışındaki proje ortam dosyasında tutulur; ilgili hesap e-postasını doğrulayınca ilk yönetici yetkisi bir kez atanır.

Hedef Hosting adresi `https://beta-car-a019a9b0.web.app` şeklindedir. Tam yayın tamamlanmadan bu adres çalışan ilan sitesi olarak kullanılmaz. Özel alan adı seçilirse Auth alan adları, robots ve sitemap birlikte güncellenir.

[Yayın kontrol listesi](yayin-kontrol-listesi.md), banka/paket ayarları, e-posta sağlayıcısı, isteğe bağlı SMS ve onaylı yasal içerikler canlı kullanım öncesinde tamamlanır.
