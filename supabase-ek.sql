begin;
alter table public.firmalar add column bilgiler jsonb not null default '{}';
alter table public.profil add column dogrulandi boolean not null default false;
grant select(dogrulandi) on public.profil to anon,authenticated;
alter table public.profil add column telefon_goster boolean not null default true;
grant update(telefon_goster) on public.profil to authenticated;
alter table public.ilanlar add column gizli boolean not null default false;
create table public.firma_ozel(firma_id uuid primary key references public.firmalar on delete cascade,vergi text not null default '');
alter table public.firma_ozel enable row level security;
create policy sahibi on public.firma_ozel for all to authenticated using(exists(select 1 from public.firmalar f where f.id=firma_id and f.kullanici_id=(select auth.uid())) or (select private.admin())) with check(exists(select 1 from public.firmalar f where f.id=firma_id and f.kullanici_id=(select private.uye())) or (select private.admin()));
grant select,insert,update on public.firma_ozel to authenticated;
create table public.aramalar(id uuid primary key default gen_random_uuid(),kullanici_id uuid not null default auth.uid() references public.profil on delete cascade,ad text not null,filtre jsonb not null,eposta boolean not null default false,olusturma timestamptz not null default now());
create table public.takipler(kullanici_id uuid not null default auth.uid() references public.profil on delete cascade,satici_id uuid not null references public.profil on delete cascade,primary key(kullanici_id,satici_id),check(kullanici_id<>satici_id));
create table public.engeller(kullanici_id uuid not null default auth.uid() references public.profil on delete cascade,engellenen_id uuid not null references public.profil on delete cascade,primary key(kullanici_id,engellenen_id),check(kullanici_id<>engellenen_id));
create table public.konusmalar(id uuid primary key default gen_random_uuid(),ilan_id uuid references public.ilanlar,alici_id uuid not null references public.profil,satici_id uuid not null references public.profil,olusturma timestamptz not null default now(),ilk_yanit int,unique(ilan_id,alici_id),check(alici_id<>satici_id));
create table public.mesajlar(id uuid primary key default gen_random_uuid(),konusma_id uuid not null references public.konusmalar on delete cascade,gonderen_id uuid not null references public.profil,metin text not null check(length(metin) between 1 and 4000),uyari boolean not null default false,okundu boolean not null default false,olusturma timestamptz not null default now());
create table public.talepler(id uuid primary key default gen_random_uuid(),kullanici_id uuid not null default auth.uid() references public.profil,marka_id bigint references public.markalar,model_id bigint references public.modeller,baslik text not null,butce numeric check(butce>=0),para_birimi text not null default 'GBP',sehir text,metin text not null,aktif boolean not null default true,olusturma timestamptz not null default now());
create table public.sikayetler(id uuid primary key default gen_random_uuid(),kullanici_id uuid not null default auth.uid() references public.profil,ilan_id uuid references public.ilanlar,mesaj_id uuid references public.mesajlar,sebep text not null check(sebep in ('sahte','kapora','fiyat','satilmis','diger')),notu text not null default '',durum text not null default 'beklemede',sonuc text,olusturma timestamptz not null default now(),check(num_nonnulls(ilan_id,mesaj_id)=1));
create unique index sikayet_tek_ilan on public.sikayetler(kullanici_id,ilan_id) where ilan_id is not null;
create unique index sikayet_tek_mesaj on public.sikayetler(kullanici_id,mesaj_id) where mesaj_id is not null;
create table public.randevular(id uuid primary key default gen_random_uuid(),kullanici_id uuid not null default auth.uid() references public.profil,firma_id uuid references public.firmalar,ilan_id uuid references public.ilanlar,ad text not null,telefon text not null,sehir text,tarih timestamptz,notu text not null default '',durum text not null default 'beklemede',olusturma timestamptz not null default now());
create table public.yorumlar(id uuid primary key default gen_random_uuid(),kullanici_id uuid not null default auth.uid() references public.profil,firma_id uuid not null references public.firmalar,puan int not null check(puan between 1 and 5),metin text not null check(length(metin) between 3 and 2000),olusturma timestamptz not null default now(),unique(kullanici_id,firma_id));
create table public.sayfalar(slug text primary key,baslik text not null,baslik_en text not null,icerik text not null,icerik_en text not null);
create table public.iletisim(id uuid primary key default gen_random_uuid(),kullanici_id uuid not null default auth.uid() references public.profil,konu text not null,metin text not null check(length(metin) between 5 and 4000),olusturma timestamptz not null default now());
create table private.foto_oturumlari(kod uuid primary key default gen_random_uuid(),ilan_id uuid not null references public.ilanlar,kullanici_id uuid not null references public.profil,bitis timestamptz not null default now()+interval '15 minutes',kullanildi boolean not null default false);
create table private.istekler(kullanici_id uuid not null references public.profil,alan text not null,zaman timestamptz not null default now());
create table private.istatistik(ilan_id uuid primary key references public.ilanlar on delete cascade,goruntulenme int not null default 0,telefon int not null default 0);
create table private.ziyaretler(ilan_id uuid not null references public.ilanlar on delete cascade,kim text not null,gun date not null default current_date,primary key(ilan_id,kim,gun));
create index mesaj_konusma on public.mesajlar(konusma_id,olusturma);
create index konusma_alici on public.konusmalar(alici_id);
create index konusma_satici on public.konusmalar(satici_id);
create index arama_sahip on public.aramalar(kullanici_id);
create index talep_sahibi on public.talepler(kullanici_id);
create index sikayet_ilan on public.sikayetler(ilan_id);
create index randevu_firma on public.randevular(firma_id);
create index randevu_sahip on public.randevular(kullanici_id);
create index yorum_firma on public.yorumlar(firma_id);
create index hiz_sahip on private.istekler(kullanici_id,alan,zaman);
create index takip_satici on public.takipler(satici_id);

create function private.hiz(p_alan text,p_adet int default 20) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.uye();
begin
 perform 1 from public.profil where id=u for update;
 if (select count(*) from private.istekler where kullanici_id=u and alan=p_alan and zaman>now()-interval '1 minute')>=p_adet then raise exception 'İşlem sınırı; bir dakika sonra tekrar deneyin'; end if;
 insert into private.istekler(kullanici_id,alan) values(u,p_alan);
