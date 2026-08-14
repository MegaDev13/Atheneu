-- ═══════════════════════════════════════════════════════════════════════
-- ATHENEU · Migration 0001 — núcleo (schema §30 + RLS §31)
-- Regra fundamental: cada usuário só acessa os próprios dados.
-- Execute no SQL Editor do Supabase ou via `supabase db push`.
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Helpers ────────────────────────────────────────────────────────────
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─── Profiles ───────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  bio text not null default '',
  avatar_color text not null default '#6e1f2b',
  avatar_url text,
  onboarded boolean not null default false,
  prefs jsonb not null default '{"interests":[],"yearlyGoal":12,"frequency":"daily","format":"read","audioRate":1}'::jsonb,
  privacy jsonb not null default '{"library":"public","progress":"followers","activity":"followers","notes":"private","highlights":"private"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- Cria o profile automaticamente no cadastro.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── Books ──────────────────────────────────────────────────────────────
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  author text not null default '',
  genre text not null default 'Outros',
  description text not null default '',
  cover_url text,
  format text not null default 'txt' check (format in ('txt','epub','pdf','docx','seed')),
  status text not null default 'want' check (status in ('want','reading','paused','finished')),
  pages integer not null default 0,
  rating smallint not null default 0 check (rating between 0 and 5),
  file_key text,
  file_size bigint not null default 0,
  added_at timestamptz not null default now(),
  last_access timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists books_user_idx on books (user_id, last_access desc);
create index if not exists books_user_status_idx on books (user_id, status);
create trigger books_updated_at before update on books
  for each row execute function set_updated_at();

create table if not exists book_chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  idx integer not null,
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  unique (book_id, idx)
);
create index if not exists chapters_book_idx on book_chapters (book_id, idx);

-- ─── Progresso / sessões ────────────────────────────────────────────────
create table if not exists reading_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  chapter integer not null default 0,
  location double precision not null default 0,
  page integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create table if not exists reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  page_start integer not null default 0,
  page_end integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on reading_sessions (user_id, started_at desc);

-- ─── Marcações / notas / tags ───────────────────────────────────────────
create table if not exists highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  chapter integer not null default 0,
  start_pos integer not null default 0,
  end_pos integer not null default 0,
  text text not null,
  color text not null default 'yellow' check (color in ('yellow','blue','green','red')),
  created_at timestamptz not null default now()
);
create index if not exists highlights_user_book_idx on highlights (user_id, book_id);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid references books(id) on delete set null,
  chapter integer,
  excerpt text,
  text text not null,
  tags text[] not null default '{}',
  review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_user_idx on notes (user_id, created_at desc);
create index if not exists notes_tags_idx on notes using gin (tags);
create trigger notes_updated_at before update on notes
  for each row execute function set_updated_at();

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists book_tags (
  book_id uuid not null references books(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (book_id, tag_id)
);

-- ─── Audiobooks (§15–17) ────────────────────────────────────────────────
create table if not exists audiobooks (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','processing','ready','failed')),
  voice text,
  total_seconds double precision not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id)
);
create trigger audiobooks_updated_at before update on audiobooks
  for each row execute function set_updated_at();

create table if not exists audio_chapters (
  id uuid primary key default gen_random_uuid(),
  audiobook_id uuid not null references audiobooks(id) on delete cascade,
  idx integer not null,
  title text not null default '',
  storage_key text,
  seconds double precision not null default 0,
  -- Sincronização texto↔áudio (§17): pares [segundo, índice da palavra].
  sync_map jsonb not null default '[]'::jsonb,
  unique (audiobook_id, idx)
);

create table if not exists audio_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  chapter integer not null default 0,
  seconds double precision not null default 0,
  rate double precision not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

