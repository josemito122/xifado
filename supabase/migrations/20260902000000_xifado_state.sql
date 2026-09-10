-- Desafio Xifado — banco central Supabase
-- Execute no SQL Editor do projeto correto.
-- O backend usa SUPABASE_SERVICE_ROLE_KEY exclusivamente no servidor.
-- Não coloque essa chave no frontend, no GitHub ou em VITE_*.

create table if not exists public.xifado_state (
  id integer primary key check (id = 1),
  payload jsonb not null default '{}'::jsonb,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.xifado_state add column if not exists version bigint not null default 1;
alter table public.xifado_state drop constraint if exists xifado_state_version_positive;
alter table public.xifado_state add constraint xifado_state_version_positive check (version > 0);

create or replace function public.xifado_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as 'begin
  new.updated_at = timezone(''utc'', now());
  return new;
end;';

drop trigger if exists xifado_state_set_updated_at on public.xifado_state;
create trigger xifado_state_set_updated_at
before update on public.xifado_state
for each row execute function public.xifado_set_updated_at();

-- O navegador não acessa esta tabela diretamente. Todas as mutações passam
-- pelas procedures tRPC do backend, que validam o código mestre/senha individual.
alter table public.xifado_state enable row level security;
alter table public.xifado_state force row level security;
revoke all on table public.xifado_state from anon, authenticated;
grant all on table public.xifado_state to service_role;

-- Habilita mudanças da linha central para Realtime/observabilidade futura.
do 'begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = ''supabase_realtime''
      and schemaname = ''public''
      and tablename = ''xifado_state''
  ) then
    alter publication supabase_realtime add table public.xifado_state;
  end if;
exception when undefined_object then null;
end;';

-- Verificações seguras, sem exibir credenciais:
select n.nspname as schemaname,
       c.relname as tablename,
       c.relrowsecurity as rowsecurity,
       c.relforcerowsecurity as forcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'xifado_state';

select id, jsonb_typeof(payload) as payload_type, updated_at
from public.xifado_state
order by id;
