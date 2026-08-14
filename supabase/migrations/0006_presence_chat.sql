-- ═══════════════════════════════════════════════════════════════════════
-- ATHENEU · Migration 0006 — Presença (online/offline) + chat entre usuários
-- ═══════════════════════════════════════════════════════════════════════

-- Presença: heartbeat do app atualiza last_seen; "online" = visto há < 3 min
alter table profiles add column if not exists last_seen timestamptz not null default now();

-- Diretório de usuários (somente dados de exibição; progresso/notas continuam privados)
create or replace view public_users as
select
  p.id,
  p.name,
  p.avatar_color,
  p.bio,
  p.last_seen,
  (select count(*) from books b where b.user_id = p.id) as total_books,
  (select count(*) from books b where b.user_id = p.id and b.status = 'reading') as reading_now
from profiles p;

revoke select on public_users from public;
grant select on public_users to authenticated;

-- Chat em tempo real respeitando RLS (cada usuário só lê mensagens das
-- conversas das quais participa — políticas da migration 0002).
do $$
begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then
  null;
end $$;
