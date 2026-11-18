-- MicronMonkey action reporting (RBA and Ministry of Economic Affairs)
-- Run once in Supabase Dashboard > SQL Editor.
-- Counts are self-reported, not official confirmations.
create table if not exists public.action_reports (
  id bigint generated always as identity primary key,
  action_type text not null check (action_type in ('rba', 'moea')),
  visitor_token uuid not null,
  reported_at timestamptz not null default now(),
  unique(action_type, visitor_token)
);

alter table public.action_reports enable row level security;
revoke all on public.action_reports from anon, authenticated;
-- Do not add direct public INSERT or SELECT policies; RPC is the only public entrypoint.

create or replace function public.submit_action_report(
  p_action_type text,
  p_visitor_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer;
begin
  if p_action_type not in ('rba','moea') or p_action_type is null then
    raise exception 'Unsupported action';
  end if;
  if p_visitor_token is null then
    raise exception 'Missing visitor token';
  end if;

  insert into public.action_reports (action_type, visitor_token)
    values (p_action_type, p_visitor_token)
  on conflict (action_type, visitor_token) do nothing;

  get diagnostics v_inserted = row_count;
  return jsonb_build_object('ok', true, 'new_report', v_inserted = 1);
end
$$;

create or replace function public.get_action_report_counts()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'rba', count(*) filter (where action_type = 'rba'),
    'moea', count(*) filter (where action_type = 'moea')
  )
  from public.action_reports;
$$;

revoke all on function public.submit_action_report(text,uuid) from public;
revoke all on function public.get_action_report_counts() from public;
grant execute on function public.submit_action_report(text,uuid) to anon, authenticated;
grant execute on function public.get_action_report_counts() to anon, authenticated;
comment on table public.action_reports is 'Opt-in self reports, not official delivery confirmations. Visitor token is pseudonymous and stored only for duplicate prevention.';
