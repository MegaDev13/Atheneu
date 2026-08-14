// ─── Backend Supabase (produção) ─────────────────────────────────────────────
// Todas as consultas respeitam RLS: cada usuário só acessa os próprios dados.
// O frontend nunca usa a service role key — apenas a chave pública (anon).

import { supabase } from '../lib/supabase';
import type { Backend } from './backend';
import { uid } from '../lib/utils';
import type {
  Activity, AudioProgress, Book, Chapter, Goal, Highlight, Note, Notification,
  Profile, Progress, ReadingSession, SessionUser, SocialBundle,
} from '../lib/types';

function req<T>(data: T | null, error: any): T {
  if (error) throw new Error(error.message || 'Erro no servidor');
  return data as T;
}

const mapBook = (r: any): Book => ({
  id: r.id, title: r.title, author: r.author, genre: r.genre, description: r.description || '',
  cover: r.cover_url, format: r.format, status: r.status, pages: r.pages || 0, rating: r.rating || 0,
  addedAt: new Date(r.added_at).getTime(), lastAccess: new Date(r.last_access).getTime(),
  fileKey: r.file_key, fileSize: r.file_size || 0,
});
const unmapBook = (userId: string, b: Book) => ({
  id: b.id, user_id: userId, title: b.title, author: b.author, genre: b.genre,
  description: b.description, cover_url: b.cover, format: b.format, status: b.status,
  pages: b.pages, rating: b.rating, added_at: new Date(b.addedAt).toISOString(),
  last_access: new Date(b.lastAccess).toISOString(), file_key: b.fileKey, file_size: b.fileSize,
});

const mapProfile = (r: any): Profile => ({
  id: r.id, name: r.name, email: r.email, bio: r.bio || '', color: r.avatar_color || '#6e1f2b',
  onboarded: !!r.onboarded, prefs: r.prefs || { interests: [], yearlyGoal: 12, frequency: 'daily', format: 'read', audioRate: 1 },
  privacy: r.privacy || { library: 'public', progress: 'followers', activity: 'followers', notes: 'private', highlights: 'private' },
  createdAt: new Date(r.created_at).getTime(),
});

