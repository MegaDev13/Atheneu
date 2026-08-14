-- ═══════════════════════════════════════════════════════════════════════
-- ATHENEU · Migration 0008 — Mensagens (permissões/leitura) + Notificações + e-mail
-- Reutiliza conversations/conversation_members/messages/notifications/blocks/reports.
-- ═══════════════════════════════════════════════════════════════════════

-- Preferências de notificação por canal (site/e-mail) e por tipo.
alter table profiles add column if not exists notify_prefs jsonb not null default
  '{"message":{"site":true,"email":true},"follow":{"site":true,"email":true},"reply":{"site":true,"email":true},"mention":{"site":true,"email":true},"activity":{"site":true,"email":false}}'::jsonb;

-- conversation_members já tem last_read_at (marcação de leitura). Garante coluna.
alter table conversation_members add column if not exists last_read_at timestamptz;

-- Fila de e-mail assíncrona (não bloqueia o envio da mensagem).
create table if not exists email_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null default 'MESSAGE_RECEIVED',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','sent','failed','retrying')),
  attempts integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists email_notifications_pending_idx on email_notifications (status, created_at) where status in ('pending','retrying');

alter table email_notifications enable row level security;
create policy "email_notifications: ler próprio" on email_notifications for select using (auth.uid() = user_id);
create policy "email_notifications: criar próprio" on email_notifications for insert with check (auth.uid() = user_id);

-- Notificações: tipos extensíveis via campo kind (MESSAGE_RECEIVED, FOLLOW_RECEIVED, …).
-- notifications já existe (0001); garante coluna kind e link.
alter table notifications add column if not exists kind text not null default 'SYSTEM_NOTIFICATION';
alter table notifications add column if not exists href text;

-- Lê e-mail do destinatário SOMENTE para o sistema de notificação (função definer),
-- nunca exposto em APIs públicas de perfil.
create or replace function user_email_internal(uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select email from profiles where id = uid;
$$;
revoke all on function user_email_internal(uuid) from public;
