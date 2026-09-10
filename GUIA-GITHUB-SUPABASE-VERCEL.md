# Desafio Xifado — publicação

## 1. Supabase

Abra o SQL Editor do projeto Supabase correto e execute todo o arquivo `supabase/xifado.sql`. O script cria `public.xifado_state`, `public.xifado_events` e `public.xifado_audit_logs`, ativa RLS sem acesso direto do navegador, habilita o timestamp de atualização e adiciona a tabela de estado à publicação Realtime. O backend inicializa a linha central com os participantes padrão apenas quando ela ainda não existe. A versão em `supabase/migrations/20260902000000_xifado_security_history.sql` é a migration oficial; o SQL em `supabase/xifado.sql` é o instalador manual distribuído no pacote.

Não crie policy pública de `INSERT`, `UPDATE` ou `SELECT` para essa tabela. O navegador chama somente o endpoint tRPC; o backend usa `SUPABASE_SECRET_KEY` exclusivamente no servidor.

## 2. Variáveis na Vercel

Configure estas variáveis em Production, Preview e Development:

```text
SUPABASE_URL=https://mswkebcfiazfdboniofn.supabase.co
SUPABASE_SECRET_KEY=<chave secreta sb_secret do projeto Supabase>
XIFADO_MASTER_CODE=<código mestre escolhido>
JWT_SECRET=<segredo longo e aleatório>
```

`SUPABASE_SECRET_KEY` e `JWT_SECRET` nunca devem começar com `VITE_`, nunca devem estar no frontend e nunca devem ser commitados no GitHub. A URL pública do Supabase pode ser usada no backend, mas não é necessário expor nenhuma credencial no cliente.

## 3. GitHub e Vercel

Suba o conteúdo do projeto para um repositório GitHub sem `.env`, `node_modules` ou `dist`. Na Vercel, importe o repositório, mantenha o framework Vite e use o `vercel.json` incluído. O build validado é `pnpm run build`; a função `api/trpc/[...path].ts` atende as requisições em `/api/trpc`.

## 4. Operação

O estado público é consultado pelo dashboard para manter os dispositivos convergentes. Alterações administrativas passam pelo código mestre no servidor. Login de participante usa nome + senha uma única vez e gera cookie de sessão HttpOnly; a senha e os tokens não são reenviados nas ações seguintes. O código mestre também não está embutido no bundle do navegador. Logout limpa o cookie e a remoção ou reativação incrementa `sessionVersion`.

Antes de iniciar o ciclo, confirme os horários ISO em `America/Sao_Paulo`. A interface exibe o relógio em Brasília, registra a baixa com horário e duração e congela novas baixas após o término.
