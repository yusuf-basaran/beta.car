begin;

revoke create on schema public from public, anon, authenticated;
revoke all on schema private from public, anon;
grant usage on schema private to anon, authenticated;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from public;

alter table public.talepler add constraint talep_sinir check (
 length(trim(baslik)) between 3 and 160 and length(trim(metin)) between 3 and 4000
 and para_birimi in ('GBP','EUR','USD','TL') and length(coalesce(sehir,''))<=80
) not valid;
alter table public.sikayetler add constraint sikayet_not_sinir check(length(notu)<=2000) not valid;
alter table public.randevular add constraint randevu_sinir check (
 num_nonnulls(firma_id,ilan_id)>=1 and length(trim(ad)) between 2 and 100
 and length(telefon) between 7 and 30 and telefon ~ '^[+0-9 ()-]+$'
 and length(notu)<=2000 and length(coalesce(sehir,''))<=80
) not valid;
alter table public.iletisim add constraint iletisim_konu_sinir check(length(trim(konu)) between 2 and 160) not valid;
alter table public.oneriler add constraint oneri_sinir check(length(marka) between 1 and 100 and length(coalesce(model,''))<=100) not valid;
alter table public.aramalar add constraint arama_ad_sinir check(length(trim(ad)) between 1 and 120 and octet_length(filtre::text)<=8000) not valid;
alter table public.ilan_ekspertiz add constraint ekspertiz_sinir check(length(firma) between 1 and 160 and length(dosya)<=600) not valid;

drop policy oku on public.talepler;
create policy oku on public.talepler for select to anon, authenticated
 using(aktif or kullanici_id=(select auth.uid()) or (select private.admin()));

create or replace function private.form_hiz() returns trigger language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); iz text;
begin
 if u is null or private.admin() then return new; end if;
 perform private.hiz(tg_table_name,5);
 if (select count(*) from private.istekler where kullanici_id=u and alan=tg_table_name and zaman>now()-interval '1 day')>100 then
  raise exception 'Günlük işlem sınırı';
 end if;
 iz:='tekrar:'||tg_table_name||':'||md5((to_jsonb(new)-array['id','olusturma','guncelleme'])::text);
 if exists(select 1 from private.istekler where kullanici_id=u and alan=iz and zaman>now()-interval '5 minutes') then
  raise exception 'Aynı işlem kısa aralıklarla tekrarlanamaz';
 end if;
 insert into private.istekler(kullanici_id,alan) values(u,iz);
 if tg_table_name='randevular' then
  if new.firma_id is not null and not exists(select 1 from public.firmalar where id=new.firma_id) then raise exception 'Firma bulunamadı'; end if;
  if new.ilan_id is not null and not exists(select 1 from public.ilanlar where id=new.ilan_id and durum='yayinda' and bitis>now() and not gizli) then raise exception 'İlan bulunamadı'; end if;
 end if;
 return new;
end $$;

create trigger form_guncelle before update on public.talepler for each row execute function private.form_hiz();
create trigger form_guncelle before update on public.aramalar for each row execute function private.form_hiz();

create function private.mesaj_sinir() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if length(trim(new.metin)) not between 1 and 4000 then raise exception 'Mesaj uzunluğu geçersiz'; end if;
 if exists(select 1 from public.mesajlar where gonderen_id=new.gonderen_id and konusma_id=new.konusma_id and metin=new.metin and olusturma>now()-interval '1 minute') then raise exception 'Aynı mesaj kısa aralıklarla tekrarlanamaz'; end if;
 if (select count(*) from public.mesajlar where gonderen_id=new.gonderen_id and olusturma>now()-interval '1 day')>=500 then raise exception 'Günlük mesaj sınırı'; end if;
 return new;
end $$;
create trigger mesaj_sinir before insert on public.mesajlar for each row execute function private.mesaj_sinir();

create function private.sikayet_hedef() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.ilan_id is not null and not exists(select 1 from public.ilanlar where id=new.ilan_id and not gizli and ((durum='yayinda' and bitis>now()) or (durum='satildi' and satilma>now()-interval '7 days'))) then raise exception 'İlan bulunamadı'; end if;
 if new.mesaj_id is not null and not exists(select 1 from public.mesajlar m join public.konusmalar k on k.id=m.konusma_id where m.id=new.mesaj_id and auth.uid() in(k.alici_id,k.satici_id) and m.gonderen_id<>auth.uid()) then raise exception 'Mesaj bulunamadı'; end if;
 return new;