const supabaseBackendImpl = {
  mode: 'supabase',

  async init() {
    const { data } = await supabase!.auth.getSession();
    const s = data.session;
    if (!s) return { user: null };
    return { user: { id: s.user.id, email: s.user.email || '', name: (s.user.user_metadata?.name as string) || '' } };
  },

  async signUp(name, email, password) {
    const { data, error } = await supabase!.auth.signUp({
      email, password, options: { data: { name } },
    });
    if (error) return { ok: false, message: error.message };
    if (!data.session) return { ok: true, message: 'Verifique seu e-mail para confirmar a conta.' };
    return { ok: true };
  },

  async signIn(email, password) {
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  },

  async signOut() {
    await supabase!.auth.signOut();
  },

  async resetPassword(email) {
    const { error } = await supabase!.auth.resetPasswordForEmail(email);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Enviamos um link de recuperação para o seu e-mail.' };
  },

  onAuthChange(cb) {
    const { data } = supabase!.auth.onAuthStateChange((_ev, session) => {
      cb(session ? { id: session.user.id, email: session.user.email || '', name: (session.user.user_metadata?.name as string) || '' } : null);
    });
    return () => data.subscription.unsubscribe();
  },

  async getProfile(userId) {
    const { data, error } = await supabase!.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapProfile(data) : null;
  },

  async saveProfile(userId, patch) {
    const row: any = { id: userId };
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.bio !== undefined) row.bio = patch.bio;
    if (patch.color !== undefined) row.avatar_color = patch.color;
    if (patch.onboarded !== undefined) row.onboarded = patch.onboarded;
    if (patch.prefs !== undefined) row.prefs = patch.prefs;
    if (patch.privacy !== undefined) row.privacy = patch.privacy;
    const { error } = await supabase!.from('profiles').upsert(row);
    req({}, error);
  },

  async listBooks(userId) {
    const { data, error } = await supabase!.from('books').select('*').eq('user_id', userId).order('last_access', { ascending: false });
    return req(data, error).map(mapBook);
  },

  async saveBook(userId, book) {
    const { error } = await supabase!.from('books').upsert(unmapBook(userId, book));
    req({}, error);
  },

  async deleteBook(userId, bookId) {
    const { error } = await supabase!.from('books').delete().eq('id', bookId).eq('user_id', userId);
    req({}, error);
  },

  async getChapters(bookId) {
    const { data, error } = await supabase!.from('book_chapters').select('*').eq('book_id', bookId).order('idx');
    return req(data, error).map((r: any) => ({ id: r.id, bookId: r.book_id, index: r.idx, title: r.title, text: r.content }));
  },

  async saveChapters(chapters) {
    const rows = chapters.map((c) => ({ id: c.id, book_id: c.bookId, idx: c.index, title: c.title, content: c.text }));
    const { error } = await supabase!.from('book_chapters').upsert(rows);
    req({}, error);
  },

  async saveFile(userId, bookId, file) {
    const key = `${userId}/${bookId}/${file.name}`;
    const { error } = await supabase!.storage.from('books').upload(key, file, { upsert: true });
    req({}, error);
    return key;
  },

  async saveCover(userId, bookId, dataUrl) {
    const blob = await (await fetch(dataUrl)).blob();
    const key = `${userId}/${bookId}/cover.png`;
    const { error } = await supabase!.storage.from('covers').upload(key, blob, { upsert: true, contentType: 'image/png' });
    req({}, error);
    const { data } = supabase!.storage.from('covers').getPublicUrl(key);
    return data.publicUrl;
  },

  async listProgress(userId) {
    const { data, error } = await supabase!.from('reading_progress').select('*').eq('user_id', userId);
    return req(data, error).map((r: any) => ({ bookId: r.book_id, chapter: r.chapter, location: r.location, page: r.page, updatedAt: new Date(r.updated_at).getTime() }));
  },

  async saveProgress(userId, p) {
    const { error } = await supabase!.from('reading_progress').upsert({
      user_id: userId, book_id: p.bookId, chapter: p.chapter, location: p.location, page: p.page,
      updated_at: new Date(p.updatedAt).toISOString(),
    });
    req({}, error);
  },

  async listSessions(userId) {
    const { data, error } = await supabase!.from('reading_sessions').select('*').eq('user_id', userId);
    return req(data, error).map((r: any) => ({ id: r.id, bookId: r.book_id, start: new Date(r.started_at).getTime(), end: new Date(r.ended_at).getTime(), pageStart: r.page_start, pageEnd: r.page_end }));
  },

  async saveSession(userId, s) {
    const { error } = await supabase!.from('reading_sessions').upsert({
      id: s.id, user_id: userId, book_id: s.bookId,
      started_at: new Date(s.start).toISOString(), ended_at: new Date(s.end).toISOString(),
      page_start: s.pageStart, page_end: s.pageEnd,
    });
    req({}, error);
  },

  async listHighlights(userId, bookId) {
    let q = supabase!.from('highlights').select('*').eq('user_id', userId);
    if (bookId) q = q.eq('book_id', bookId);
    const { data, error } = await q;
    return req(data, error).map((r: any) => ({ id: r.id, bookId: r.book_id, chapter: r.chapter, start: r.start_pos, end: r.end_pos, text: r.text, color: r.color, createdAt: new Date(r.created_at).getTime() }));
  },

  async saveHighlight(userId, h) {
    const { error } = await supabase!.from('highlights').upsert({
      id: h.id, user_id: userId, book_id: h.bookId, chapter: h.chapter, start_pos: h.start, end_pos: h.end,
      text: h.text, color: h.color, created_at: new Date(h.createdAt).toISOString(),
    });
    req({}, error);
  },

  async deleteHighlight(userId, id) {
    const { error } = await supabase!.from('highlights').delete().eq('id', id).eq('user_id', userId);
    req({}, error);
  },

  async listNotes(userId) {
    const { data, error } = await supabase!.from('notes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return req(data, error).map((r: any) => ({ id: r.id, bookId: r.book_id, chapter: r.chapter, excerpt: r.excerpt, text: r.text, tags: r.tags || [], review: !!r.review, createdAt: new Date(r.created_at).getTime() }));
  },

  async saveNote(userId, n) {
    const { error } = await supabase!.from('notes').upsert({
      id: n.id, user_id: userId, book_id: n.bookId, chapter: n.chapter, excerpt: n.excerpt,
      text: n.text, tags: n.tags, review: n.review, created_at: new Date(n.createdAt).toISOString(),
    });
    req({}, error);
  },

  async deleteNote(userId, id) {
    const { error } = await supabase!.from('notes').delete().eq('id', id).eq('user_id', userId);
    req({}, error);
  },

  async listGoals(userId) {
    const { data, error } = await supabase!.from('reading_goals').select('*').eq('user_id', userId);
    return req(data, error).map((r: any) => ({ id: r.id, kind: r.kind, target: r.target, period: r.period, createdAt: new Date(r.created_at).getTime() }));
  },

  async saveGoal(userId, g) {
    const { error } = await supabase!.from('reading_goals').upsert({
      id: g.id, user_id: userId, kind: g.kind, target: g.target, period: g.period,
      created_at: new Date(g.createdAt).toISOString(),
    });
    req({}, error);
  },

  async deleteGoal(userId, id) {
    const { error } = await supabase!.from('reading_goals').delete().eq('id', id).eq('user_id', userId);
    req({}, error);
  },

  async listActivities(userId) {
    const { data, error } = await supabase!.from('activities').select('*').eq('user_id', userId).order('at', { ascending: false }).limit(120);
    return req(data, error).map((r: any) => ({ id: r.id, kind: r.kind, bookId: r.book_id, text: r.text, at: new Date(r.at).getTime() }));
  },

  async addActivity(userId, a) {
    const { error } = await supabase!.from('activities').insert({
      user_id: userId, kind: a.kind, book_id: a.bookId, text: a.text, at: new Date(a.at).toISOString(),
    });
    req({}, error);
  },

  async getAudioProgress(userId, bookId) {
    const { data, error } = await supabase!.from('audio_progress').select('*').eq('user_id', userId).eq('book_id', bookId).maybeSingle();
    req(data ?? {}, error);
    if (!data) return null;
    return { bookId: data.book_id, chapter: data.chapter, seconds: data.seconds, rate: data.rate, updatedAt: new Date(data.updated_at).getTime() };
  },

  async saveAudioProgress(userId, a) {
    const { error } = await supabase!.from('audio_progress').upsert({
      user_id: userId, book_id: a.bookId, chapter: a.chapter, seconds: a.seconds, rate: a.rate,
      updated_at: new Date(a.updatedAt).toISOString(),
    });
    req({}, error);
  },

  async listNotifications(userId) {
    const { data, error } = await supabase!.from('notifications').select('*').eq('user_id', userId).order('at', { ascending: false }).limit(40);
    return req(data, error).map((r: any) => ({ id: r.id, icon: r.icon, text: r.text, at: new Date(r.at).getTime(), read: !!r.read, href: r.href }));
  },

  async markNotificationsRead(userId) {
    const { error } = await supabase!.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    req({}, error);
  },

  async getSocial(userId) {
    // Fase Social 1 em Supabase: lista de quem você segue + feed com a própria
    // atividade. Perfis públicos completos, presença e clubes dependem das
    // tabelas da migration 0002 e são ativados progressivamente.
    let following: string[] = [];
    try {
      const { data } = await supabase!.from('follows').select('followee_id').eq('follower_id', userId);
      following = (data || []).map((r: any) => r.followee_id);
    } catch (e) {
      console.warn('Tabela follows ainda não aplicada?', e);
    }
    const empty: SocialBundle = { people: [], following, readers: {}, feed: [], comments: [], clubs: [] };
    return empty;
  },

  async toggleFollow(userId, personId) {
    const { data: existing } = await supabase!.from('follows')
      .select('follower_id').eq('follower_id', userId).eq('followee_id', personId).maybeSingle();
    if (existing) {
      await supabase!.from('follows').delete().eq('follower_id', userId).eq('followee_id', personId);
    } else {
      await supabase!.from('follows').insert({ follower_id: userId, followee_id: personId });
    }
    const { data } = await supabase!.from('follows').select('followee_id').eq('follower_id', userId);
    return (data || []).map((r: any) => r.followee_id);
  },
} satisfies Partial<Backend>;