end $$;
create function public.yetkim() returns boolean language sql stable set search_path='' as $$select private.admin()$$;
create function private.konusma_ac(p_ilan uuid,p_satici uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.uye(); s uuid; k uuid;
begin
 perform private.hiz('konusma',10);
 if p_ilan is not null then select kullanici_id into s from public.ilanlar where id=p_ilan and durum in ('yayinda','satildi') and not gizli; else s:=p_satici; end if;
 if s is null or s=u or not exists(select 1 from public.profil where id=s) or exists(select 1 from public.engeller where (kullanici_id=s and engellenen_id=u) or (kullanici_id=u and engellenen_id=s)) then raise exception 'Konuşma açılamıyor'; end if;
 select id into k from public.konusmalar where alici_id=u and satici_id=s and ilan_id is not distinct from p_ilan;
 if k is null then insert into public.konusmalar(ilan_id,alici_id,satici_id) values(p_ilan,u,s) returning id into k; end if;
 return k;
end $$;
create function public.konusma_ac(p_ilan uuid default null,p_satici uuid default null) returns uuid language sql set search_path='' as $$select private.konusma_ac(p_ilan,p_satici)$$;
create function private.mesaj_yaz(p_konusma uuid,p_metin text) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.uye(); k public.konusmalar; m uuid; hedef uuid;
begin
 perform private.hiz('mesaj',15);
 select * into k from public.konusmalar where id=p_konusma and u in (alici_id,satici_id) for update;
 if not found then raise exception 'Konuşma bulunamadı'; end if;
 hedef:=case when u=k.alici_id then k.satici_id else k.alici_id end;
 if exists(select 1 from public.engeller where (kullanici_id=u and engellenen_id=hedef) or (kullanici_id=hedef and engellenen_id=u)) then raise exception 'Mesaj gönderilemiyor'; end if;
 insert into public.mesajlar(konusma_id,gonderen_id,metin,uyari) values(k.id,u,trim(p_metin),p_metin ~* '(kapora|ön[[:space:]]*ödeme|on[[:space:]]*odeme|iban|havale)') returning id into m;
 if u=k.satici_id and k.ilk_yanit is null then update public.konusmalar set ilk_yanit=extract(epoch from(now()-(select min(olusturma) from public.mesajlar where konusma_id=k.id and gonderen_id=k.alici_id)))::int where id=k.id; end if;
 perform private.bildir(hedef,'yeni_mesaj',jsonb_build_object('konusma_id',k.id,'ilan_id',k.ilan_id));
 return m;
end $$;
create function public.mesaj_yaz(p_konusma uuid,p_metin text) returns uuid language sql set search_path='' as $$select private.mesaj_yaz(p_konusma,p_metin)$$;
create function private.okundu(p_konusma uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.konusmalar where id=p_konusma and private.uye() in(alici_id,satici_id)) then raise exception 'Yetki yok'; end if;
 update public.mesajlar set okundu=true where konusma_id=p_konusma and gonderen_id<>auth.uid();
end $$;
create function public.okundu(p_konusma uuid) returns void language sql set search_path='' as $$select private.okundu(p_konusma)$$;
create function private.satici(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'ad',p.ad,'telefon',case when p.telefon_goster then p.telefon end,'yanit',round((select avg(ilk_yanit) from public.konusmalar where satici_id=p.id)),'firma',(select to_jsonb(f) from public.firmalar f where f.kullanici_id=p.id)) from public.profil p where p.id=p_id
$$;
create function public.satici(p_id uuid) returns jsonb language sql stable set search_path='' as $$select private.satici(p_id)$$;
create function private.ilan_durum(p_no bigint) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',id,'no',no,'durum',case when gizli then 'kaldirildi' else durum end) from public.ilanlar where no=p_no and (durum<>'taslak' or kullanici_id=auth.uid())
$$;
create function public.ilan_durum(p_no bigint) returns jsonb language sql stable set search_path='' as $$select private.ilan_durum(p_no)$$;
create function private.istatistik(p_ilan uuid,p_tur text,p_kim text) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.ilanlar; ek int:=0;
begin
 select * into i from public.ilanlar where id=p_ilan and ((durum='yayinda' and bitis>now() and not gizli) or kullanici_id=auth.uid() or private.admin());
 if not found then return '{}'::jsonb; end if;
 if p_tur in ('goruntulenme','telefon') and length(p_kim) between 16 and 100 then
  insert into private.ziyaretler(ilan_id,kim) values(i.id,md5(p_kim||p_tur)) on conflict do nothing;
  get diagnostics ek=row_count;
  insert into private.istatistik(ilan_id,goruntulenme,telefon) values(i.id,case when p_tur='goruntulenme' then ek else 0 end,case when p_tur='telefon' then ek else 0 end) on conflict(ilan_id) do update set goruntulenme=private.istatistik.goruntulenme+excluded.goruntulenme,telefon=private.istatistik.telefon+excluded.telefon;
 end if;
 return jsonb_build_object('goruntulenme',coalesce((select goruntulenme from private.istatistik where ilan_id=i.id),0),'favori',(select count(*) from public.favoriler where ilan_id=i.id),'telefon',case when auth.uid()=i.kullanici_id or private.admin() then (select telefon from private.istatistik where ilan_id=i.id) end,'mesaj',case when auth.uid()=i.kullanici_id or private.admin() then (select count(*) from public.konusmalar where ilan_id=i.id) end);
end $$;
create function public.istatistik(p_ilan uuid,p_tur text default '',p_kim text default '') returns jsonb language sql set search_path='' as $$select private.istatistik(p_ilan,p_tur,p_kim)$$;
create function private.foto_oturum(p_ilan uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare kod uuid;
begin
 perform private.hiz('foto_oturum',5);
 if not exists(select 1 from public.ilanlar where id=p_ilan and kullanici_id=private.uye() and durum='taslak') then raise exception 'Taslak bulunamadı'; end if;
 update private.foto_oturumlari set kullanildi=true where ilan_id=p_ilan;
 insert into private.foto_oturumlari(ilan_id,kullanici_id) values(p_ilan,auth.uid()) returning foto_oturumlari.kod into kod;
 return kod;
end $$;
create function public.foto_oturum(p_ilan uuid) returns uuid language sql set search_path='' as $$select private.foto_oturum(p_ilan)$$;
create function private.foto_al(p_kod uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare x private.foto_oturumlari;
begin
 select * into x from private.foto_oturumlari where kod=p_kod and bitis>now() and not kullanildi for update;
 if not found or x.kullanici_id<>private.uye() then raise exception 'Fotoğraf oturumu geçersiz veya süresi dolmuş'; end if;
 update private.foto_oturumlari set kullanildi=true where kod=p_kod;
 return x.ilan_id;
end $$;
create function public.foto_al(p_kod uuid) returns uuid language sql set search_path='' as $$select private.foto_al(p_kod)$$;
create function private.ilan_kopyala(p_ilan uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare i public.ilanlar; n uuid;
begin
 perform private.hiz('kopyala',3);
 select * into i from public.ilanlar where id=p_ilan and kullanici_id=private.uye();
 if not found then raise exception 'İlan bulunamadı'; end if;
 insert into public.ilanlar(kullanici_id,kategori_id,marka_id,model_id,diger_marka,diger_model,baslik,aciklama,yil,km,fiyat,para_birimi,yakit,vites,sehir,detay,fotograflar,video) values(i.kullanici_id,i.kategori_id,i.marka_id,i.model_id,i.diger_marka,i.diger_model,i.baslik,i.aciklama,i.yil,i.km,i.fiyat,i.para_birimi,i.yakit,i.vites,i.sehir,i.detay-'sasi'-'plaka_no',i.fotograflar,i.video) returning id into n;
 insert into public.ilan_parca select n,parca,durum from public.ilan_parca where ilan_id=i.id;
 insert into public.ilan_donanim select n,donanim_id from public.ilan_donanim where ilan_id=i.id;
 return n;
end $$;
create function public.ilan_kopyala(p_ilan uuid) returns uuid language sql set search_path='' as $$select private.ilan_kopyala(p_ilan)$$;
create function private.sikayet_kontrol() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.hiz('sikayet',3);
 if new.ilan_id is not null then
  perform 1 from public.ilanlar where id=new.ilan_id for update;
  if (select count(*) from public.sikayetler where ilan_id=new.ilan_id and durum='beklemede')>=3 then update public.ilanlar set gizli=true where id=new.ilan_id; end if;
 end if;
 insert into public.bildirimler(kullanici_id,tur,veri) select kullanici_id,'sikayet',jsonb_build_object('sikayet_id',new.id) from private.yetkiler where admin and not engelli;
 return new;
end $$;
create trigger sikayet_kontrol after insert on public.sikayetler for each row execute function private.sikayet_kontrol();
create function private.yorum_kontrol() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.hiz('yorum',3);
 if not exists(select 1 from public.konusmalar k join public.firmalar f on f.id=new.firma_id join public.mesajlar m on m.konusma_id=k.id and m.gonderen_id=new.kullanici_id where (k.alici_id=new.kullanici_id and k.satici_id=f.kullanici_id) or (k.satici_id=new.kullanici_id and k.alici_id=f.kullanici_id)) then raise exception 'Yorum için firmayla mesajlaşmış olmalısınız'; end if;
 return new;
end $$;
create trigger yorum_kontrol before insert or update on public.yorumlar for each row execute function private.yorum_kontrol();

drop view public.ilan_kartlari;
create view public.ilan_kartlari with(security_invoker=true) as
 select i.*,m.ad marka,o.ad model,p.ad satici,f.ad firma,coalesce(f.dogrulandi,p.dogrulandi,false) dogrulandi,
 (select count(*) from public.ilan_parca b where b.ilan_id=i.id) parca_sayisi,
 (select count(*) from public.ilan_parca b where b.ilan_id=i.id and b.durum in ('boyali','lokal_boyali')) boyali,
 (select count(*) from public.ilan_parca b where b.ilan_id=i.id and b.durum='degisen') degisen,
 (select count(*) from public.ilan_parca b where b.ilan_id=i.id and b.durum='hasarli') hasarli,
 exists(select 1 from public.ilan_ekspertiz e where e.ilan_id=i.id) ekspertizli,
 (select h.fiyat from public.fiyat_gecmisi h where h.ilan_id=i.id and h.para_birimi=i.para_birimi order by h.tarih desc,h.id desc offset 1 limit 1) onceki_fiyat
 from public.ilanlar i left join public.markalar m on m.id=i.marka_id left join public.modeller o on o.id=i.model_id left join public.profil p on p.id=i.kullanici_id left join public.firmalar f on f.kullanici_id=i.kullanici_id;
grant select on public.ilan_kartlari to anon,authenticated;
create function public.ilan_ara(p jsonb default '{}') returns jsonb language sql stable set search_path='' as $$
 with liste as (
 select c.* from public.ilan_kartlari c join public.kategoriler k on k.id=c.kategori_id
 where c.durum='yayinda' and c.bitis>now() and not c.gizli
 and (nullif(p->>'kategori','') is null or k.slug=p->>'kategori' or k.slug like (p->>'kategori')||'-%')
 and (nullif(p->>'id','') is null or c.id=nullif(p->>'id','')::uuid)
 and (nullif(p->>'q','') is null or c.baslik ilike '%'||(p->>'q')||'%' or c.marka ilike '%'||(p->>'q')||'%' or c.model ilike '%'||(p->>'q')||'%' or c.no::text=p->>'q')
 and (nullif(p->>'marka','') is null or c.marka_id=nullif(p->>'marka','')::bigint)
 and (nullif(p->>'model','') is null or c.model_id=nullif(p->>'model','')::bigint)
 and (nullif(p->>'tip','') is null or k.arac_tipi=p->>'tip')
 and (nullif(p->>'yil','') is null or c.yil=nullif(p->>'yil','')::int)
 and (nullif(p->>'min','') is null or c.fiyat>=nullif(p->>'min','')::numeric)
 and (nullif(p->>'max','') is null or c.fiyat<=nullif(p->>'max','')::numeric)
 and (nullif(p->>'para_birimi','') is null or c.para_birimi=p->>'para_birimi')
 and (nullif(p->>'yil_min','') is null or c.yil>=nullif(p->>'yil_min','')::int)
 and (nullif(p->>'yil_max','') is null or c.yil<=nullif(p->>'yil_max','')::int)
 and (nullif(p->>'km_max','') is null or c.km<=nullif(p->>'km_max','')::int)
 and (nullif(p->>'yakit','') is null or c.yakit=p->>'yakit')
 and (nullif(p->>'vites','') is null or c.vites=p->>'vites')
 and (nullif(p->>'sehir','') is null or c.sehir=p->>'sehir')
 and (nullif(p->>'satici','') is null or c.kullanici_id=nullif(p->>'satici','')::uuid)
 and (nullif(p->>'satici_tipi','') is null or (p->>'satici_tipi'='bireysel' and c.firma is null) or exists(select 1 from public.firmalar f where f.kullanici_id=c.kullanici_id and f.tur=p->>'satici_tipi'))
 and (nullif(p->>'onecikarma','') is null or (c.onecikarma=p->>'onecikarma' and c.onecikarma_bitis>now()))
 and (coalesce(p->>'ekspertizli','')<>'true' or c.ekspertizli)
 and not exists(select 1 from jsonb_each_text(coalesce(p->'detay','{}')) d where coalesce(c.detay->>d.key,'')<>d.value)
 and (coalesce(p->>'kaporta','')<>'orijinal' or (c.parca_sayisi=13 and c.boyali+c.degisen+c.hasarli=0))
 and (coalesce(p->>'kaporta','')<>'degisensiz' or (c.parca_sayisi=13 and c.degisen=0))
 and (coalesce(p->>'kaporta','')<>'hasarsiz' or (c.parca_sayisi=13 and c.hasarli=0))
 and (coalesce(p->>'kaporta','') not in ('1','2','3') or (c.parca_sayisi=13 and c.boyali+c.degisen<=(p->>'kaporta')::int and c.hasarli=0))
 and not exists(select 1 from jsonb_array_elements_text(coalesce(p->'donanim','[]')) d where not exists(select 1 from public.ilan_donanim e where e.ilan_id=c.id and e.donanim_id=d.value::bigint))
 ), sayfa as (
 select * from liste order by
 case when p->>'sira'='fiyat_artan' then fiyat end asc nulls last,
 case when p->>'sira'='fiyat_azalan' then fiyat end desc nulls last,
 case when p->>'sira'='yil' then yil end desc nulls last,
 case when p->>'sira'='km' then km end asc nulls last,
 coalesce(yukari,yayin) desc,id
 limit 20 offset greatest(0,least(10000,coalesce((nullif(p->>'sayfa',''))::int,1)-1))*20
 ) select jsonb_build_object('toplam',(select count(*) from liste),'ilanlar',coalesce((select jsonb_agg(to_jsonb(s)) from sayfa s),'[]'))
$$;
create function private.genel_ayarlar() returns jsonb language sql stable security definer set search_path='' as $$select coalesce(jsonb_object_agg(anahtar,deger),'{}') from public.ayarlar where anahtar in ('kurlar','sosyal','iletisim_telefon')$$;
create function public.genel_ayarlar() returns jsonb language sql stable security invoker set search_path='' as $$select private.genel_ayarlar()$$;
create or replace function private.admin_duzenle(p_tablo text,p_id text,p_veri jsonb) returns void language plpgsql security definer set search_path='' as $$
declare a public.abonelikler;
begin
 if not private.admin() then raise exception 'Yetki yok'; end if;
 if p_tablo='ayarlar' then
  if p_id not in ('iban','hesap_sahibi','banka','odeme_notu','ucretsiz_ilan_limiti','onecikarma_gun','talep_zaman_asimi_gun','ilan_onayi','sms_zorunlu','kurlar','sosyal','iletisim_telefon') then raise exception 'Ayar geçersiz'; end if;
  if p_id in ('ucretsiz_ilan_limiti','onecikarma_gun','talep_zaman_asimi_gun') and ((p_veri#>>'{}')::int<case when p_id='ucretsiz_ilan_limiti' then 0 else 1 end or (p_veri#>>'{}')::int>10000) then raise exception 'Ayar aralığı geçersiz'; end if;
  if p_id in ('sms_zorunlu','ilan_onayi') then perform (p_veri#>>'{}')::boolean; end if;
  update public.ayarlar set deger=p_veri where anahtar=p_id;
 elsif p_tablo='abonelikler' then
  select * into a from public.abonelikler where id=p_id::uuid for update;
  if not found then raise exception 'Abonelik bulunamadı'; end if;
  update public.abonelikler set kalan_ilan=coalesce((p_veri->>'kalan_ilan')::int,kalan_ilan),kalan_onecikarma=coalesce((p_veri->>'kalan_onecikarma')::int,kalan_onecikarma),bitis=coalesce((p_veri->>'bitis')::timestamptz,bitis),durum=coalesce(p_veri->>'durum',durum) where id=a.id;
 elsif p_tablo='ilanlar' then
  update public.ilanlar set durum=coalesce(p_veri->>'durum',durum),gizli=coalesce((p_veri->>'gizli')::boolean,gizli),onecikarma=case when p_veri?'onecikarma' then p_veri->>'onecikarma' else onecikarma end,onecikarma_bitis=case when p_veri?'onecikarma_bitis' then (p_veri->>'onecikarma_bitis')::timestamptz else onecikarma_bitis end where id=p_id::uuid;
 else raise exception 'Tablo geçersiz'; end if;
end $$;
create or replace function private.kota(p_ilan uuid,p_islem text,p_tur text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.uye(); i public.ilanlar; a public.abonelikler; t text; n int; lim int; paid boolean;
begin
 select tip into t from public.profil where id=u for update;
 select * into i from public.ilanlar where id=p_ilan and kullanici_id=u for update;
 if not found then raise exception 'İlan bulunamadı'; end if;
 if p_islem='yayinla' then
  if i.durum not in ('taslak','kaldirildi','suresi_doldu','reddedildi') then raise exception 'İlan yayın işlemine uygun değil'; end if;
  if i.marka_id is not null and i.model_id is not null and not exists(select 1 from public.modeller where id=i.model_id and marka_id=i.marka_id and (bas_yil is null or i.yil>=bas_yil) and (bit_yil is null or i.yil<=bit_yil)) then raise exception 'Marka, model ve yıl uyuşmuyor'; end if;
  if (select (deger#>>'{}')::boolean from public.ayarlar where anahtar='sms_zorunlu') and not exists(select 1 from auth.users where id=u and phone_confirmed_at is not null and regexp_replace(phone,'[^0-9]','','g')=(select regexp_replace(telefon,'[^0-9]','','g') from public.profil where id=u) and (coalesce(i.detay->>'telefon','')='' or regexp_replace(phone,'[^0-9]','','g')=regexp_replace(i.detay->>'telefon','[^0-9]','','g'))) then raise exception 'Telefon doğrulaması gerekli'; end if;
  select ucretli into paid from private.ilan_haklari where ilan_id=i.id;
  select count(*) into n from public.ilanlar where kullanici_id=u and id<>i.id and durum in ('yayinda','beklemede') and bitis>now();
  select (deger#>>'{}')::int into lim from public.ayarlar where anahtar='ucretsiz_ilan_limiti';
  if not coalesce(paid,false) and i.durum='suresi_doldu' and exists(select 1 from private.ilan_haklari where ilan_id=i.id) and n>=lim then raise exception 'Yenilemek için aktif ilanlarından birini kaldır' using hint='hesabim.html'; end if;
  if not coalesce(paid,false) and (t='kurumsal' or n>=lim) then
   select * into a from public.abonelikler where kullanici_id=u and durum='aktif' and bitis>now() and kalan_ilan>0 order by bitis for update limit 1;
   if not found then raise exception 'Paket al veya mevcut ilanlarından birini kaldır' using hint='paketler.html'; end if;
   update public.abonelikler set kalan_ilan=kalan_ilan-1 where id=a.id;
   insert into private.ilan_haklari(ilan_id,ucretli,abonelik_id) values(i.id,true,a.id) on conflict(ilan_id) do update set ucretli=true,abonelik_id=a.id;
  else
   insert into private.ilan_haklari(ilan_id) values(i.id) on conflict do nothing;
  end if;
  update public.ilanlar set durum=case when uyari or (select (deger#>>'{}')::boolean from public.ayarlar where anahtar='ilan_onayi') then 'beklemede' else 'yayinda' end,yayin=now(),bitis=now()+interval '30 days',guncelleme=now() where id=i.id returning * into i;
 elsif p_islem='onecikar' then
  if i.durum<>'yayinda' or i.bitis<=now() or p_tur is null or p_tur not in ('seckin','hizli','prestij','vurgulu') then raise exception 'Öne çıkarma seçimi geçersiz'; end if;
  select * into a from public.abonelikler where kullanici_id=u and durum='aktif' and bitis>now() and kalan_onecikarma>0 order by bitis for update limit 1;
  if not found then raise exception 'Öne çıkarma hakkı yok' using hint='paketler.html'; end if;
  update public.abonelikler set kalan_onecikarma=kalan_onecikarma-1 where id=a.id;
  update public.ilanlar set onecikarma=p_tur,onecikarma_bitis=now()+make_interval(days=>(select (deger#>>'{}')::int from public.ayarlar where anahtar='onecikarma_gun')) where id=i.id returning * into i;
 elsif p_islem='yukari' then
  if i.durum<>'yayinda' or i.bitis<=now() or (i.yukari at time zone 'Asia/Nicosia')::date=(now() at time zone 'Asia/Nicosia')::date then raise exception 'Günde bir kez kullanılabilir'; end if;
  update public.ilanlar set yukari=now() where id=i.id returning * into i;
 elsif p_islem in ('kaldir','satildi','arsiv') then
  if p_islem='satildi' and i.durum<>'yayinda' then raise exception 'Yalnız yayındaki ilan satıldı olarak işaretlenebilir'; end if;
  update public.ilanlar set durum=case p_islem when 'kaldir' then 'kaldirildi' when 'satildi' then 'satildi' else 'arsiv' end,satilma=case when p_islem='satildi' then now() else satilma end,guncelleme=now() where id=i.id returning * into i;
 else raise exception 'Geçersiz işlem'; end if;
 return jsonb_build_object('id',i.id,'durum',i.durum,'bitis',i.bitis,'onecikarma',i.onecikarma,'onecikarma_bitis',i.onecikarma_bitis);
end $$;
create function private.yonet(p_tablo text,p_id text,p_veri jsonb,p_islem text) returns jsonb language plpgsql security definer set search_path='' as $$
declare alan text; deger text; sonuc jsonb; pk text;
begin
 if not private.admin() then raise exception 'Yetki yok'; end if;
 if p_tablo='kullanici' then
  if p_veri?'engelli' then insert into private.yetkiler(kullanici_id,engelli) values(p_id::uuid,(p_veri->>'engelli')::boolean) on conflict(kullanici_id) do update set engelli=excluded.engelli;end if;
  if p_veri?'dogrulandi' then update public.profil set dogrulandi=(p_veri->>'dogrulandi')::boolean where id=p_id::uuid;end if;
  insert into public.islem_kaydi(kullanici_id,tablo,kayit,islem,sonraki) values(auth.uid(),'kullanici',p_id,'UPDATE',p_veri);return '{}';
 end if;
 if p_tablo not in ('paketler','kategoriler','markalar','modeller','donanimlar','bannerlar','yazilar','sayfalar','firmalar','sikayetler','randevular') then raise exception 'Tablo erişimi kapalı'; end if;
 pk:=case when p_tablo='sayfalar' then 'slug' else 'id' end;
 if p_islem='sil' then execute format('delete from public.%I where %I::text=$1',p_tablo,pk) using p_id;return '{}'; end if;
 if p_veri='{}' then raise exception 'Alan gerekli'; end if;
 select string_agg(format('%I',a.key),','),string_agg(format('(jsonb_populate_record(null::public.%I,$1)).%I',p_tablo,a.key),',') into alan,deger from jsonb_each(p_veri) a;
 if p_id is null or p_id='' then
  execute format('insert into public.%I(%s) select %s returning to_jsonb(%I.*)',p_tablo,alan,deger,p_tablo) into sonuc using p_veri;
 else
  execute format('update public.%I set (%s)=(select %s) where %I::text=$2 returning to_jsonb(%I.*)',p_tablo,alan,deger,pk,p_tablo) into sonuc using p_veri,p_id;
 end if;
 if p_tablo='sikayetler' and sonuc->>'durum'<>'beklemede' then perform private.bildir((sonuc->>'kullanici_id')::uuid,'sikayet_sonucu',jsonb_build_object('sonuc',sonuc->>'sonuc')); end if;
 return sonuc;
end $$;
create function public.yonet(p_tablo text,p_id text default null,p_veri jsonb default '{}',p_islem text default 'kaydet') returns jsonb language sql set search_path='' as $$select private.yonet(p_tablo,p_id,p_veri,p_islem)$$;
create function private.admin_veri(p_tablo text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r jsonb;
begin
 if not private.admin() then raise exception 'Yetki yok'; end if;
 if p_tablo='genel' then return jsonb_build_object('ilan',(select count(*) from public.ilanlar where olusturma>=current_date),'uye',(select count(*) from public.profil where olusturma>=current_date),'mesaj',(select count(*) from public.mesajlar where olusturma>=current_date),'talep',(select count(*) from public.paket_talepleri where durum in ('beklemede','dekont_yuklendi'))); end if;
 if p_tablo not in ('profil','ilanlar','paket_talepleri','abonelikler','ayarlar','paketler','kategoriler','markalar','modeller','oneriler','donanimlar','bannerlar','yazilar','sayfalar','firmalar','sikayetler','randevular','islem_kaydi','gelir_ozeti','iletisim') then raise exception 'Tablo erişimi kapalı'; end if;
 execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]'') from (select * from public.%I order by %s limit 1000) t',p_tablo,case when exists(select 1 from information_schema.columns where table_schema='public' and table_name=p_tablo and column_name='olusturma') then 'olusturma desc' when p_tablo='islem_kaydi' then 'tarih desc' else '1' end) into r;
 return r;
end $$;
create function public.admin_veri(p_tablo text) returns jsonb language sql set search_path='' as $$select private.admin_veri(p_tablo)$$;
create function private.oneri_onayla(p_id uuid,p_onay boolean) returns void language plpgsql security definer set search_path='' as $$
declare o public.oneriler; m bigint;
begin
 if not private.admin() then raise exception 'Yetki yok'; end if;
 select * into o from public.oneriler where id=p_id and durum='beklemede' for update;
 if not found then raise exception 'Öneri bulunamadı'; end if;
 if p_onay then
  insert into public.markalar(ad,tip,anahtar) values(o.marka,o.tip,regexp_replace(lower(o.marka),'[^a-z0-9]','','g')) on conflict(anahtar,tip) do update set ad=excluded.ad returning id into m;
  if nullif(o.model,'') is not null then insert into public.modeller(marka_id,ad,anahtar) values(m,o.model,regexp_replace(lower(o.model),'[^a-z0-9]','','g')) on conflict do nothing; end if;
 end if;
 update public.oneriler set durum=case when p_onay then 'onaylandi' else 'reddedildi' end where id=o.id;
end $$;
create function public.oneri_onayla(p_id uuid,p_onay boolean) returns void language sql set search_path='' as $$select private.oneri_onayla(p_id,p_onay)$$;
create function private.birlestir(p_tur text,p_eski bigint,p_yeni bigint) returns void language plpgsql security definer set search_path='' as $$
declare m public.modeller; hedef bigint;
begin
 if not private.admin() or p_eski=p_yeni then raise exception 'Geçersiz işlem'; end if;
 if p_tur='model' then
  if not exists(select 1 from public.modeller a join public.modeller b on a.marka_id=b.marka_id where a.id=p_eski and b.id=p_yeni) then raise exception 'Markalar aynı olmalı'; end if;
  update public.ilanlar set model_id=p_yeni where model_id=p_eski;
  update public.talepler set model_id=p_yeni where model_id=p_eski;
  delete from public.modeller where id=p_eski;
 elsif p_tur='marka' then
  if not exists(select 1 from public.markalar where id=p_yeni) then raise exception 'Hedef marka bulunamadı';end if;
  for m in select * from public.modeller where marka_id=p_eski for update loop
   select id into hedef from public.modeller where marka_id=p_yeni and anahtar=m.anahtar;
   if hedef is null then
    update public.modeller set marka_id=p_yeni where id=m.id;
    update public.ilanlar set marka_id=p_yeni where model_id=m.id;
    update public.talepler set marka_id=p_yeni where model_id=m.id;
   else
    update public.ilanlar set marka_id=p_yeni,model_id=hedef where model_id=m.id;
    update public.talepler set marka_id=p_yeni,model_id=hedef where model_id=m.id;
    delete from public.modeller where id=m.id;
   end if;
  end loop;
  update public.ilanlar set marka_id=p_yeni where marka_id=p_eski;
  update public.talepler set marka_id=p_yeni where marka_id=p_eski;
  delete from public.markalar where id=p_eski;
 else raise exception 'Geçersiz tür'; end if;
end $$;
create function public.birlestir(p_tur text,p_eski bigint,p_yeni bigint) returns void language sql set search_path='' as $$select private.birlestir(p_tur,p_eski,p_yeni)$$;
create function private.hesap_sil() returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.uye();
begin
 update public.ilanlar set durum='arsiv',baslik='Kapatılan hesap',aciklama='',fotograflar='{}',detay='{}' where kullanici_id=u;
 update public.profil set ad='Kapatılan hesap',telefon=null,sehir=null,eposta_ozet=false where id=u;
 insert into private.yetkiler(kullanici_id,engelli) values(u,true) on conflict(kullanici_id) do update set engelli=true;
 delete from auth.sessions where user_id=u;
 update auth.users set banned_until='infinity' where id=u;
end $$;
create function public.hesap_sil() returns void language sql set search_path='' as $$select private.hesap_sil()$$;
create or replace function private.ilan_kontrol() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.model_id is not null and not exists(select 1 from public.modeller where id=new.model_id and marka_id=new.marka_id) then raise exception 'Marka ile model uyuşmuyor'; end if;
 new.detay:=new.detay-'telefon';
 new.uyari:=(new.baslik||' '||new.aciklama) ~* '(kapora|ön[[:space:]]*ödeme|on[[:space:]]*odeme|iban|havale)';
 if length(new.aciklama)>80 and exists(select 1 from public.ilanlar i where i.id<>new.id and i.kullanici_id<>new.kullanici_id and i.durum in ('yayinda','beklemede') and regexp_replace(lower(i.aciklama),'[[:space:]]+',' ','g')=regexp_replace(lower(new.aciklama),'[[:space:]]+',' ','g')) then new.uyari:=true;end if;
 if new.fiyat>0 and exists(select 1 from public.piyasa_fiyatlari p where p.model_id=new.model_id and p.yil=new.yil and p.para_birimi=new.para_birimi and new.fiyat<p.medyan*0.55) then new.uyari:=true;end if;
 if exists(select 1 from public.profil p join public.ilanlar i on i.kullanici_id=p.id where p.telefon is not null and p.telefon=(select telefon from public.profil where id=new.kullanici_id) and i.durum='yayinda' group by p.telefon having count(*)>=20 and count(distinct p.id)>=3) then new.uyari:=true;end if;
 if tg_op='INSERT' then
  if auth.uid() is not null then
   perform private.uye();
   perform 1 from public.profil where id=auth.uid() for update;
   if (select count(*) from public.ilanlar where kullanici_id=auth.uid() and olusturma>now()-interval '1 hour')>=(case when (select tip from public.profil where id=auth.uid())='kurumsal' then 500 else 10 end) then raise exception 'İlan işlem sınırına ulaşıldı'; end if;
  end if;
 elsif new.baslik is distinct from old.baslik or new.aciklama is distinct from old.aciklama or new.fiyat is distinct from old.fiyat or new.model_id is distinct from old.model_id then
  if new.uyari and new.durum in ('yayinda','satildi') then new.durum:='beklemede'; end if;
 end if;
 new.guncelleme:=now();
 return new;
end $$;
create table private.duyurulan(ilan_id uuid primary key references public.ilanlar on delete cascade);
alter table private.duyurulan enable row level security;
create function private.ilan_duyur() returns trigger language plpgsql security definer set search_path='' as $$
declare a public.aramalar;
begin
 if new.durum='yayinda' and old.durum<>'yayinda' and not exists(select 1 from private.duyurulan where ilan_id=new.id) then
  insert into private.duyurulan values(new.id);
  for a in select * from public.aramalar where kullanici_id<>new.kullanici_id loop
   if exists(select 1 from jsonb_array_elements(public.ilan_ara(a.filtre||jsonb_build_object('id',new.id,'sayfa',1))->'ilanlar') x where x->>'id'=new.id::text) then perform private.bildir(a.kullanici_id,'arama_eslesmesi',jsonb_build_object('ilan_id',new.id,'arama',a.ad),a.id::text||':'||new.id::text); if not a.eposta then delete from private.eposta_kuyrugu q using public.bildirimler b where q.bildirim_id=b.id and b.tekil=a.id::text||':'||new.id::text;end if;end if;
  end loop;
 end if;
 if new.fiyat<old.fiyat and new.para_birimi=old.para_birimi then
  perform private.bildir(f.kullanici_id,'fiyat_degisti',jsonb_build_object('ilan_id',new.id,'fiyat',new.fiyat,'para_birimi',new.para_birimi)) from public.favoriler f where f.ilan_id=new.id and f.fiyat_takibi;
 end if;
 return new;
end $$;
create trigger ilan_duyur after update on public.ilanlar for each row execute function private.ilan_duyur();
create function private.form_hiz() returns trigger language plpgsql security definer set search_path='' as $$begin perform private.hiz(tg_table_name,5);return new;end $$;

do $$ declare t text;begin
 foreach t in array array['aramalar','takipler','engeller','konusmalar','mesajlar','talepler','sikayetler','randevular','yorumlar','sayfalar','iletisim'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('create policy yonet on public.%I for all to authenticated using((select private.admin())) with check((select private.admin()))',t);
 end loop;
 foreach t in array array['foto_oturumlari','istekler','istatistik','ziyaretler'] loop execute format('alter table private.%I enable row level security',t);end loop;
 foreach t in array array['aramalar','takipler','engeller'] loop
  execute format('create policy sahibi on public.%I for all to authenticated using(kullanici_id=(select auth.uid())) with check(kullanici_id=(select private.uye()))',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
 foreach t in array array['talepler','yorumlar','sayfalar'] loop
  execute format('create policy oku on public.%I for select to anon,authenticated using(true)',t);
  execute format('grant select on public.%I to anon,authenticated',t);
 end loop;
 foreach t in array array['talepler','yorumlar','randevular','iletisim','sikayetler'] loop
  execute format('create policy ekle on public.%I for insert to authenticated with check(kullanici_id=(select private.uye()))',t);
 end loop;
 foreach t in array array['talepler','randevular','iletisim','aramalar','oneriler'] loop execute format('create trigger form_hiz before insert on public.%I for each row execute function private.form_hiz()',t);end loop;
 foreach t in array array['sayfalar','sikayetler','randevular','oneriler','yorumlar'] loop execute format('create trigger islem_kaydi after insert or update or delete on public.%I for each row execute function private.kaydet()',t);end loop;
end $$;
create policy konusma_oku on public.konusmalar for select to authenticated using((select auth.uid()) in(alici_id,satici_id));
create policy mesaj_oku on public.mesajlar for select to authenticated using(exists(select 1 from public.konusmalar k where k.id=konusma_id and (select auth.uid()) in(k.alici_id,k.satici_id)));
grant select on public.konusmalar,public.mesajlar to authenticated;
grant insert(marka_id,model_id,baslik,butce,para_birimi,sehir,metin),update(baslik,butce,para_birimi,sehir,metin,aktif),delete on public.talepler to authenticated;
create policy talep_yaz on public.talepler for update to authenticated using(kullanici_id=(select auth.uid())) with check(kullanici_id=(select private.uye()));
create policy talep_sil on public.talepler for delete to authenticated using(kullanici_id=(select auth.uid()));
grant insert(firma_id,puan,metin) on public.yorumlar to authenticated;
grant insert(ilan_id,mesaj_id,sebep,notu),select on public.sikayetler to authenticated;
create policy sikayet_oku on public.sikayetler for select to authenticated using(kullanici_id=(select auth.uid()));
grant insert(firma_id,ilan_id,ad,telefon,sehir,tarih,notu),select on public.randevular to authenticated;
create policy randevu_oku on public.randevular for select to authenticated using(kullanici_id=(select auth.uid()) or exists(select 1 from public.firmalar f where f.id=firma_id and f.kullanici_id=(select auth.uid())));
grant insert(konu,metin),select on public.iletisim to authenticated;
create policy iletisim_oku on public.iletisim for select to authenticated using(kullanici_id=(select auth.uid()));
grant update(bilgiler) on public.firmalar to authenticated;
grant usage,select on all sequences in schema public to authenticated,service_role;
grant all on all tables in schema public,private to service_role;

create policy ilan_resim_sil on storage.objects for delete to authenticated using(bucket_id in ('ilanlar','ekspertiz') and (storage.foldername(name))[1]=(select auth.uid())::text);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('firmalar','firmalar',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict do nothing;
drop policy firma_yaz on public.firmalar;
create policy firma_yaz on public.firmalar for insert to authenticated with check(kullanici_id=(select private.uye()) and not dogrulandi and not one_cikan and exists(select 1 from public.profil p where p.id=kullanici_id and p.tip='kurumsal'));
create policy firma_resim_yukle on storage.objects for insert to authenticated with check(bucket_id='firmalar' and (storage.foldername(name))[1]=(select private.uye())::text);
create policy firma_resim_oku on storage.objects for select to anon,authenticated using(bucket_id='firmalar');
drop policy ilan_oku on public.ilanlar;
create policy ilan_oku on public.ilanlar for select to anon,authenticated using((not gizli and ((durum='yayinda' and bitis>now()) or (durum='satildi' and satilma>now()-interval '7 days'))) or kullanici_id=(select auth.uid()) or (select private.admin()));

do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.mesajlar,public.konusmalar,public.ilanlar;
 end if;
end $$;

create function private.ek_bakim() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from private.istekler where zaman<now()-interval '1 day';
 delete from private.ziyaretler where gun<current_date-30;
 delete from private.foto_oturumlari where bitis<now();
end $$;
select cron.schedule('beta-car-temizlik','20 3 * * *','select private.ek_bakim()');

do $$ declare f record;begin
 for f in select p.oid::regprocedure as sig,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname=any(array['admin_veri','birlestir','ek_bakim','form_hiz','foto_al','foto_oturum','genel_ayarlar','hesap_sil','hiz','ilan_ara','ilan_durum','ilan_duyur','ilan_kopyala','istatistik','konusma_ac','mesaj_yaz','okundu','oneri_onayla','satici','sikayet_kontrol','yetkim','yonet','yorum_kontrol']) loop
  execute format('revoke execute on function %s from public,anon,authenticated',f.sig);
  if f.proname=any(array['admin_veri','birlestir','foto_al','foto_oturum','genel_ayarlar','hesap_sil','ilan_ara','ilan_durum','ilan_kopyala','istatistik','konusma_ac','mesaj_yaz','okundu','oneri_onayla','satici','yetkim','yonet']) then execute format('grant execute on function %s to authenticated',f.sig);end if;
  if f.proname=any(array['genel_ayarlar','ilan_ara','ilan_durum','istatistik','satici']) then execute format('grant execute on function %s to anon',f.sig);end if;
 end loop;end $$;
insert into public.ayarlar(anahtar,deger) values ('sosyal','{}'),('iletisim_telefon','""') on conflict do nothing;

insert into public.sayfalar(slug,baslik,baslik_en,icerik,icerik_en) values('hakkimizda','Hakkımızda','About Us','BETA.CAR, Kuzey Kıbrıs için araç ve parça ilanlarının yayımlandığı bir platformdur. Luxury & Prestige Gallery, markanın sloganıdır. Bireysel satıcılar ve firmalar kendi beyanlarından sorumludur.

Platform, araç satış sözleşmesinin tarafı değildir. Araç bedeli, kapora veya ön ödeme toplamaz; emanet hizmeti sunmaz. Paket talepleri, banka transferinden sonra yapılan inceleme ve hak tanımlama kaydıyla yönetilir.

Sorularınızı İletişim formundan hesabınızla iletebilirsiniz.','BETA.CAR is a vehicle and parts listing platform for Northern Cyprus. Luxury & Prestige Gallery is its slogan. Individual sellers and businesses are responsible for their own statements.

The platform is not a party to vehicle sales. It does not collect vehicle payments, deposits or advances, and offers no escrow service. Package requests are managed through transfer review and credit records.

Send questions using the Contact form while signed in.') on conflict(slug) do nothing;
insert into public.sayfalar(slug,baslik,baslik_en,icerik,icerik_en) values('reklam-ver','Reklam Ver','Advertise','Banner ve firma görünürlüğü taleplerini iletişim formundan iletin. Konumu, yayın tarihini ve iletişim bilgilerinizi yazın. Uygunluk incelendikten sonra sizinle iletişim kurulur. Bu sayfada fiyat listesi veya ödeme alanı bulunmaz.','Use the contact form to enquire about banners and business visibility. Include placement, dates and your contact information. We will review suitability and contact you. This page contains no price list or payment form.') on conflict(slug) do nothing;
insert into public.sayfalar(slug,baslik,baslik_en,icerik,icerik_en) values('iletisim','İletişim','Contact','Hesabınızla giriş yaparak aşağıdaki formdan destek talebi gönderin. İlan veya paket hakkında yazarken ilan numarasını ya da talep referansını belirtin. Şifre, kart bilgisi veya kimlik belgesi göndermeyin.

BETA.CAR hiçbir zaman mesajla IBAN istemez; paket ödeme bilgisi yalnızca Hesabım > Paketlerim ekranında görünür.','Sign in and send a support request using the form below. Include the listing number or request reference when relevant. Do not send passwords, card details or identity documents.

BETA.CAR never requests an IBAN by message; package bank details appear only under My Account > My Packages.') on conflict(slug) do nothing;
insert into public.sayfalar(slug,baslik,baslik_en,icerik,icerik_en) values('bireysel-uye-sozlesmesi','Bireysel Üye Sözleşmesi','Individual Membership Agreement','Üyelik, geçerli e-posta adresinin doğrulanmasıyla kullanılır. Kullanıcı hesap bilgilerinin doğruluğundan ve şifresinin korunmasından sorumludur. Başkasına ait telefon veya kimlik bilgisi kullanılamaz.

Yalnızca satma yetkisine sahip olduğunuz araçları ve parçaları ilan edin. Mülkiyet, fiyat, kilometre, hasar ve donanım bilgilerini doğru yazın. İlan yayımlanması, platformun aracı incelediği veya bilgileri garanti ettiği anlamına gelmez.

BETA.CAR satış bedeli toplamaz ve satışa taraf olmaz. Şüpheli içerik incelenebilir, ilan gizlenebilir ve kötüye kullanım halinde hesap kısıtlanabilir. İtirazlar İletişim formundan iletilebilir.

Ücretsiz aktif ilan limiti ve varsa paket hakları veritabanındaki kayda göre uygulanır. Paket koşulları ayrı metindedir. Kullanıcı hesabını Profil ekranından kapatabilir. Yasal saklama zorunluluğu olan işlem kayıtları anonimleştirme veya saklama gerekliliklerine göre ele alınır. Emredici tüketici hakları saklıdır.','Membership uses a verified email address. Users are responsible for accurate account information and protecting their passwords. Do not use another person’s phone or identity.

List only vehicles and parts you are entitled to sell. Provide accurate ownership, price, mileage, damage and equipment details. Publication does not mean the platform inspected the vehicle or guarantees its condition.

BETA.CAR does not collect vehicle payments and is not a party to sales. Suspected abuse can lead to review, hidden listings or account restrictions. Appeals may be submitted through Contact.

The database record determines the free active listing limit and any package credits. Package terms are separate. Close your account in Profile. Records subject to legal retention are handled in line with applicable retention or anonymisation requirements. Mandatory consumer rights are preserved.') on conflict(slug) do nothing;
insert into public.sayfalar(slug,baslik,baslik_en,icerik,icerik_en) values('kurumsal-uye-sozlesmesi','Kurumsal Üye Sözleşmesi','Business Membership Agreement','Kurumsal hesap başvurusu yapan kişi, firmayı temsil etmeye yetkili olmalıdır. Firma adı, türü, vergi bilgisi ve iletişim kayıtları doğru olmalıdır. Doğrulanmış Firma rozeti, yalnızca platformun kayıt incelemesini gösterir; araçların durumuna, firmanın mali gücüne veya satış sonucuna garanti vermez.

Kurumsal ilanlar aktif paket kotasına tabidir; bireysel ücretsiz limitten yararlanmaz. Toplu yüklenen kayıtlar taslaktır ve yayın sırasında sunucu kotası uygulanır. Firma, personelinin hesap erişiminden ve ilanlarından sorumludur.

Sahte içerik, yanıltıcı fiyat, izinsiz görsel, kapora talebi veya kullanıcı tacizi inceleme ve kısıtlama sebebidir. İtiraz ve destek başvuruları İletişim formundan yapılır. Paket ve gizlilik koşulları bu sözleşmeyle birlikte uygulanır.','The person registering a business account must be authorised to represent it. Business name, category, tax and contact records must be accurate. The Verified Business badge indicates a record review only; it does not guarantee vehicle condition, solvency or sales outcomes.

Business listings require active package credits and do not use the individual free allowance. Bulk imports are drafts; server-side quota checks apply when publishing. Businesses are responsible for staff access and listings.

False content, misleading prices, unauthorised images, deposit demands or harassment can lead to review and restrictions. Submit appeals and support requests through Contact. Package and privacy terms also apply.') on conflict(slug) do nothing;
insert into public.sayfalar(slug,baslik,baslik_en,icerik,icerik_en) values('ilan-kurallari','İlan Kuralları','Listing Rules','Başlık araç veya parçayı tanımlamalıdır. Bir ilan tek bir araç ya da açıkça tanımlanmış parça içindir. Aynı şasi veya plaka ile birden fazla açık kayıt kabul edilmez. Fotoğraflar size ait olmalı veya kullanım izniniz bulunmalıdır.

Fiyat, para birimi, kilometre, model yılı, direksiyon, plaka ve ithalat bilgilerini kontrol edin. Eksik ya da bilinmeyen kaporta bilgisi orijinal kabul edilmez. Kaporta ve donanım alanları satıcı beyanıdır; raporun doğruluğu ayrıca incelenmelidir.

Kapora, ön ödeme, IBAN veya havale talebi içeren ilanlar incelemeye alınır. Sahte ilan, yanlış fiyat ve satılmış ilanlar şikayet edilebilir. Üç ayrı üyenin bekleyen şikayeti, ilanı inceleme süresince gizler.

İlanlar 30 gün yayında kalır. Yenileme aynı ilan hakkı içindedir; ücretsiz aktif limit korunur. Satıldı işareti 7 gün görünür, ardından ilan arşivlenir. Günde bir kez ücretsiz yukarı çıkarma kullanılabilir.','A title must identify the vehicle or part. One listing covers one vehicle or a clearly described part. Multiple open records for the same VIN or registration are not accepted. Use only photos you own or are authorised to use.

Check price, currency, mileage, model year, steering, registration and import details. Missing bodywork information does not mean original condition. Bodywork and equipment entries are seller declarations; inspection reports must be checked independently.

Listings requesting deposits, advance payments, IBAN details or transfers are reviewed. False listings, wrong prices and sold vehicles may be reported. Three pending reports from different members temporarily hide a listing for review.

Listings run for 30 days. Renewal remains within the same listing credit, subject to the free active limit. Sold listings remain visible for 7 days, then archive. One free move-up is allowed per day.') on conflict(slug) do nothing;
insert into public.sayfalar(slug,baslik,baslik_en,icerik,icerik_en) values('paket-ve-uyelik-kosullari','Paket ve Üyelik Koşulları','Package & Membership Terms','Paket adı, hedef hesap türü, ilan ve öne çıkarma hakları, süre, fiyat ve para birimi paket kaydında gösterilir. Fiyat belirtilmemişse talep incelenirken tutar belirlenir. Banka bilgisi açılmadan önce talep ekranındaki tutarı kontrol edin.

Site içinde tahsilat yapılmaz. Kart, otomatik ödeme, otomatik yenileme ve emanet hizmeti yoktur. Paket bedeli yalnızca talep onayından sonra Hesabım > Paketlerim ekranında görünen banka hesabına, site dışında havale/EFT ile ödenir. Açıklamaya referans kodu yazılmalıdır. Banka masrafları transferi yapan kişiye aittir.

Dekont yüklemek hak tanımlamaz. Banka kaydıyla kontrol sonrası onay verildiğinde haklar ve süre başlar. İnceleme için sabit bir saat taahhüdü verilmez; talep durumu hesapta izlenebilir. Red halinde gerekçe gösterilir ve açık süre içinde yeni dekont yüklenebilir. Ödeme bekleyen talep, ayarlanan süre içinde dekont gelmezse sona erer.

Ücretsiz aktif limiti aşan bireysel ilan ve her kurumsal ilan, ilk yayın sırasında bir paket ilan hakkı kullanır. Ücretli hak kullanılmış ilanı yenilemek yeni hak tüketmez. Silme veya kaldırma hak iadesi yapmaz. Öne çıkarma her işlemde bir hak tüketir ve belirtilen sürede kapanır. Kullanılmayan haklar paket bitişinde kapanır.

İptal veya iade talebi referans koduyla İletişim formundan yapılır. Aktifleştirilmemiş talepte banka kaydı ve işlem durumu incelenir; kullanılmış haklar ve zorunlu tüketici hakları dikkate alınır. İade üzerinde anlaşılırsa banka işlemi site dışında gerçekleştirilir; panel yalnız işlem notunu tutar. Platform bu ekrandan fatura kesmez.','The package record shows its name, eligible account type, listing and promotion credits, term, price and currency. If no price is listed, the amount is set during request review. Check the amount shown before bank details are opened.

The site collects no funds. There are no card payments, automatic collections, automatic renewals or escrow services. After review, pay outside the site by transfer only to the account displayed in My Account > My Packages. Include the reference code. The sender bears bank transfer charges.

Uploading a receipt does not activate credits. Credits and the term begin after bank reconciliation and approval. No fixed review-hour guarantee is offered; track the request in your account. Rejections include a reason and allow a replacement receipt within the open deadline. An awaiting-transfer request expires if no receipt arrives within the configured period.

Individual listings above the free active allowance and all business listings consume one listing credit at first publication. Renewing a listing that already consumed a paid credit does not use another. Deletion or removal does not refund credits. Each promotion consumes one credit and ends after its stated duration. Unused rights close at package expiry.

Submit cancellation or refund requests through Contact with the reference code. Unactivated requests are reviewed against bank records and status; used rights and mandatory consumer rights are considered. Any agreed refund is transferred outside the site; the panel retains a note only. The platform does not issue invoices through this screen.') on conflict(slug) do nothing;
insert into public.sayfalar(slug,baslik,baslik_en,icerik,icerik_en) values('gizlilik-politikasi','Gizlilik Politikası','Privacy Policy','Hesap adı, e-posta, telefon, ilan bilgileri, mesajlar, bildirim tercihleri ve paket işlem kayıtları; hesabı işletmek, ilanları göstermek, destek sağlamak ve kötüye kullanımı incelemek için işlenir. Firma vergi bilgisi ve paket dekontu herkese açık değildir.

İlan fotoğrafları ve ilan içeriği herkese açık olabilir. Telefon ancak satıcının tercihine göre gösterilir. Mesajlar konuşma taraflarına açıktır; yetkili yöneticiler şikayet incelemesi kapsamında erişebilir. İlanlarda kesin adres gösterilmez; harita ilçe/şehir düzeyindedir.

Veriler Supabase hizmetlerinde saklanır; site Vercel üzerinde sunulur. Hizmet bölgeleri seçilen proje ayarlarına bağlıdır ve sınır ötesi aktarım söz konusu olabilir. İsteğe bağlı e-posta bildirimlerini Profil ekranından kapatabilirsiniz.

Hesap kapatma, veri erişimi, düzeltme ve silme başvuruları İletişim formundan alınır. Kimliğin doğrulanması gerekebilir. İşlem ve uyuşmazlık kayıtları, hukuki yükümlülük ve talebin niteliğine göre gerekli süre saklanabilir; gereksiz veriler silinir veya anonimleştirilir.','Account name, email, phone, listing information, messages, notification preferences and package records are processed to operate accounts, display listings, provide support and investigate abuse. Business tax details and package receipts are not public.

Listing photos and content may be public. Phone numbers are shown according to the seller’s preference. Messages are visible to conversation participants; authorised administrators may access them for complaint review. Maps show district/city-level locations rather than exact listing addresses.

Data is stored using Supabase services and the site is hosted on Vercel. Service regions depend on the chosen project configuration and may involve international transfers. Disable optional email notifications in Profile.

Submit account closure, access, correction and erasure requests through Contact. Identity verification may be required. Transaction and dispute records may be retained where needed for legal duties or the nature of a claim; unnecessary data is deleted or anonymised.') on conflict(slug) do nothing;
insert into public.sayfalar(slug,baslik,baslik_en,icerik,icerik_en) values('cerez-politikasi','Çerez Politikası','Cookie Policy','BETA.CAR oturum, dil, gerekli tercih ve güvenlik kayıtları için tarayıcı depolamasını kullanır. Dil, favoriler, son bakılan ilanlar, karşılaştırma ve arama geçmişi cihazınızda tutulabilir. Giriş yapınca favoriler hesabınıza aktarılır.

Marka ve model sözlüğü oturum depolamasında en fazla bir gün önbelleğe alınır. Çevrimdışı sayfa önbelleği veya servis çalışanı yoktur. Reklam takip çerezi ve isteğe bağlı analiz çerezi etkin değildir.

Tarayıcı ayarlarından yerel kayıtları silebilirsiniz. Bu işlem cihazdaki tercihleri ve giriş durumunu sıfırlayabilir. Harita açıldığında OpenStreetMap sunucularına görsel istekleri gider; bunun için IP adresiniz ve tarayıcı bilgisi ilgili hizmete iletilir.','BETA.CAR uses browser storage for sessions, language, essential preferences and security. Language, favourites, recently viewed listings, comparison and search history may be stored on your device. Favourites are transferred to your account after sign-in.

The make/model dictionary is cached in session storage for up to one day. There is no offline page cache or service worker. Advertising tracking and optional analytics cookies are not enabled.

Delete local records using your browser settings. This may reset preferences and sign-in status. Opening a map requests images from OpenStreetMap servers, which receive your IP address and browser information.') on conflict(slug) do nothing;
insert into public.sayfalar(slug,baslik,baslik_en,icerik,icerik_en) values('kvkk-aydinlatma','KVKK Aydınlatma Metni','Personal Data Notice','BETA.CAR kapsamında kimlik ve iletişim bilgileri, üyelik işlemleri, ilan içerikleri, mesajlar ve paket talebi kayıtları hizmetin yürütülmesi için işlenir. Başvuru sahibinin sağladığı veriler, hesap ve ilan formları, oturum kayıtları ve destek taleplerinden elde edilir.

İşleme amaçları; üyelik sözleşmesinin yürütülmesi, ilanların yayımlanması, paket haklarının kayıt altına alınması, kötüye kullanımın engellenmesi, destek ve hukuki taleplerin karşılanmasıdır. İşlemenin dayanağı duruma göre sözleşmenin ifası, hukuki yükümlülük, hakkın tesisi veya ölçülü meşru menfaattir; isteğe bağlı bildirim tercihleri geri alınabilir.

Veriler hizmet sağlayıcılarla teknik işletim amacıyla ve yetkili makamlarla yasal gereklilik halinde paylaşılabilir. Seçilen barındırma bölgesine göre yurt dışına aktarım değerlendirilmeli ve uygulanabilir KKTC kişisel veri kuralları ile uygulanabildiği ölçüde 6698 sayılı Kanun dikkate alınmalıdır.

Veriye erişme, düzeltme, silme, işlemeye itiraz ve aktarım hakkında bilgi taleplerini İletişim formundan iletin. Başvurunun aidiyeti doğrulanarak uygulanabilir yasal süre içinde yanıtlanır.','BETA.CAR processes identity and contact details, membership activity, listing content, messages and package request records to provide the service. Information is obtained through account and listing forms, session records and support requests.

Purposes include performing the membership agreement, publishing listings, recording package rights, preventing abuse, support and responding to legal claims. The basis may be contractual performance, legal obligation, establishment of rights or proportionate legitimate interests. Optional notification preferences can be withdrawn.

Data may be shared with technical service providers and with authorities when legally required. International transfers depend on hosting-region choices and must be assessed under applicable Northern Cyprus data rules and, where applicable, Türkiye Law No. 6698.

Use Contact for access, correction, erasure, objection or transfer-information requests. Requests are answered within applicable legal periods after verifying that they belong to the requester.') on conflict(slug) do nothing;
insert into public.sayfalar(slug,baslik,baslik_en,icerik,icerik_en) values('guvenli-alim','Güvenli Alım','Buying Safely','Siteye veya satıcıya kapora, ön ödeme, havale yapma; ödemeyi aracı yerinde görüp ekspertiz yaptırdıktan sonra yap.

Ruhsat, şasi numarası ve satıcının satış yetkisini karşılaştır. İthal araçlarda plaka ve gümrük durumunu bağımsız olarak doğrula. Kaporta çizimi ve donanım listesi satıcı beyanıdır. Raporu düzenleyen merkezle rapor numarası ve tarihini kontrol et.

Çok düşük fiyat, acele transfer isteği veya başka hesaba ödeme talebi varsa görüşmeyi durdur ve ilanı şikayet et.

BETA.CAR hiçbir zaman mesajla IBAN istemez; paket ödeme bilgisi yalnızca Hesabım > Paketlerim ekranında görünür.','Do not send deposits, advance payments or transfers to the site or seller; pay after seeing and inspecting the vehicle.

Compare registration, VIN and the seller’s authority to sell. Independently verify registration and customs status for imports. Body diagrams and equipment lists are seller declarations. Check report details with the issuing inspection centre.

Stop and report the listing if the price is unusually low or someone pressures you to transfer money or pay a different account.

BETA.CAR never requests an IBAN by message; package bank details appear only under My Account > My Packages.') on conflict(slug) do nothing;
insert into public.sayfalar(slug,baslik,baslik_en,icerik,icerik_en) values('guvenli-satis','Güvenli Satış','Selling Safely','Siteye veya satıcıya kapora, ön ödeme, havale yapma; ödemeyi aracı yerinde görüp ekspertiz yaptırdıktan sonra yap.

İlan bilgilerini belgelerle karşılaştır, kişisel kimlik veya ruhsatın tamamını herkese açık fotoğraflara ekleme. Aracı güvenli bir yerde göster. Üçüncü kişilerin yönlendirdiği bağlantılara hesap veya banka şifresi girme.

Transfer ekran görüntüsü tek başına ödeme kanıtı değildir. Aracın teslimi ve devir işlemi öncesinde kendi bankandan ve ilgili resmi kanallardan gerekli doğrulamaları yap.

BETA.CAR hiçbir zaman mesajla IBAN istemez; paket ödeme bilgisi yalnızca Hesabım > Paketlerim ekranında görünür.','Do not send deposits, advance payments or transfers to the site or seller; pay after seeing and inspecting the vehicle.

Check listing details against documents and do not publish complete identity or registration documents in photos. Show the vehicle in a safe place. Never enter account or bank passwords into links sent by third parties.

A transfer screenshot alone is not proof of payment. Before delivery and ownership transfer, verify through your own bank and the relevant official channels.

BETA.CAR never requests an IBAN by message; package bank details appear only under My Account > My Packages.') on conflict(slug) do nothing;
insert into public.sayfalar(slug,baslik,baslik_en,icerik,icerik_en) values('sss','SSS','FAQ','İlan nasıl verilir? Aracını Sat bağlantısından bilgileri doldur, fotoğrafları ekle, önizlemeyi kontrol et ve yayınla. E-posta doğrulaması gerekir; SMS denetimi etkinleştirildiğinde telefon doğrulaması da istenir.

Ücretsiz kaç ilan verilebilir? Bireysel hesapların aktif limiti yönetim ayarından okunur. Kurumsal hesaplar paket kotası kullanır. Paketlerin güncel hakları Paketler ekranında gösterilir.

Paket ödemesi nasıl yapılır? Önce talep gönderilir. İnceleme sonrasında banka bilgisi yalnız Hesabım > Paketlerim ekranında açılır. Dekont kontrolünden sonra haklar tanımlanır.

Bir ilan şüpheliyse ne yapmalıyım? İlanın Şikayet et bağlantısından nedenini seçin. Para göndermeyin; görüşme kayıtlarını silmeyin.

Değerleme kesin satış fiyatı mıdır? Hayır. Yeterli sayıdaki benzer ilan fiyatından hesaplanan aralıktır; ilan fiyatı gerçekleşmiş satış fiyatı anlamına gelmez.','How do I publish? Use Sell Your Vehicle, fill in the details, add photos, check the preview and publish. Email verification is required; phone verification is also required when SMS checks are enabled.

How many listings are free? The individual active limit comes from administrator settings. Business accounts use package credits. Current credits are shown on Packages.

How are packages paid? Submit a request first. After review, bank details open only in My Account > My Packages. Credits activate after the receipt is checked.

What if a listing is suspicious? Select a reason under Report. Do not send money or delete conversation records.

Is valuation a guaranteed sale price? No. It is a range based on enough comparable asking prices; asking prices are not completed sale prices.') on conflict(slug) do nothing;
insert into public.yazilar(slug,baslik,baslik_en,ozet,ozet_en,icerik,icerik_en,kategori) values('ithal-aracta-belge-kontrolu','İthal araçta belge kontrolü','Checking import paperwork','Plaka, şasi ve ithalat kaydını aynı dosyada değerlendirin.','Check registration, VIN and import records together.','İthal bir aracı incelerken ilk olarak şasi numarasını araç üzerindeki işaretle karşılaştırın. İlandaki model adı tek başına araç kimliğini doğrulamaz. Plaka durumu ile gümrük beyanını satıcıdan yazılı olarak isteyin.

Japonya veya İngiltere çıkışlı bir araçta pazar adı ile yerel model adı farklı olabilir. Teknik özellikleri model adına göre varsaymak yerine araç üzerindeki üretici bilgisi ve belgelerle kontrol edin. Grade kaydı bir referanstır; güncel ekspertizin yerine geçmez.

Belgelerdeki tutarsızlık çözülmeden devir ya da ödeme kararı vermeyin. İşlemin tabi olduğu güncel şartları ilgili resmi kanaldan doğrulayın.','Start by comparing the VIN in the paperwork with the marking on the vehicle. A model name in a listing does not establish identity. Ask the seller for written registration and customs information.

Market and local model names may differ for Japanese or UK imports. Verify technical details from manufacturer information and documents rather than relying on the model name. A grade record is a reference, not a substitute for a current inspection.

Do not decide on payment or transfer until inconsistencies are resolved. Confirm current requirements with the relevant official channel.','Araç Alımı') on conflict(slug) do nothing;
insert into public.yazilar(slug,baslik,baslik_en,ozet,ozet_en,icerik,icerik_en,kategori) values('ekspertiz-raporunu-okumak','Ekspertiz raporunu okumak','Reading an inspection report','Rapor tarihi, parça beyanı ve kontrol kapsamını birlikte okuyun.','Read the date, panel declarations and inspection scope together.','Raporu açınca yalnız sonuç satırına bakmayın. Tarih, kilometre, şasi ve firma bilgisinin incelediğiniz araçla eşleştiğini kontrol edin. Belgede hangi testlerin yapılmadığı da sonucu etkiler.

Boyalı bir parça tek başına aracın tüm geçmişini anlatmaz. Değişen parça, yapısal kontrol, mekanik ölçüm ve test sürüşü birlikte değerlendirilmelidir. Kaporta çiziminde belirtilmemiş alanlar orijinal kabul edilmemelidir.

Raporu düzenleyen merkezi kendi resmi iletişim kanalından arayıp belgeyi doğrulayın. Aracı görmeden kapora veya ön ödeme göndermeyin.','Do not read only the final line. Check that date, mileage, VIN and inspection business match the vehicle you are viewing. Tests excluded from the report also matter.

A painted panel alone does not explain the full history. Assess replaced panels together with structural checks, mechanical measurements and a test drive. Unspecified panels in a diagram must not be assumed original.

Verify the document through the inspection centre’s own official contact channel. Do not send deposits or advance payments before seeing the vehicle.','Ekspertiz') on conflict(slug) do nothing;
insert into public.yazilar(slug,baslik,baslik_en,ozet,ozet_en,icerik,icerik_en,kategori) values('elektrikli-aracta-kullanim-hesabi','Elektrikli araçta kullanım hesabı','Planning electric vehicle use','Günlük mesafe ve şarj erişimi, katalog menzilinden önce gelir.','Daily distance and charging access matter before catalogue range.','Günlük rotanızı, park sürenizi ve şarj erişiminizi not edin. Katalog menzili tek bir ölçüm koşulunu temsil eder; sıcaklık, hız, klima ve batarya durumu gerçek kullanımı değiştirir.

İkinci el elektrikli araçta batarya raporunun tarihi, ölçüm yöntemi ve şarj geçmişi hakkında bilgi isteyin. Şarj soketinin bulunduğunuz yerdeki cihazlarla uyumunu kontrol edin. Evde kurulum düşünüyorsanız tesisatı yetkili bir uzmana inceletin.

Maliyet karşılaştırmasında yalnız enerji fiyatını değil sigorta, bakım, lastik ve olası kurulum giderini de hesaplayın.','Record your daily route, parking time and access to charging. Catalogue range represents defined test conditions; temperature, speed, climate control and battery condition affect real use.

For a used electric vehicle, ask about the battery report’s date, measurement method and charging history. Check connector compatibility with local charging equipment. Have a qualified professional assess the installation if you plan home charging.

Compare insurance, maintenance, tyres and possible installation costs as well as the energy price.','Kullanım') on conflict(slug) do nothing;
create function private.foto_ekle(p_ilan uuid,p_url text) returns text[] language plpgsql security definer set search_path='' as $$
declare i public.ilanlar;
begin
 select * into i from public.ilanlar where id=p_ilan and kullanici_id=private.uye() for update;
 if not found or cardinality(i.fotograflar)>=15 or p_url not like 'https://%' then raise exception 'Fotoğraf eklenemiyor'; end if;
 update public.ilanlar set fotograflar=array_append(fotograflar,p_url) where id=i.id returning fotograflar into i.fotograflar;
 return i.fotograflar;
end $$;
create function public.foto_ekle(p_ilan uuid,p_url text) returns text[] language sql set search_path='' as $$select private.foto_ekle(p_ilan,p_url)$$;
revoke execute on function private.foto_ekle(uuid,text),public.foto_ekle(uuid,text) from public,anon;
grant execute on function private.foto_ekle(uuid,text),public.foto_ekle(uuid,text) to authenticated;
create function public.ana_akim(p_son uuid[] default '{}') returns jsonb language sql stable set search_path='' as $$
 with kimlikler as (
 (select id from public.ilanlar where durum='yayinda' and bitis>now() and not gizli order by yayin desc limit 20)
 union (select id from public.ilanlar where durum='yayinda' and bitis>now() and not gizli and onecikarma='seckin' and onecikarma_bitis>now() order by yayin desc limit 4)
 union (select id from public.ilanlar where durum='yayinda' and bitis>now() and not gizli and onecikarma='hizli' and onecikarma_bitis>now() order by yayin desc limit 4)
 union (select i.id from public.ilanlar i join public.kategoriler k on k.id=i.kategori_id where i.durum='yayinda' and i.bitis>now() and not i.gizli and k.slug like 'parca-%' order by i.yayin desc limit 4)
 union (select id from public.ilanlar where id=any(p_son))
 ) select coalesce(jsonb_agg(to_jsonb(c) order by c.yayin desc),'[]') from public.ilan_kartlari c where c.id in (select id from kimlikler)
$$;
revoke execute on function public.ana_akim(uuid[]) from public;
grant execute on function public.ana_akim(uuid[]) to anon,authenticated;
create table private.arama_gecmisi(kullanici_id uuid not null references public.profil on delete cascade,sorgu text not null,olusturma timestamptz not null default now(),primary key(kullanici_id,sorgu));
alter table private.arama_gecmisi enable row level security;
create function private.arama_gecmis(p_sorgu text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.uye();r jsonb;
begin
 perform 1 from public.profil where id=u for update;
 if p_sorgu is not null then
  if length(p_sorgu)>4000 then raise exception 'Arama çok uzun'; end if;
  insert into private.arama_gecmisi(kullanici_id,sorgu) values(u,p_sorgu) on conflict(kullanici_id,sorgu) do update set olusturma=now();
  delete from private.arama_gecmisi where kullanici_id=u and sorgu not in(select sorgu from private.arama_gecmisi where kullanici_id=u order by olusturma desc limit 10);
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('query',sorgu,'date',extract(epoch from olusturma)*1000) order by olusturma desc),'[]') into r from private.arama_gecmisi where kullanici_id=u;return r;
end $$;
create function public.arama_gecmis(p_sorgu text default null) returns jsonb language sql set search_path='' as $$select private.arama_gecmis(p_sorgu)$$;
revoke execute on function private.arama_gecmis(text),public.arama_gecmis(text) from public,anon;
grant execute on function private.arama_gecmis(text),public.arama_gecmis(text) to authenticated;
create function public.model_ozeti(p_model bigint,p_yil int default null,p_km int default null,p_yakit text default null,p_vites text default null,p_para text default 'GBP') returns jsonb language sql stable set search_path='' as $$
 with liste as (select fiyat from public.ilanlar where model_id=p_model and durum='yayinda' and bitis>now() and not gizli and fiyat>0 and para_birimi=p_para
 and (p_yil is null or yil between p_yil-1 and p_yil+1) and (p_km is null or abs(km-p_km)<=30000) and (nullif(p_yakit,'') is null or yakit=p_yakit) and (nullif(p_vites,'') is null or vites=p_vites)),
 ozet as (select count(*) adet,percentile_cont(.5) within group(order by fiyat) medyan,avg(fiyat) ortalama,min(fiyat) en_dusuk,max(fiyat) en_yuksek,percentile_cont(.2) within group(order by fiyat) alt,percentile_cont(.8) within group(order by fiyat) ust from liste),
 dagilim as (select least(4,coalesce(floor((l.fiyat-o.en_dusuk)/nullif(o.en_yuksek-o.en_dusuk,0)*5),0)) dilim,count(*) adet from liste l cross join ozet o group by 1)
 select to_jsonb(o)||jsonb_build_object('dagilim',coalesce((select jsonb_agg(jsonb_build_array(dilim,adet) order by dilim) from dagilim),'[]')) from ozet o
$$;
revoke execute on function public.model_ozeti(bigint,int,int,text,text,text) from public;
grant execute on function public.model_ozeti(bigint,int,int,text,text,text) to anon,authenticated;
create function private.randevu_duyur() returns trigger language plpgsql security definer set search_path='' as $$
declare u uuid;
begin
 for u in select kullanici_id from private.yetkiler where admin and not engelli union select kullanici_id from public.firmalar where id=new.firma_id loop
  perform private.bildir(u,'randevu',jsonb_build_object('randevu_id',new.id,'ilan_id',new.ilan_id));
 end loop;return new;
end $$;
revoke execute on function private.randevu_duyur() from public,anon,authenticated;
create trigger randevu_duyur after insert on public.randevular for each row execute function private.randevu_duyur();
commit;
