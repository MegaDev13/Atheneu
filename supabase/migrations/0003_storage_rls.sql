-- ═══════════════════════════════════════════════════════════════════════
-- ATHENEU · Migration 0003 — Supabase Storage (§32)
-- Buckets: covers (público p/ leitura), books/audio/processed (privados).
-- Arquivos privados nunca são publicamente acessíveis: use URLs assinadas.
-- ═══════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('books', 'books', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('processed', 'processed', false)
on conflict (id) do nothing;

-- Capas: leitura pública; escrita apenas do dono, dentro da própria pasta.
create policy "covers: leitura pública" on storage.objects
  for select using (bucket_id = 'covers');
create policy "covers: upload próprio" on storage.objects
  for insert with check (
    bucket_id = 'covers' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "covers: atualizar a própria" on storage.objects
  for update using (
    bucket_id = 'covers' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "covers: apagar a própria" on storage.objects
  for delete using (
    bucket_id = 'covers' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Livros (arquivos originais): somente o dono.
create policy "books: ler o próprio" on storage.objects
  for select using (
    bucket_id = 'books' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "books: enviar o próprio" on storage.objects
  for insert with check (
    bucket_id = 'books' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "books: apagar o próprio" on storage.objects
  for delete using (
    bucket_id = 'books' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Áudio gerado: o Worker autentica como o próprio usuário, então o dono
-- pode ler, enviar (upload dos capítulos gerados), atualizar e apagar
-- apenas dentro da própria pasta. Nunca entre usuários.
create policy "audio: ler o próprio" on storage.objects
  for select using (
    bucket_id = 'audio' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "audio: enviar o próprio" on storage.objects
  for insert with check (
    bucket_id = 'audio' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "audio: atualizar o próprio" on storage.objects
  for update using (
    bucket_id = 'audio' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "audio: apagar o próprio" on storage.objects
  for delete using (
    bucket_id = 'audio' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Texto processado: somente o dono.
create policy "processed: ler o próprio" on storage.objects
  for select using (
    bucket_id = 'processed' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── Realtime ───────────────────────────────────────────────────────────
-- Para chat/notificações em tempo real (fase social 3), habilite:
-- alter publication supabase_realtime add table messages;
-- alter publication supabase_realtime add table notifications;
