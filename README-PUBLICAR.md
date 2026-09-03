# Xifado — publicação manual

Este pacote é um projeto Vite/React com API Node/Express em funções da Vercel e persistência no Supabase. A interface original foi preservada. A raiz correta do projeto é a pasta que contém `package.json`, `tsconfig.json`, `client`, `server`, `shared`, `api`, `supabase` e `vercel.json`.

## 1. Abrir e instalar no VS Code

Extraia o ZIP e abra no VS Code a pasta `xifado`, não a pasta pai. No terminal integrado, confirme:

```powershell
Get-ChildItem package.json, tsconfig.json, vercel.json
pnpm install
pnpm run check
pnpm run build
```

O comando `pnpm run check` deve ser executado dentro da pasta que contém `tsconfig.json`. Executá-lo na pasta pai produz o erro TypeScript `TS18003` porque os padrões `client/src/**/*`, `shared/**/*` e `server/**/*` deixam de apontar para os arquivos reais.

## 2. Configurar o ambiente local

Copie `.env.example` para `.env.local` ou `.env`, e preencha os valores localmente. Nunca envie `.env` ou `.env.local` para o GitHub. O backend usa `SUPABASE_SECRET_KEY`, `JWT_SECRET` e `XIFADO_MASTER_CODE` exclusivamente no servidor.

```powershell
Copy-Item .env.example .env.local
```

As variáveis mínimas são:

```text
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
JWT_SECRET=um-segredo-longo-e-aleatorio
XIFADO_MASTER_CODE=seu-codigo-mestre
```

`SUPABASE_ANON_KEY` só deve ser usada no navegador se uma funcionalidade pública realmente precisar dela. A aplicação atual usa o backend para consultar e alterar o estado protegido.

## 3. Preparar o Supabase

No projeto Supabase correto, aplique as migrations em `supabase/migrations` usando a CLI, preferencialmente:

```powershell
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Se não usar a CLI, execute o instalador `supabase/xifado.sql` uma única vez no SQL Editor do projeto correto. Não execute os dois fluxos sobre um banco já parcialmente configurado sem verificar o histórico de migrations.

Depois, confirme que existem `public.xifado_state`, `public.xifado_credentials`, `public.xifado_events`, `public.xifado_rate_limits` e `public.xifado_audit_logs`, além da função `public.xifado_rate_limit_check`. A tabela `xifado_credentials` guarda somente hashes `scrypt`, tem RLS forçado, bloqueia `anon` e `authenticated` e pode ser acessada apenas pelo backend com a chave secreta.

Para criar os primeiros participantes, defina temporariamente no ambiente da Vercel a variável `XIFADO_INITIAL_CREDENTIALS` como JSON, por exemplo `{"Ana":"Senha123"}`. Na primeira leitura de um estado sem credenciais, o backend cria o membro, gera o hash no servidor e grava o hash em `xifado_credentials`; a senha original não é gravada. Depois de confirmar que o login funciona, remova essa variável do ambiente para impedir novas cargas acidentais.

## 4. Importar para o GitHub

Crie um repositório vazio e, dentro da raiz do projeto, execute:

```powershell
git init
git add .
git status
git commit -m "chore: organizar projeto Xifado para Vercel e Supabase"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

Antes do commit, confirme que `.env`, `.env.local`, `node_modules` e `dist` não aparecem no `git status`. Se uma credencial já tiver sido commitada, revogue-a no Supabase e substitua o `JWT_SECRET` e o código mestre antes de publicar.

## 5. Configurar a Vercel

Importe o repositório do GitHub e configure o projeto assim:

| Campo | Valor |
|---|---|
| Framework Preset | Vite |
| Root Directory | A pasta que contém `package.json`; se o repo foi enviado com uma pasta externa `xifado`, use `xifado` |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm run build` |
| Output Directory | `dist/public` |
| Node.js | 20 ou superior |

Cadastre as mesmas variáveis em **Production**, **Preview** e **Development**:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
JWT_SECRET
XIFADO_MASTER_CODE
```

Não cole comandos de shell no valor de uma variável. Cada variável deve ocupar uma linha independente no painel da Vercel. Em particular, o nome precisa ser exatamente `SUPABASE_SECRET_KEY`; um texto como `SUPABASE_SECRET_KEYecho ...` faz o backend considerar que a chave não existe.

Depois de salvar as variáveis, faça um novo deploy com limpeza do cache. Teste primeiro:

```text
https://SEU-DOMINIO.vercel.app/api/health
```

A resposta saudável é JSON com `status: "ok"` e `database: "ok"`. Em seguida abra a aplicação e confirme o carregamento do estado.

## 6. Diagnóstico do erro original

A mensagem `O servidor da aplicação não respondeu corretamente. Confira as variáveis da Vercel e o SQL do Supabase.` é uma mensagem genérica do cliente quando `/api/trpc` recebe uma resposta 5xx ou não-JSON. Ela não identifica a causa original. Neste projeto, foram corrigidos dois pontos importantes: a configuração local continha a chave com o nome quebrado por um comando de shell concatenado, e os clientes Supabase/JWT foram ajustados para inicialização tardia, evitando que a função Vercel morra no carregamento do módulo antes de conseguir responder em JSON.

## 7. Comandos de verificação

```powershell
pnpm run check
pnpm run build
pnpm dev
```

Em outro terminal local, teste:

```powershell
Invoke-WebRequest http://localhost:3000/api/health
```

Se a resposta for `503`, o servidor está carregado, mas o Supabase ou o schema não estão disponíveis. Se a Vercel retornar HTML ou `FUNCTION_INVOCATION_FAILED`, verifique primeiro o Root Directory, as variáveis nos três ambientes e os logs da função.
