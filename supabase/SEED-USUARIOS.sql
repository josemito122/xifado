-- XIFADO: credenciais iniciais dos participantes.
-- As senhas em texto puro NÃO são armazenadas; somente hashes scrypt.
-- Execute este arquivo UMA vez no SQL Editor do Supabase.

insert into public.xifado_credentials (name, password_hash)
values
  ('Cadu', 'scrypt$2f37ec4b9ee88716273881d00aaf37b9$a198976e6f3767febe09bcef69c612d8002fded0ec42cd5358e67cabe1b33a0170048a985c78eb78891229511fafddbf08619e1278f5d8fd720335629b6f83a2'),
  ('Dudu', 'scrypt$a19c2a203af98358cb507e01d153cc86$556942272631d38ce463c1f826b5215f8aa122566e98eb3a506fb35206d07ae8da8b5041c26d6c82da1077dd5715158259e97457cd9e3688617f1ac35ab4e1ee'),
  ('Luis', 'scrypt$e4886f32d41b11f2a08ff9cf3d148c82$7da14eed85f36bed1e6f77d98c0494197e912c149d4d1adf145ab198e8baacb65bdd2e32f4013c03dcd1c3dde607487a5a02283f0c9efac47fc275088202a579'),
  ('Kauan', 'scrypt$679db25d0b2f0f157eb6fcd0c2314e32$080eed3e8d74e61d6d98da699abdb64618decf6ac3166b562d145d2f14d31617a01fdff3cc4b73829c1aac130ce6c81a0cca386ecd37a776510e2251c30b4f84'),
  ('Felipe', 'scrypt$cf42d34558b176437fb2d2e9da411dfd$1ac3e40475f4e65b64602aede410b36eac773c5be39ea3486150d570967e0576260691fc8253b039d169371a0a21f1154234ea06c0fd4a1f7d1f4532ff3bd271'),
  ('Rafael', 'scrypt$69dce5a364f31cb65aeacc88cb5eef8e$ef241653be2af735407880e60c101af0e505218b86ae52655ff814ae0a446011e15a3c698c23130e32f337cb2039e6f3aae882974aaa01b07daedb531d9f6e98'),
  ('Victor', 'scrypt$b611b0d360167791cf40dbb3904709f6$2893d56de0a928f6655d3b3df1fb50fb01e242bb2be633cfd24f09f41c486e7a386422e661eea01c282351c6be21b53371cd10fe1d81e109e67672cf9d3857df'),
  ('Matheus', 'scrypt$80a9e384d89cdcd8e0c0779d7d34e7ae$f22e03b5008e166491b4d4af01798b81e22fea912cc57e44915ce251cd9a63086a0f8a1ff6090da3fcd62bfa195871f4a00a24c9378a3cfd459ef75d0c561de3'),
  ('Expedito', 'scrypt$4814c32491f3b04cae248200c3f83695$e9ba2faaf1ab730e7585e6a9e2494c73d24fdb313785416147e5d34762668a5f39d6155218314b03a2f9f0e744d29b7001f965188c744b1bcddee9c85ef7136e'),
  ('Fabrício', 'scrypt$916ed91dbe3289752d4eb6268f3489d4$105761941857b6fbedf040cacead27ba84bca55ec9276458ea6586023a2874e69e2d4e048822612d8be64d6ab4e79e742e20698dd528238bd504495cf3eed0a5'),
  ('Guilherme', 'scrypt$9b3cdbd86f6fe370dd646c716873589a$c420a1ba612131c8674a37c78e90a077f2b3e526a54b12968485c83f06c54c931457b42f0a67d90bb974c7238fd79f43a8467bfb1a8aac723bb89a620839dadc'),
  ('Ruan Araujo', 'scrypt$5b5a19840032990b2571bd682460a7cb$c0f8b88ff80d1553871a3e01c1606dada1461a77e9db4a564c3b6b6aa6aa6937cb6a0cbeee941ea2e043aad69af9c2692e5ba24666e057373d082755ca3134d1'),
  ('Ruan Carlos', 'scrypt$99902ed8a9412ff69089903da059bde2$0816440bdb40c5f8727a495f28dae10775578201ac1445c8412e74cf65363cb9b7c77619de32639e0695eeec67f718ed7b9f6ef2201a8e3325f44608136eb0ce')
on conflict (name) do nothing;

-- Garante que cada credencial tenha um participante ativo no estado.
do $$
declare
  r record;
  current_members jsonb;
  member_value jsonb := jsonb_build_object(
    'eliminated', false,
    'timestamp', null,
    'reason', '',
    'rank', null,
    'duration', null,
    'sessionVersion', 1,
    'active', true,
    'removedAt', null,
    'removedBy', null,
    'lossHistory', '[]'::jsonb
  );
begin
  select coalesce(payload->'members', '{}'::jsonb) into current_members
  from public.xifado_state
  where id = 1;

  if current_members is null then
    current_members := '{}'::jsonb;
  end if;

  for r in select name from public.xifado_credentials loop
    if not (current_members ? r.name) then
      current_members := current_members || jsonb_build_object(r.name, member_value);
    end if;
  end loop;

  if exists (select 1 from public.xifado_state where id = 1) then
    update public.xifado_state
      set payload = jsonb_set(payload, '{members}', current_members, true),
          updated_at = timezone('utc', now())
    where id = 1;
  end if;
end $$;

select name
from public.xifado_credentials
where name in ('Cadu','Dudu','Luis','Kauan','Felipe','Rafael','Victor','Matheus','Expedito','Fabrício','Guilherme','Ruan Araujo','Ruan Carlos')
order by name;
