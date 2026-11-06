-- 《未寄出的信》正式資料庫更新：每個匿名帳號最近 24 小時最多 5 封新信；兩封至少間隔 30 秒。
-- Supabase Dashboard > SQL Editor 執行一次；不修改既有投稿資料。
-- 兩種歷史版本的 trigger function 都更新，避免舊 trigger 仍套用舊限制。

create or replace function public.limit_letter_posts()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.letters l
    where l.author_id = new.author_id
      and l.created_at > now() - interval '30 seconds'
  ) then
    raise exception '每封信至少間隔 30 秒，請稍後再投稿';
  end if;
  if (
    select count(*) from public.letters l
    where l.author_id = new.author_id
      and l.created_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception '每 24 小時最多投稿 5 封信，請稍後再試';
  end if;
  return new;
end;
$$;

create or replace function public.limit_letter_posting()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.letters l
    where l.author_id = new.author_id
      and l.created_at > now() - interval '30 seconds'
  ) then
    raise exception '每封信至少間隔 30 秒，請稍後再投稿';
  end if;
  if (
    select count(*) from public.letters l
    where l.author_id = new.author_id
      and l.created_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception '每 24 小時最多投稿 5 封信，請稍後再試';
  end if;
  return new;
end;
$$;
