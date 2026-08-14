// ═══════════════════════════════════════════════════════════════════════
// ATHENEU TTS WORKER (Windows/Linux/macOS — Node 18+)
//
// Busca trabalhos na fila do Supabase, gera áudio LOCALMENTE (Kokoro/Piper),
// envia para o Storage e registra progresso/segmentos. Opera apenas com as
// permissões do usuário autenticado (§42, §43).
//
// Uso:
//   npm run worker:build
//   npm run worker               # usa workers/windows/worker.config.json
//   npm run worker -- --login    # primeiro login
// ═══════════════════════════════════════════════════════════════════════

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';
import { spawnSync } from 'child_process';
import { detectEngine, TTSProvider } from '../shared/provider';
import { segmentChapter } from '../shared/segmenter';
import { concatWav, wavSeconds, sha256File } from '../shared/audio';

// ─── Configuração central do Worker ─────────────────────────────────────
interface WorkerConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  deviceName: string;
  pollSeconds: number;        // ocioso: consome pouco (§8)
  heartbeatSeconds: number;
  engines: { kokoro?: any; piper?: any };
  convertToMp3: boolean;      // usa ffmpeg se disponível
  // Opcional: login não interativo (o config é local e deve ficar fora do git).
  email?: string;
  password?: string;
}

// O bundle roda em workers/windows/dist/, mas o config costuma ficar em
// workers/windows/ — procura nos dois lugares (e no cwd como último recurso).
const CONFIG_CANDIDATES = [
  path.join(__dirname, 'worker.config.json'),
  path.join(__dirname, '..', 'worker.config.json'),
  path.join(process.cwd(), 'workers', 'windows', 'worker.config.json'),
];

function loadConfig(): WorkerConfig {
  const cfgPath = CONFIG_CANDIDATES.find((p) => fs.existsSync(p));
  if (!cfgPath) {
    console.error('Crie workers/windows/worker.config.json (veja worker.config.example.json).');
    process.exit(1);
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    console.error('Preencha supabaseUrl e supabaseAnonKey no worker.config.json.');
    process.exit(1);
  }
  return { pollSeconds: 10, heartbeatSeconds: 30, convertToMp3: true, engines: {}, deviceName: os.hostname(), ...cfg };
}

// Sessão/estado do worker ficam FORA do projeto (nunca no git)
const STATE_DIR = path.join(os.homedir(), '.atheneu-worker');
const SESSION_FILE = path.join(STATE_DIR, 'session.json');
const STATE_FILE = path.join(STATE_DIR, 'state.json');

// Persistência de sessão em arquivo (fora do git)
const fileStorage = {
  getItem: (k: string) => {
    try { return fs.readFileSync(SESSION_FILE, 'utf8'); } catch { return null; }
  },
  setItem: (k: string, v: string) => {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(SESSION_FILE, v, { mode: 0o600 });
  },
  removeItem: () => { try { fs.unlinkSync(SESSION_FILE); } catch {} },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pad3 = (n: number) => String(n + 1).padStart(3, '0');

// §47 · Retentativas com backoff (5s → 15s → 45s)
async function withRetry<T>(fn: () => Promise<T>, what: string): Promise<T> {
  const delays = [5000, 15000, 45000];
  let lastErr: any;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt < delays.length) {
        log(`⚠ ${what} falhou; nova tentativa em ${delays[attempt] / 1000}s…`);
        await sleep(delays[attempt]);
      }
    }
  }
  throw lastErr;
}

let statusLine = '';
function log(msg: string) {
  statusLine = msg;
  console.log(`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`);
}

// ─── Worker ─────────────────────────────────────────────────────────────
class AtheneuWorker {
  cfg: WorkerConfig;
  sb: SupabaseClient;
  engine: TTSProvider | null = null;
  workerId: string | null = null;
  userId: string | null = null;
  userName = '';
  current: { book: string; chapter: number; total: number; progress: number } | null = null;
  cancelled = false;

