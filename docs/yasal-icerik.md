# Yasal içerik şablonları

[yasal-sablonlar.json](yasal-sablonlar.json), Firebase `sayfalar` koleksiyonu için Türkçe ve İngilizce metinleri içerir. Otomatik migration veya build kapsamında çalıştırılmaz. Mevcut metinler hukuk incelemesi ve işletmeci onayından sonra bu dosya üzerinden güncellenebilir.

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

Metinler düz yazıdır; sayfa modülü bunları HTML kaçışıyla gösterir. Yer tutucuların doldurulması ve inceleme tamamlanmadan şablonlar canlı ortamda uygulanmaz. Güvenli Alım ve Güvenli Satış sayfalarının kapora ve IBAN uyarıları korunur.

Hukuk incelemesinden geçen ve işletmeci alanları tamamlanan JSON, yetkili ortamda `node scripts/firebase/legal.mjs PROJE_KIMLIGI ONAYLI_DOSYA.json --onayli` ile aktarılır. Eksik işletmeci yer tutucuları aktarımı durdurur. Eski SQL şablonu önceki kurulumun kaynağı olarak korunur.
