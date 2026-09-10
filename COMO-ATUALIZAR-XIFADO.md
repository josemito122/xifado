# Atualização segura do Xifado

## 1. Banco Supabase

No SQL Editor, execute somente:

`supabase/ADD-LUIS-ALEXANDRE.sql`

Esse SQL adiciona/atualiza somente as credenciais de Luis e Alexandre e garante que os dois estejam ativos em `xifado_state` sem apagar o restante do estado.

## 2. VS Code

Substitua o conteúdo da pasta local pelo conteúdo deste ZIP, preservando qualquer cópia de segurança do projeto atual.

No PowerShell:

```powershell
cd C:\Users\Windows\Downloads\xifado
pnpm install
pnpm check
pnpm build
pnpm test
```

Se os comandos passarem:

```powershell
git add .
git commit -m "Corrige login e cadastro dos participantes"
git push origin main
```

## 3. Vercel

Aguarde o deploy automático do branch `main`. Depois faça `Ctrl + F5` no site.

## 4. O que NÃO fazer

Não apague `public.xifado_state`.
Não execute scripts que recriem o desafio inteiro.
Não coloque senha em texto puro dentro do Supabase.
