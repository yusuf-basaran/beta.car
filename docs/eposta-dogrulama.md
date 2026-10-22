# E-posta bağlantısıyla doğrulama

Üye kaydından sonra Firebase Authentication e-posta adresine doğrulama bağlantısı gönderir. Bağlantı Firebase'in kendi işlem ekranında açılır; kullanıcı doğrulamayı tamamlayıp siteye döner. Site yeniden açıldığında hesap bilgisi ve kimlik belirteci yenilenir.

Doğrulanmamış hesapla giriş kabul edilmez; ilan ve mesaj gibi üye işlemleri sunucuda da korunur. Aynı e-posta ve parolayla kayıt yeniden denendiğinde doğrulanmamış hesaba yeni bağlantı gönderilebilir. Şifre sıfırlama Firebase Authentication'ın ayrı bağlantılı akışını kullanır.

E-posta onayı için ek gönderim sağlayıcısı veya uygulamaya ait kod doğrulama hizmeti gerekmez. Uygulama bildirimlerinin e-posta kuyruğu ayrı bir hizmettir.

## Firebase ayarları

- E-posta/parola sağlayıcısı açık ve site adresi yetkili alan adlarında olmalıdır.
- Doğrulama bağlantısının işlem adresi Firebase'in varsayılan güvenilir adresidir.
- Devam adresi sitenin `hesabim.html` sayfasıdır; parola sıfırlama dönüşü `giris.html` sayfasına yapılır.
- Doğrulama, parola sıfırlama ve e-posta değişikliği şablonlarının görünen gönderen adı KONTAK kullanır. Varsayılan gönderici alan adı proje kimliğine bağlıdır.

## Kabul kontrolü

Kayıt, doğrulama e-postasının teslimi, bağlantıya tıklama, siteye dönüş ve giriş birlikte denenir. Doğrulama öncesi üye işlemleri reddedilmeli; doğrulama sonrasında kabul edilmelidir. Emülatör testinde gerçek Firebase bağlantısı ve hesap durumu kullanılır; canlı teslimat ayrıca kontrol edilir.
