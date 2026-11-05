-- 在 Unsent Letters 專案的 Supabase SQL Editor 執行整份 SQL。
-- 更新地區可選值；保留 RLS、欄位權限與背景最多兩項的限制。
begin;
alter table public.letters drop constraint if exists letters_region_safe;
alter table public.letters add constraint letters_region_safe
  check (region is null or region in ('台北','桃園','新竹','銅鑼','台中','台南','其他地區'));
commit;
