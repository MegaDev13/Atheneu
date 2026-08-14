-- ═══════════════════════════════════════════════════════════════════════
-- ATHENEU · Migration 0005 — Camada de anotações independentes do PDF
--
-- As marcações NÃO tocam o arquivo original: são renderizadas pelo app
-- sobre a página, com coordenadas RELATIVAS (0..1) — funcionam em qualquer
-- zoom/resolução/dispositivo. Uma anotação pode ter múltiplos retângulos
-- (várias linhas) e atravessar páginas (mesmo id).
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists pdf_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  page integer not null,
  type text not null default 'text' check (type in ('text','visual')),
  text text,
  name text not null default '',
  comment text not null default '',
  color text not null default 'yellow'
    check (color in ('yellow','green','blue','red','orange','purple')),
  rects jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pdf_ann_user_book_idx
  on pdf_annotations (user_id, book_id, page);
create index if not exists pdf_ann_book_idx
  on pdf_annotations (book_id);

drop trigger if exists pdf_annotations_updated_at on pdf_annotations;
create trigger pdf_annotations_updated_at before update on pdf_annotations
  for each row execute function set_updated_at();

alter table pdf_annotations enable row level security;

drop policy if exists "anotações: próprio" on pdf_annotations;
create policy "anotações: próprio" on pdf_annotations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Progresso já existe em reading_progress (page/updated_at) e é a fonte da
-- "última página lida" (last_read_page), independente do cronômetro (§31-49).
-- Garantimos upsert rápido por (user, book):
create index if not exists reading_progress_pk_idx
  on reading_progress (user_id, book_id);
