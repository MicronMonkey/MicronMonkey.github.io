-- 未寄出的信 v1：為「執行此 migration 之前」已存在的信件建立一次性歷史閱讀基準。
-- 起始值是估算（依現有共鳴數 2.00 ~ 3.00 倍），不代表已驗證的獨立讀者。
-- 新信的歷史基準為 0；後續真實的匿名帳號閱讀只記一次並累加。
-- 可重跑：已補值的信件不會重新計算，按讚變動也不影響基準。
-- 在 Supabase SQL Editor 執行。先確定 unsent-letters-v1-interactions.sql 已執行。
begin;

alter table public.letters
  add column if not exists historical_read_baseline integer;

update public.letters
set historical_read_baseline = greatest(
  1,
  floor(
    greatest(0, likes_count) * (
      2.0 + (abs(hashtext(id::text)::bigint) % 101) / 100.0
    )
  )::integer
)
where historical_read_baseline is null;

alter table public.letters
  alter column historical_read_baseline set default 0;

alter table public.letters
  alter column historical_read_baseline set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'historical_read_baseline_nonnegative'
      and conrelid = 'public.letters'::regclass
  ) then
    alter table public.letters
      add constraint historical_read_baseline_nonnegative
      check (historical_read_baseline >= 0);
  end if;
end;
$$;

-- Keep the existing RPC interface (read_count, comment_people, comment_count).
-- read_count means recorded unique anonymous accounts + fixed historical estimate.
-- The historical estimate is never inserted into letter_reads or presented as unique people.
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
    select distinct s.id, s.historical_read_baseline
    from unnest(coalesce(p_letter_ids, array[]::uuid[])) as ids_input(id)
    join public.letters s on s.id = ids_input.id
    where s.is_hidden = false
    limit 100
  )
  select ids.id,
    (ids.historical_read_baseline::bigint +
      (select count(*) from public.letter_reads r where r.letter_id = ids.id)::bigint)::bigint,
    (select count(distinct c.author_id) from public.letter_comments c
      where c.letter_id = ids.id and c.is_hidden = false)::bigint,
    (select count(*) from public.letter_comments c
      where c.letter_id = ids.id and c.is_hidden = false)::bigint
  from ids;
$$;

revoke all on function public.letter_engagement_stats(uuid[]) from public;
grant execute on function public.letter_engagement_stats(uuid[]) to authenticated;
commit;

-- Optional verification (run separately):
-- select title, likes_count, historical_read_baseline, created_at
-- from public.letters order by created_at desc limit 30;