end $$;
create trigger sikayet_hedef before insert on public.sikayetler for each row execute function private.sikayet_hedef();

create function private.arama_dogrula() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if jsonb_typeof(new.filtre)<>'object' then raise exception 'Arama filtresi geçersiz'; end if;
 perform public.ilan_ara(new.filtre||'{"sayfa":1}'::jsonb);
 return new;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value then
 raise exception 'Arama filtresi geçersiz';
end $$;
create trigger arama_dogrula before insert or update on public.aramalar for each row execute function private.arama_dogrula();

create or replace function private.ilan_duyur() returns trigger language plpgsql security definer set search_path='' as $$
declare a public.aramalar;
begin
 if new.durum='yayinda' and old.durum<>'yayinda' and not exists(select 1 from private.duyurulan where ilan_id=new.id) then
  insert into private.duyurulan values(new.id);
  for a in select * from public.aramalar where kullanici_id<>new.kullanici_id loop
   begin
    if exists(select 1 from jsonb_array_elements(public.ilan_ara(a.filtre||jsonb_build_object('id',new.id,'sayfa',1))->'ilanlar') x where x->>'id'=new.id::text) then
     perform private.bildir(a.kullanici_id,'arama_eslesmesi',jsonb_build_object('ilan_id',new.id,'arama',a.ad),a.id::text||':'||new.id::text);
     if not a.eposta then delete from private.eposta_kuyrugu q using public.bildirimler b where q.bildirim_id=b.id and b.tekil=a.id::text||':'||new.id::text; end if;
    end if;
   exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value then
    continue;
   end;
  end loop;
 end if;
 if new.fiyat<old.fiyat and new.para_birimi=old.para_birimi then
  perform private.bildir(f.kullanici_id,'fiyat_degisti',jsonb_build_object('ilan_id',new.id,'fiyat',new.fiyat,'para_birimi',new.para_birimi)) from public.favoriler f where f.ilan_id=new.id and f.fiyat_takibi;
 end if;
 return new;
end $$;

create function private.rapor_sahibi() returns trigger language plpgsql security definer set search_path='' as $$
declare u uuid;
begin
 select kullanici_id into u from public.ilanlar where id=new.ilan_id;
 if split_part(new.dosya,'/',1)<>u::text or not exists(select 1 from storage.objects where bucket_id='ekspertiz' and name=new.dosya) then raise exception 'Rapor dosyası ilan sahibine ait olmalı'; end if;
 return new;
end $$;
create trigger rapor_sahibi before insert or update on public.ilan_ekspertiz for each row execute function private.rapor_sahibi();

create or replace function private.satici(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'ad',p.ad,'telefon',case when p.telefon_goster then p.telefon end,
 'yanit',round((select avg(ilk_yanit) from public.konusmalar where satici_id=p.id)),
 'firma',(select to_jsonb(f) from public.firmalar f where f.kullanici_id=p.id))
 from public.profil p where p.id=p_id and (p.id=auth.uid() or private.admin()
 or exists(select 1 from public.ilanlar i where i.kullanici_id=p.id and not i.gizli and ((i.durum='yayinda' and i.bitis>now()) or (i.durum='satildi' and i.satilma>now()-interval '7 days')))
 or exists(select 1 from public.firmalar f where f.kullanici_id=p.id)
 or exists(select 1 from public.konusmalar k where auth.uid() in(k.alici_id,k.satici_id) and p.id in(k.alici_id,k.satici_id)))
$$;
create or replace function private.ilan_durum(p_no bigint) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',id,'no',no,'durum',case when gizli then 'kaldirildi' else durum end)
 from public.ilanlar where no=p_no and (kullanici_id=auth.uid() or private.admin()
 or (yayin is not null and durum in ('yayinda','satildi','kaldirildi','suresi_doldu','arsiv')))
$$;

update storage.buckets set public=false,file_size_limit=5242880,allowed_mime_types=array['application/pdf','image/jpeg','image/png'] where id='dekontlar';
update storage.buckets set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf','image/jpeg','image/png'] where id='ekspertiz';
update storage.buckets set public=true,file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='ilanlar';
update storage.buckets set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='firmalar';

revoke execute on function private.mesaj_sinir(),private.sikayet_hedef(),private.arama_dogrula(),private.rapor_sahibi() from public,anon,authenticated;
commit;