export const unused = uid; // mantém util importado para futuras extensões

// ─── Extensão: Workers / fila de TTS / IA (migration 0004) ─────────────
// Todas as chamadas usam o JWT do usuário autenticado; o RLS garante o
// isolamento. O claim de jobs é transacional via RPC (for update skip locked).

const mapWorkerRow = (r: any): import('../lib/types').TtsWorker => ({
  id: r.id, deviceName: r.device_name, platform: r.platform, status: r.status, active: r.active,
  engine: r.engine, engineVersion: r.engine_version, cpu: r.cpu, memory: r.memory,
  battery: r.battery, lastSeen: new Date(r.last_seen).getTime(), createdAt: new Date(r.created_at).getTime(),
});

const mapJobRow = (r: any): import('../lib/types').TtsJob => ({
  id: r.id, bookId: r.book_id, status: r.status, priority: r.priority, workerId: r.worker_id,
  currentChapter: r.current_chapter, currentSegment: r.current_segment, progress: r.progress,
  engine: r.engine, voice: r.voice, speed: r.speed, attempts: r.attempts,
  createdAt: new Date(r.created_at).getTime(),
  startedAt: r.started_at ? new Date(r.started_at).getTime() : null,
  completedAt: r.completed_at ? new Date(r.completed_at).getTime() : null,
  errorMessage: r.error_message,
});

