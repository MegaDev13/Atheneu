# Configuração do Supabase — passo a passo

Este guia cobre a criação do projeto, execução das migrations e ajustes de autenticação.
O resumo também está no `README.md`.

## 1. Criar o projeto

1. Acesse [supabase.com](https://supabase.com) → **New project**.
2. Escolha organização, senha do banco e região mais próxima dos usuários (ex.: `South America (São Paulo)`).

## 2. Executar as migrations

As migrations vivem em `supabase/migrations/` e devem ser aplicadas **em ordem**:

| Arquivo | Conteúdo |
|---|---|
| `0001_core_schema.sql` | Profiles, books, chapters, progresso, sessões, notas, destaques, audiobooks, metas, atividades, notificações, conceitos + **RLS completo** |
| `0002_social_schema.sql` | Follows, blocks, reports, comentários, reações, chat, clubes + helpers de privacidade + views `public_profiles` e `feed` |
| `0003_storage_rls.sql` | Buckets `covers`, `books`, `audio`, `processed` + políticas por dono |

### Opção A — SQL Editor (mais simples)
1. No painel do Supabase: **SQL Editor → New query**.
2. Cole o conteúdo de `0001_core_schema.sql` → **Run**. Repita para 0002 e 0003.

### Opção B — CLI
```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
```

## 3. Autenticação

- **Authentication → Providers → Email**: habilitado.
  - Com *Confirm email* ligado: o cadastro envia link de confirmação (a UI mostra o estado de sucesso adequado).
  - Desligado: o usuário entra direto após registrar.
- **Authentication → URL Configuration**:
  - *Site URL*: `https://<usuario>.github.io/<repo>/`
  - *Redirect URLs*: adicione a mesma URL (usada na recuperação de senha).

## 4. Chaves

Em **Settings → API**:
- Copie `Project URL` → `VITE_SUPABASE_URL`
- Copie `anon public key` → `VITE_SUPABASE_ANON_KEY`

A `service_role key` **nunca** vai para o frontend — use-a apenas em Edge Functions/workers
(ex.: o futuro worker de TTS que grava arquivos no bucket `audio`).

## 5. Storage

As migrations criam os buckets automaticamente:

| Bucket | Visibilidade | Conteúdo |
|---|---|---|
| `covers` | leitura pública | capas (otimizadas no upload) |
| `books` | privado | arquivos originais (EPUB/PDF/TXT/DOCX) |
| `audio` | privado | capítulos narrados (gerados pelo worker) |
| `processed` | privado | texto extraído/limpo |

Para arquivos privados, o frontend deve usar **URLs assinadas**
(`storage.from(bucket).createSignedUrl(key, 3600)`).

## 6. Realtime (fase social 3)

Quando for ativar chat/notificações em tempo real:

```sql
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;
```

E no frontend, assine com `supabase.channel(...)` filtrando sempre pelo `user_id`
(as políticas de leitura já garantem isolamento).

## 7. Verificação rápida

```sql
-- Deve retornar todas as tabelas com RLS habilitado:
select tablename, rowsecurity from pg_tables
where schemaname = 'public' order by tablename;
```
