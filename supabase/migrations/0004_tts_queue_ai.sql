-- ═══════════════════════════════════════════════════════════════════════
-- ATHENEU · Migration 0004 — Fila de TTS distribuído + camada de IA Gemini
--
--  TTS: workers, tts_jobs, tts_job_chapters, audio_segments, tts_preferences
--  IA:  ai_cache, ai_requests + funções de controle
--
-- Princípio: o site e os Workers operam SEMPRE com as permissões do usuário
-- autenticado (anon key + JWT). Nenhuma service role no cliente.
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Workers (§10, §11) ─────────────────────────────────────────────────
create table if not exists workers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  device_name text not null default 'Worker',
  platform text not null default 'windows' check (platform in ('windows','android','linux','macos','demo')),
  status text not null default 'offline' check (status in ('online','offline','paused')),
  active boolean not null default true,
  engine text not null default '',
  engine_version text not null default '',
  cpu text not null default '',
  memory text not null default '',
  battery integer,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workers_user_idx on workers (user_id);
create trigger workers_updated_at before update on workers
  for each row execute function set_updated_at();

-- ─── Fila de jobs (§9) ──────────────────────────────────────────────────
create table if not exists tts_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued','claimed','processing','paused','completed','failed','cancelled')),
  priority smallint not null default 1 check (priority between 0 and 2), -- 0 baixa, 1 normal, 2 alta
  worker_id uuid references workers(id) on delete set null,
  current_chapter integer not null default 0,
  current_segment integer not null default 0,
  progress double precision not null default 0,
  engine text not null default 'kokoro',
  voice text not null default '',
  speed double precision not null default 1,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text
);
create index if not exists tts_jobs_queue_idx on tts_jobs (user_id, status, priority desc, created_at);
create index if not exists tts_jobs_book_idx on tts_jobs (book_id, created_at desc);

-- Progresso por capítulo (§13, §14, §15, §48)
create table if not exists tts_job_chapters (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references tts_jobs(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  chapter_idx integer not null,
  status text not null default 'pending' check (status in ('pending','processing','done','failed')),
  storage_key text,
  format text not null default 'wav',
  seconds double precision not null default 0,
  file_size bigint not null default 0,
  file_hash text,                       -- sha256 (§48)
  segments_done integer not null default 0,
  segments_total integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (job_id, chapter_idx)
);
create index if not exists job_chapters_job_idx on tts_job_chapters (job_id, chapter_idx);

-- ─── Segmentos para sincronização texto↔áudio (§18) ────────────────────
create table if not exists audio_segments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  chapter_idx integer not null,
  segment_index integer not null,
  text_start integer not null,
  text_end integer not null,
  audio_start double precision not null,
  audio_end double precision not null,
  unique (book_id, chapter_idx, segment_index)
);
create index if not exists audio_segments_lookup on audio_segments (book_id, chapter_idx, segment_index);

-- ─── Preferências de TTS (§19) ──────────────────────────────────────────
create table if not exists tts_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  engine text not null default 'kokoro',
  voice text not null default '',
  speed double precision not null default 1,
  language text not null default 'pt-BR',
  quality text not null default 'high' check (quality in ('low','medium','high')),
  updated_at timestamptz not null default now()
);

-- ─── IA: cache e histórico (§22, §33) ───────────────────────────────────
create table if not exists ai_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  request_hash text not null,
  operation text not null,
  input_reference text,
  response jsonb not null,
  model text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (user_id, operation, request_hash)
);
create index if not exists ai_cache_lookup on ai_cache (user_id, operation, request_hash);

create table if not exists ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  operation text not null,
  request_hash text,
  model text not null default '',
  status text not null default 'success' check (status in ('success','error','rate_limited','quota','cache')),
  tokens_estimated integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_requests_user_day_idx on ai_requests (user_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════
-- Funções da fila (claim atômico, heartbeat, liberação de jobs órfãos)
-- ═══════════════════════════════════════════════════════════════════════

-- §12 · Claim atômico: dois Workers NUNCA pegam o mesmo job.
-- `for update skip locked` garante serialização mesmo com requisições simultâneas.
-- §46 · Anti-monopólio: um usuário só tem 1 job ativo por vez.
create or replace function claim_next_tts_job(p_worker uuid)
returns setof tts_jobs
language plpgsql security definer set search_path = public as $$
declare
  v_job tts_jobs;
begin
  if not exists (select 1 from workers w where w.id = p_worker and w.user_id = auth.uid() and w.active) then
    raise exception 'worker inválido ou inativo';
  end if;

  if exists (select 1 from tts_jobs j
             where j.user_id = auth.uid() and j.status in ('claimed','processing')) then
    return;
  end if;

  update tts_jobs
     set status = 'claimed',
         worker_id = p_worker,
         started_at = coalesce(started_at, now())
   where id = (
     select id from tts_jobs
      where user_id = auth.uid() and status = 'queued'
      order by priority desc, created_at asc
      limit 1
      for update skip locked
   )
  returning * into v_job;

  if found then
    return next v_job;
  end if;
  return;
end $$;

-- §11 · Heartbeat (mantém o Worker como online)
create or replace function heartbeat_worker(p_worker uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update workers
     set last_seen = now(), status = 'online'
   where id = p_worker and user_id = auth.uid();
end $$;

-- §11 · Jobs de Workers que desapareceram voltam para a fila (não imediatamente;
-- somente após o timeout). Qualquer Worker autenticado pode chamar; apenas jobs
-- do próprio usuário são afetados.
create or replace function release_stale_tts_jobs(p_timeout_seconds integer default 300)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  with stale as (
    select j.id
      from tts_jobs j
      join workers w on w.id = j.worker_id
     where j.user_id = auth.uid()
       and j.status in ('claimed','processing')
       and w.last_seen < now() - make_interval(secs => p_timeout_seconds)
  )
  update tts_jobs j
     set status = 'queued', worker_id = null
    from stale
   where j.id = stale.id;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- §31 · Uso global da IA hoje (agregado, sem expor linhas de outros usuários)
create or replace function ai_usage_today()
returns table (total bigint, users bigint)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select count(*)::bigint,
         count(distinct r.user_id)::bigint
    from ai_requests r
   where r.created_at >= date_trunc('day', now());
end $$;

-- ═══════════════════════════════════════════════════════════════════════
-- RLS — tudo isolado por usuário (regra fundamental do projeto)
-- ═══════════════════════════════════════════════════════════════════════
alter table workers enable row level security;
alter table tts_jobs enable row level security;
alter table tts_job_chapters enable row level security;
alter table audio_segments enable row level security;
alter table tts_preferences enable row level security;
alter table ai_cache enable row level security;
alter table ai_requests enable row level security;

create policy "workers: próprio" on workers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tts_jobs: próprio" on tts_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "job_chapters: próprio" on tts_job_chapters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "audio_segments: próprio" on audio_segments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tts_preferences: próprio" on tts_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ai_cache: próprio" on ai_cache
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ai_requests: próprio" on ai_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_requests: inserir o próprio" on ai_requests
  for insert with check (auth.uid() = user_id);

-- As funções security definer acima verificam auth.uid() internamente e só
-- tocam dados do usuário autenticado. As funções NUNCA usam a service role.

-- ─── Storage: áudios dentro do bucket `audio` (criado na 0003) ─────────
-- Estrutura lógica (§16): {user_id}/{book_id}/chapter-NNN.mp3
-- As políticas da 0003 já garantem leitura apenas ao dono do primeiro
-- segmento de pasta (user_id). O Worker autentica como o próprio usuário,
-- portanto consegue subir apenas dentro da sua pasta (§42, §43).
