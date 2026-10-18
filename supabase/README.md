# Veritabanı

Bu belge önceki Supabase kurulumu için korunur. Firebase kurulumu [kurulum belgesinde](../docs/kurulum.md) yer alır.

Migration dosyaları tarih sırasıyla, her dosya yalnızca bir kez uygulanır. SQL Editor veya Supabase CLI kullanılabilir. Aynı veritabanına kök SQL dosyaları ile migration kopyaları birlikte uygulanmaz.

| Sıra | Dosya                                   | İçerik                                                |
| ---- | --------------------------------------- | ----------------------------------------------------- |
| 1    | `20261017000100_0001_cekirdek.sql`      | İlanlar, araç sözlüğü, paketler, kota, RLS ve Storage |
| 2    | `20261017000200_0002_ek_ozellikler.sql` | Mesaj, firma, arama, yönetim ve içerik                |
| 3    | `20261017000300_0003_eposta.sql`        | Bildirim e-postası kuyruğu ve gönderim işi            |
| 4    | `20261017000400_0004_guvenlik.sql`      | Form sınırları, dosya sahipliği ve yetki düzeltmeleri |

İlk üç dosya kökteki SQL dosyalarının içerikleri değiştirilmeden alınmış kopyalarıdır. Kök dosyalar korunur. Önceden kurulmuş projede uygulanmış dosyalar tekrar çalıştırılmaz; migration geçmişi gerçek kurulumla eşleştirilir. CLI kullanılıyorsa `supabase migration list` ile durum doğrulanır ve yalnız gerçekten uygulanmış sürümler `supabase migration repair --status applied <sürüm>` ile kaydedilir. Bu komut SQL çalıştırmaz.

## Kurulum

1. Ayrı bir test projesinde yedek ve geri dönüş yöntemi doğrulanır.
2. `pg_cron`, `pg_net` ve Supabase Vault kullanılabilir olmalıdır. SQL dosyaları pg_cron/pg_net uzantılarını açar; Vault altyapısı proje tarafından sağlanır.
3. Dört migration sırayla uygulanır. Yeni projede `supabase db push` kullanmadan önce proje bağlantısı ve planlanan değişiklikler kontrol edilir.
4. Data API exposed schemas listesinde yalnız uygulamanın kullandığı `public` bulunur; `private` eklenmez. Şema USAGE yetkisi API'ye açılma anlamına gelmez; invoker RPC'ler için gereklidir.
5. Storage ve Realtime ayarları [yayın kontrol listesi](../docs/yayin-kontrol-listesi.md) üzerinden doğrulanır.

Yeni CHECK kuralları eski kayıtları değiştirmemek için NOT VALID eklenmiştir. Mevcut kayıtlar incelenip düzeltildikten sonra ilgili tabloda `ALTER TABLE ... VALIDATE CONSTRAINT ...` çalıştırılır. Yeni yazımlar bu denetimlerden geçer.

## Zamanlanmış işler

Saatler UTC'dir.

| İş                  | Sıklık         | Görev                                                                                 |
| ------------------- | -------------- | ------------------------------------------------------------------------------------- |
| `beta-car-bakim`    | `*/15 * * * *` | Paket talebi zaman aşımı, abonelik bitişi ve bildirimleri, ilan ve öne çıkarma süresi |
| `beta-car-temizlik` | `20 3 * * *`   | Süresi bitmiş fotoğraf oturumları, hız sınırı kayıtları ve eski ziyaret kayıtları     |
| `beta-car-eposta`   | `*/2 * * * *`  | E-posta kuyruğunu gönderme, sonucu izleme ve yeniden deneme                           |

```sql
select jobname, schedule, active from cron.job
where jobname in ('beta-car-bakim','beta-car-temizlik','beta-car-eposta');
select jobid, status, return_message, start_time
from cron.job_run_details order by start_time desc limit 20;
```

## Vault

| Ad               | Değer                            |
| ---------------- | -------------------------------- |
| `beta_mail_url`  | HTTPS e-posta API uç noktası     |
| `beta_mail_key`  | Sağlayıcının Bearer anahtarı     |
| `beta_mail_from` | Sağlayıcıda doğrulanmış gönderen |

Değerler yalnız Vault ekranından girilir. Dosyalara, Git geçmişine veya tarayıcı yapılandırmasına yazılmaz. API `from`, `to`, `subject`, `text` alanlarıyla JSON kabul etmelidir. Vault değerleri eksikken gönderim işi kuyruk kayıtlarını bekletir. Auth SMTP ayarı bu bildirim kuyruğundan ayrıdır. Teslimat sağlayıcı raporuyla doğrulanır.

## İlk yönetici

Hesap önce kayıt olup e-postasını doğrular. Aşağıdaki yer tutucu SQL Editor'da gerçek adresle değiştirilir:

```sql
insert into private.yetkiler(kullanici_id, admin)
select id, true from auth.users
where email = '[YÖNETİCİ E-POSTASI]' and email_confirmed_at is not null
on conflict(kullanici_id) do update set admin=true, engelli=false;
```

Kullanıcı metadata alanı yönetici yetkisi vermez. Rol anahtarları tarayıcıya gönderilmez. İkinci bir üyenin yönetim RPC'lerine erişemediği ayrıca denenir.

## Kontroller

`npm test`, PGlite üzerinde ayrı ve geçici veritabanı açar. RLS, yönetici ayrımı, kota, paket, mesaj, şikâyet ve form sınırlarını doğrular. Auth/Storage/cron/Vault/HTTP sınırları taklit edilir; canlı servis kurulumunun doğrulanması için yayın kontrol listesi kullanılır.
