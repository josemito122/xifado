# Credenciais iniciais do Xifado

As credenciais dos participantes são carregadas no banco por `supabase/SEED-USUARIOS.sql` usando apenas hashes scrypt. As senhas em texto puro não ficam no código nem no banco.

O acesso mestre usa o mesmo formulário público de login:

- Nome: `mestre`
- Senha: configure `XIFADO_MASTER_CODE` no Vercel com a senha mestre escolhida.

Depois do login, `mestre` é encaminhado para a aba mestre; qualquer outro nome válido é encaminhado para a aba participante.

Para adicionar novos participantes, use a área mestre. A senha é armazenada como hash scrypt.