Object.assign(supabaseBackendImpl, {
  async listWorkers(userId: string) {
    const { data, error } = await supabase!.from('workers').select('*').eq('user_id', userId).order('last_seen', { ascending: false });
    return req(data, error).map(mapWorkerRow);
  },

  async updateWorker(userId: string, workerId: string, patch: any) {
    const row: any = {};
    if (patch.deviceName !== undefined) row.device_name = patch.deviceName;
    if (patch.active !== undefined) row.active = patch.active;
    if (Object.keys(row).length === 0) return;
    const { error } = await supabase!.from('workers').update(row).eq('id', workerId).eq('user_id', userId);
    req({}, error);
  },

  async deleteWorker(userId: string, workerId: string) {
    const { error } = await supabase!.from('workers').delete().eq('id', workerId).eq('user_id', userId);
    req({}, error);
  },

  async getTtsPrefs(userId: string) {
    const { data, error } = await supabase!.from('tts_preferences').select('*').eq('user_id', userId).maybeSingle();
    req(data ?? {}, error);
    return {
      engine: data?.engine || 'kokoro', voice: data?.voice || '', speed: data?.speed || 1,
      language: data?.language || 'pt-BR', quality: data?.quality || 'high',
    };
  },

  async saveTtsPrefs(userId: string, prefs: any) {
    const { error } = await supabase!.from('tts_preferences').upsert({
      user_id: userId, engine: prefs.engine, voice: prefs.voice, speed: prefs.speed,
      language: prefs.language, quality: prefs.quality, updated_at: new Date().toISOString(),
    });
    req({}, error);
  },

  async listJobs(userId: string) {
    const { data, error } = await supabase!.from('tts_jobs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    return req(data, error).map(mapJobRow);
  },

  async createJob(userId: string, bookId: string, priority: number, prefs: any) {
    const { data, error } = await supabase!.from('tts_jobs').insert({
      user_id: userId, book_id: bookId, priority, status: 'queued',
      engine: prefs.engine, voice: prefs.voice, speed: prefs.speed,
    }).select().single();
    return mapJobRow(req(data, error));
  },

  async cancelJob(userId: string, jobId: string) {
    const { error } = await supabase!.from('tts_jobs')
      .update({ status: 'cancelled' })
      .eq('id', jobId).eq('user_id', userId)
      .in('status', ['queued', 'claimed', 'processing', 'paused']);
    req({}, error);
  },

  async getBookAudioState(userId: string, bookId: string): Promise<import('../lib/types').BookAudioState> {
    const { data: jobs, error: e1 } = await supabase!.from('tts_jobs')
      .select('*').eq('user_id', userId).eq('book_id', bookId).order('created_at', { ascending: false }).limit(1);
    req(jobs, e1);
    const job = jobs && jobs[0] ? mapJobRow(jobs[0]) : null;
    let chapters: any[] = [];
    if (job) {
      const { data, error } = await supabase!.from('tts_job_chapters')
        .select('*').eq('user_id', userId).eq('job_id', job.id).order('chapter_idx');
      chapters = req(data, error).map((c: any) => ({
        jobId: c.job_id, chapterIdx: c.chapter_idx, status: c.status, storageKey: c.storage_key,
        format: c.format, seconds: c.seconds, fileSize: c.file_size, fileHash: c.file_hash,
        segmentsDone: c.segments_done, segmentsTotal: c.segments_total,
      }));
    }
    const { data: bch, error: e2 } = await supabase!.from('book_chapters').select('id').eq('book_id', bookId);
    req(bch, e2);
    return {
      job, chapters,
      readyChapters: chapters.filter((c) => c.status === 'done').length,
      totalChapters: (bch ?? []).length,
    };
  },

  async getAudioUrl(userId: string, bookId: string, chapterIdx: number) {
    // §16: {user}/{book}/chapter-NNN.mp3 · URL assinada (arquivo privado)
    const key = `${userId}/${bookId}/chapter-${String(chapterIdx + 1).padStart(3, '0')}.mp3`;
    const { data, error } = await supabase!.storage.from('audio').createSignedUrl(key, 3600);
    if (error) return null;
    return data.signedUrl;
  },

  async getAudioSegments(userId: string, bookId: string, chapterIdx: number) {
    const { data, error } = await supabase!.from('audio_segments')
      .select('*').eq('user_id', userId).eq('book_id', bookId).eq('chapter_idx', chapterIdx)
      .order('segment_index');
    return req(data, error).map((s: any) => ({
      chapterIdx: s.chapter_idx, segmentIndex: s.segment_index,
      textStart: s.text_start, textEnd: s.text_end, audioStart: s.audio_start, audioEnd: s.audio_end,
    }));
  },

  async aiGetCache(userId: string, operation: string, hash: string) {
    const { data, error } = await supabase!.from('ai_cache')
      .select('*').eq('user_id', userId).eq('operation', operation).eq('request_hash', hash)
      .gt('expires_at', new Date().toISOString()).maybeSingle();
    req(data ?? {}, error);
    if (!data) return null;
    return {
      hash: data.request_hash, operation: data.operation, response: data.response?.text ?? '',
      model: data.model, createdAt: new Date(data.created_at).getTime(), expiresAt: new Date(data.expires_at).getTime(),
    };
  },

  async aiSetCache(userId: string, entry: any) {
    const { error } = await supabase!.from('ai_cache').upsert({
      user_id: userId, request_hash: entry.hash, operation: entry.operation,
      response: { text: entry.response }, model: entry.model,
      expires_at: new Date(entry.expiresAt).toISOString(),
    }, { onConflict: 'user_id,operation,request_hash' });
    req({}, error);
  },

  async aiLogRequest(userId: string, entry: any) {
    const { error } = await supabase!.from('ai_requests').insert({
      user_id: userId, operation: entry.operation, request_hash: entry.hash,
      model: entry.model, status: entry.status, tokens_estimated: entry.tokensEstimated,
      created_at: new Date(entry.at).toISOString(),
    });
    req({}, error);
  },

  async aiCountToday(userId: string) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const { count, error } = await supabase!.from('ai_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId).neq('status', 'cache').gte('created_at', dayStart.toISOString());
    req({}, error);
    return count || 0;
  },

  async aiGlobalToday() {
    // Agregado via RPC security definer (não expõe linhas de outros usuários)
    const { data, error } = await supabase!.rpc('ai_usage_today');
    if (error) {
      console.warn('ai_usage_today indisponível:', error.message);
      return 0;
    }
    return Number(data?.[0]?.total || 0);
  },

  async getBookFileUrl(userId: string, book: import('../lib/types').Book) {
    // Arquivos privados: URL assinada do bucket `books` (1h de validade).
    if (!book.fileKey) return null;
    const { data, error } = await supabase!.storage.from('books').createSignedUrl(book.fileKey, 3600);
    if (error) {
      console.warn('URL assinada indisponível:', error.message);
      return null;
    }
    return data.signedUrl;
  },
});

export const supabaseBackend = supabaseBackendImpl as Backend;

// ─── Anotações independentes do PDF (migration 0005) ───
const mapAnnRow = (r: any): import('../lib/types').PdfAnnotation => ({
  id: r.id, bookId: r.book_id, page: r.page, type: r.type, text: r.text,
  name: r.name, comment: r.comment, color: r.color, rects: r.rects || [],
  createdAt: new Date(r.created_at).getTime(), updatedAt: new Date(r.updated_at).getTime(),
});

Object.assign(supabaseBackend, {
  async listAnnotations(userId: string, bookId?: string) {
    let q = supabase!.from('pdf_annotations').select('*').eq('user_id', userId).order('page');
    if (bookId) q = q.eq('book_id', bookId);
    const { data, error } = await q;
    return req(data, error).map(mapAnnRow);
  },
  async saveAnnotation(userId: string, a: import('../lib/types').PdfAnnotation) {
    const { error } = await supabase!.from('pdf_annotations').upsert({
      id: a.id, user_id: userId, book_id: a.bookId, page: a.page, type: a.type,
      text: a.text, name: a.name, comment: a.comment, color: a.color, rects: a.rects,
      updated_at: new Date(a.updatedAt).toISOString(),
    });
    req({}, error);
  },
  async deleteAnnotation(userId: string, id: string) {
    const { error } = await supabase!.from('pdf_annotations').delete().eq('id', id).eq('user_id', userId);
    req({}, error);
  },
} as any);

// ─── Comunidade: presença + chat (migrations 0002/0006) ───
const ONLINE_WINDOW = 3 * 60 * 1000;

// Id determinístico p/ DM (mesmo par → mesma conversa), sem uuid v5 nativo
function dmConversationId(a: string, b: string): string {
  const [x, y] = [a, b].sort();
  const s = 'dm|' + x + '|' + y;
  const bytes = new TextEncoder().encode(s);
  const words: number[] = [];
  for (let seed = 0; seed < 8; seed++) {
    let h = (0x811c9dc5 ^ Math.imul(seed + 1, 0x9e3779b9)) >>> 0;
    for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193) >>> 0; }
    words.push(h >>> 0);
  }
  const hx = words.map((w) => w.toString(16).padStart(8, '0')).join('');
  return `${hx.slice(0, 8)}-${hx.slice(8, 12)}-4${hx.slice(13, 16)}-a${hx.slice(17, 20)}-${hx.slice(20, 32)}`;
}

