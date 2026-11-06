-- Unsent Letters / 光光猴「未寄出的信」
-- 在 Supabase SQL Editor 執行。執行前請先確認使用正確的 Supabase 專案。
-- 使用 Supabase Auth -> Anonymous Sign-Ins (匿名登入)，前端不要求填 Email。
-- 匿名登入不同於完全不可追蹤；平台仍可能記錄 IP / 稽核日誌。
-- 免事前審核，但須有人處理檢舉及必要的下架。
create extension if not exists pgcrypto;

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('a','b','c','d')),
  title text not null check (char_length(btrim(title)) between 3 and 40),
  body text not null check (char_length(btrim(body)) between 15 and 1200),
  nickname text not null default '匿名來信' check (char_length(nickname) between 1 and 20),
  likes_count integer not null default 0 check (likes_count >= 0),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists letters_created_idx on public.letters(created_at desc);
create index if not exists letters_category_created_idx on public.letters(category,created_at desc);
create index if not exists letters_popular_idx on public.letters(likes_count desc,created_at desc);

create table if not exists public.letter_likes (
  letter_id uuid not null references public.letters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(letter_id,user_id)
);
create index if not exists letter_likes_user_idx on public.letter_likes(user_id);

create table if not exists public.letter_reports (
  letter_id uuid not null references public.letters(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('personal_data','harassment','spam','other')),
  created_at timestamptz not null default now(),
  primary key(letter_id,reporter_id)
);
create index if not exists letter_reports_created_idx on public.letter_reports(created_at desc);

alter table public.letters enable row level security;
alter table public.letter_likes enable row level security;
alter table public.letter_reports enable row level security;

-- 最小權限：一般訪客只能讀取可見信件、建立自己的信件、操作自己的愛心和檢舉。
revoke all on public.letters from anon,authenticated;
revoke all on public.letter_likes from anon,authenticated;
revoke all on public.letter_reports from anon,authenticated;
grant usage on schema public to authenticated;
grant select (id,category,title,body,nickname,likes_count,is_hidden,created_at) on public.letters to authenticated;
grant insert (author_id,category,title,body,nickname) on public.letters to authenticated;
grant select (letter_id,user_id,created_at) on public.letter_likes to authenticated;
grant insert (letter_id,user_id) on public.letter_likes to authenticated;
grant delete on public.letter_likes to authenticated;
grant insert (letter_id,reporter_id,reason) on public.letter_reports to authenticated;

drop policy if exists "read visible letters" on public.letters;
create policy "read visible letters" on public.letters
  for select to authenticated using (is_hidden = false);
drop policy if exists "insert own letter" on public.letters;
create policy "insert own letter" on public.letters
  for insert to authenticated with check (author_id = (select auth.uid()));

drop policy if exists "read own likes" on public.letter_likes;
create policy "read own likes" on public.letter_likes
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "add own likes" on public.letter_likes;
create policy "add own likes" on public.letter_likes
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "remove own likes" on public.letter_likes;
create policy "remove own likes" on public.letter_likes
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "report as self" on public.letter_reports;
create policy "report as self" on public.letter_reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));

-- 由資料庫維護愛心計數。一般訪客無法直接修改 likes_count。
create or replace function public.sync_letter_likes()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.letters set likes_count =
    (select count(*)::integer from public.letter_likes where letter_id = coalesce(new.letter_id,old.letter_id))
    where id = coalesce(new.letter_id,old.letter_id);
  return null;
end;
$$;
drop trigger if exists sync_letter_likes_trigger on public.letter_likes;
create trigger sync_letter_likes_trigger after insert or delete on public.letter_likes
for each row execute function public.sync_letter_likes();

-- 每個匿名登入身分每 30 秒最多投稿一封。
-- 注意：換裝置/清除匿名身分仍可能繞過，正式公開前應加入 CAPTCHA/WAF 與後台告警。
create or replace function public.limit_letter_posting()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if exists (
    select 1 from public.letters
    where author_id = new.author_id and created_at > now() - interval '30 seconds'
  ) then
    raise exception '請至少間隔 30 秒再投稿';
  end if;
  return new;
end;
$$;
drop trigger if exists limit_letter_posting_trigger on public.letters;
create trigger limit_letter_posting_trigger before insert on public.letters
for each row execute function public.limit_letter_posting();

-- 管理員下架方式（在 Supabase SQL Editor 執行；替換 UUID）：
-- update public.letters set is_hidden = true where id = 'LETTER_UUID';
-- 檢視待處理檢舉（只於管理員後台執行）：
-- select letter_id,reason,count(*) from public.letter_reports group by letter_id,reason order by count(*) desc;
