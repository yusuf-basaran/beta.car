# Yayın kontrol listesi

## İşletmeci ve içerik

- [ ] İşletmeci unvanı, adres, telefon, e-posta ve vergi numarası doğrulandı; tüm yer tutucular dolduruldu.
- [ ] [Yasal metin şablonları](yasal-icerik.md) yayın öncesi hukuk incelemesinden geçti; onaylı TR/EN metinleri sayfalar koleksiyonuna uygulandı.
- [ ] Uygulanabilir KKTC mevzuatı ve diğer veri koruma yükümlülükleri değerlendirildi; sağlayıcılar, aktarım bölgeleri, saklama/silme süreleri ve başvuru yöntemi açıklandı.
- [ ] Paket iptal/iade şartları ve onay süresi gerçek işletme uygulamasıyla uyumlu.
- [ ] Paket fiyatı, para birimi, kotası ve süresi yönetim panelinden girildi.
- [ ] Ücretsiz ilan limiti, öne çıkarma süresi ve talep zaman aşımı yönetim ayarlarından kontrol edildi.
- [ ] SMS sağlayıcısının durumuna göre `sms_zorunlu` ayarı belirlendi; doğrulanmış e-posta zorunlu.
- [ ] Genel iletişim, sosyal bağlantılar ve kurlar yönetim ayarlarından girildi.
- [ ] IBAN yalnız özel paket talebi ekranında görünüyor; site dışında yapılan işlemler banka kaydıyla doğrulanıyor.

Teknik kurulum ve kabul kontrolleri bu belgedeki ilgili başlıklarda tamamlanır. Hukuk incelemesi ve bu kontrol listesi site arayüzünde yayımlanmaz.

## Firebase

- [ ] Google hesabında hedef proje, proje açma yetkisi ve gerekli faturalandırma planı doğrulandı; test ve üretim ayrıldı.
- [ ] Firestore Standard, Cloud Functions ve Storage `europe-west1` bölgesinde; yedekleme ve geri dönüş yöntemi belirlendi.
- [ ] `npm ci`, `npm ci --prefix functions`, tüm testler ve build başarılı.
- [ ] `.firebaserc` doğru projeyi seçiyor. `firebase deploy --only auth,firestore,storage,functions,hosting` başarılı.
- [ ] Firestore ve Storage kuralları gerçek projeye uygulandı; yetkisiz okuma/yazma reddediliyor.
- [ ] E-posta/parola girişi açık, anonim giriş kapalı. Auth alan adları, e-posta şablonları, doğrulama ve parola sıfırlama denendi.
- [ ] Doğrulanmış ilk yönetici özel `_yetkiler` kaydıyla atandı. `INITIAL_ADMIN_EMAIL` ilk atama sonrasında kaldırıldı.
- [ ] İlk API isteği kategori/donanım/paket başlangıç kayıtlarını ekledi; paket fiyatları işletmeci tarafından girildi.
- [ ] Storage bucket genel IAM erişimine kapalı. `dekontlar`/`ekspertiz` özel; `ilanlar`/`firmalar` açık dosya yolları kurallarla ayrılıyor.
- [ ] Dosya boyutu, MIME, sahiplik ve dekont süre sınırları denendi. Başka üyenin dekontuna erişim reddedildi; geçici rapor bağlantısı süresi dolunca kapanıyor.
- [ ] Mesaj, bildirim ve sahip ilanı için Firestore dinleyicileri iki ayrı oturumda denendi.
- [ ] `bakim`, `temizlik`, `eposta` Cloud Scheduler işleri ve `ilanBildirim` tetikleyicisi başarılı; hata kayıtları izlendi.
- [ ] Bildirim e-postası için `MAIL_ENABLED`, `MAIL_API_URL`, `MAIL_FROM` ayarlandı; `MAIL_API_KEY` Secret Manager'a eklendi ve işlevle bağlandı. Gerçek test teslimatı doğrulandı.
- [ ] SMS kapalı/açık durumu Auth sağlayıcısı ve `sms_zorunlu` ayarıyla uyumlu.
- [ ] Arama okuma maliyeti, Firestore/Storage limitleri, bütçe uyarıları ve yedekler gözden geçirildi.
- [ ] Eski canlı veri varsa Auth UID, koleksiyon ve dosya eşleme aktarımı ayrıca doğrulandı; eski SQL Firebase'e uygulanmadı.

## Hosting ve alan adı

- [ ] Hosting `.build` çıktısını sunuyor; Functions API yolları aynı alan adında çalışıyor.
- [ ] Kaynak bağlantı alanları boş. Statik çıktıda yalnız public web config var; sunucu, SQL, seed, kimlik ve belge dosyaları yok.
- [ ] Gerçek alan adı Firebase Hosting'e bağlandı, DNS sahipliği ve HTTPS sertifikası doğrulandı.
- [ ] `/kullanilmis`, `/sifir`, `/parca` filtreli listeyi açıyor; bilinmeyen yol 404 durum koduyla 404 sayfasını sunuyor.
- [ ] CSP, HSTS, Referrer-Policy, Permissions-Policy ve X-Content-Type-Options canlı yanıtta mevcut; Firebase ve harita istekleri çalışıyor.
- [ ] Mobil ekran, klavye odağı, alan doğrulaması ve görseller kontrol edildi.
- [ ] Üretim test edilmiş commit'ten yayımlandı; GitHub CI ve yayın erişimleri yalnız gerekli kişilerde.

## SEO ve ana ekrana ekleme

- [ ] `robots.txt` ve `sitemap.xml` kullanılan Firebase Hosting veya özel alan adıyla eşleşiyor; özel alan adı için sahiplik doğrulandı.
- [ ] Sayfa title, description ve sosyal paylaşım görselleri kontrol edildi. İlan JSON-LD verisi güncel başlık ve fiyatla uyumlu.
- [ ] Hesap, mesaj, giriş, ilan düzenleme, telefon fotoğraf oturumu ve admin sayfaları noindex; özel paket talebi sayfası hesaba bağlı.
- [ ] Sitemap yalnız açık sayfaları içeriyor; ilan/model sayfalarının dinamik sitemap ihtiyacı kayıt sayısına göre değerlendirildi.
- [ ] Manifest adı, başlangıç adresi, renkleri ve ikon URL'leri kontrol edildi. `logo.png` geniş kaynak logodur; ana ekrana ekleme için kare 192×192 ve 512×512 ikon sürümleri hazırlanıp manifestte tanımlandı ve cihazda denendi.
- [ ] Search Console alan adı doğrulandı ve sitemap gönderildi; özel sayfaların indekslenmediği kontrol edildi.

## İşletim ve kabul

- [ ] [İki üye ve bir yönetici kabul testleri](kabul-testleri.md) tamamlandı.
- [ ] Hata, zamanlama ve e-posta kuyruğu takibinden sorumlu kişi belirlendi; güvenlik e-posta adresi izleniyor.
- [ ] Banka hesabı ve dekont eşleşmesi kontrol yöntemi, onay süresi ve site dışı iade süreci tanımlandı.
- [ ] Lisans ve güvenlik bildirim adresi işletmeci tarafından doğrulandı.