Object.assign(supabaseBackend, {
  async listUsers(userId: string): Promise<import('../lib/types').CommunityUser[]> {
    const { data, error } = await supabase!.from('public_users').select('*');
    req(data, error);
    const now = Date.now();
    return (data as any[]).map((u) => ({
      id: u.id, name: u.name || 'Leitor(a)', color: u.avatar_color || '#6e1f2b', bio: u.bio || '',
      lastSeen: new Date(u.last_seen).getTime(),
      online: now - new Date(u.last_seen).getTime() < ONLINE_WINDOW,
      isSelf: u.id === userId,
      totalBooks: u.total_books || 0, readingNow: u.reading_now || 0,
    })).sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name, 'pt'));
  },

  async sendHeartbeat(userId: string) {
    await supabase!.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', userId);
  },

  async listConversations(userId: string): Promise<import('../lib/types').Conversation[]> {
    const { data: members, error } = await supabase!.from('conversation_members')
      .select('conversation_id').eq('user_id', userId);
    req(members, error);
    const ids = (members || []).map((m: any) => m.conversation_id);
    if (ids.length === 0) return [];
    const { data: convs, error: e2 } = await supabase!.from('conversations')
      .select('id, kind').in('id', ids).eq('kind', 'dm');
    req(convs, e2);
    const { data: allMembers, error: e3 } = await supabase!.from('conversation_members')
      .select('conversation_id, user_id').in('conversation_id', ids);
    req(allMembers, e3);
    const { data: users, error: e4 } = await supabase!.from('public_users').select('id, name, avatar_color, last_seen');
    req(users, e4);
    const uMap = new Map((users as any[]).map((u) => [u.id, u]));
    const now = Date.now();
    const out: import('../lib/types').Conversation[] = [];
    for (const c of convs as any[]) {
      const otherId = (allMembers as any[]).find((m) => m.conversation_id === c.id && m.user_id !== userId)?.user_id;
      const other = otherId ? uMap.get(otherId) : null;
      const { data: last } = await supabase!.from('messages')
        .select('text, created_at').eq('conversation_id', c.id)
        .order('created_at', { ascending: false }).limit(1);
      out.push({
        id: c.id, kind: 'dm', otherUserId: otherId || null,
        otherUserName: other?.name || 'Leitor(a)',
        otherUserColor: other?.avatar_color || '#6e1f2b',
        otherUserOnline: other ? now - new Date(other.last_seen).getTime() < ONLINE_WINDOW : false,
        lastMessage: last?.[0]?.text, lastAt: last?.[0] ? new Date(last[0].created_at).getTime() : undefined,
      });
    }
    return out.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
  },

  async openDm(userId: string, otherId: string): Promise<import('../lib/types').Conversation[]> {
    // DM determinística: o mesmo par de usuários sempre deriva o mesmo id,
    // então os dois lados encontram a mesma conversa sem RETURNING (RLS-safe).
    const id = dmConversationId(userId, otherId);
    const e1: any = await supabase!.from('conversations').insert({ id, kind: 'dm' }).then((r) => r.error);
    if (e1 && e1.code !== '23505') req({}, e1);
    const e2: any = await supabase!.from('conversation_members')
      .insert({ conversation_id: id, user_id: userId }).then((r) => r.error);
    if (e2 && e2.code !== '23505') req({}, e2);
    return (supabaseBackend as any).listConversations(userId);
  },

  async listMessages(userId: string, conversationId: string): Promise<import('../lib/types').ChatMessage[]> {
    const { data, error } = await supabase!.from('messages')
      .select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(300);
    req(data, error);
    return (data as any[]).map((m) => ({
      id: m.id, conversationId: m.conversation_id, userId: m.user_id, text: m.text,
      at: new Date(m.created_at).getTime(),
    }));
  },

  async sendMessage(userId: string, conversationId: string, text: string): Promise<import('../lib/types').ChatMessage[]> {
    const { data, error } = await supabase!.from('messages')
      .insert({ conversation_id: conversationId, user_id: userId, text })
      .select().single();
    req(data, error);
    return {
      id: data.id, conversationId, userId, text: data.text, at: new Date(data.created_at).getTime(),
    } as any;
  },

  onChatMessage(conversationId: string, cb: (m: import('../lib/types').ChatMessage) => void) {
    const ch = supabase!.channel('msg-' + conversationId)
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          const m = payload.new;
          cb({ id: m.id, conversationId: m.conversation_id, userId: m.user_id, text: m.text, at: new Date(m.created_at).getTime() });
        })
      .subscribe();
    return () => { supabase!.removeChannel(ch); };
  },
} as any);

