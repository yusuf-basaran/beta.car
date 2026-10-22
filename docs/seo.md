# SEO

Ana adres: https://kon-tak.vercel.app/ · Kontrol tarihi: 22 Ekim 2026.

## Yayındaki düzen

- Sayfaya özgü title ve description, mutlak canonical, Open Graph ve Twitter paylaşım etiketleri bulunur.
- Genel paylaşım görseli 1200×630 boyutundaki `og-image.png` dosyasıdır. İlanda ilk fotoğraf, yazıda kapak kullanılır.
- TR/EN sayfaları `lang=en` adresi ve karşılıklı `hreflang` bağlantılarıyla ayrılır. Varsayılan dil Türkçedir.
- Açık sayfalar `seo` işlevinden taranabilir HTML alır. İlan, firma ve yazı bilgileri JavaScript çalışmadan kaynakta bulunur; arayüz aynı verileri istemcide yükler.
- WebSite, Organization ve BreadcrumbList verileri; ilgili sayfalarda Vehicle/Offer ve Article verileri sunulur. Adres, puan veya fiyat uydurulmaz.
- `/index.html` ana sayfaya 301 yönlenir. İzleme parametreleri canonical adresine girmez. Filtreli aramalar ve kişisel karşılaştırma indeks dışındadır.
- Olmayan ve özel ilanlar 404; daha önce yayımlanıp kaldırılmış veya süresi dolmuş ilanlar 410 döndürür. Taslak bilgisi açık HTML'e eklenmez; sahibinin istemci önizlemesi korunur.
- Hesap, mesaj, giriş, düzenleme, telefon fotoğraf oturumu ve yönetim sayfalarında meta ve HTTP `noindex` bulunur.

`robots.txt`, sayfanın işlenmesi için gereken CSS, JavaScript, public yapılandırma ve API kaynaklarının alınmasına izin verir. İndeks dışındaki sayfaların `noindex` etiketinin okunabilmesi için tarama engellenmez. Özel veriye erişim Auth, sunucu denetimi ve güvenlik kurallarıyla korunur.

## Sitemap

`/sitemap.xml` açık sayfa, yayındaki ilan, firma, yayımlanmış yazı ve ilanı bulunan model bağlantılarını Firestore'dan alır. Taslak, gizli, kaldırılmış, süresi dolmuş ilan ve gelecekte yayımlanacak yazı eklenmez. TR/EN eşleri ve gerçek güncelleme tarihi belirtilir. Tarihi bilinmeyen kayda tarih yazılmaz.

Sonuç beş dakika önbellekte tutulur. Büyük sonuçlar 40.000 URL'lik parçalara ayrılır. Kök `sitemap.xml` dosyası statik yayın için temel listedir; Firebase bu dosyayı dinamik işlevden sunar.

İlan ve firma detayları ile 404/410 yanıtları `no-store` kullanır. Bu adreslerde kaldırılan içeriğin eski kopyası CDN'den sunulmaz. Diğer açık HTML sayfaları beş dakika önbellekte tutulur.

## Kontroller

Canlı sitemap'teki 54 bağlantının tamamı 200 yanıtı verdi. Canonical, dil eşleri, JSON-LD, title/description, paylaşım etiketleri ve kaynak HTML kontrol edildi. Özel sayfa başlıkları, 301, 404, mobil genişlik ve gerçek SDK ile çalışan arayüz doğrulandı; tarayıcı veya CSP hatası görülmedi.

Betik yüklenirken başlık alanı önceden ayrılır. Geciken betikle yapılan 390, 800 ve 1440 piksel tarayıcı testinde ana içeriğin üst konumu korundu.

Birim testleri zararlı metin kaçışı, JSON-LD, canonical, sitemap kapsamı/parçalama, TR/EN, özel kayıt ve durum kodlarını sınar. Firebase emülatörü gerçek ilan ve yazıyla Hosting yönlendirmesini kontrol eder.

## Search Console

Mevcut Firebase CLI oturumu Search Console yetkisini içermez; API denetimi `403: insufficient authentication scopes` döndürdü. Mülk doğrulaması ve sitemap gönderimi bu oturumla yapılmadı.

1. [Search Console](https://search.google.com/search-console) içinde **URL ön eki** mülkü olarak `https://kon-tak.vercel.app/` adresini ekleyin.
2. Google'ın sunduğu yöntemle sahipliği doğrulayın. HTML etiketi yöntemi seçilirse verilen `google-site-verification` etiketi site başlığına eklenip yeniden yayımlanır.
3. **Site Haritaları** bölümüne `sitemap.xml` gönderin; URL Denetimi ile ana sayfayı kontrol edin.

Özel alan adı kullanılacaksa önce Firebase Hosting ve Auth alan adı kurulumu tamamlanır. Ardından `functions/seo-config.json`, HTML başlıkları, robots ve statik sitemap aynı ana adresle güncellenir; yeni alan adı Search Console'da doğrulanır.

## Yayın

`npm run firebase:deploy`, Firebase için build alır. Açık HTML şablonları Git dışındaki `functions/site/` dizinine kopyalanır ve işlevle yayımlanır. `--firebase` build seçeneği bu sayfaların statik kopyalarını çıktıdan ayırır; Hosting isteği `seo` işlevine ulaşır. Yerel emülatör aynı düzeni kullanır.

Sitemap ve açık HTML önbelleğinin okuma maliyeti kayıt sayısıyla izlenir. İşletme içerikleri, gerçek ilanlar ve yasal işletmeci bilgileri yönetim panelinden tamamlanır.

KONTAK logo ve ikonları `assets/` altında, paylaşım görseli kökte bulunur. Ana sayfa, ilan, firma ve yasal sayfaların başlıkları ayrıdır. Küçük yazılarda turuncunun kontrast sağlayan koyu tonu kullanılır. Kaldırılmış kategoriler sitemap kapsamından çıkarılır; mevcut araç kayıtları korunur.

Firebase Authentication doğrulama, parola sıfırlama ve e-posta değişikliği şablonlarının görünen gönderen adı KONTAK olarak kaydedildi. Firebase projesi ve web uygulamasının görünen adları da KONTAK kullanır. Konu ve gövde düzenleme istekleri `EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED` yanıtıyla reddediliyor. Varsayılan gönderici alan adı proje kimliğinden gelir; markaya ait bir e-posta adresinden gönderim için sahip olunan alan adının DNS doğrulaması gerekir.
