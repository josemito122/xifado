# Desafio Xifado Online

Aplicação full-stack do desafio Xifado, com estado centralizado no Supabase, API tRPC server-side, sessões assinadas, rate limiting, health check e interface responsiva.

## Configuração

Execute `supabase/xifado.sql` no SQL Editor do projeto Supabase antes do primeiro uso; ele é a fonte oficial para instalação manual e é idempotente. Para migrations versionadas, aplique primeiro `supabase/migrations/20260902000000_xifado_state.sql` e depois `supabase/
migrations/20260902000001_xifado_security_history.sql`. O schema mantém RLS restritiva e cria as tabelas de eventos/auditoria. Na Vercel, configure `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `JWT_SECRET` e `XIFADO_MASTER_CODE` como variáveis protegidas do servidor. Não use nenhuma delas com prefixo `VITE_` e não versione arquivos `.env`.

Consulte `CONFIGURACAO-ENV.md` e `SECURITY.md` para a separação de ambientes, rotação de segredos e checklist. Importe o repositório no GitHub, conecte-o à Vercel e use o comando `pnpm run build` definido no `package.json`.

As sessões do participante e do mestre usam cookies HttpOnly, Secure e SameSite=Lax. O logout limpa o cookie no servidor, e a remoção ou troca de credencial revoga a sessão pelo `sessionVersion`.

## Verificação local

Use `pnpm run check`, `pnpm test` e `pnpm run build`. O endpoint `GET /api/health` deve responder HTTP 200. O estado público é servido por `xifado.state`; mutações administrativas exigem sessão assinada do mestre.
