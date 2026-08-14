-- ═══════════════════════════════════════════════════════════════════════
-- ATHENEU · Migration 0009 — Retrospectiva de leitura (Reading Wrapped)
-- Snapshot do período fechado; idempotente (não duplica por usuário/período).
-- A retrospectiva é PRIVADA por padrão (§29).
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists recaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  period text not null,               -- '2026-08' | '2026'
  kind text not null default 'monthly' check (kind in ('monthly','yearly')),
  metrics jsonb not null default '{}'::jsonb,
  viewed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, period)            -- idempotência (§33)
);
create index if not exists recaps_user_idx on recaps (user_id, period);

alter table recaps enable row level security;
create policy "recaps: somente o próprio" on recaps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
