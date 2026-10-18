# Firebase güvenlik incelemesi

## Erişim modeli

Cloud Functions Admin SDK güvenlik kurallarını atladığından sunucu her işlemde Auth hesabını, e-posta doğrulamasını, özel rolü ve sahipliği yeniden kontrol eder. `_yetkiler` istemciye kapalıdır. Rol kullanıcı metadata alanından veya istek gövdesinden alınmaz. E-posta değişip doğrulama kalkarsa yönetici işlemleri de kapanır.

Firestore istemci yazmaları tamamen kapalıdır. Dinleyiciler yalnız üyenin konuşma, mesaj, bildirim ve kendi ilanını okuyabilir. Finansal kayıtlar, telefon tercihleri ve banka ayarları sunucu süzgecinden geçer. Talep sahibine makbuz notu verilmez. Halka açık ilan yanıtından şasi ve plaka numarası çıkarılır.

## Denetlenen sınırlar

| Alan      | Sunucu ve kural denetimi                                                                          |
| --------- | ------------------------------------------------------------------------------------------------- |
| Paket     | Aynı üyede tek açık talep; durum geçişleri yönetici; onay ve abonelik atomik                      |
| Kota      | Transaction, kullanıcı kilidi, ücretsiz limit ve abonelik tarihi; eşzamanlı son hak bir kez düşer |
| Banka     | Yalnız sahibi ve ödeme bekleyen, süresi dolmamış talep; değişiklikler işlem kaydında              |
| Dekont    | Özel yol, sahibi/yönetici okuması, 5 MB PDF/JPEG/PNG; talep sahibi/durum/süre yükleme kontrolü    |
| Ekspertiz | Özel yol, ilan sahibi yüklemesi, 10 MB; görünür ilanda sunucu üzerinden süreli görüntüleme        |
| Görsel    | İlan/firma sahipliği, JPEG/PNG/WebP, boyut ve 15 fotoğraf sınırı                                  |
| Mesaj     | Taraf üyeliği, engelleme, 4000 karakter, dakikalık/günlük/tekrar sınırı, okundu sahipliği         |
| Form      | Şikâyet/randevu/iletişim/talep alan sınırları, hedef erişimi ve hız sınırları                     |
| Şikâyet   | Üye başına hedefte tek kayıt; üç bekleyen kayıtta gizleme                                         |
| İçerik    | İstemcide kaçış; HTML çalıştırılmaması; satır içi script/stil yasağı                              |

İstek gövdesi 1 MB ile sınırlıdır; iç içe nesnelerde prototip alanları reddedilir. Koleksiyon ve yazılabilir alanlar açık listelidir. İstemci korunan alanı güncelleme/upsert ile ekleyemez. Veri türü, sayısal aralık ve metin uzunluğu sunucuda kontrol edilir. Formlarda istemci bot kontrollerine ek olarak sunucu hız ve tekrar sınırları vardır.

Firestore kuralları tek başına sorgu maliyetini sınırlamaz. Sunucu API'sinde hız sınırı, çıktı limiti ve işlem başına 450 yazma sınırı vardır. Geniş arama ve günlük bakımın okuma maliyeti veri büyüklüğüyle artar. Canlıda bütçe, gecikme, günlük kullanım, yedek ve kötüye kullanım takibi gerekir.

## Yerel doğrulama

`npm run test:firebase` gerçek Auth, Firestore, Storage ve Functions emülatörlerini kullanır. Yönetici rolü yazma, başka üyenin mesajını/dekontunu okuma, sahte kota güncelleme, doğrulanmamış yazma ve yetkisiz paket onayı negatif senaryolarla sınanır. Paket ve öne çıkarma eşzamanlı istekleri, dosya tür/boyut sınırları, üç şikâyet ve bakım idempotansı doğrulanır. Gerçek Web SDK ile giriş ve API erişimi ayrıca denenir.

Emülatör sonucu canlı IAM, Scheduler, e-posta/SMS teslimatı, alan adı ve faturalandırma yapılandırmasının yerine geçmez. [Yayın kontrol listesi](yayin-kontrol-listesi.md) canlı proje için kullanılır. Önceki SQL incelemesi `guvenlik-incelemesi.md` dosyasında tarihsel kurulum olarak korunur.