  constructor(cfg: WorkerConfig) {
    this.cfg = cfg;
    this.sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { storage: fileStorage as any, persistSession: true, autoRefreshToken: true },
    });
  }

  async login(force = false) {
    if (force) await this.sb.auth.signOut();
    const { data } = await this.sb.auth.getSession();
    if (!data.session) {
      let email = this.cfg.email || '';
      let pass = this.cfg.password || '';
      if (!email || !pass) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const ask = (q: string) => new Promise<string>((res) => rl.question(q, res));
        email = await ask('E-mail da sua conta Atheneu: ');
        pass = await ask('Senha: ');
        rl.close();
      }
      const { error } = await this.sb.auth.signInWithPassword({ email, password: pass });
      if (error) { console.error('Falha no login:', error.message); process.exit(1); }
    }
    const { data: s } = await this.sb.auth.getSession();
    const u = s.session?.user;
    if (!u) throw new Error('Sessão inválida após o login — tente npm run worker -- --login');
    this.userId = u.id;
    this.userName = (u.user_metadata?.name as string) || u.email || '';
    log(`🔑 Autenticado como ${this.userName}`);
  }

  // §10 · Registro do dispositivo
  async register() {
    const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {};
    if (state.workerId) {
      const { data } = await this.sb.from('workers').select('id').eq('id', state.workerId).maybeSingle();
      if (data) { this.workerId = state.workerId; }
    }
    if (!this.workerId) {
      const { data, error } = await this.sb.from('workers').insert({
        user_id: this.userId, device_name: this.cfg.deviceName, platform: process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux',
        status: 'online', engine: this.engine?.name || '', engine_version: this.engine?.version || '',
        cpu: `${os.cpus().length} núcleos`, memory: `${Math.round(os.totalmem() / 1e9)} GB`,
      }).select().single();
      if (error) throw new Error('Não foi possível registrar o worker: ' + error.message);
      this.workerId = data.id;
      fs.mkdirSync(STATE_DIR, { recursive: true });
      fs.writeFileSync(STATE_FILE, JSON.stringify({ workerId: this.workerId }), { mode: 0o600 });
      log(`📟 Worker registrado: ${this.cfg.deviceName}`);
    }
  }

  // §11 · Heartbeat periódico
  startHeartbeat() {
    setInterval(async () => {
      try { await this.sb.rpc('heartbeat_worker', { p_worker: this.workerId }); } catch {}
    }, this.cfg.heartbeatSeconds * 1000);
    setInterval(async () => {
      try { await this.sb.rpc('release_stale_tts_jobs', { p_timeout_seconds: 300 }); } catch {}
    }, 60_000);
  }

  async claim() {
    const { data, error } = await this.sb.rpc('claim_next_tts_job', { p_worker: this.workerId });
    if (error) throw new Error(error.message);
    return (data && data[0]) || null;
  }

  async processJob(job: any) {
    this.cancelled = false;
    const { data: book } = await this.sb.from('books').select('title').eq('id', job.book_id).single();
    const { data: chapters } = await this.sb.from('book_chapters').select('*').eq('book_id', job.book_id).order('idx');
    if (!chapters || chapters.length === 0) {
      await this.failJob(job.id, 'Livro sem capítulos processados.');
      return;
    }
    log(`▶ ${book?.title}: ${chapters.length} capítulos (engine: ${this.engine?.name})`);

    // Garante linhas de progresso por capítulo (§13)
    const { data: existing } = await this.sb.from('tts_job_chapters').select('*').eq('job_id', job.id);
    const rows = new Map((existing || []).map((r: any) => [r.chapter_idx, r]));
    for (const ch of chapters) {
      if (!rows.has(ch.idx)) {
        const { data: ins } = await this.sb.from('tts_job_chapters').insert({
          job_id: job.id, user_id: this.userId, chapter_idx: ch.idx, status: 'pending',
          segments_total: segmentChapter(ch.content).length,
        }).select().single();
        if (ins) rows.set(ch.idx, ins);
      }
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atheneu-'));
    try {
      for (let i = 0; i < chapters.length; i++) {
        if (this.cancelled) break;
        const ch = chapters[i];
        const row: any = rows.get(ch.idx);
        if (row?.status === 'done') continue; // §14 · nunca reprocessa capítulo concluído
        this.current = { book: book?.title || '', chapter: i, total: chapters.length, progress: job.progress };
        await this.sb.from('tts_jobs').update({ status: 'processing', current_chapter: i }).eq('id', job.id);
        await this.processChapter(job, ch, row, tmpDir);
        const progress = (i + 1) / chapters.length;
        await this.sb.from('tts_jobs').update({ progress }).eq('id', job.id);
      }

      if (!this.cancelled) {
        await this.sb.from('tts_jobs').update({ status: 'completed', progress: 1, completed_at: new Date().toISOString() }).eq('id', job.id);
        await this.sb.from('audiobooks').upsert({ book_id: job.book_id, user_id: this.userId, status: 'ready', total_seconds: 0 });
        log(`✅ ${book?.title} concluído.`);
      }
    } catch (e: any) {
      await this.failJob(job.id, String(e?.message || e));
    } finally {
      // §49 · limpeza dos temporários
      fs.rmSync(tmpDir, { recursive: true, force: true });
      this.current = null;
    }
  }

  async processChapter(job: any, ch: any, row: any, tmpDir: string) {
    const segments = segmentChapter(ch.content);
    const startIdx = row?.segments_done || 0; // §14 · retoma do segmento confirmado
    if (startIdx > 0) log(`  ↻ Retomando capítulo ${ch.idx + 1} do segmento ${startIdx + 1}`);
    await this.sb.from('tts_job_chapters').update({ status: 'processing' }).eq('job_id', job.id).eq('chapter_idx', ch.idx);

    const wavFiles: string[] = [];
    const segTimings: { idx: number; start: number; end: number; audioStart: number; audioEnd: number }[] = [];
    let accSeconds = 0;

    for (let s = startIdx; s < segments.length; s++) {
      if (this.cancelled) return;
      const seg = segments[s];
      const out = path.join(tmpDir, `seg-${ch.idx}-${s}.wav`);
      await withRetry(
        () => this.engine!.synthesize(seg.text, { voice: job.voice || this.cfg.engines?.kokoro?.voice || '', speed: job.speed || 1, outFile: out }),
        `TTS capítulo ${ch.idx + 1} segmento ${s + 1}`
      );
      const dur = wavSeconds(fs.readFileSync(out));
      segTimings.push({ idx: s, start: seg.start, end: seg.end, audioStart: accSeconds, audioEnd: accSeconds + dur });
      accSeconds += dur;
      wavFiles.push(out);
      // progresso granular persistido a cada segmento (§14)
      await this.sb.from('tts_job_chapters').update({ segments_done: s + 1 }).eq('job_id', job.id).eq('chapter_idx', ch.idx);
      if (s % 5 === 0) await this.sb.from('tts_jobs').update({ current_segment: s }).eq('id', job.id);
    }

    // §15 · valida, mede, envia, registra
    const wavOut = path.join(tmpDir, `chapter-${pad3(ch.idx)}.wav`);
    concatWav(wavFiles, wavOut);
    let finalFile = wavOut;
    let format = 'wav';
    if (this.cfg.convertToMp3 && spawnSync('ffmpeg', ['-version']).status === 0) {
      const mp3Out = wavOut.replace(/\.wav$/, '.mp3');
      const r = spawnSync('ffmpeg', ['-y', '-i', wavOut, '-codec:a', 'libmp3lame', '-qscale:a', '4', mp3Out], { stdio: 'ignore' });
      if (r.status === 0 && fs.existsSync(mp3Out)) { finalFile = mp3Out; format = 'mp3'; }
    }

    const size = fs.statSync(finalFile).size;
    const hash = sha256File(finalFile);
    if (size < 500) throw new Error('Arquivo de áudio gerado está vazio/corrompido.');
    const seconds = wavSeconds(fs.readFileSync(wavOut));

    // §16 · {user}/{book}/chapter-NNN.{format}
    const key = `${this.userId}/${job.book_id}/chapter-${pad3(ch.idx)}.${format}`;
    await withRetry(async () => {
      const { error } = await this.sb.storage.from('audio').upload(key, fs.readFileSync(finalFile), {
        contentType: format === 'mp3' ? 'audio/mpeg' : 'audio/wav', upsert: true,
      });
      if (error) throw new Error(error.message);
    }, `upload capítulo ${ch.idx + 1}`);

    // §18 · segmentos de sincronização texto↔áudio
    await this.sb.from('audio_segments').delete().eq('book_id', job.book_id).eq('chapter_idx', ch.idx);
    if (segTimings.length > 0) {
      await this.sb.from('audio_segments').insert(segTimings.map((t) => ({
        user_id: this.userId, book_id: job.book_id, chapter_idx: ch.idx, segment_index: t.idx,
        text_start: t.start, text_end: t.end, audio_start: t.audioStart, audio_end: t.audioEnd,
      })));
    }

    await this.sb.from('tts_job_chapters').update({
      status: 'done', storage_key: key, format, seconds, file_size: size, file_hash: hash,
      segments_done: segments.length, segments_total: segments.length,
    }).eq('job_id', job.id).eq('chapter_idx', ch.idx);
    log(`  ✔ Capítulo ${ch.idx + 1} enviado (${format}, ${Math.round(seconds)}s, ${Math.round(size / 1024)} kB)`);
    wavFiles.forEach((f) => fs.rmSync(f, { force: true })); // §49
  }

  async failJob(jobId: string, message: string) {
    log(`✖ Job falhou: ${message}`);
    await this.sb.from('tts_jobs').update({ status: 'failed', error_message: message.slice(0, 500) }).eq('id', jobId);
  }

  // ─── Loop principal ───────────────────────────────────────────────────
  async loop() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        this.render();
        const job = await this.claim(); // §12 · claim atômico
        if (job) {
          await this.sb.from('tts_jobs').update({ status: 'claimed' }).eq('id', job.id);
          await this.processJob(job);
        } else {
          await sleep(this.cfg.pollSeconds * 1000);
        }
      } catch (e: any) {
        log(`⚠ Erro no loop: ${e?.message || e}`);
        await sleep(this.cfg.pollSeconds * 1000);
      }
    }
  }

  // Interface simples no terminal (§8)
  render() {
    const bar = (p: number) => {
      const n = Math.round(p * 12);
      return '█'.repeat(n) + '░'.repeat(12 - n);
    };
    process.stdout.write('\x1b[2J\x1b[H');
    console.log('┌──────────────────────────────────────────────┐');
    console.log('│  TTS WORKER · ATHENEU                        │');
    console.log('├──────────────────────────────────────────────┤');
    console.log(`│  🟢 Conectado                                │`);
    console.log(`│  Usuário:  ${this.userName.slice(0, 33).padEnd(33)}│`);
    console.log(`│  Worker:   ${'Ativo'.padEnd(33)}│`);
    console.log(`│  Engine:   ${(this.engine?.name || 'nenhum').padEnd(33)}│`);
    if (this.current) {
      console.log('├──────────────────────────────────────────────┤');
      console.log(`│  📖 ${this.current.book.slice(0, 40).padEnd(40)}│`);
      console.log(`│  Capítulo ${this.current.chapter + 1}/${this.current.total}`.padEnd(47) + '│');
      console.log(`│  ${bar(this.current.progress)} ${String(Math.round(this.current.progress * 100)).padStart(3)}%`.padEnd(47) + '│');
    } else {
      console.log('├──────────────────────────────────────────────┤');
      console.log(`│  Fila vazia — aguardando trabalhos…          │`);
    }
    console.log(`│  ${statusLine.slice(0, 43).padEnd(43)}│`);
    console.log('└──────────────────────────────────────────────┘');
  }

  async start(forceLogin: boolean) {
    log('🔑 Autenticando…');
    await this.login(forceLogin);
    log(`🔑 Autenticado como ${this.userName}`);
    this.engine = detectEngine(this.cfg.engines);
    if (!this.engine) {
      log('⚠ Nenhum engine local encontrado (Kokoro/Piper). Instale um engine — veja docs/TTS_WORKERS.md.');
      log('  O worker ficará online, mas não conseguirá processar até um engine ser detectado.');
    } else {
      log(`🔉 Engine detectado: ${this.engine.name} (${this.engine.version})`);
    }
    await this.register();
    log(`📟 Worker registrado: ${this.cfg.deviceName}`);
    await this.sb.from('workers').update({ engine: this.engine?.name || '', engine_version: this.engine?.version || '' }).eq('id', this.workerId);
    this.startHeartbeat();
    process.on('SIGINT', () => { log('Encerrando — o estado do trabalho foi preservado no Supabase.'); process.exit(0); });
    await this.loop();
  }
}

const cfg = loadConfig();
const worker = new AtheneuWorker(cfg);
worker.start(process.argv.includes('--login')).catch((e) => {
  console.error('Erro fatal:', e?.message || e);
  console.error(e?.stack || '');
  process.exit(1);
});
