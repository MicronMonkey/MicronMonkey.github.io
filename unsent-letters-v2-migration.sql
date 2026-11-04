-- Unsent Letters v2: run only after unsent-letters-setup.sql
-- Adds optional broad work-context labels and a safe public aggregate.
alter table public.letters
  add column if not exists region text,
  add column if not exists worktype text,
  add column if not exists tenure text;

-- An optional context tag is publicly visible. Use coarse categories only.
alter table public.letters
  drop constraint if exists letters_region_safe;
alter table public.letters
  add constraint letters_region_safe
    check (region is null or region in ('台中','桃園','新竹','台南','其他地區'));

alter table public.letters
  drop constraint if exists letters_worktype_safe;
alter table public.letters
  add constraint letters_worktype_safe
    check (worktype is null or worktype in ('製程相關','設備相關','製造相關','工程支援','行政支援','其他職務'));

alter table public.letters
  drop constraint if exists letters_tenure_safe;
alter table public.letters
  add constraint letters_tenure_safe
    check (tenure is null or tenure in ('未滿 3 年','3～5 年','6～10 年','10 年以上'));

alter table public.letters
  drop constraint if exists letters_context_max_two;
alter table public.letters
  add constraint letters_context_max_two
    check (((region is not null)::int + (worktype is not null)::int + (tenure is not null)::int) <= 2);

-- Allow client to read and submit only visible, approved public columns.
grant select (region, worktype, tenure) on public.letters to authenticated;
grant insert (region, worktype, tenure) on public.letters to authenticated;

-- A public total for hearts on non-hidden letters: no author/user IDs exposed.
create or replace function public.public_letter_heart_total()
returns bigint
language sql stable security definer
set search_path = public
as $$
  select coalesce(sum(likes_count),0)::bigint
  from public.letters where is_hidden = false;
$$;
revoke all on function public.public_letter_heart_total() from public;
grant execute on function public.public_letter_heart_total() to authenticated;

-- Note: the website preview still has blank Supabase config values.
-- No public posting/likes will sync until a project is configured,
-- anonymous sign-ins are enabled and both SQL files are applied.
