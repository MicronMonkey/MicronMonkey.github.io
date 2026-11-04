-- 未寄出的信｜Supabase 資料庫安裝 SQL
-- 在 Supabase Dashboard → SQL Editor 執行。先在 Authentication > Providers > Anonymous Sign-ins 啟用匿名登入。
-- 請先於測試專案部署；本檔不包含任何機密金鑰。
create extension if not exists pgcrypto;

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('a','b','c','d')),
  title text not null check (char_length(btrim(title)) between 3 and 40),
  body text not null check (char_length(btrim(body)) between 15 and 1200),
  nickname text not null default '匿名來信' check (char_length(nickname) between 1 and 20),
  author_id uuid not null references auth.users(id) on delete cascade,
  likes_count integer not null default 0 check (likes_count >= 0),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.letter_likes (
  letter_id uuid not null references public.letters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(letter_id,user_id)
);

create table if not exists public.letter_reports (
  id bigint generated always as identity primary key,
  letter_id uuid not null references public.letters(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('personal_data','harassment','spam','other')),
  created_at timestamptz not null default now(),
  unique(letter_id,reporter_id)
);

create index if not exists idx_letters_visible_new on public.letters(is_hidden,created_at desc);
create index if not exists idx_letters_category on public.letters(category,created_at desc);
create index if not exists idx_reports_created on public.letter_reports(created_at desc);

alter table public.letters enable row level security;
alter table public.letter_likes enable row level security;
alter table public.letter_reports enable row level security;

drop policy if exists letters_read_visible on public.letters;
create policy letters_read_visible on public.letters
for select to authenticated using (is_hidden = false);

drop policy if exists letters_insert_own on public.letters;
create policy letters_insert_own on public.letters
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and likes_count = 0
  and is_hidden = false
  and created_at between now() - interval '1 minute' and now() + interval '1 minute'
);

drop policy if exists likes_read_own on public.letter_likes;
create policy likes_read_own on public.letter_likes
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists likes_add_own on public.letter_likes;
create policy likes_add_own on public.letter_likes
for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists(select 1 from public.letters l where l.id = letter_id and l.is_hidden = false)
);

drop policy if exists likes_remove_own on public.letter_likes;
create policy likes_remove_own on public.letter_likes
for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists reports_insert_own on public.letter_reports;
create policy reports_insert_own on public.letter_reports
for insert to authenticated with check (
  reporter_id = (select auth.uid())
  and exists(select 1 from public.letters l where l.id = letter_id and l.is_hidden = false)
);

-- 觸發器：每名匿名登入使用者 24 小時最多 3 封新信。
-- 注意：使用者可清除瀏覽資料建立新匿名身分，因此此限制不是完整的防機器人方案。
create or replace function public.limit_letter_posts()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if (select count(*) from public.letters l
      where l.author_id = new.author_id
      and l.created_at > now() - interval '24 hours') >= 3 then
    raise exception '每 24 小時最多投稿 3 封信，請稍後再試';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_letter_post_limit on public.letters;
create trigger enforce_letter_post_limit
before insert on public.letters
for each row execute function public.limit_letter_posts();

-- 觸發器：愛心數由 DB 更新，前端不可直接修改。
create or replace function public.sync_letter_like_count()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.letters set likes_count = likes_count + 1 where id = new.letter_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.letters set likes_count = greatest(0, likes_count - 1) where id = old.letter_id;
    return old;
  end if;
  return null;
end;
$$;
drop trigger if exists update_letter_like_count on public.letter_likes;
create trigger update_letter_like_count
after insert or delete on public.letter_likes
for each row execute function public.sync_letter_like_count();

-- 前端使用者的最低權限：不能改文章、不能自行把報告設為已處理，不能修改愛心總數。
revoke all on public.letters from anon, authenticated;
revoke all on public.letter_likes from anon, authenticated;
revoke all on public.letter_reports from anon, authenticated;
grant select, insert on public.letters to authenticated;
grant select, insert, delete on public.letter_likes to authenticated;
grant insert on public.letter_reports to authenticated;
grant usage on sequence public.letter_reports_id_seq to authenticated;

-- 審核不是發文前的必經程序。管理員可於 Supabase Table Editor 將違規信件 is_hidden 設為 true，
-- 並在 letter_reports 表查看檢舉。勿在瀏覽器存放 service_role key。
