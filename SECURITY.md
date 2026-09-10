# Segurança do Xifado

Nunca publique valores de `SUPABASE_SECRET_KEY`, `JWT_SECRET`, `XIFADO_MASTER_CODE`, senhas de participantes ou tokens. Configure esses valores somente como variáveis protegidas no ambiente server-side da Vercel.

As sessões Xifado usam cookies HttpOnly, Secure, SameSite=Lax e Path=/. Mutations críticas não recebem senha ou token no corpo; a autorização é resolvida no servidor. A remoção ou reativação incrementa `sessionVersion` e invalida sessões antigas.

O projeto não deve conter `.env`, `.project-config.json`, `node_modules` ou `dist` no commit. Se uma credencial aparecer em qualquer commit, considere-a comprometida, revogue-a e gere uma nova no provedor correspondente.

O Supabase deve permanecer com acesso direto fechado para `anon` e `authenticated`; a aplicação acessa `xifado_state` exclusivamente pelo backend. Antes de abrir o repositório ao público, execute uma varredura de secrets no histórico e confirme o Security Advisor do Supabase.
