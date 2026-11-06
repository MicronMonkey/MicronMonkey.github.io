-- 未寄出的信 V1 | 留言打氣 + 不重複讀者數
-- 請先完成 unsent-letters-setup.sql 與 unsent-letters-v2-migration.sql。
-- 在 Supabase Dashboard → SQL Editor 執行本檔；不要把 service_role key 放在網頁內。
-- 閱讀人數以同一匿名 Supabase 帳號在同一封信的首次閱讀計算，不代表真實身分。
-- 清除瀏覽器資料／換裝置可產生新匿名帳號。

alter table public.letters
  add column if not exists comments_count integer not null default 0;
alter table public.letters
  add column if not exists reads_count integer not null default 0;
grant select (comments_count, reads_count) on public.letters to authenticated;

create table if not exists public.letter_comments (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references public.letters(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null default '匿名夥伴'
    check (char_length(btrim(nickname)) between 1 and 20),
  body text not null
    check (char_length(btrim(body)) between 1 and 200),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_letter_comments_active
on public.letter_comments (letter_id, created_at desc)
where is_hidden = false;

create table if not exists public.letter_reads (
  letter_id uuid not null references public.letters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (letter_id, user_id)
);

alter table public.letter_comments enable row level security;
alter table public.letter_reads enable row level security;

drop policy if exists comment_read_visible on public.letter_comments;
create policy comment_read_visible on public.letter_comments
for select to authenticated
using (
  is_hidden = false and exists (
    select 1 from public.letters l
    where l.id = letter_id and l.is_hidden = false
  )
);
drop policy if exists comment_write_own on public.letter_comments;
create policy comment_write_own on public.letter_comments
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and is_hidden = false
  and exists (
    select 1 from public.letters l
    where l.id = letter_id and l.is_hidden = false
  )
);

drop policy if exists reads_select_own on public.letter_reads;
create policy reads_select_own on public.letter_reads
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists reads_insert_own on public.letter_reads;
create policy reads_insert_own on public.letter_reads
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.letters l
    where l.id = letter_id and l.is_hidden = false
  )
);

-- 限制洗版：同一匿名登入帳號，留言至少間隔 10 秒、每 24 小時最多 30 則。
create or replace function public.limit_letter_comments()
returns trigger
language plpgsql security definer set search_path = public
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
    raise exception '24 小時最多留言 30 則，請明天再試';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_letter_comment_rate on public.letter_comments;
create trigger enforce_letter_comment_rate
before insert on public.letter_comments
for each row execute function public.limit_letter_comments();

-- 只由資料庫維護公開的可見留言數；隱藏違規留言會扣回。
create or replace function public.update_letter_comment_count()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  letter_target uuid;
  delta integer := 0;
begin
  letter_target := coalesce(new.letter_id, old.letter_id);
  if tg_op = 'INSERT' then
    if not new.is_hidden then delta := 1; end if;
  elsif tg_op = 'DELETE' then
    if not old.is_hidden then delta := -1; end if;
  else
    if old.is_hidden and not new.is_hidden then delta := 1; end if;
    if not old.is_hidden and new.is_hidden then delta := -1; end if;
  end if;
  if delta <> 0 then
    update public.letters
       set comments_count = greatest(0, comments_count + delta)
     where id = letter_target;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists maintain_letter_comment_count on public.letter_comments;
create trigger maintain_letter_comment_count
after insert or delete or update of is_hidden on public.letter_comments
for each row execute function public.update_letter_comment_count();

-- 每位匿名帳號每封信只計算一次閱讀。
create or replace function public.update_letter_read_count()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.letters set reads_count = reads_count + 1 where id = new.letter_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.letters set reads_count = greatest(0, reads_count - 1)
    where id = old.letter_id;
    return old;
  end if;
  return null;
end;
$$;
drop trigger if exists maintain_letter_read_count on public.letter_reads;
create trigger maintain_letter_read_count
after insert or delete on public.letter_reads
for each row execute function public.update_letter_read_count();

-- 舊資料若曾存在，重新核算彙總（重複執行不會累加）。
update public.letters l
   set comments_count = (
     select count(*) from public.letter_comments c
      where c.letter_id = l.id and c.is_hidden = false
   ),
   reads_count = (
     select count(*) from public.letter_reads r
      where r.letter_id = l.id
   );

-- 僅開放安全欄位；匿名投稿者 UUID 不對一般讀者公開。
revoke all on public.letter_comments from anon, authenticated;
revoke all on public.letter_reads from anon, authenticated;
grant select (id, letter_id, nickname, body, created_at)
  on public.letter_comments to authenticated;
grant insert (letter_id, author_id, nickname, body)
  on public.letter_comments to authenticated;
grant select (letter_id, user_id) on public.letter_reads to authenticated;
grant insert (letter_id, user_id) on public.letter_reads to authenticated;
-- 刪除或隱藏留言請由管理員在 Supabase Table Editor 執行。
