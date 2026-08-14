-- ═══════════════════════════════════════════════════════════════════════
-- ATHENEU · Migration 0002 — camada social (§51–82)
-- Clube de leitura: perfis públicos, follows, feed, discussões, chat, clubes.
-- Privacidade por padrão: notas/destaques nunca são expostos automaticamente.
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Seguir / bloquear / denunciar (§54) ───────────────────────────────
create table if not exists follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  followee_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on follows (followee_id);

create table if not exists blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_kind text not null check (target_kind in ('user','message','comment','highlight','club')),
  target_id uuid not null,
  reason text not null default '',
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references profiles(id),
  report_id uuid references reports(id) on delete set null,
  action text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

-- Helper: alguém me bloqueou? (usada nas políticas abaixo)
create or replace function is_blocked_by(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks b where b.blocker_id = other and b.blocked_id = auth.uid()
  );
$$;

-- Helper: segue este usuário?
create or replace function follows_user(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from follows f where f.follower_id = auth.uid() and f.followee_id = other
  );
$$;

-- Helper: visibilidade de um perfil para o usuário atual
create or replace function can_see(other uuid, field text) returns boolean
language sql stable security definer set search_path = public as $$
  select (
    not exists (select 1 from blocks b where b.blocker_id = other and b.blocked_id = auth.uid())
  ) and (
    case (select (privacy->>field) from profiles where id = other)
      when 'public' then true
      when 'followers' then follows_user(other)
      else auth.uid() = other
    end
  );
$$;

-- ─── Discussões (§58–59) ────────────────────────────────────────────────
-- Comentários vinculados a livro e capítulo; spoilers marcados por capítulo.
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null,
  chapter integer not null default 0,
  text text not null check (char_length(text) <= 4000),
  excerpt text,
  parent_id uuid references comments(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists comments_book_chapter_idx on comments (book_id, chapter, created_at desc);
create index if not exists comments_user_idx on comments (user_id);

create table if not exists comment_reactions (
  comment_id uuid not null references comments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  reaction text not null check (reaction in ('love','insight','think','clap','laugh')),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id, reaction)
);

-- Destaques compartilhados voluntariamente (§71)
create table if not exists shared_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null,
  book_title text not null default '',
  book_author text not null default '',
  text text not null check (char_length(text) <= 500),
  scope text not null default 'feed' check (scope in ('feed','club')),
  club_id uuid,
  created_at timestamptz not null default now()
);

