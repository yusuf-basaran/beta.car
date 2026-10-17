# İstemci bağımlılığı

Supabase istemcisi `2.118.0` sürümüne sabitlenmiştir. Uygulama, yapılandırma girildiğinde ES modülünü jsDelivr üzerinden yükler.

| Seçenek                                         | Kazanç                                                                                       | Bakım yükü                                                                                                             |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Sabit sürümlü CDN                               | Mevcut yükleme düzeni ve CDN önbelleği korunur.                                              | Üçüncü taraf erişimine bağımlıdır. Dinamik `import()` için taşınabilir bir `integrity` alanı yoktur.                   |
| Sabit sürümlü dosyaları aynı alan adında sunmak | Yayın dosyaları ve bağımlılık bütünlüğü uygulamayla birlikte denetlenir; CSP daraltılabilir. | Alt bağımlılıklar ve lisans bildirimleri de sürümlenmelidir; her güncellemede kontrol toplamları ve testler yenilenir. |
| Statik modül etiketi ve SRI                     | Doğrudan yüklenen dosyada tarayıcı bütünlük denetimi yapılabilir.                            | Mevcut dinamik başlatma düzeni değişir; alt modüllerin bütünlüğü ayrıca ele alınır.                                    |

Bu düzenlemede CDN adresi ve sürümü korunur. Aynı alan adından sunma tercih edilirse bağımlılık ağacı, lisanslar ve dosya kontrol toplamları birlikte depoya alınmalıdır. Yalnızca URL'ye sürüm yazılması, SRI denetiminin karşılığı değildir.
