# E-posta koduyla doğrulama

Firebase Auth hesabı ve parolası korunur. Altı haneli e-posta kodu Cloud Functions tarafından üretilir; doğrulama tamamlandığında Firebase Auth hesabının `emailVerified` alanı sunucuda güncellenir. Şifre sıfırlama bu doğrulamadan ayrıdır ve Firebase'in bağlantılı akışını kullanır.

Kod 10 dakika geçerlidir. Beş yanlış denemede geçerli kod kilitlenir. Yeniden gönderim aralığı 60 saniye, üst sınır saatte beş gönderimdir. Kod kullanıcı kimliği ve o anki e-posta adresine bağlıdır; e-posta değişirse eski kod kullanılamaz. Kod `_eposta_kodlari` özel koleksiyonunda açık metin yerine sunucu anahtarıyla HMAC olarak saklanır. Başarılı kullanımda HMAC ve nonce kaldırılır. Süresi dolan kayıtlar, saatlik gönderim sınırı korunarak temizlik işinde kaldırılır. Koleksiyon istemciye kapalıdır.

## Gönderim hizmeti

`MAIL_ENABLED=true`, `MAIL_API_URL` ve `MAIL_FROM` sunucu ortamında tanımlanır. `MAIL_API_KEY`, Firebase Secret Manager'da tutulur. API anahtarı tarayıcıya veya Git'e yazılmaz. Güncel HTTP sözleşmesi, Bearer yetkilendirmesi ve `from`, `to`, `subject`, `text` alanlarını kabul eden HTTPS gönderim uç noktasıdır; Resend `/emails` biçimiyle uyumludur. Başka bir hizmetin farklı gövde veya kimlik doğrulaması varsa sunucu adaptörü uygulanmalıdır. SMTP bağlantısı için ayrıca sunucu taşıyıcı adaptörü gerekir.

Gönderim ayarı tamamlanınca anahtarı yetkili terminalden girin:

```bash
npx firebase functions:secrets:set MAIL_API_KEY --project PROJE_KIMLIGI
npm run build -- --firebase
npx firebase deploy --only functions,hosting --project PROJE_KIMLIGI
```

Gönderici adresi/alan adı hizmette doğrulanmalı, gerçek bir alıcıya teslimat denenmelidir. Örnek veya sadece izinli test alıcısına gönderim yapan bir hesap, genel üyelik için hazır sayılmaz.

## Kullanıcı akışı

1. Üye e-posta/parolayla kayıt olur veya doğrulanmamış hesabıyla giriş yapar.
2. Hizmet hazırsa sitede altı haneli kod ekranı açılır ve kod gönderilir.
3. Üye e-postadaki sayıyı sitede yazar; bağlantıya tıklamaz.
4. Sunucu kodu onaylar, Firebase Auth durumu güncellenir ve istemci kimlik belirtecini yeniler.
5. Doğrulanmış hesap ilan, mesaj ve diğer üye işlemlerine devam eder.

`eposta_kod_durumu` hazır değilse mevcut Firebase bağlantılı doğrulaması korunur. Böylece gönderim hizmeti bağlanmadan kayıt kapatılmaz. Etkin kod gönderiminde bir hata olursa başarılı gönderim mesajı gösterilmez; kullanıcı tekrar deneyebilir.

## Kabul kontrolü

Türkçe/İngilizce kayıt ve doğrulanmamış giriş; altı hane kontrolü; yanlış/eskimiş/yeni kod; yeniden gönderim ve saatlik sınır; başka hesap/e-posta ile kullanma; eşzamanlı istekler; gönderim hatası; Firebase Auth güncellemesi ve belirteç yenileme test edilir. Gerçek e-posta teslim testi ayrıca yapılır. Kodlar işlem günlüklerine yazılmaz.
