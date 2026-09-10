# Configuração de ambiente

Na Vercel, configure estas variáveis nos ambientes **Development**, **Preview** e **Production** conforme necessário:

| Variável | Uso | Exposição |
|---|---|---|
| `SUPABASE_URL` | URL do projeto Supabase | somente servidor |
| `SUPABASE_SECRET_KEY` | acesso backend ao PostgreSQL via Supabase | somente servidor; nunca `VITE_` |
| `JWT_SECRET` | assinatura de sessões de participante e mestre | somente servidor; não pode faltar |
| `XIFADO_MASTER_CODE` | código usado somente no login mestre | somente servidor |
| `XIFADO_INITIAL_CREDENTIALS` | opcional; JSON temporário para criar credenciais na primeira inicialização vazia; depois remova a variável | somente servidor |

Use valores novos se credenciais antigas tiverem aparecido em commits ou arquivos compartilhados. O backend rejeita credenciais persistidas que não estejam no formato scrypt; gere os hashes apenas durante uma inicialização controlada e retire o segredo inicial depois. Não envie secrets pelo chat. O frontend utiliza apenas `/api/trpc`; não precisa de chave Supabase no navegador.

As sessões Xifado são cookies HttpOnly, Secure, SameSite=Lax e Path=/. O logout remove os cookies; `sessionVersion` revoga sessões antigas quando um membro é removido ou reativado.

Antes do deploy, execute `supabase/xifado.sql` no projeto correto, confirme `public.xifado_state` e mantenha o repositório privado durante os testes.
