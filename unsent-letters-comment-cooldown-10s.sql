-- 未寄出的信：把匿名留言頻率限制從 30 秒調整為 10 秒。
-- 請在 Supabase Dashboard > SQL Editor 執行一次；不需修改現有留言資料。
-- 每 24 小時最多 30 則的限制維持不變。
create or replace function public.limit_letter_comments()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.letter_comments c
    where c.author_id = new.author_id
      and c.created_at > now() - interval '10 seconds'
  ) then
    raise exception '留言太頻繁，請間隔 10 秒再送出';
  end if;
  if (
    select count(*) from public.letter_comments c
    where c.author_id = new.author_id
      and c.created_at > now() - interval '24 hours'
  ) >= 30 then
    raise exception '每 24 小時最多留言 30 則';
  end if;
  return new;
end;
$$;
