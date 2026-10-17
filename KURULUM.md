# BETA.CAR

Kaynaklar köktedir. HTML, CSS ve JavaScript dışında bir arayüz bağımlılığı yoktur. Tarayıcı yalnız Supabase istemcisinin sabitlenmiş sürümünü yükler. `seed.js` Git dışında tutulur.

## Mevcut durum

Supabase proje seçimi bekleniyor. Canlı veritabanına SQL uygulanmadı; gerçek SMS, banka transferi veya e-posta gönderilmedi. Yerel Postgres uyumluluk ve tarayıcı kontrolleri, seçilecek Supabase projesindeki uçtan uca kontrolün yerini almaz.

## Supabase

1. Seçilen yeni projede SQL Editor üzerinden sırayla `supabase.sql`, `supabase-ek.sql` çalıştırılır. Bu dosyalar bir kez uygulanır; aynı veritabanında tekrar çalıştırılmaz. İlk dosya Aşama 1'de uygulandıysa yalnız `supabase-ek.sql` çalıştırılır.
2. Database > Extensions bölümünde `pg_cron` açık olmalıdır. SQL, `beta-car-bakim` işini 15 dakikada bir ve `beta-car-temizlik` işini her gün çalışacak şekilde kaydeder. İşlerin başarılı çalıştığı Cron > History ekranından kontrol edilir.
3. Auth > URL Configuration: Site URL gerçek HTTPS site adresi olmalıdır. Aynı alan adındaki hesap ve giriş sayfaları yönlendirme listesine eklenir. Önizleme adresleri yalnız test ortamı için ayrıca eklenir.
4. E-posta doğrulaması açık, anonim üyelik kapalı tutulur. Auth e-postaları için SMTP sağlayıcısı ve gönderen alan adı doğrulanır. Kayıt, doğrulama, oturum ve şifre sıfırlama gerçek bir test hesabıyla denenir.
5. `app.js` ilk satırındaki `url` ve `anon` alanları projenin URL'si ve anon anahtarıyla doldurulur. Service key tarayıcıya, Git'e, Vercel ön yüz değişkenlerine veya mesajlara eklenmez.
6. Data API için `public` şeması açık, `private` şeması kapalı kalmalıdır. SQL gerekli tablo, kolon ve fonksiyon izinlerini verir. Database > Advisors içindeki bulgular incelenir.
7. Realtime publication içinde `bildirimler`, `mesajlar`, `konusmalar`, `ilanlar` bulunmalıdır. SQL publication mevcutsa bunları ekler. İki ayrı tarayıcı hesabıyla mesaj ve fotoğraf güncellemesi denenir.
8. Storage: `dekontlar` özel ve 5 MB; `ekspertiz` özel ve 10 MB; `ilanlar` herkese açık ve 10 MB; `firmalar` herkese açık ve 5 MB. Dosya türü sınırları SQL'dedir. Dekontlar `kullanıcı UUID/talep UUID/dosya` yoluna yüklenir. İmzalı bağlantılar 120 saniyede biter.

İlk yönetici, e-postası doğrulanmış hesaba yalnız SQL Editor üzerinden atanır. Aşağıdaki e-posta gerçek yönetici adresiyle değiştirilir:

```sql
insert into private.yetkiler(kullanici_id,admin)
select id,true from auth.users where email='yonetici@alan-adi'
on conflict(kullanici_id) do update set admin=true,engelli=false;
```

Rol için kullanıcı metadata alanları kullanılmaz. Yöneticiler hesabın engel durumunu ve satıcı doğrulamasını panelden yönetebilir; yeni admin ataması SQL ile yapılır.

## Paketler

Yönetici girişinden `admin.html?sekme=ayarlar` açılır. IBAN, banka ve hesap sahibi burada belirlenir. Genel iletişim telefonu ve sosyal bağlantılar da aynı ekrandadır. Tutarı boş olan paket için talep ödeme bekliyor durumuna geçirilirken tutar girilir. Kullanıcı sadece kendi ödeme bekleyen talebinde banka bilgisi alabilir.

Bir onay işleminden önce dekont ve banka kaydı karşılaştırılır. Onay aynı işlem içinde aboneliği açar; ikinci onay engellenir. Makbuz notu yalnız admin tarafından okunur. Kaldırma veya silme hak iadesi yapmaz. Ücretsiz ilan yenilemesinde aktif limit aşılmışsa önce başka bir ilan kaldırılır; bu yenileme ayrıca hak tüketmez.

Ödeme bilgileri footer, mesaj ve genel sayfalara yazılmaz. Para tahsilatı, otomatik yenileme, emanet, kapora toplama ve site içi fatura işlevi bulunmaz.

## SMS

SMS sağlayıcısı seçilene kadar `sms_zorunlu` false kalır; doğrulanmış e-posta ile başlanır. Supabase Auth telefon sağlayıcısı açıldıktan sonra Profil ekranından telefon değişikliği ve kod doğrulaması denenir. Ardından `sms_zorunlu` true yapılır. Yayın RPC'si doğrulanmış Auth telefonu ile profil ve ilandaki telefonun eşleşmesini denetler.

