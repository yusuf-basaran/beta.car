# Son kontrol

Kontrol tarihi: 18 Ekim 2026. Firebase altyapısı ve yeni uygulama ikonları kullanılır. Yerel lint, birim, emülatör, tarayıcı, build ve biçim kontrolleri başarılıdır. Firebase hesabı yetkilendirildi; canlı uygulama yayını Blaze planının etkinleştirilmesini bekliyor. Önceki dört commit korunur; yeni commit'ler Yusuf Basaran kimliğiyle yazılır.

| Kontrol                  | Kapsam                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `npm run lint`           | İstemci, sunucu, betik ve test kodları                                                                |
| `npm test`               | 10 saf fonksiyon, build ve korunan SQL regresyon testi                                                |
| `npm run test:firebase`  | 12 test başarılı; Auth, Firestore, Storage, Functions, Hosting, gerçek SDK girişi ve sunucu kuralları |
| `npm run test:browser`   | 9 arayüz senaryosu; servis yanıtları taklit edilir                                                    |
| `npm run build`          | 19 HTML sayfası, ES modülleri, stil, logo ve ikonlar                                                  |
| `npx prettier --check .` | Biçim kontrolü                                                                                        |
| `git diff --check`       | Boşluk ve birleştirme kontrolü                                                                        |

Kaynak bağlantı alanları boştur. Firebase Hosting public yapılandırmayı ayrılmış adresinden alır; farklı dağıtım için build yalnız izinli web yapılandırma alanlarını kabul eder. Özel kimlik dosyası, ortam dosyası, seed, SQL, sunucu, belge ve testler statik çıktıya kopyalanmaz. Eski SQL kaynakları ve migration kopyaları korunur.

## Canlıda tamamlanacaklar

- Blaze planının etkinleştirilmesi ve Storage kurulumu. Firebase projesi, Auth, Firestore, kurallar ve başlangıç kayıtları hazır.
- Storage kuralları, Functions ve Hosting canlı dağıtımı; ilk yönetici ataması.
- Auth e-postası, bildirim sağlayıcısı ve isteğe bağlı SMS teslim testleri.
- Banka, paket fiyatı, kota/süreler ve işletme iletişim ayarları.
- Yasal işletmeci alanları ve hukuk incelemesi; onaylı içeriklerin aktarımı.
- Gerçek alan adı, DNS, robots/sitemap, cihaz ikonları ve Search Console.
- [Kabul testlerinin](kabul-testleri.md) gerçek test projesinde uygulanması.

Emülatör ve taklit servis sonuçları canlı sağlayıcı teslimatını doğrulamaz. Teknik ayrıntılar [kurulum](kurulum.md), [Firebase incelemesi](firebase-guvenlik.md) ve [yayın kontrol listesinde](yayin-kontrol-listesi.md) yer alır.

Proje ve servislerin yayın kaydı [Firebase yayın belgesinde](firebase-yayin.md) yer alır.
