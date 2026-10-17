# Yasal içerik şablonları

[yasal-sablonlar.sql](yasal-sablonlar.sql), sayfalar tablosu için Türkçe ve İngilizce metinleri içerir. Otomatik migration veya build kapsamında çalıştırılmaz. Mevcut metinler hukuk incelemesi ve işletmeci onayından sonra bu dosya üzerinden güncellenebilir.

| Sayfa                      | Adres                                     |
| -------------------------- | ----------------------------------------- |
| Gizlilik Politikası        | `sayfa.html?s=gizlilik-politikasi`        |
| KVKK Aydınlatma Metni      | `sayfa.html?s=kvkk-aydinlatma`            |
| Kullanım Koşulları         | `sayfa.html?s=kullanim-kosullari`         |
| Çerez Bilgilendirmesi      | `sayfa.html?s=cerez-politikasi`           |
| İletişim                   | `sayfa.html?s=iletisim`                   |
| Hakkımızda                 | `sayfa.html?s=hakkimizda`                 |
| Güvenli Alışveriş İpuçları | `sayfa.html?s=guvenli-alisveris-ipuclari` |

İşletmeci bilgileri `[İŞLETMECİ UNVANI]`, `[ADRES]`, `[TELEFON]`, `[E-POSTA]`, `[VERGİ NO]` alanlarında bırakılmıştır. Sağlayıcılar, veri konumları, saklama süreleri, aktarım dayanakları, iptal ve iade uygulaması gerçek işleyişe göre kesinleştirilir. Mevzuatın kapsamı ve başvuru hakları hukuk danışmanıyla değerlendirilir.

Metinler düz yazıdır; sayfa modülü bunları HTML kaçışıyla gösterir. Yer tutucuların doldurulması ve inceleme tamamlanmadan bu SQL canlı ortamda çalıştırılmaz. Güvenli Alım ve Güvenli Satış sayfalarının kapora ve IBAN uyarıları korunur.
