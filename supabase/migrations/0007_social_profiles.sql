-- ═══════════════════════════════════════════════════════════════════════
-- ATHENEU · Migration 0007 — Perfil social + Comunidade literária
-- Reutiliza profiles/follows/blocks/reports/notifications existentes (0001/0002).
-- NÃO cria tabelas duplicadas; só estende e adiciona discussões/comentários.
-- ═══════════════════════════════════════════════════════════════════════

-- Perfil social extendido (identidade + preferências) em jsonb único.
alter table profiles add column if not exists username text;
alter table profiles add column if not exists social jsonb not null default '{}'::jsonb;

-- username único (minúsculo, sem espaço). Mantém id como chave primária.
do $$ begin
  create unique index if not exists profiles_username_uq on profiles (lower(username)) where username is not null;
end $$;

-- ─── Discussões (comunidade) ───
create table if not exists discussions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  content text not null default '',
  category text not null default 'Geral',
  book_id uuid references books(id) on delete set null,
  author_name text,
  tags text[] not null default '{}',
  status text not null default 'published' check (status in ('published','hidden','reported','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists discussions_user_idx on discussions (user_id, created_at desc);
create index if not exists discussions_created_idx on discussions (created_at desc);
create index if not exists discussions_tags_idx on discussions using gin (tags);
create trigger discussions_updated_at before update on discussions
  for each row execute function set_updated_at();

-- ─── Comentários encadeados ───
create table if not exists discussion_comments (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references discussions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  parent_id uuid references discussion_comments(id) on delete cascade,
  content text not null,
  status text not null default 'published' check (status in ('published','hidden','reported','removed')),
  created_at timestamptz not null default now()
);
create index if not exists dcomments_disc_idx on discussion_comments (discussion_id, created_at);

-- ─── Reações em discussões ───
create table if not exists discussion_reactions (
  discussion_id uuid not null references discussions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (discussion_id, user_id, emoji)
);

-- ─── Discussões salvas ───
create table if not exists saved_discussions (
  user_id uuid not null references profiles(id) on delete cascade,
  discussion_id uuid not null references discussions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, discussion_id)
);

-- ─── RLS ───
alter table discussions enable row level security;
alter table discussion_comments enable row level security;
alter table discussion_reactions enable row level security;
alter table saved_discussions enable row level security;

-- Discussões publicadas são legíveis por autenticados; só o dono escreve/edita.
create policy "discussions: ler publicadas" on discussions for select
  using (status = 'published' or user_id = auth.uid());
create policy "discussions: criar propria" on discussions for insert
  with check (auth.uid() = user_id);
create policy "discussions: editar propria" on discussions for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "discussions: excluir propria" on discussions for delete
  using (auth.uid() = user_id);

create policy "dcomments: ler publicados" on discussion_comments for select
  using (status = 'published' or user_id = auth.uid());
create policy "dcomments: criar proprio" on discussion_comments for insert
  with check (auth.uid() = user_id);
create policy "dcomments: editar proprio" on discussion_comments for update
  using (auth.uid() = user_id);
create policy "dcomments: excluir proprio" on discussion_comments for delete
  using (auth.uid() = user_id);

create policy "dreactions: ler" on discussion_reactions for select using (true);
create policy "dreactions: propria" on discussion_reactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "saved: propria" on saved_discussions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Perfis públicos: ler identidade pública de outros usuários (sem dados privados).
drop policy if exists "profiles: ler o próprio" on profiles;
create policy "profiles: ler próprio" on profiles for select using (auth.uid() = id);
create policy "profiles: ler público" on profiles for select using (true);
-- Writes só o próprio.
drop policy if exists "profiles: editar o próprio" on profiles;
create policy "profiles: editar o próprio" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profiles: inserir o próprio" on profiles;
create policy "profiles: inserir o próprio" on profiles for insert with check (auth.uid() = id);

-- ─── View de perfil público (só campos seguros; nunca e-mail/senha/tokens) ───
create or replace view public_profiles_ext as
select
  p.id, p.username, p.name, p.avatar_color, p.bio, p.last_seen,
  (p.social->>'cover') as cover,
  (p.social->>'about') as about,
  (p.social->>'location') as location,
  (p.social->>'website') as website,
  (p.social->>'pronouns') as pronouns,
  coalesce(p.social->'genres', '[]') as genres,
  coalesce(p.social->'authors', '[]') as authors,
  coalesce(p.social->'books', '[]') as books,
  coalesce(p.social->'music', '[]') as music,
  coalesce(p.social->'interests', '[]') as interests,
  (select count(*) from follows f where f.followee_id = p.id) as followers,
  (select count(*) from follows f where f.follower_id = p.id) as following,
  (select count(*) from books b where b.user_id = p.id) as total_books,
  (select count(*) from discussions d where d.user_id = p.id and d.status='published') as discussions_count
from profiles p;
revoke select on public_profiles_ext from public;
grant select on public_profiles_ext to authenticated;
