-- 未寄出的信 v1：匿名留言、獨立讀者數與留言人數
-- 必須在 Supabase SQL Editor 執行；先確認 setup.sql / v2-migration.sql 已套用。
-- 本檔不含任何金鑰。讀取與留言均以登入的匿名 auth.uid() 計算，非真正的自然人人數。
-- 先在測試環境驗證後，再於正式 Supabase 專案套用。
begin;

create table if not exists public.letter_reads (
  letter_id uuid not null references public.letters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (letter_id, user_id)
);

create table if not exists public.letter_comments (
  id bigint generated always as identity primary key,
  letter_id uuid not null references public.letters(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null default '匿名夥伴' check (char_length(btrim(nickname)) between 1 and 20),
  body text not null check (char_length(btrim(body)) between 1 and 180),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_letter_comments_public_recent
  on public.letter_comments (letter_id, created_at desc) where is_hidden = false;
create index if not exists idx_letter_comments_author_recent
  on public.letter_comments (author_id, created_at desc);

alter table public.letter_reads enable row level security;
alter table public.letter_comments enable row level security;

drop policy if exists letter_reads_insert_own on public.letter_reads;
create policy letter_reads_insert_own on public.letter_reads
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.letters l
      where l.id = letter_id and l.is_hidden = false
    )
  );
-- 不提供讀取其他人 read rows 的政策，統計僅透過安全函式公開。

drop policy if exists letter_comments_read_visible on public.letter_comments;
create policy letter_comments_read_visible on public.letter_comments
  for select to authenticated using (
    is_hidden = false
    and exists (
      select 1 from public.letters l
      where l.id = letter_id and l.is_hidden = false
    )
  );

drop policy if exists letter_comments_insert_own on public.letter_comments;
create policy letter_comments_insert_own on public.letter_comments
  for insert to authenticated with check (
    author_id = (select auth.uid())
    and is_hidden = false
    and exists (
      select 1 from public.letters l
      where l.id = letter_id and l.is_hidden = false
    )
  );

-- 降低洗版風險：同一匿名帳號的留言間隔 >= 30 秒，每 24 小時最多 30 則。
create or replace function public.limit_letter_comments()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.letter_comments c
    where c.author_id = new.author_id
      and c.created_at > now() - interval '30 seconds'
  ) then
    raise exception '留言太頻繁，請於 30 秒後再試';
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
drop trigger if exists enforce_letter_comment_limit on public.letter_comments;
create trigger enforce_letter_comment_limit
  before insert on public.letter_comments
  for each row execute function public.limit_letter_comments();

-- 讀信只記一次：記錄 UUID，但不向其他前端訪客揭露。
create or replace function public.mark_letter_read(p_letter_id uuid)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '需要登入';
  end if;
  if not exists (select 1 from public.letters l
    where l.id = p_letter_id and l.is_hidden = false) then
    raise exception '信件不存在';
  end if;
  insert into public.letter_reads (letter_id,user_id)
    values (p_letter_id,auth.uid())
    on conflict (letter_id,user_id) do nothing;
end;
$$;

-- 只暴露聚合數字，絕不向訪客傳回誰讀過或誰留言的 UUID。
create or replace function public.letter_engagement_stats(p_letter_ids uuid[])
returns table (
  letter_id uuid,
  read_count bigint,
  comment_people bigint,
  comment_count bigint
)
language sql stable security definer
set search_path = public
as $$
  with ids as (
    select distinct s.id
    from unnest(coalesce(p_letter_ids, array[]::uuid[])) as ids_input(id)
    join public.letters s on s.id = ids_input.id
    where s.is_hidden = false
    limit 100
  )
  select ids.id,
    (select count(*) from public.letter_reads r where r.letter_id = ids.id)::bigint,
    (select count(distinct c.author_id) from public.letter_comments c
      where c.letter_id = ids.id and c.is_hidden = false)::bigint,
    (select count(*) from public.letter_comments c
      where c.letter_id = ids.id and c.is_hidden = false)::bigint
  from ids;
$$;

-- 前端只能取得留言的文字與匿名暱稱；不包含 author_id。
revoke all on public.letter_reads from anon,authenticated;
revoke all on public.letter_comments from anon,authenticated;
grant select (id,letter_id,nickname,body,created_at) on public.letter_comments to authenticated;
grant insert (letter_id,author_id,nickname,body) on public.letter_comments to authenticated;
grant usage on sequence public.letter_comments_id_seq to authenticated;
revoke all on function public.mark_letter_read(uuid) from public;
revoke all on function public.letter_engagement_stats(uuid[]) from public;
revoke all on function public.limit_letter_comments() from public;
grant execute on function public.mark_letter_read(uuid) to authenticated;
grant execute on function public.letter_engagement_stats(uuid[]) to authenticated;

commit;