## Araç sözlüğü

Node.js 20 veya üstü gerekir. `seed.js` ayrıca indirilip köke konur; `.gitignore` onu ve durum dosyasını dışarıda tutar. Service key yalnız bu işlemde ortam değişkeninden okunur. Terminal geçmişine anahtar yazmadan çalıştırmak için:

```bash
read -r SUPABASE_URL
read -r -s SUPABASE_SERVICE_ROLE_KEY
export SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
node seed.js
unset SUPABASE_SERVICE_ROLE_KEY
```

Betik 1950'den çalıştırıldığı yıla kadar markaları ve modelleri tarar; işlem uzun sürebilir. `.seed-state.json` dosyasını koruyarak yeniden çalıştırmak kaldığı yıldan devam eder. Yeni proje veya yeni yıl için `SEED_STATE` değişkeniyle ayrı durum dosyası seçilir. Kaynak vPIC'tir; deniz ve bazı arazi/iş makinesi sınıfları kapsam dışıdır. SUV/minivan ve karavan ayrımı vPIC sınıflarının sınırlarına tabidir. Bu kayıtlar yönetici tarafından denetlenir; liste tam küresel üretici kataloğu olarak kabul edilmez.

## Bildirim e-postaları

Uygulama bildirimleri anında veritabanına yazılır. Profilde e-posta özeti açıksa ayrıca özel kuyruğa alınır. Kayıtlı aramada e-posta seçeneği de ayrıca açık olmalıdır.

Auth SMTP, paket ve arama bildirimlerini kendiliğinden göndermez. Bu bildirimler için `supabase-eposta.sql` çalıştırılır. Supabase Vault ekranına `beta_mail_url`, `beta_mail_key`, `beta_mail_from` kayıtları eklenir. API, HTTPS üzerinden Bearer anahtarıyla `from`, `to`, `subject`, `text` JSON alanlarını kabul etmelidir; Resend'in `/emails` uç noktası bu biçimi kullanır. Gönderen alan adı sağlayıcıda doğrulanmalıdır. Anahtar SQL dosyasına veya `app.js` içine yazılmaz.

`beta-car-eposta` işi iki dakikada bir kuyruğu gönderir; HTTP sonucunu bir sonraki çalışmada değerlendirir. İstek kimliği ve deneme sayısı özel tabloda tutulur. En fazla beş deneme yapılır; aynı kayıt için aynı idempotency anahtarı kullanılır. Başarısız kayıtların `hata` durumu izlenir. Gerçek teslim testi ve sağlayıcı webhook/teslim raporu kontrolü yapılmadan e-posta hizmeti hazır kabul edilmez.

## GitHub ve Vercel

1. `yusuf-basaran/beta.car` deposu Vercel'e Git projesi olarak bağlanır. Framework Preset: Other. Root Directory: kök. `vercel.json` içindeki build ve output ayarları kullanılır.
2. Build yalnız HTML, `style.css`, `app.js`, logo, manifest, robots ve sitemap dosyalarını `.build` çıktısına kopyalar. SQL, kurulum metni, seed ve ortam dosyaları yayına gitmez.
3. `/kullanilmis`, `/sifir`, `/parca` yolları listeleme sayfasına yönlendirilir. Olmayan adreslerde `404.html` sunulması kontrol edilir.
4. Gerçek alan adı belirlenince `robots.txt` ve `sitemap.xml` içindeki `https://beta.car` adresi değiştirilir. Auth Site URL ve yönlendirmeler aynı alan adına alınır. Alan adı sahipliği doğrulanmadan özel alan adı bağlanmaz.
5. Önizlemede test tamamlandıktan sonra test edilen commit production olarak yayımlanır. Vercel Git entegrasyonu sonraki `main` push işlemlerinde yeniden yayın yapar.
6. Mobilde ana ekrana ekleme manifest üzerinden mümkündür. Çevrimdışı önbellek veya servis çalışanı kurulmaz.

## Kabul kontrolleri

İki üye ve bir yöneticiyle şu akışlar denenir: kayıt/e-posta, şifre sıfırlama, taslak ve yayın, ücretsiz limit, kurumsal kota, kaporta/donanım, özel rapor, favori ve fiyat bildirimi, kayıtlı arama, üç araç karşılaştırma, mesaj/okundu/engelleme, üç ayrı şikayet, paket talebi/IBAN/dekont/onay/red/yeni dekont, abonelik bitişi ve e-posta kuyruğu. Başka kullanıcının talebine, dekontuna veya kotasına erişim ayrıca reddedilmelidir.

Yayın öncesinde gerçek işletmeci kimliği, açık iletişim bilgileri, veri saklama süreleri, hizmet sağlayıcı bölgeleri ve yasal metinler işletmeci tarafından kesinleştirilir. Fiyatlar, ücretsiz limit, paket süreleri, kur değerleri ve SMS durumu yönetim ayarından kontrol edilir. Kurlar girilmeden yaklaşık döviz dönüşümü gösterilmez.
