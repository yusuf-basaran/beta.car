import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const sqlFile = (p) => new URL('../' + p, import.meta.url);
test('SQL yetkileri, paket ve ilan akışları', async () => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema storage; create schema cron;
create table auth.users(id uuid primary key,email_confirmed_at timestamptz,phone text,phone_confirmed_at timestamptz,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text); alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
grant usage on schema auth,storage to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; grant select,insert on storage.objects to authenticated;`);
  const sql = readFileSync(sqlFile('supabase.sql'), 'utf8').replace(
    'create extension if not exists pg_cron;',
    '',
  );
  {
    await db.exec(sql);
    await db.exec(readFileSync(sqlFile('supabase-ek.sql'), 'utf8'));
    await db.exec(
      readFileSync(sqlFile('supabase/migrations/20261017000400_0004_guvenlik.sql'), 'utf8'),
    );
  }

  const A = '11111111-1111-4111-8111-111111111111',
    B = '22222222-2222-4222-8222-222222222222',
    C = '33333333-3333-4333-8333-333333333333';
  let passed = 0;
  const assert = (condition, message) => {
    if (!condition) throw Error(message);
    passed++;
  };
  const run = async (sql, params = []) => (await db.query(sql, params)).rows;
  const as = async (uid) => {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid || '']);
    await db.exec(uid ? 'set role authenticated' : 'set role anon');
  };
  async function denied(sql, params = []) {
    try {
      await db.query(sql, params);
    } catch {
      passed++;
      return;
    }
    throw Error('Expected rejection: ' + sql);
  }
  await db.query(
    'insert into auth.users(id,email_confirmed_at,raw_user_meta_data) values($1,now(),\'{"ad":"Alin"}\'),($2,now(),\'{"ad":"Bora","role":"admin"}\'),($3,now(),\'{"ad":"Cem"}\')',
    [A, B, C],
  );
  await db.query('insert into private.yetkiler(kullanici_id,admin) values($1,true)', [C]);
  const packageId = (await run("select id from public.paketler where ad='10''lu İlan Paketi'"))[0]
    .id;
  await as(A);
  const req = (await run('select public.talep_ac($1) id', [packageId]))[0].id;
  await denied('select public.talep_ac($1)', [packageId]);
  await denied("update public.paket_talepleri set durum='onaylandi' where id=$1", [req]);
  await denied('select makbuz_notu from public.paket_talepleri');
  await denied('select public.banka_bilgisi($1)', [req]);
  assert((await run('select * from public.ayarlar')).length === 0, 'private settings exposed');
  await denied('select telefon from public.profil');
  await denied('select public.admin_talepler()');
  await as(B);
  assert(
    (await run('select id from public.paket_talepleri')).length === 0,
    'other request exposed',
  );
  await denied('select public.banka_bilgisi($1)', [req]);
  await denied("select public.talep_isle($1,'odeme_bekliyor')", [req]);
  await as(C);
  for (const k of ['iban', 'banka', 'hesap_sahibi'])
    await run("select public.admin_duzenle('ayarlar',$1,$2::jsonb)", [
      k,
      JSON.stringify('BC-TEST'),
    ]);
  await denied("select public.talep_isle($1,'odeme_bekliyor')", [req]);
  await run("select public.talep_isle($1,'odeme_bekliyor','','internal',100)", [req]);
  await run('update public.paketler set fiyat=999 where id=$1', [packageId]);
  assert((await run('select public.admin_talepler() t')).length === 1, 'admin request RPC');
  await as(A);
  const bank = (await run('select public.banka_bilgisi($1) b', [req]))[0].b;
  assert(bank.tutar === 100, 'price snapshot changed');
  assert(bank.iban === 'BC-TEST', 'bank details unavailable');
  const file = A + '/' + req + '/r.pdf';
  await run("insert into storage.objects(bucket_id,name) values('dekontlar',$1)", [file]);
  await denied('select public.dekont_ekle($1,$2)', [req, B + '/' + req + '/r.pdf']);
  await run('select public.dekont_ekle($1,$2)', [req, file]);
  await denied('select public.banka_bilgisi($1)', [req]);
  assert((await run('select name from storage.objects')).length === 1, 'receipt missing');
  await as(B);
  assert((await run('select name from storage.objects')).length === 0, 'other receipt exposed');
  await as(C);
  await run("select public.talep_isle($1,'onaylandi')", [req]);
  await denied("select public.talep_isle($1,'onaylandi')", [req]);
  await as(A);
  let sub = (await run('select * from public.abonelikler'))[0];
  assert(sub.kalan_ilan === 10, 'quota on approval');
  assert(sub.kalan_onecikarma === 0, 'feature balance');
  await denied('update public.abonelikler set kalan_ilan=999');
  await denied(
    'insert into public.abonelikler(kullanici_id,paket_id,talep_id,bitis,kalan_ilan,kalan_onecikarma) values($1,$2,$3,now(),999,999)',
    [A, packageId, req],
  );
  const category = (
    await run("select id from public.kategoriler where slug='kullanilmis-binek'")
  )[0].id;
  let ids = [];
  for (let n = 0; n < 4; n++) {
    const id = (
      await run(
        'insert into public.ilanlar(kategori_id,baslik,yil,fiyat) values($1,$2,2024,12000) returning id',
        [category, 'Araç ilanı ' + n],
      )
    )[0].id;
    ids.push(id);
    await run("select public.kota($1,'yayinla')", [id]);
  }
  sub = (await run('select * from public.abonelikler'))[0];
  assert(sub.kalan_ilan === 9, 'fourth listing quota not atomic');
  await denied("select public.kota($1,'yayinla')", [ids[3]]);
  await denied("update public.ilanlar set durum='yayinda' where id=$1", [ids[3]]);
  await denied('update public.ilanlar set kullanici_id=$1 where id=$2', [B, ids[3]]);
  await run("select public.kota($1,'yukari')", [ids[3]]);
  await denied("select public.kota($1,'yukari')", [ids[3]]);
  await run("select public.kota($1,'kaldir')", [ids[3]]);
  assert(
    (await run('select kalan_ilan from public.abonelikler'))[0].kalan_ilan === 9,
    'quota refunded',
  );
  await run("select public.kota($1,'yayinla')", [ids[3]]);
  assert(
    (await run('select kalan_ilan from public.abonelikler'))[0].kalan_ilan === 9,
    'republish charged twice',
  );
  await denied("select public.kota($1,'onecikar','prestij')", [ids[3]]);
  await as(C);
  await run("select public.admin_duzenle('abonelikler',$1,'{\"kalan_onecikarma\":1}')", [sub.id]);
  await as(A);
  await run("select public.kota($1,'onecikar','prestij')", [ids[3]]);
  assert(
    (await run('select kalan_onecikarma from public.abonelikler'))[0].kalan_onecikarma === 0,
    'feature quota not charged',
  );
  await denied("select public.kota($1,'onecikar','seckin')", [ids[3]]);
  const draft = (
    await run(
      "insert into public.ilanlar(kategori_id,baslik) values($1,'Taslak araç') returning id",
      [category],
    )
  )[0].id;
  await as(B);
  assert(
    (await run('select * from public.ilan_kartlari where id=$1', [draft])).length === 0,
    'view bypasses RLS',
  );
  assert(
    (await run('select * from public.abonelikler')).length === 0,
    'other subscription exposed',
  );
  await denied("select public.kota($1,'kaldir')", [ids[3]]);
  await as(null);
  await denied('select public.talep_ac($1)', [packageId]);
  await denied('select private.bakim()');
  assert((await run('select * from public.ilan_kartlari')).length === 4, 'public listings blocked');
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  await db.query("update public.ilanlar set bitis=now()-interval '1 day' where id=$1", [ids[3]]);
  await db.exec('select private.bakim()');
  await as(A);
  await run("select public.kota($1,'yayinla')", [ids[3]]);
  assert(
    (await run('select kalan_ilan from public.abonelikler'))[0].kalan_ilan === 9,
    'renewal charged',
  );
  await db.exec('reset role');
  assert(
    (await run("select count(*)::int n from public.islem_kaydi where tablo='ayarlar'"))[0].n >= 3,
    'IBAN audit missing',
  );
  assert(
    (await run('select count(*)::int n from private.eposta_kuyrugu'))[0].n >= 3,
    'email events missing',
  );

  await as(null);
  assert((await run("select public.ilan_ara('{}') r"))[0].r.toplam === 4, 'search default');
  for (const v of ['orijinal', 'degisensiz', 'hasarsiz', '1', '2', '3'])
    await run('select public.ilan_ara($1)', [{ kaporta: v }]);
  await as(B);
  const k = (await run('select public.konusma_ac($1) k', [ids[0]]))[0].k;
  const message = (await run("select public.mesaj_yaz($1,'IBAN ve kapora talebi') m", [k]))[0].m;
  assert(
    (await run('select uyari from public.mesajlar where id=$1', [message]))[0].uyari,
    'message warning absent',
  );
  await denied("insert into public.mesajlar(konusma_id,gonderen_id,metin) values($1,$2,'x')", [
    k,
    B,
  ]);
  await as(A);
  await run('select public.okundu($1)', [k]);
  assert(
    (await run('select okundu from public.mesajlar where id=$1', [message]))[0].okundu,
    'read receipt absent',
  );
  await run("select public.mesaj_yaz($1,'Aracı yerinde inceleyebilirsiniz')", [k]);
  assert(
    (await run('select ilk_yanit from public.konusmalar where id=$1', [k]))[0].ilk_yanit !== null,
    'reply time absent',
  );
  const code = (await run('select public.foto_oturum($1) c', [draft]))[0].c;
  await as(B);
  await denied('select public.foto_al($1)', [code]);
  await as(A);
  assert((await run('select public.foto_al($1) i', [code]))[0].i === draft, 'photo token redeem');
  await denied('select public.foto_al($1)', [code]);
  await denied("select public.kota($1,'satildi')", [draft]);
  await as(B);
  await denied("select public.yonet('paketler',null,'{}')");
  await run('insert into public.engeller(kullanici_id,engellenen_id) values($1,$2)', [B, A]);
  await as(A);
  await denied("select public.mesaj_yaz($1,'Bir mesaj')", [k]);
  await as(C);
  await run(
    'select public.yonet(\'paketler\',null,\'{"ad":"Yeni Paket","hedef":"bireysel","sure_gun":30}\')',
  );
  await run("select public.admin_duzenle('ilanlar',$1,'{\"gizli\":true}')", [ids[0]]);
  await as(null);
  assert((await run("select public.ilan_ara('{}') r"))[0].r.toplam === 3, 'hidden listing public');
  await db.exec('reset role');
  const D = '44444444-4444-4444-8444-444444444444';
  await run('insert into auth.users(id,email_confirmed_at) values($1,now())', [D]);
  await as(D);
  assert((await run('select * from public.mesajlar')).length === 0, 'outsider messages');
  await denied('select public.okundu($1)', [k]);
  await as(C);
  await run("select public.admin_duzenle('ilanlar',$1,'{\"gizli\":false}')", [ids[0]]);
  for (const u of [B, C, D]) {
    await as(u);
    await run("insert into public.sikayetler(ilan_id,sebep) values($1,'sahte')", [ids[0]]);
  }
  await as(null);
  assert(
    (await run('select id from public.ilanlar where id=$1', [ids[0]])).length === 0,
    'three reports did not hide',
  );
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  await db.exec(
    "alter table auth.users add column email text;update auth.users set email='test@example.invalid';create schema vault;create table vault.decrypted_secrets(name text,decrypted_secret text);create schema net;create table net._http_response(id bigint,status_code int);create sequence net.request_seq;create function net.http_post(url text,body jsonb,headers jsonb,timeout_milliseconds int) returns bigint language plpgsql as $$declare n bigint;begin n:=nextval('net.request_seq');insert into net._http_response values(n,202);return n;end $$;",
  );
  await db.exec(
    readFileSync(sqlFile('supabase-eposta.sql'), 'utf8').replace(
      'create extension if not exists pg_net;',
      '',
    ),
  );
  await db.exec(
    "select private.eposta_gonder();insert into vault.decrypted_secrets values('beta_mail_url','https://mail.example.invalid'),('beta_mail_key','only-test'),('beta_mail_from','test@example.invalid');select private.eposta_gonder();",
  );
  assert(
    (await run("select count(*)::int n from private.eposta_kuyrugu where durum='gonderiliyor'"))[0]
      .n > 0,
    'email queue was not submitted',
  );
  await db.exec(
    "update private.eposta_kuyrugu set son_deneme=now()-interval '2 minutes';select private.eposta_gonder();",
  );
  assert(
    (await run("select count(*)::int n from private.eposta_kuyrugu where durum='gonderildi'"))[0]
      .n > 0,
    'email response not reconciled',
  );
  await as(A);
  for (let n = 0; n < 12; n++) await run('select public.arama_gecmis($1)', ['q=' + n]);
  assert((await run('select public.arama_gecmis() a'))[0].a.length === 10, 'search history cap');
  await as(B);
  assert((await run('select public.arama_gecmis() a'))[0].a.length === 0, 'search history leaked');
  await db.exec('reset role');
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  const make = (
    await run(
      "insert into public.markalar(ad,tip,anahtar) values('Kuzey','otomobil','kuzey') returning id",
    )
  )[0].id;
  const model = (
    await run(
      "insert into public.modeller(marka_id,ad,anahtar,bas_yil,bit_yil) values($1,'K1','k1',2000,2026) returning id",
      [make],
    )
  )[0].id;
  for (let n = 0; n < 5; n++)
    await run(
      "insert into public.ilanlar(kullanici_id,kategori_id,marka_id,model_id,baslik,yil,fiyat,durum,bitis) values($1,$2,$3,$4,'Kuzey Araç',2020,$5,'yayinda',now()+interval '30 days')",
      [A, category, make, model, 100 + n * 10],
    );
  await as(null);
  let summary = (await run('select public.model_ozeti($1) r', [model]))[0].r;
  assert(summary.adet === 5 && Number(summary.medyan) === 120, 'model aggregate');
  assert(summary.dagilim.reduce((s, x) => s + Number(x[1]), 0) === 5, 'price distribution');
  await as(D);
  const cheap = (
    await run(
      'insert into public.ilanlar(kategori_id,marka_id,model_id,baslik,yil,fiyat,detay) values($1,$2,$3,\'Kuzey Araç\',2020,10,\'{"telefon":"secret-phone"}\') returning id,uyari,detay',
      [category, make, model],
    )
  )[0];
  assert(cheap.uyari, 'low price not flagged');
  assert(!('telefon' in cheap.detay), 'phone privacy');
  await as(A);
  for (let n = 0; n < 15; n++)
    await run('select public.foto_ekle($1,$2)', [draft, 'https://photo.example.invalid/' + n]);
  await denied('select public.foto_ekle($1,$2)', [draft, 'https://photo.example.invalid/16']);
  await as(B);
  await denied('select public.foto_ekle($1,$2)', [draft, 'https://photo.example.invalid/x']);
  await as(C);
  const make2 = (
    await run(
      "insert into public.markalar(ad,tip,anahtar) values('Kuzey 2','otomobil','kuzey2') returning id",
    )
  )[0].id;
  await run(
    "insert into public.modeller(marka_id,ad,anahtar,bas_yil,bit_yil) values($1,'K1','k1',2000,2026)",
    [make2],
  );
  await run("select public.birlestir('marka',$1,$2)", [make, make2]);
  assert(
    (await run('select id from public.markalar where id=$1', [make])).length === 0,
    'make merge failed',
  );

  await db.exec('reset role');
  assert(
    (
      await run(
        "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind='r' and not c.relrowsecurity",
      )
    ).length === 0,
    'RLS eksik',
  );
  assert(
    (
      await run(
        "select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prosecdef and not coalesce(p.proconfig @> array['search_path=\"\"'],false)",
      )
    ).length === 0,
    'search_path eksik',
  );
  for (const bucket of await run('select * from storage.buckets')) {
    assert(bucket.public === ['ilanlar', 'firmalar'].includes(bucket.id), 'bucket erişimi');
    assert(
      bucket.file_size_limit ===
        (['dekontlar', 'firmalar'].includes(bucket.id) ? 5242880 : 10485760),
      'bucket boyutu',
    );
  }
  await as(D);
  await denied("insert into public.talepler(baslik,metin) values('x','y')");
  await denied("insert into public.iletisim(konu,metin) values('x','İletişim metni')");
  await run(
    "insert into public.iletisim(konu,metin) values('Bilgi','Araç ilanı hakkında bilgi istiyorum')",
  );
  await denied(
    "insert into public.iletisim(konu,metin) values('Bilgi','Araç ilanı hakkında bilgi istiyorum')",
  );
  await denied("insert into public.randevular(ad,telefon) values('Deniz','05330000000')");
  await denied('insert into public.aramalar(ad,filtre) values(\'Bozuk\',\'{"marka":"abc"}\')');
  await denied("insert into public.sikayetler(ilan_id,sebep) values($1,'sahte')", [draft]);
  await denied("insert into public.sikayetler(mesaj_id,sebep) values($1,'kapora')", [message]);
  await denied(
    "insert into public.ilan_ekspertiz(ilan_id,dosya,firma,tarih) values($1,$2,'Kontrol',current_date)",
    [cheap.id, A + '/private.pdf'],
  );
  await as(C);
  await run('select public.konusma_ac(null,$1)', [D]);
  await as(D);
  const conv = (await run('select public.konusma_ac(null,$1) k', [C]))[0].k;
  await run("select public.mesaj_yaz($1,'İnceleme saati nedir?')", [conv]);
  await denied("select public.mesaj_yaz($1,'İnceleme saati nedir?')", [conv]);
  await denied("select public.mesaj_yaz($1,repeat('a',4001))", [conv]);
  await as(A);
  for (let n = 0; n < 5; n++)
    await run('insert into public.iletisim(konu,metin) values($1,$2)', [
      'Konu ' + n,
      'Farklı içerik ' + n,
    ]);
  await denied(
    "insert into public.iletisim(konu,metin) values('Son konu','Altıncı iletişim talebi')",
  );
  assert(passed >= 68, 'kontrol sayısı');
  await db.close();
});
