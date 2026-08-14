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
