# Voya · Sistema de Controle de Metas

Sistema interno para controle de metas mensais das profissionais da Voya.
Next.js 14 (App Router) + Supabase (banco de dados, autenticação e RLS) + Vercel.

## 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) → **New project**.
2. Anote a **senha do banco** que você definir (não é usada pelo app, mas guarde por segurança).
3. Aguarde o projeto terminar de provisionar.

## 2. Criar as tabelas

No painel do Supabase: **SQL Editor → New query**.

1. Cole todo o conteúdo de `schema.sql` (deste projeto) e clique em **Run**.
2. Depois, cole todo o conteúdo de `rpc_ranking.sql` e clique em **Run** novamente.

Isso cria:
- Tabelas: `professionals`, `profiles`, `monthly_goals`, `goal_progress`, `month_locks`, `change_history`
- Row Level Security (RLS) em todas as tabelas
- Trigger que cria automaticamente um `profile` quando um usuário é criado no Supabase Auth
- Função `get_ranking()` usada no ranking por percentual

## 3. Pegar as chaves da API

Em **Project Settings → API**, copie:
- **Project URL**
- **anon public key**
- **service_role key** (fica em "Project API keys" — não confunda com a anon)

## 4. Configurar variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

**Importante:** `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser exposta no navegador nem commitada no
Git. Ela só é usada dentro de server actions (criação/remoção de login de profissionais).

## 5. Instalar e rodar localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:3000

## 6. Criar o primeiro usuário Master

O cadastro de usuários pelo próprio app (tela "Adicionar profissional") só cria contas com
`role = profissional`. O primeiro usuário Master precisa ser criado manualmente, uma única vez:

1. No Supabase: **Authentication → Users → Add user** (ou "Invite user").
   - Email: o e-mail que você vai usar para logar como Master
   - Password: defina uma senha
   - Marque **Auto Confirm User**
2. Depois de criado, vá em **Table Editor → profiles** e edite (ou insira, se não tiver sido
   criado automaticamente) a linha correspondente a esse usuário:
   - `role` = `master`
   - `professional_id` = deixe em branco (null)

   Se a linha em `profiles` não existir ainda, rode no SQL Editor (troque o e-mail e o UUID do
   usuário, que aparece na tela de Authentication → Users):

   ```sql
   insert into public.profiles (id, name, email, role)
   values ('UUID-DO-USUARIO', 'Seu Nome', 'seu-email@voya.com', 'master');
   ```

3. Pronto — logue no app com esse e-mail e senha. Você cai direto no Dashboard Master.

A partir daí, todo o resto (criação de profissionais e seus logins) é feito pela própria
interface, em **Gerenciar Profissionais**.

## 7. Publicar na Vercel

1. Suba este projeto para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com) → **Add New Project** → importe o repositório.
3. Em **Environment Variables**, adicione as três variáveis do passo 4
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
4. Clique em **Deploy**.
5. Depois do primeiro deploy, se você mudar variáveis de ambiente, use **Redeploy**.

## Estrutura do projeto

```
app/
  login/                    Página de login
  dashboard/                Painel da profissional
  master/                   Painel do Master (layout com menu lateral)
    profissionais/          CRUD de profissionais + criação de login
    metas/                  Definir/editar meta inicial e geral por mês
    meses/                  Liberar/bloquear meses
    historico/              Histórico de alterações
    configuracoes/          Troca de senha e info da conta
components/                 Componentes de UI (cards, gráficos, tabelas)
lib/
  supabase/                 Clientes Supabase (browser, server, admin)
  calculations.ts           Todas as regras de cálculo (%, médias, projeção, ritmo)
  types.ts                  Tipos TypeScript compartilhados
schema.sql                  Schema do banco (tabelas + RLS + triggers)
rpc_ranking.sql              Função de ranking por percentual
```

## Regras de cálculo implementadas (lib/calculations.ts)

- `% meta inicial` = realizado / meta inicial × 100
- `% meta geral` = realizado / meta geral × 100
- `Restante` = meta − realizado
- `Média diária necessária` = restante / dias restantes no mês
- `Média semanal necessária` = restante / semanas restantes no mês
- `Projeção de fechamento` = (realizado / dias decorridos) × total de dias do mês
- `Status de ritmo`: compara o % da meta geral já realizado com o % de dias já
  decorridos no mês (tolerância de 5 pontos percentuais para "dentro do ritmo")

## Permissões (resumo)

| Ação                                   | Master | Profissional |
|-----------------------------------------|:------:|:-------------:|
| Ver todas as profissionais em R$        | ✅     | ❌            |
| Ver ranking em %                        | ✅     | ✅ (só %)     |
| Criar/editar/remover profissionais      | ✅     | ❌            |
| Definir/editar metas                    | ✅     | ❌            |
| Liberar/bloquear meses                  | ✅     | ❌            |
| Editar o próprio valor realizado        | —      | ✅ (só mês liberado) |
| Ver histórico de alterações             | ✅     | ❌            |

Essas regras são garantidas em duas camadas: nas telas (o menu do Master nem aparece para
profissionais) e no banco de dados via Row Level Security — ou seja, mesmo que alguém tente
burlar pelo navegador, o Supabase bloqueia a operação.
