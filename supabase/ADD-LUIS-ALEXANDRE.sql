-- XIFADO: adicionar/garantir Luis e Alexandre sem apagar o estado existente.
-- As senhas NÃO ficam em texto puro; abaixo estão somente hashes scrypt.

-- Luis: senha solicitada pelo administrador.
-- Alexandre: senha solicitada pelo administrador.
insert into public.xifado_credentials (name, password_hash)
values
  ('Luis', 'scrypt$c2486681fddd3417892d4323b055afa8$4183ad5d4e3537442b1722b9929e17040ed041110a22b51fabbc63f60de4253679dad2c3c419280ac036e972d021aa1c7bd6391b57c9d4ae6b3cc6eb7a46bff1'),
  ('Alexandre', 'scrypt$af20cee3652eb631b250b0ce0e093d74$b2f3541d334ca9a2b59a8a3f3d367f91c97d04e0e4f5a2257aa0084410486ccd31159620a23a747e74b8abfcd4c2ba356b1c3f491fb6a4590b7f2d3ab852bf11')
on conflict (name) do update
set password_hash = excluded.password_hash,
    updated_at = timezone('utc', now());

-- Garante que os dois participantes existam e estejam ativos.
-- Se já existirem, preserva o histórico de perdas e apenas reativa o cadastro.
do $$
declare
  current_payload jsonb;
  members jsonb;
  old_member jsonb;
  next_version integer;
begin
  select payload into current_payload
  from public.xifado_state
  where id = 1
  for update;

  if current_payload is null then
    raise exception 'xifado_state id=1 não encontrado';
  end if;

  members := coalesce(current_payload->'members', '{}'::jsonb);

  -- Luis
  old_member := coalesce(members->'Luis', '{}'::jsonb);
  next_version := greatest(coalesce((old_member->>'sessionVersion')::integer, 0) + 1, 1);
  members := jsonb_set(
    members,
    '{Luis}',
    old_member || jsonb_build_object(
      'eliminated', false,
      'timestamp', null,
      'reason', '',
      'rank', null,
      'duration', null,
      'sessionVersion', next_version,
      'active', true,
      'removedAt', null,
      'removedBy', null,
      'lossHistory', coalesce(old_member->'lossHistory', '[]'::jsonb)
    ),
    true
  );

  -- Alexandre
  old_member := coalesce(members->'Alexandre', '{}'::jsonb);
  next_version := greatest(coalesce((old_member->>'sessionVersion')::integer, 0) + 1, 1);
  members := jsonb_set(
    members,
    '{Alexandre}',
    old_member || jsonb_build_object(
      'eliminated', false,
      'timestamp', null,
      'reason', '',
      'rank', null,
      'duration', null,
      'sessionVersion', next_version,
      'active', true,
      'removedAt', null,
      'removedBy', null,
      'lossHistory', coalesce(old_member->'lossHistory', '[]'::jsonb)
    ),
    true
  );

  update public.xifado_state
  set payload = jsonb_set(current_payload, '{members}', members, true),
      version = version + 1,
      updated_at = timezone('utc', now())
  where id = 1;
end $$;

-- Verificação
select name
from public.xifado_credentials
where lower(trim(name)) in ('luis', 'alexandre')
order by name;

select
  key as nome,
  value->>'active' as ativo,
  value->>'sessionVersion' as session_version
from jsonb_each(
  coalesce(
    (select payload->'members' from public.xifado_state where id = 1),
    '{}'::jsonb
  )
)
where lower(trim(key)) in ('luis', 'alexandre')
order by key;
