begin;
create extension if not exists pg_net;
alter table private.eposta_kuyrugu add column istek_id bigint;
alter table private.eposta_kuyrugu add column son_deneme timestamptz;
create function private.eposta_gonder() returns void language plpgsql security definer set search_path='' as $$
declare k record; cevap record; api text; anahtar text; gonderen text; istek bigint; baslik text; metin text;
begin
 select decrypted_secret into api from vault.decrypted_secrets where name='beta_mail_url' limit 1;
 select decrypted_secret into anahtar from vault.decrypted_secrets where name='beta_mail_key' limit 1;
 select decrypted_secret into gonderen from vault.decrypted_secrets where name='beta_mail_from' limit 1;
 if api is null or anahtar is null or gonderen is null then return; end if;
 if api not like 'https://%' then raise exception 'E-posta API adresi HTTPS olmalı'; end if;
 for k in select * from private.eposta_kuyrugu where durum='gonderiliyor' and son_deneme<now()-interval '1 minute' for update skip locked loop
  select * into cevap from net._http_response where id=k.istek_id;
  if found and cevap.status_code between 200 and 299 then update private.eposta_kuyrugu set durum='gonderildi' where id=k.id;
  elsif found or k.son_deneme<now()-interval '10 minutes' then update private.eposta_kuyrugu set durum=case when deneme>=5 then 'hata' else 'beklemede' end where id=k.id;end if;
 end loop;
 for k in select q.*,u.email,b.tur,b.veri from private.eposta_kuyrugu q join auth.users u on u.id=q.kullanici_id join public.profil p on p.id=u.id join public.bildirimler b on b.id=q.bildirim_id where q.durum='beklemede' and q.deneme<5 and p.eposta_ozet and u.email_confirmed_at is not null and (q.son_deneme is null or q.son_deneme<now()-interval '10 minutes') order by q.olusturma limit 20 for update of q skip locked loop
  baslik:=case k.tur when 'paket_talebi' then 'Paket talebiniz güncellendi' when 'paket_bitiyor' then 'Paket süreniz bitiyor' when 'paket_bitti' then 'Paket süreniz bitti' when 'fiyat_degisti' then 'Takip ettiğiniz ilanın fiyatı değişti' when 'arama_eslesmesi' then 'Kayıtlı aramanıza uygun yeni ilan' when 'ilan_bitiyor' then 'İlan süreniz bitiyor' when 'yeni_mesaj' then 'Yeni mesajınız var' else 'Hesabınızda yeni bildirim' end;
  metin:=baslik||E'\n\nAyrıntıları KONTAK hesabınızdaki Bildirimler ekranından inceleyin.'||E'\n\nKONTAK hiçbir zaman mesajla IBAN istemez; paket ödeme bilgisi yalnızca Hesabım > Paketlerim ekranında görünür.';
  select net.http_post(url:=api,headers:=jsonb_build_object('Authorization','Bearer '||anahtar,'Content-Type','application/json','Idempotency-Key','bc-'||k.id::text),body:=jsonb_build_object('from',gonderen,'to',jsonb_build_array(k.email),'subject','KONTAK · '||baslik,'text',metin),timeout_milliseconds:=10000) into istek;
  update private.eposta_kuyrugu set istek_id=istek,durum='gonderiliyor',deneme=deneme+1,son_deneme=now() where id=k.id;
 end loop;
 delete from private.eposta_kuyrugu where durum='gonderildi' and olusturma<now()-interval '90 days';
end $$;
revoke execute on function private.eposta_gonder() from public,anon,authenticated;
select cron.schedule('beta-car-eposta','*/2 * * * *','select private.eposta_gonder()');
commit;
