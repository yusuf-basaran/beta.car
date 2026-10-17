# Yayın kontrol listesi

## İşletmeci ve içerik

- [ ] İşletmeci unvanı, adres, telefon, e-posta ve vergi numarası doğrulandı; tüm yer tutucular dolduruldu.
- [ ] [Yasal metin şablonları](yasal-icerik.md) yayın öncesi hukuk incelemesinden geçti; onaylı TR/EN metinleri sayfalar tablosuna uygulandı.
- [ ] Uygulanabilir KKTC mevzuatı ve diğer veri koruma yükümlülükleri değerlendirildi; sağlayıcılar, aktarım bölgeleri, saklama/silme süreleri ve başvuru yöntemi açıklandı.
- [ ] Paket iptal/iade şartları ve onay süresi gerçek işletme uygulamasıyla uyumlu.
- [ ] Paket fiyatı, para birimi, kotası ve süresi yönetim panelinden girildi.
- [ ] Ücretsiz ilan limiti, öne çıkarma süresi ve talep zaman aşımı yönetim ayarlarından kontrol edildi.
- [ ] SMS sağlayıcısının durumuna göre `sms_zorunlu` ayarı belirlendi; doğrulanmış e-posta zorunlu.
- [ ] Genel iletişim, sosyal bağlantılar ve kurlar yönetim ayarlarından girildi.
- [ ] IBAN yalnız özel paket talebi ekranında görünüyor; site dışında yapılan işlemler banka kaydıyla doğrulanıyor.

Teknik kurulum ve kabul kontrolleri bu belgedeki ilgili başlıklarda tamamlanır. Hukuk incelemesi ve bu kontrol listesi site arayüzünde yayımlanmaz.

## Supabase

- [ ] Üretim ve test projeleri ayrıldı; yedekleme, geri dönüş ve veri saklama yöntemi belirlendi.
- [ ] [Migration sırası](../supabase/README.md) uygulandı; mevcut projede önceden uygulanmış dosyalar tekrar çalıştırılmadı.
- [ ] `pg_cron`, `pg_net` ve Vault kullanılabilir; `beta-car-bakim`, `beta-car-temizlik`, `beta-car-eposta` işleri aktif ve History kayıtları başarılı.
- [ ] Vault'a `beta_mail_url`, `beta_mail_key`, `beta_mail_from` girildi; bildirim e-postası gerçek test alıcısına ulaştı ve sağlayıcı teslim raporunda görüldü.
- [ ] Data API exposed schemas listesinde `private` yok; yönetici yardımcılarına doğrudan erişim reddediliyor.
- [ ] Auth Site URL gerçek HTTPS alan adı; hesap ve şifre sıfırlama yönlendirmeleri aynı alan adında. Önizleme adresleri yalnız test projesinde izinli.
- [ ] E-posta doğrulaması açık, anonim üyelik kapalı; parola ve Auth hız sınırları gözden geçirildi.
- [ ] SMTP gönderen alan adı ve SPF/DKIM kayıtları doğrulandı; kayıt ve şifre sıfırlama e-postaları teslim ediliyor.
- [ ] İlk yönetici yalnız SQL ile atandı; diğer üyenin admin RPC ve tablolarına erişimi reddedildi.
- [ ] Storage bucket erişimi, boyut ve MIME sınırları denendi: dekontlar özel 5 MB PDF/JPEG/PNG; ekspertiz özel 10 MB PDF/JPEG/PNG; ilanlar açık 10 MB JPEG/PNG/WebP; firmalar açık 5 MB JPEG/PNG/WebP.
- [ ] Üye başka üyenin dekontunu veya özel kayıtlarını okuyamıyor; dosya yolunu değiştirerek başkasının ekspertiz dosyasını kendi ilanına bağlayamıyor.
- [ ] İmzalı dosya bağlantısı süresi dolunca erişim reddediliyor; Storage üzerinde rastgele ve izinsiz dosya türü yüklenemiyor.
- [ ] `supabase_realtime` publication içinde `bildirimler`, `mesajlar`, `konusmalar`, `ilanlar` var; iki ayrı oturumda mesaj, sayaç ve fotoğraf güncellemesi doğrulandı.
- [ ] NOT VALID CHECK kuralları için eski kayıtlar tarandı ve uygun olanlar VALIDATE CONSTRAINT ile doğrulandı.
- [ ] Database Advisors bulguları değerlendirildi; RLS ve dar tablo/kolon/RPC yetkileri korundu.

