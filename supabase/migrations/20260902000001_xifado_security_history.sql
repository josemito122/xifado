-- Desafio Xifado — instalação Supabase backend-only
-- Execute no SQL Editor do projeto correto ou aplique como migration versionada.
-- O servidor usa SUPABASE_SECRET_KEY (a antiga service_role é apenas fallback temporário).
-- Nunca coloque chaves, senhas ou tokens no frontend, GitHub ou em VITE_*.

create table if not exists public.xifado_state (
  id integer primary key check (id = 1),
  payload jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint xifado_state_version_positive check (version > 0)
);
alter table public.xifado_state add column if not exists version bigint not null default 1;
alter table public.xifado_state drop constraint if exists xifado_state_version_positive;
alter table public.xifado_state add constraint xifado_state_version_positive check (version > 0);

create table if not exists public.xifado_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('PARTICIPANT_CREATED','PARTICIPANT_REMOVED','LOSS_DECLARED','PARTICIPANT_REVIVED','PENALTY_CREATED','PENALTY_COMPLETED','PENALTY_UNCOMPLETED','RULE_CREATED','RULE_CHANGED','RULE_REMOVED','SCHEDULE_CHANGED')),
  actor text not null,
  target text,
  occurred_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists xifado_events_occurred_at_idx on public.xifado_events (occurred_at desc);
create index if not exists xifado_events_target_idx on public.xifado_events (target);

create table if not exists public.xifado_rate_limits (
  key text primary key,
  window_started_at timestamptz not null default timezone('utc', now()),
  hit_count integer not null default 0 check (hit_count >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.xifado_rate_limit_check(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public
as $$
declare current_row public.xifado_rate_limits%rowtype;
begin
  insert into public.xifado_rate_limits(key, window_started_at, hit_count, updated_at)
  values (p_key, timezone('utc', now()), 1, timezone('utc', now()))
  on conflict (key) do update set
    hit_count = case when public.xifado_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= timezone('utc', now()) then 1 else public.xifado_rate_limits.hit_count + 1 end,
    window_started_at = case when public.xifado_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= timezone('utc', now()) then timezone('utc', now()) else public.xifado_rate_limits.window_started_at end,
    updated_at = timezone('utc', now())
  returning * into current_row;
  return current_row.hit_count <= p_limit;
end;
$$;
revoke all on function public.xifado_rate_limit_check(text, integer, integer) from public, anon, authenticated;
grant execute on function public.xifado_rate_limit_check(text, integer, integer) to service_role;
alter table public.xifado_rate_limits enable row level security;
alter table public.xifado_rate_limits force row level security;
revoke all on table public.xifado_rate_limits from anon, authenticated;
grant all on table public.xifado_rate_limits to service_role;

create table if not exists public.xifado_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  target text,
  request_id uuid,
  recorded_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists xifado_audit_logs_recorded_at_idx on public.xifado_audit_logs (recorded_at desc);
create index if not exists xifado_audit_logs_request_id_idx on public.xifado_audit_logs (request_id);

create or replace function public.xifado_set_updated_at()
returns trigger language plpgsql security invoker set search_path = public
as 'begin new.updated_at = timezone(''utc'', now()); return new; end;';
drop trigger if exists xifado_state_set_updated_at on public.xifado_state;
create trigger xifado_state_set_updated_at before update on public.xifado_state for each row execute function public.xifado_set_updated_at();

alter table public.xifado_state enable row level security;
alter table public.xifado_state force row level security;
alter table public.xifado_events enable row level security;
alter table public.xifado_events force row level security;
alter table public.xifado_audit_logs enable row level security;
alter table public.xifado_audit_logs force row level security;
revoke all on table public.xifado_state, public.xifado_events, public.xifado_audit_logs from anon, authenticated;
grant all on table public.xifado_state, public.xifado_events, public.xifado_audit_logs to service_role;

do 'begin
  if not exists (select 1 from pg_publication_tables where pubname = ''supabase_realtime'' and schemaname = ''public'' and tablename = ''xifado_state'') then
    alter publication supabase_realtime add table public.xifado_state;
  end if;
exception when undefined_object then null; end;';

-- Verificações seguras; não inserem dados e não exibem credenciais.
select n.nspname as schemaname, c.relname as tablename, c.relrowsecurity as rowsecurity, c.relforcerowsecurity as forcerowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('xifado_state','xifado_events','xifado_audit_logs') order by c.relname;
select id, jsonb_typeof(payload) as payload_type, version, updated_at from public.xifado_state order by id;
