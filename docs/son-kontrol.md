# Son kontrol

Kontrol tarihi: 20 Ekim 2026. Firebase altyapısı ve yeni uygulama ikonları kullanılır. Lint, birim, emülatör, tarayıcı, build ve biçim kontrolleri başarılıdır. Auth, Firestore, Storage, altı sunucu işlevi, üç zamanlanmış iş ve Hosting yayımlanmıştır. [Canlı site](https://beta-car-a019a9b0.web.app) tarayıcı ve erişim kontrollerini geçti. Önceki dört commit korunur; yeni commit'ler Yusuf Basaran kimliğiyle yazılır.

| Kontrol                  | Kapsam                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `npm run lint`           | İstemci, sunucu, betik ve test kodları                                                                                         |
| `npm test`               | 16 saf fonksiyon, SEO, build ve korunan SQL regresyon testi                                                                    |
| `npm run test:firebase`  | 14 test başarılı; Auth, Firestore, Storage, Functions, Hosting, SEO, gerçek SDK girişi ve sunucu kuralları                     |
| `npm run test:browser`   | 18 arayüz senaryosu; servis yanıtları taklit edilir; geciken bağlantı, hata/yeniden deneme ve gereksiz istekler kontrol edilir |
| `npm run build`          | 19 HTML sayfası, ES modülleri, stil, logo ve ikonlar                                                                           |
| `npx prettier --check .` | Biçim kontrolü                                                                                                                 |
| `git diff --check`       | Boşluk ve birleştirme kontrolü                                                                                                 |
| Canlı tarayıcı           | Gerçek Firebase verileri, ikonlar, TR/EN, filtre/sıralama, paketler, form doğrulama, 404 ve mobil                              |
| Canlı erişim             | Banka/rol kayıtları, özel talepler ve dosya listeleme girişsiz erişime kapalı; bucket genel IAM erişimi kapalı                 |
| Canlı SEO                | 54 sitemap adresi; canonical, hreflang, JSON-LD, paylaşım görseli, 301, 404 ve özel sayfa noindex kontrolü                     |

Kaynak bağlantı alanları boştur. Firebase Hosting public yapılandırmayı ayrılmış adresinden alır; farklı dağıtım için build yalnız izinli web yapılandırma alanlarını kabul eder. Özel kimlik dosyası, ortam dosyası, seed, SQL, sunucu, belge ve testler statik çıktıya kopyalanmaz. Eski SQL kaynakları ve migration kopyaları korunur.

## Canlıda tamamlanacaklar

- Hesap sahibinin sitede kayıt olup e-postasını doğrulamasıyla ilk yönetici ataması.
- Auth e-postası, bildirim sağlayıcısı ve isteğe bağlı SMS teslim testleri.
- Banka, paket fiyatı, kota/süreler ve işletme iletişim ayarları.
- Yasal işletmeci alanları ve hukuk incelemesi; onaylı içeriklerin aktarımı.
- Gerçek alan adı, DNS, robots/sitemap, cihaz ikonları ve Search Console.
- Tam araç kataloğu aktarımı; başlangıçta 11 marka ve 10 model bulunur.
- [Kabul testlerinin](kabul-testleri.md) gerçek test projesinde uygulanması.

Emülatör ve taklit servis sonuçları canlı sağlayıcı teslimatını doğrulamaz. Teknik ayrıntılar [kurulum](kurulum.md), [Firebase incelemesi](firebase-guvenlik.md) ve [yayın kontrol listesinde](yayin-kontrol-listesi.md) yer alır.

Proje ve servislerin yayın kaydı [Firebase yayın belgesinde](firebase-yayin.md) yer alır.

## Açılış performansı

Oturum kontrolü tamamlanmadan bağlantı veya giriş uyarısı gösterilmez. İlk yüklemede yüklenme durumu, gerçek hatada yeniden deneme düğmesi sunulur. Üyelik gerektiren sayfalarda ziyaretçi için araç kataloğu istenmez. Ana sayfanın başlangıç verisi 10 yerine 2 sunucu isteğiyle alınır. Özel banka ayarları bu yanıtlara dahil edilmez.

Sayfa modülleri ihtiyaç halinde yüklenir. Firestore dinleme ve Storage yükleme kodları ilk kullanımda indirilir. Üst logonun görüntüsü daha küçük WebP dosyasıyla sunulur; asıl logo korunur. Build, istemci dosyalarının içeriğinden sürüm numarası hesaplayıp modül ve stil adreslerine ekler; böylece yeni yayın eski dosyalarla karışmaz.

Canlı mobil ölçümde ana sayfanın veri yüklemesi 5,3 saniyeden 2,7 saniyeye indi. İlk açılışta aynı kaynaktan indirilen içerik yaklaşık 1,18 MB yerine 89 KB oldu; dış Firebase SDK dosyaları bu boyut toplamına dahil değildir. Ayrı tarayıcı kontrolünde LCP 1,37 saniye, CLS 0 ölçüldü. Bu değerler ölçüm ortamına aittir; cihaz ve bağlantıya göre değişir. Geciktirilen Firebase SDK testi geçici bağlantı uyarısı göstermedi.

Skeleton yer tutucular ilk açılışta, ana sayfa bölümlerinde, ilan sonuçları ve detay yüklenirken görünür. Filtre veya sıralama değişikliğinde yeniden devreye girer; veri ya da hata yanıtıyla kaldırılır. Ekran okuyucuya tek yüklenme bildirimi verilir; dekoratif şekiller gizlenir. Hareket azaltma tercihi etkinse animasyon çalışmaz. Üst üste gelen filtre isteklerinde son seçimin sonucu korunur.