## Vercel ve alan adı

- [ ] GitHub deposu `yusuf-basaran/beta.car` Vercel projesine bağlandı; erişim yalnız gerekli depoyla sınırlı.
- [ ] Framework Other, Root Directory depo kökü, build `npm run build`, Output Directory `.build`.
- [ ] Node.js 20.19 veya üstü seçildi; kilit dosyasıyla bağımlılık kurulumu başarılı.
- [ ] Ortama `SUPABASE_URL` ve public/anon anahtarı olan `SUPABASE_ANON_KEY` girildi. Service role veya secret anahtarı yok; değişiklik sonrası tekrar deployment yapıldı.
- [ ] Kaynak `js/config.js` alanları boş; yalnız dağıtım çıktısı public yapılandırmayı içeriyor. SQL, seed, .env, belge ve testler sunulmuyor.
- [ ] Önizlemede kabul testleri geçti; üretim aynı test edilmiş commit'ten yayımlandı.
- [ ] Gerçek alan adı sahipliği ve DNS kayıtları doğrulandı; HTTPS sertifikası geçerli. HSTS includeSubDomains kullanılan alt alan adlarında da HTTPS var.
- [ ] `/kullanilmis`, `/sifir`, `/parca` filtreli listeye açılıyor; bilinmeyen yol 404 durum koduyla 404 sayfasını sunuyor.
- [ ] CSP, HSTS, Referrer-Policy, Permissions-Policy ve X-Content-Type-Options üretim yanıtında mevcut. Harita ve Supabase bağlantıları CSP'yi ihlal etmiyor.
- [ ] Mobil ekranlar, klavye kullanımı, odağın görünürlüğü ve form hata mesajları kontrol edildi.

## SEO ve ana ekrana ekleme

- [ ] `robots.txt` ve `sitemap.xml` içindeki `https://beta.car` gerçek alan adıyla değiştirildi. `beta.car` kullanılacaksa sahiplik doğrulandı.
- [ ] Sayfa title, description ve sosyal paylaşım görselleri kontrol edildi. İlan JSON-LD verisi güncel başlık ve fiyatla uyumlu.
- [ ] Hesap, mesaj, giriş, ilan düzenleme, telefon fotoğraf oturumu ve admin sayfaları noindex; özel paket talebi sayfası hesaba bağlı.
- [ ] Sitemap yalnız açık sayfaları içeriyor; ilan/model sayfalarının dinamik sitemap ihtiyacı kayıt sayısına göre değerlendirildi.
- [ ] Manifest adı, başlangıç adresi, renkleri ve ikon URL'leri kontrol edildi. `logo.png` geniş kaynak logodur; ana ekrana ekleme için kare 192×192 ve 512×512 ikon sürümleri hazırlanıp manifestte tanımlandı ve cihazda denendi.
- [ ] Search Console alan adı doğrulandı ve sitemap gönderildi; özel sayfaların indekslenmediği kontrol edildi.

## İşletim ve kabul

- [ ] [İki üye ve bir yönetici kabul testleri](kabul-testleri.md) tamamlandı.
- [ ] Hata, cron ve e-posta kuyruğu takibinden sorumlu kişi belirlendi; güvenlik e-posta adresi izleniyor.
- [ ] Banka hesabı ve dekont eşleşmesi kontrol yöntemi, onay süresi ve site dışı iade süreci tanımlandı.
- [ ] Lisans ve güvenlik bildirim adresi işletmeci tarafından doğrulandı.