// ─── Perfil social / comunidade (migration 0007) ───
const ONLINE_MS2 = 3 * 60 * 1000;
function mapPub(u: any, selfId: string): import('../lib/types').PublicProfile {
  const now = Date.now();
  return {
    id: u.id, username: u.username || null, name: u.name || 'Leitor(a)', color: u.avatar_color || '#6e1f2b',
    bio: u.bio || '', lastSeen: new Date(u.last_seen).getTime(), online: now - new Date(u.last_seen).getTime() < ONLINE_MS2,
    cover: u.cover || '', about: u.about || '', location: u.location || '', website: u.website || '', pronouns: u.pronouns || '',
    genres: u.genres || [], authors: u.authors || [], books: u.books || [], music: u.music || [], interests: u.interests || [],
    followers: u.followers || 0, following: u.following || 0, totalBooks: u.total_books || 0, discussionsCount: u.discussions_count || 0,
    isSelf: u.id === selfId,
  };
}
function mapDisc(d: any): import('../lib/types').Discussion {
  return { id: d.id, userId: d.user_id, userName: d.profiles?.name, userColor: d.profiles?.avatar_color, title: d.title, content: d.content, category: d.category, bookId: d.book_id, bookTitle: d.books?.title, authorName: d.author_name, tags: d.tags || [], status: d.status, createdAt: new Date(d.created_at).getTime() };
}