-- ─── Chat (§60–63) ──────────────────────────────────────────────────────
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'dm' check (kind in ('dm','book','chapter','club')),
  title text not null default '',
  book_id uuid,
  chapter integer,
  club_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists conversation_members (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  text text not null check (char_length(text) <= 4000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists messages_conversation_idx on messages (conversation_id, created_at desc);

-- ─── Clubes de leitura (§65–67) ─────────────────────────────────────────
create table if not exists reading_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  cover_url text,
  admin_id uuid not null references profiles(id),
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists reading_group_members (
  group_id uuid not null references reading_groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists reading_group_books (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references reading_groups(id) on delete cascade,
  title text not null,
  author text not null default '',
  -- Calendário da leitura coletiva (§67)
  schedule jsonb not null default '[]'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── RLS social ─────────────────────────────────────────────────────────
alter table follows enable row level security;
alter table blocks enable row level security;
alter table reports enable row level security;
alter table moderation_actions enable row level security;
alter table comments enable row level security;
alter table comment_reactions enable row level security;
alter table shared_highlights enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;
alter table reading_groups enable row level security;
alter table reading_group_members enable row level security;
alter table reading_group_books enable row level security;

-- Follows: ver quem alguém segue respeita a privacidade 'library' do alvo;
-- seguir/deixar de seguir é sempre ação do próprio usuário.
create policy "follows: ler" on follows for select
  using (follower_id = auth.uid() or can_see(followee_id, 'library'));
create policy "follows: seguir" on follows for insert
  with check (follower_id = auth.uid() and not is_blocked_by(followee_id));
create policy "follows: deixar de seguir" on follows for delete
  using (follower_id = auth.uid());

create policy "blocks: próprio" on blocks
  for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create policy "reports: criar o próprio" on reports
  for insert with check (reporter_id = auth.uid());
create policy "reports: ler o próprio" on reports
  for select using (reporter_id = auth.uid());

create policy "moderation: somente leitura para moderação futura" on moderation_actions
  for select using (false);

-- Comentários: leitura pública, exceto de quem me bloqueou; escrita própria.
-- O respeito ao limite de capítulo (spoiler) é aplicado no frontend usando o
-- campo chapter + o progresso do leitor (§64); o conteúdo nunca é de outro
-- usuário sem ação explícita de exibição.
create policy "comments: ler" on comments for select
  using (not is_blocked_by(user_id));
create policy "comments: escrever" on comments for insert
  with check (user_id = auth.uid());
create policy "comments: editar o próprio" on comments for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "comments: apagar o próprio" on comments for delete
  using (user_id = auth.uid());

create policy "reactions: ler" on comment_reactions for select
  using (not is_blocked_by(user_id));
create policy "reactions: reagir" on comment_reactions for insert
  with check (user_id = auth.uid());
create policy "reactions: remover a própria" on comment_reactions for delete
  using (user_id = auth.uid());

create policy "shared_highlights: ler feed/club" on shared_highlights for select
  using (not is_blocked_by(user_id));
create policy "shared_highlights: compartilhar o próprio" on shared_highlights for insert
  with check (user_id = auth.uid());
create policy "shared_highlights: apagar o próprio" on shared_highlights for delete
  using (user_id = auth.uid());

-- Chat: somente membros da conversa veem mensagens (§81).
create policy "conversations: membro lê" on conversations for select
  using (
    exists (select 1 from conversation_members m
            where m.conversation_id = id and m.user_id = auth.uid())
    or kind in ('book','chapter','club')
  );
create policy "conversation_members: ler membros" on conversation_members for select
  using (
    exists (select 1 from conversation_members m2
            where m2.conversation_id = conversation_id and m2.user_id = auth.uid())
    or exists (select 1 from conversations c
               where c.id = conversation_id and c.kind in ('book','chapter','club'))
  );
create policy "conversation_members: entrar" on conversation_members for insert
  with check (user_id = auth.uid());
create policy "conversation_members: sair" on conversation_members for delete
  using (user_id = auth.uid());
create policy "messages: membros lêem" on messages for select
  using (
    deleted_at is null and not is_blocked_by(user_id) and
    exists (select 1 from conversation_members m
            where m.conversation_id = conversation_id and m.user_id = auth.uid())
  );
create policy "messages: membro escreve" on messages for insert
  with check (
    user_id = auth.uid() and
    exists (select 1 from conversation_members m
            where m.conversation_id = conversation_id and m.user_id = auth.uid())
  );
create policy "messages: apagar a própria" on messages for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Clubes
create policy "groups: clubes públicos são visíveis" on reading_groups for select
  using (is_private = false or
    exists (select 1 from reading_group_members m where m.group_id = id and m.user_id = auth.uid()));
create policy "groups: criar" on reading_groups for insert
  with check (admin_id = auth.uid());
create policy "groups: administrar o próprio" on reading_groups for update
  using (admin_id = auth.uid()) with check (admin_id = auth.uid());

create policy "group_members: ler" on reading_group_members for select
  using (
    exists (select 1 from reading_groups g where g.id = group_id and
            (g.is_private = false or g.admin_id = auth.uid()))
    or user_id = auth.uid()
  );
create policy "group_members: entrar em clube público" on reading_group_members for insert
  with check (
    user_id = auth.uid() and
    exists (select 1 from reading_groups g where g.id = group_id and g.is_private = false)
  );
create policy "group_members: sair / admin remove" on reading_group_members for delete
  using (
    user_id = auth.uid() or
    exists (select 1 from reading_groups g where g.id = group_id and g.admin_id = auth.uid())
  );

create policy "group_books: membros lêem" on reading_group_books for select
  using (
    exists (select 1 from reading_groups g where g.id = group_id and
            (g.is_private = false or
             exists (select 1 from reading_group_members m where m.group_id = g.id and m.user_id = auth.uid())))
  );
create policy "group_books: admin escreve" on reading_group_books for insert
  with check (
    exists (select 1 from reading_groups g where g.id = group_id and g.admin_id = auth.uid())
  );
create policy "group_books: admin atualiza" on reading_group_books for update
  using (exists (select 1 from reading_groups g where g.id = group_id and g.admin_id = auth.uid()));

-- ─── Perfil público (§52) ───────────────────────────────────────────────
-- View com exposição controlada por privacidade + bloqueios.
create or replace view public_profiles as
select
  p.id,
  p.name,
  p.bio,
  p.avatar_color,
  p.avatar_url,
  (select count(*) from books b where b.user_id = p.id) as total_books,
  (select count(*) from books b where b.user_id = p.id and b.status = 'reading') as reading_count,
  (select count(*) from books b where b.user_id = p.id and b.status = 'finished') as finished_count,
  (select count(*) from follows f where f.followee_id = p.id) as followers,
  (select count(*) from follows f where f.follower_id = p.id) as following
from profiles p
where
  p.id <> auth.uid()
  and not exists (select 1 from blocks bl where bl.blocker_id = p.id and bl.blocked_id = auth.uid())
  and (
    (p.privacy->>'library') = 'public'
    or ((p.privacy->>'library') = 'followers' and follows_user(p.id))
  );

grant select on public_profiles to authenticated;

-- ─── Feed (§55) ─────────────────────────────────────────────────────────
-- Atividades visíveis conforme a privacidade 'activity' do autor.
create or replace view feed as
select a.id, a.user_id, a.kind, a.book_id, a.text, a.at,
       p.name as author_name, p.avatar_color as author_color
from activities a
join profiles p on p.id = a.user_id
where
  a.user_id <> auth.uid()
  and not is_blocked_by(a.user_id)
  and (
    (p.privacy->>'activity') = 'public'
    or ((p.privacy->>'activity') = 'followers' and follows_user(a.user_id))
  );

grant select on feed to authenticated;
