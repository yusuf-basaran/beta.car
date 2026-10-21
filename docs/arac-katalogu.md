# Araç kataloğu

Marka ve model kayıtları Firestore `markalar` ve `modeller` koleksiyonlarında tutulur. Mevcut kimlikler korunur; ilanların marka/model bağlantıları değiştirilmez.

## Kaynaklar

NHTSA vPIC, binek, çok amaçlı araç, kamyon, otobüs ve motosiklet türleri için üretici ve model listesi sağlar. ABD pazarı dışındaki bütün araçları kapsamaz. `scripts/firebase/regional.json`, Japonya ve İngiltere modellerini; Avrupa ve Asya markalarını; iş makinesi, ATV, karavan ve deniz aracı seçeneklerini tamamlar. Model yılı aralığı kaynakta yoksa tarih tahmin edilmez; arayüz 1950 ile gelecek yıl arasını gösterir.

```bash
npm run firebase:catalogue -- FIREBASE_PROJECT_ID
```

Komut Firebase CLI hesabının proje yetkisini kullanır. Kaynak yanıtları Git dışında kalan `.seed-state.json` dosyasına kaydedilir. Yeniden çalıştırıldığında başarılı kaynak istekleri tekrarlanmaz. HTTP 401/403 yanıtları zorlanmaz. Kaynak isteklerinin bir kısmı alınamazsa mevcut yanıtlarla aktarmak için:

```bash
npm run firebase:catalogue -- FIREBASE_PROJECT_ID --cached-only
```

İkinci komut dış araç kaynağına istek göndermez. Çıktıdaki `eksik_kaynak` değeri alınamayan üretici/tür isteklerinin sayısıdır. Bir marka farklı araç türlerinde ayrı kimliklerle tutulabilir; `marka` sayısı benzersiz üretici sayısı anlamına gelmez. Listede bulunmayan araçlar `Diğer` üzerinden bildirilir ve yönetici onayına gider.

## Seçim ve doğrulama

Kategori araç türünü sınırlar. Tür değişince uyumsuz marka, model ve yıl temizlenir. Model listesi seçilen markaya; yıllar modelin bilinen aralığına; donanımlar araç türüne göre değişir. Listeden seçilmeyen serbest metin, onaylanmış marka/model kimliği gibi gönderilmez. Aynı kurallar sunucuda da denetlenir. Yakıt, motor ve vites bir modelin farklı versiyonlarında değişebildiği için bu bilgiler tahmin edilmez.

## Erişim ve kayıt

İçe aktarma, açık araç sözlüğünü `_katalog` koleksiyonunda küçük parçalara ayırır ve bütün parçalar hazır olduğunda sürüm kaydını değiştirir. Sunucu ilk sözlük isteğinde binlerce ayrı model belgesini taramaz. Yönetici marka/model değiştirince bu kopya geçersiz olur ve güncel koleksiyonlar kullanılır.

Tarayıcı araç sözlüğünü beş dakika, açık kategori/donanım/ayar verilerini bir dakika, Firebase public web yapılandırmasını bir saat süreyle oturum belleğinde tutar. Sunucunun açık referans verisi önbelleği bir dakikadır. Kullanıcı yetkisi, rol, kota, IBAN ve özel dosyalar bu önbelleklere alınmaz.

İlan formu araç bilgilerini, kaporta ve donanımı tek sunucu işleminde kaydeder. Yayın istenirse kota aynı işlemde denetlenir. Hatalı bir alan veya yetersiz kota varsa kısmi ilan/kaporta/donanım değişikliği yazılmaz. Dosya yükleme ayrı yürür. İlan istatistikleri yüz kayda kadar toplu alınır; aynı belgeye eşzamanlı okumalar tek isteği paylaşır.