Object.assign(supabaseBackend, {
  async getPublicProfile(userId: string, targetId: string) {
    const { data, error } = await supabase!.from('public_profiles_ext').select('*').eq('id', targetId).maybeSingle();
    req(data ?? {}, error);
    if (!data) return null;
    const p = mapPub(data, userId);
    const { data: f } = await supabase!.from('follows').select('follower_id').eq('follower_id', userId).eq('followee_id', targetId).maybeSingle();
    p.followedByMe = !!f;
    return p;
  },
  async updateSocial(userId: string, social: any, extra?: any) {
    const row: any = { id: userId, social };
    if (extra?.name) row.name = extra.name;
    if (extra?.bio) row.bio = extra.bio;
    if (extra?.color) row.avatar_color = extra.color;
    const { error } = await supabase!.from('profiles').update(row).eq('id', userId);
    req({}, error);
  },
  async getFollowers(userId: string, targetId: string) {
    const { data, error } = await supabase!.from('follows').select('follower_id, public_profiles_ext!follows_follower_id_fkey(*)').eq('followee_id', targetId);
    req(data, error);
    return (data as any[]).map((r) => mapPub(r.public_profiles_ext, userId)).map((u) => ({ id: u.id, name: u.name, color: u.color, bio: u.bio, lastSeen: u.lastSeen, online: u.online, isSelf: u.isSelf, totalBooks: u.totalBooks, readingNow: 0 }));
  },
  async getFollowing(userId: string, targetId: string) {
    const { data, error } = await supabase!.from('follows').select('followee_id, public_profiles_ext!follows_followee_id_fkey(*)').eq('follower_id', targetId);
    req(data, error);
    return (data as any[]).map((r) => mapPub(r.public_profiles_ext, userId)).map((u) => ({ id: u.id, name: u.name, color: u.color, bio: u.bio, lastSeen: u.lastSeen, online: u.online, isSelf: u.isSelf, totalBooks: u.totalBooks, readingNow: 0 }));
  },
  async searchUsers(userId: string, q: string) {
    let query = supabase!.from('public_profiles_ext').select('*').neq('id', userId).limit(30);
    if (q.trim()) query = query.or(`name.ilike.%${q}%,username.ilike.%${q}%`);
    const { data, error } = await query;
    req(data, error);
    return (data as any[]).map((u) => mapPub(u, userId)).map((u) => ({ id: u.id, name: u.name, color: u.color, bio: u.bio, lastSeen: u.lastSeen, online: u.online, isSelf: false, totalBooks: u.totalBooks, readingNow: 0 }));
  },
  async listDiscussions(userId: string, mode: string) {
    let q = supabase!.from('discussions').select('*, profiles(name,avatar_color), books(title)').eq('status', 'published');
    if (mode === 'following') {
      const { data: f } = await supabase!.from('follows').select('followee_id').eq('follower_id', userId);
      const ids = (f || []).map((x: any) => x.followee_id);
      q = q.in('user_id', [...ids, userId]);
    }
    const { data, error } = await q.order('created_at', { ascending: false }).limit(50);
    req(data, error);
    const list = (data as any[]).map(mapDisc);
    if (mode === 'popular') {
      const withCounts = await Promise.all(list.map(async (d) => {
        const [{ count: cc }, { count: rc }] = await Promise.all([
          supabase!.from('discussion_comments').select('*', { count: 'exact', head: true }).eq('discussion_id', d.id),
          supabase!.from('discussion_reactions').select('*', { count: 'exact', head: true }).eq('discussion_id', d.id),
        ]);
        return { ...d, commentsCount: cc || 0 };
      }));
      withCounts.sort((a, b) => ((b.commentsCount || 0)) - ((a.commentsCount || 0)));
      return withCounts;
    }
    return list;
  },
  async getDiscussion(userId: string, id: string) {
    const { data, error } = await supabase!.from('discussions').select('*, profiles(name,avatar_color), books(title)').eq('id', id).maybeSingle();
    req(data ?? {}, error);
    if (!data) return null;
    return mapDisc(data);
  },
  async createDiscussion(userId: string, d: any) {
    const { data, error } = await supabase!.from('discussions').insert({
      user_id: userId, title: d.title, content: d.content, category: d.category,
      book_id: d.bookId, author_name: d.authorName, tags: d.tags,
    }).select().single();
    req(data, error);
    return mapDisc(data);
  },
  async listComments(userId: string, discussionId: string) {
    const { data, error } = await supabase!.from('discussion_comments').select('*, profiles(name,avatar_color)').eq('discussion_id', discussionId).order('created_at');
    req(data, error);
    return (data as any[]).map((c) => ({ id: c.id, discussionId: c.discussion_id, userId: c.user_id, userName: c.profiles?.name, userColor: c.profiles?.avatar_color, parentId: c.parent_id, content: c.content, createdAt: new Date(c.created_at).getTime() }));
  },
  async addComment(userId: string, discussionId: string, content: string, parentId: string | null) {
    const { data, error } = await supabase!.from('discussion_comments').insert({ discussion_id: discussionId, user_id: userId, content, parent_id: parentId }).select().single();
    req(data, error);
    return { id: data.id, discussionId, userId, parentId, content, createdAt: Date.now() } as any;
  },
  async react(userId: string, discussionId: string, emoji: string) {
    const { data } = await supabase!.from('discussion_reactions').select('*').eq('discussion_id', discussionId).eq('user_id', userId).eq('emoji', emoji).maybeSingle();
    if (data) await supabase!.from('discussion_reactions').delete().eq('discussion_id', discussionId).eq('user_id', userId).eq('emoji', emoji);
    else await supabase!.from('discussion_reactions').insert({ discussion_id: discussionId, user_id: userId, emoji });
  },
  async toggleSaveDiscussion(userId: string, discussionId: string) {
    const { data } = await supabase!.from('saved_discussions').select('*').eq('user_id', userId).eq('discussion_id', discussionId).maybeSingle();
    if (data) { await supabase!.from('saved_discussions').delete().eq('user_id', userId).eq('discussion_id', discussionId); return false; }
    await supabase!.from('saved_discussions').insert({ user_id: userId, discussion_id: discussionId });
    return true;
  },
  async reportContent(userId: string, kind: string, id: string, reason: string) {
    await supabase!.from('reports').insert({ reporter_id: userId, target_kind: kind, target_id: id, reason });
  },
} as any);
