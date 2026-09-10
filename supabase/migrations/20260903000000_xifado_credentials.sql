-- Credenciais do Xifado: somente hashes, nunca senhas em texto aberto.
create table if not exists public.xifado_credentials (
  name text primary key check (length(name) between 1 and 80),
  password_hash text not null check (password_hash like 'scrypt$%'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.xifado_credentials_set_updated_at()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists xifado_credentials_set_updated_at on public.xifado_credentials;
create trigger xifado_credentials_set_updated_at
before update on public.xifado_credentials
for each row execute function public.xifado_credentials_set_updated_at();

alter table public.xifado_credentials enable row level security;
alter table public.xifado_credentials force row level security;
revoke all on table public.xifado_credentials from public, anon, authenticated;
grant all on table public.xifado_credentials to service_role;
revoke all on function public.xifado_credentials_set_updated_at() from public, anon, authenticated;