-- ─── Metas / atividade / notificações ──────────────────────────────────
create table if not exists reading_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null default 'books' check (kind in ('books','pages','minutes')),
  target integer not null default 1,
  period text not null default 'year' check (period in ('year','month')),
  created_at timestamptz not null default now()
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null,
  book_id uuid references books(id) on delete set null,
  text text not null,
  at timestamptz not null default now()
);
create index if not exists activities_user_idx on activities (user_id, at desc);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  icon text not null default '📚',
  text text not null,
  href text,
  read boolean not null default false,
  at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, at desc);

-- ─── Conceitos (§20) ────────────────────────────────────────────────────
create table if not exists concepts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists book_concepts (
  book_id uuid not null references books(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  occurrences integer not null default 1,
  primary key (book_id, concept_id)
);

create table if not exists user_concepts (
  user_id uuid not null references profiles(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  weight double precision not null default 1,
  primary key (user_id, concept_id)
);

-- ─── Avaliações / preferências ──────────────────────────────────────────
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  text text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, book_id)
);

create table if not exists user_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  theme text not null default 'light',
  reader_font_size integer not null default 19,
  reader_line_height double precision not null default 1.9,
  reader_theme text not null default 'light',
  updated_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- RLS — isolamento por usuário em todas as tabelas
-- ═══════════════════════════════════════════════════════════════════════
alter table profiles enable row level security;
alter table books enable row level security;
alter table book_chapters enable row level security;
alter table reading_progress enable row level security;
alter table reading_sessions enable row level security;
alter table highlights enable row level security;
alter table notes enable row level security;
alter table tags enable row level security;
alter table book_tags enable row level security;
alter table audiobooks enable row level security;
alter table audio_chapters enable row level security;
alter table audio_progress enable row level security;
alter table reading_goals enable row level security;
alter table activities enable row level security;
alter table notifications enable row level security;
alter table concepts enable row level security;
alter table book_concepts enable row level security;
alter table user_concepts enable row level security;
alter table reviews enable row level security;
alter table user_preferences enable row level security;

-- Profiles: o dono lê/edita a si mesmo; leitura pública mínima para o social
-- (nome, bio, avatar) é feita por views dedicadas na migration 0002.
create policy "profiles: ler o próprio" on profiles
  for select using (auth.uid() = id);
create policy "profiles: editar o próprio" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: inserir o próprio" on profiles
  for insert with check (auth.uid() = id);

-- Books
create policy "books: tudo do próprio usuário" on books
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Capítulos: leitura exige ser dono do livro
create policy "chapters: ler do próprio livro" on book_chapters
  for select using (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  );
create policy "chapters: escrever no próprio livro" on book_chapters
  for insert with check (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  );
create policy "chapters: apagar do próprio livro" on book_chapters
  for delete using (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  );

create policy "progress: próprio" on reading_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sessions: próprio" on reading_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "highlights: próprio" on highlights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notes: próprio" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tags: próprio" on tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "book_tags: próprio" on book_tags
  for all using (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  );

create policy "audiobooks: próprio" on audiobooks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "audio_chapters: ler do próprio audiobook" on audio_chapters
  for select using (
    exists (select 1 from audiobooks a where a.id = audiobook_id and a.user_id = auth.uid())
  );
create policy "audio_chapters: inserir no próprio audiobook" on audio_chapters
  for insert with check (
    exists (select 1 from audiobooks a where a.id = audiobook_id and a.user_id = auth.uid())
  );

create policy "audio_progress: próprio" on audio_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "goals: próprio" on reading_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "activities: próprio" on activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notifications: próprio" on notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Conceitos: catálogo global somente leitura; associações do usuário.
create policy "concepts: leitura global" on concepts for select using (true);
create policy "book_concepts: leitura via próprio livro" on book_concepts
  for select using (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  );
create policy "book_concepts: escrita via próprio livro" on book_concepts
  for insert with check (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  );
create policy "user_concepts: próprio" on user_concepts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reviews: próprio" on reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_preferences: próprio" on user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime (fase social): mensagens/notificações usam canais privados;
-- habilite publicações por tabela apenas quando a fase correspondente for ativada.
