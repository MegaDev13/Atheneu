// ─── Backend local (modo demonstração) ──────────────────────────────────────
// Persiste tudo em localStorage. Usado somente quando o Supabase não está
// configurado, para que o produto possa ser explorado de ponta a ponta.

import type { Backend } from './backend';
import {
  loadDB,
  saveDB,
  getSessionUserId,
  setSessionUserId,
  hashPassword,
  defaultPrefs,
  defaultPrivacy,
  DEMO_SOCIAL,
} from '../lib/demoStore';
import { uid } from '../lib/utils';
import { putFile, getFile } from '../lib/fileVault';
import type {
  Activity, AiCacheEntry, AiOperation, AiRequestEntry, AudioProgress, AudioSegmentMeta,
  Book, BookAudioState, Chapter, Goal, Highlight, Note, Notification, Profile, Progress,
  ReadingSession, SessionUser, SocialBundle, TtsJob, TtsPrefs, TtsWorker,
} from '../lib/types';

export const localBackend: Backend = {
  mode: 'demo',

  async init() {
    const db = loadDB();
    const userId = getSessionUserId();
    if (userId && db.profile) return { user: { id: db.profile.id, email: db.profile.email, name: db.profile.name } };
    return { user: null };
  },

  async signUp(name, email, password) {
    const db = loadDB();
    const exists = db.accounts.find((a) => a.email === email.toLowerCase());
    if (exists) return { ok: false, message: 'Este e-mail já possui uma conta. Tente entrar.' };
    const id = uid();
    db.accounts.push({ id, email: email.toLowerCase(), name, hash: await hashPassword(password) });
    db.profile = {
      id, name, email: email.toLowerCase(), bio: '', color: '#6e1f2b',
      onboarded: false, prefs: defaultPrefs(), privacy: defaultPrivacy(), createdAt: Date.now(),
    };
    setSessionUserId(id);
    saveDB();
    return { ok: true };
  },

  async signIn(email, password) {
    const db = loadDB();
    const acc = db.accounts.find((a) => a.email === email.toLowerCase());
    if (!acc) return { ok: false, message: 'E-mail ou senha incorretos.' };
    const hash = await hashPassword(password);
    if (acc.hash !== hash) return { ok: false, message: 'E-mail ou senha incorretos.' };
    if (!db.profile || db.profile.id !== acc.id) {
      db.profile = {
        id: acc.id, name: acc.name, email: acc.email, bio: '', color: '#6e1f2b',
        onboarded: db.profile?.onboarded ?? false, prefs: defaultPrefs(), privacy: defaultPrivacy(), createdAt: Date.now(),
      };
    }
    setSessionUserId(acc.id);
    saveDB();
    return { ok: true };
  },

  async signOut() {
    setSessionUserId(null);
  },

  async resetPassword(email) {
    const db = loadDB();
    const acc = db.accounts.find((a) => a.email === email.toLowerCase());
    if (!acc) return { ok: false, message: 'Não encontramos uma conta com este e-mail.' };
    return { ok: true, message: 'Em modo demo, basta entrar com a senha cadastrada.' };
  },

  onAuthChange() {
    return () => {};
  },

  async getProfile() {
    return loadDB().profile;
  },

  async saveProfile(_userId, patch) {
    const db = loadDB();
    if (!db.profile) return;
    db.profile = { ...db.profile, ...patch };
    saveDB();
  },

  async listBooks() {
    return loadDB().books.slice().sort((a, b) => b.lastAccess - a.lastAccess);
  },

  async saveBook(_userId, book) {
    const db = loadDB();
    const i = db.books.findIndex((b) => b.id === book.id);
    if (i >= 0) db.books[i] = book;
    else db.books.push(book);
    saveDB();
  },

  async deleteBook(_userId, bookId) {
    const db = loadDB();
    db.books = db.books.filter((b) => b.id !== bookId);
    db.chapters = db.chapters.filter((c) => c.bookId !== bookId);
    db.progress = db.progress.filter((p) => p.bookId !== bookId);
    db.highlights = db.highlights.filter((h) => h.bookId !== bookId);
    db.notes = db.notes.filter((n) => n.bookId !== bookId);
    db.audio = db.audio.filter((a) => a.bookId !== bookId);
    saveDB();
  },

  async getChapters(bookId) {
    return loadDB().chapters.filter((c) => c.bookId === bookId).sort((a, b) => a.index - b.index);
  },

  async saveChapters(chapters) {
    const db = loadDB();
    for (const c of chapters) db.chapters.push(c);
    saveDB();
  },

  async saveFile(_userId, bookId, file) {
    // Em modo demo o arquivo fica no IndexedDB (aceita PDFs grandes).
    // Produção: Supabase Storage (bucket `books`) — ver supabaseBackend.
    try {
      await putFile(bookId, file);
      return 'idb:' + bookId;
    } catch (e) {
      console.warn('Não foi possível guardar o arquivo localmente.', e);
      return '';
    }
  },

  async getBookFileUrl(_userId, book) {
    if (!book.fileKey) return null;
    if (book.fileKey.startsWith('data:')) return book.fileKey; // legado
    if (book.fileKey.startsWith('idb:')) {
      const blob = await getFile(book.fileKey.slice(4));
      return blob ? URL.createObjectURL(blob) : null;
    }
    return null;
  },

  async saveCover(_userId, _bookId, dataUrl) {
    return dataUrl;
  },

  async listProgress() {
    return loadDB().progress;
  },

  async saveProgress(_userId, p) {
    const db = loadDB();
    const i = db.progress.findIndex((x) => x.bookId === p.bookId);
    if (i >= 0) db.progress[i] = p;
    else db.progress.push(p);
    saveDB();
  },

  async listSessions() {
    return loadDB().sessions;
  },

  async saveSession(_userId, s) {
    const db = loadDB();
    const i = db.sessions.findIndex((x) => x.id === s.id);
    if (i >= 0) db.sessions[i] = s;
    else db.sessions.push(s);
    saveDB();
  },

  async listHighlights(_userId, bookId) {
    const all = loadDB().highlights;
    return bookId ? all.filter((h) => h.bookId === bookId) : all;
  },

  async saveHighlight(_userId, h) {
    const db = loadDB();
    db.highlights.push(h);
    saveDB();
  },

  async deleteHighlight(_userId, id) {
    const db = loadDB();
    db.highlights = db.highlights.filter((h) => h.id !== id);
    saveDB();
  },

  async listNotes() {
    return loadDB().notes.slice().sort((a, b) => b.createdAt - a.createdAt);
  },

  async saveNote(_userId, n) {
    const db = loadDB();
    const i = db.notes.findIndex((x) => x.id === n.id);
    if (i >= 0) db.notes[i] = n;
    else db.notes.unshift(n);
    saveDB();
  },

  async deleteNote(_userId, id) {
    const db = loadDB();
    db.notes = db.notes.filter((n) => n.id !== id);
    saveDB();
  },

  async listGoals() {
    return loadDB().goals;
  },

  async saveGoal(_userId, g) {
    const db = loadDB();
    const i = db.goals.findIndex((x) => x.id === g.id);
    if (i >= 0) db.goals[i] = g;
    else db.goals.push(g);
    saveDB();
  },

  async deleteGoal(_userId, id) {
    const db = loadDB();
    db.goals = db.goals.filter((g) => g.id !== id);
    saveDB();
  },

  async listActivities() {
    return loadDB().activities.slice().sort((a, b) => b.at - a.at);
  },

  async addActivity(_userId, a) {
    const db = loadDB();
    db.activities.unshift(a);
    db.activities = db.activities.slice(0, 120);
    saveDB();
  },

  async getAudioProgress(_userId, bookId) {
    return loadDB().audio.find((a) => a.bookId === bookId) || null;
  },

  async saveAudioProgress(_userId, a) {
    const db = loadDB();
    const i = db.audio.findIndex((x) => x.bookId === a.bookId);
    if (i >= 0) db.audio[i] = a;
    else db.audio.push(a);
    saveDB();
  },

  async listNotifications() {
    return loadDB().notifications;
  },

  async markNotificationsRead() {
    const db = loadDB();
    db.notifications = db.notifications.map((n) => ({ ...n, read: true }));
    saveDB();
  },

  async getSocial(userId) {
    const db = loadDB();
    return { ...DEMO_SOCIAL, following: db.following.slice() } as SocialBundle;
  },

  async toggleFollow(userId, personId) {
    const db = loadDB();
    const i = db.following.indexOf(personId);
    if (i >= 0) db.following.splice(i, 1);
    else db.following.push(personId);
    saveDB();
    return db.following.slice();
  },

  // ─── Workers / TTS (simulação do Worker demo) ───
  // No modo demo um "worker simulado" processa ~1 capítulo a cada 5s, gerando
  // metadados e segmentos de áudio para exercitar toda a UI.
  async listWorkers() {
    const db = loadDB();
    tickJobs(db);
    const w = db.workers.find((x) => x.id === 'w-demo');
    if (w) w.lastSeen = Date.now();
    saveDB();
    return db.workers.map(mapWorker);
  },

  async updateWorker(_userId, workerId, patch) {
    const db = loadDB();
    const w = db.workers.find((x) => x.id === workerId);
    if (!w) return;
    if (patch.deviceName !== undefined) w.deviceName = patch.deviceName;
    if (patch.active !== undefined) w.active = patch.active;
    saveDB();
  },

  async deleteWorker(_userId, workerId) {
    const db = loadDB();
    db.workers = db.workers.filter((w) => w.id !== workerId);
    saveDB();
  },

  async getTtsPrefs() {
    return { ...loadDB().ttsPrefs } as TtsPrefs;
  },

  async saveTtsPrefs(_userId, prefs) {
    const db = loadDB();
    db.ttsPrefs = { ...prefs };
    saveDB();
  },

  async listJobs() {
    const db = loadDB();
    tickJobs(db);
    saveDB();
    return db.jobs.slice().sort((a, b) => b.createdAt - a.createdAt).map((j) => mapJob(j));
  },

  async createJob(_userId, bookId, priority, prefs) {
    const db = loadDB();
    const existing = db.jobs.find((j) => j.bookId === bookId && ['queued', 'claimed', 'processing'].includes(j.status));
    if (existing) return mapJob(existing);
    const job = {
      id: uid(), bookId, status: 'queued', priority, workerId: null,
      currentChapter: 0, currentSegment: 0, progress: 0,
      engine: prefs.engine, voice: prefs.voice, speed: prefs.speed, attempts: 0,
      createdAt: Date.now(), startedAt: null, completedAt: null, errorMessage: null,
    };
    db.jobs.push(job);
    saveDB();
    return mapJob(job);
  },

  async cancelJob(_userId, jobId) {
    const db = loadDB();
    const job = db.jobs.find((j) => j.id === jobId);
    if (!job) return;
    if (['queued', 'claimed', 'processing', 'paused'].includes(job.status)) {
      job.status = 'cancelled'; // estado do trabalho é preservado (§6)
      db.jobChapters = db.jobChapters.map((c) =>
        c.jobId === jobId && c.status === 'processing' ? { ...c, status: 'pending' } : c
      );
    }
    saveDB();
  },

  async getBookAudioState(_userId, bookId) {
    const db = loadDB();
    tickJobs(db);
    saveDB();
    const jobs = db.jobs.filter((j) => j.bookId === bookId).sort((a, b) => b.createdAt - a.createdAt);
    const job = jobs[0] || null;
    const chapters = job
      ? db.jobChapters.filter((c) => c.jobId === job.id).sort((a, b) => a.chapterIdx - b.chapterIdx).map(mapJobChapter)
      : [];
    const total = db.chapters.filter((c) => c.bookId === bookId).length;
    return {
      job: job ? mapJob(job) : null,
      chapters,
      readyChapters: chapters.filter((c) => c.status === 'done').length,
      totalChapters: total,
    } as BookAudioState;
  },

  async getAudioUrl() {
    // Demo: não há arquivo real — o player usa a síntese do navegador como prévia.
    return null;
  },

  async getAudioSegments(_userId, bookId, chapterIdx) {
    const db = loadDB();
    return db.audioSegments
      .filter((s) => s.bookId === bookId && s.chapterIdx === chapterIdx)
      .sort((a, b) => a.segmentIndex - b.segmentIndex)
      .map((s) => ({ ...s })) as AudioSegmentMeta[];
  },

  // ─── IA: cache / log / limites ───
  async aiGetCache(_userId, operation, hash) {
    const db = loadDB();
    const hit = db.aiCache.find((c) => c.operation === operation && c.hash === hash && c.expiresAt > Date.now());
    return hit ? { ...hit } as AiCacheEntry : null;
  },

  async aiSetCache(_userId, entry) {
    const db = loadDB();
    db.aiCache = db.aiCache.filter((c) => !(c.operation === entry.operation && c.hash === entry.hash));
    db.aiCache.push({ ...entry });
    db.aiCache = db.aiCache.slice(-200);
    saveDB();
  },

  async aiLogRequest(_userId, entry) {
    const db = loadDB();
    db.aiLog.push({ ...entry });
    db.aiLog = db.aiLog.slice(-500);
    saveDB();
  },

  async aiCountToday() {
    const db = loadDB();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    return db.aiLog.filter((r) => r.at >= dayStart.getTime() && r.status !== 'cache').length;
  },

  async aiGlobalToday() {
    return this.aiCountToday('');
  },

  // preenchidos via Object.assign no fim do arquivo (anotações + comunidade)
  listAnnotations: undefined as any,
  saveAnnotation: undefined as any,
  deleteAnnotation: undefined as any,
  listUsers: undefined as any,
  sendHeartbeat: undefined as any,
  listConversations: undefined as any,
  openDm: undefined as any,
  listMessages: undefined as any,
  sendMessage: undefined as any,
  onChatMessage: undefined as any,
  getPublicProfile: undefined as any,
  updateSocial: undefined as any,
  getFollowers: undefined as any,
  getFollowing: undefined as any,
  searchUsers: undefined as any,
  listDiscussions: undefined as any,
  getDiscussion: undefined as any,
  createDiscussion: undefined as any,
  listComments: undefined as any,
  addComment: undefined as any,
  react: undefined as any,
  toggleSaveDiscussion: undefined as any,
  reportContent: undefined as any,
};

// ─── Helpers da simulação TTS ───────────────────────────────────────────
function mapWorker(w: any): TtsWorker {
  return {
    id: w.id, deviceName: w.deviceName, platform: w.platform as TtsWorker['platform'],
    status: w.status as TtsWorker['status'], active: w.active, engine: w.engine,
    engineVersion: w.engineVersion, cpu: w.cpu, memory: w.memory, battery: w.battery,
    lastSeen: w.lastSeen, createdAt: w.createdAt,
  };
}

function mapJob(j: any): TtsJob {
  return {
    id: j.id, bookId: j.bookId, status: j.status as TtsJob['status'], priority: j.priority as TtsJob['priority'],
    workerId: j.workerId, currentChapter: j.currentChapter, currentSegment: j.currentSegment,
    progress: j.progress, engine: j.engine, voice: j.voice, speed: j.speed, attempts: j.attempts,
    createdAt: j.createdAt, startedAt: j.startedAt, completedAt: j.completedAt, errorMessage: j.errorMessage,
  };
}

function mapJobChapter(c: any) {
  return {
    jobId: c.jobId, chapterIdx: c.chapterIdx, status: c.status, storageKey: c.storageKey,
    format: c.format, seconds: c.seconds, fileSize: c.fileSize, fileHash: c.fileHash,
    segmentsDone: c.segmentsDone, segmentsTotal: c.segmentsTotal,
  };
}

const SIM_SECONDS_PER_CHAPTER = 5;

// Avança a simulação dos jobs com base no tempo decorrido (retomada granular:
// capítulos já concluídos nunca são reprocessados — §14).
function tickJobs(db: any) {
  const demoWorker = db.workers.find((w: any) => w.id === 'w-demo');
  for (const job of db.jobs) {
    if (job.status === 'queued') {
      if (!demoWorker || !demoWorker.active) continue;
      // Anti-monopólio: só um job ativo por vez (§46)
      if (db.jobs.some((j: any) => j !== job && ['claimed', 'processing'].includes(j.status))) continue;
      job.status = 'processing';
      job.workerId = demoWorker.id;
      job.startedAt = Date.now();
      const chs = db.chapters.filter((c: any) => c.bookId === job.bookId);
      for (let i = 0; i < chs.length; i++) {
        if (!db.jobChapters.some((c: any) => c.jobId === job.id && c.chapterIdx === i)) {
          db.jobChapters.push({
            jobId: job.id, chapterIdx: i, status: 'pending', storageKey: null, format: 'mp3',
            seconds: 0, fileSize: 0, fileHash: null, segmentsDone: 0, segmentsTotal: 4,
          });
        }
      }
    }
    if (job.status === 'processing') {
      const chs = db.chapters.filter((c: any) => c.bookId === job.bookId).sort((a: any, b: any) => a.index - b.index);
      const elapsed = (Date.now() - (job.startedAt || Date.now())) / 1000;
      const done = Math.min(chs.length, Math.floor(elapsed / SIM_SECONDS_PER_CHAPTER));
      job.currentChapter = done;
      job.progress = chs.length ? done / chs.length : 1;
      for (let i = 0; i < chs.length; i++) {
        const row = db.jobChapters.find((c: any) => c.jobId === job.id && c.chapterIdx === i);
        if (!row || row.status === 'done') continue;
        if (i < done) {
          const words = chs[i].text.split(/\s+/).length;
          const seconds = Math.round((words / 160) * 60);
          row.status = 'done';
          row.seconds = seconds;
          row.fileSize = Math.round(seconds * 16000);
          row.storageKey = `demo/${job.bookId}/chapter-${String(i + 1).padStart(3, '0')}.mp3`;
          row.fileHash = 'demo-' + Math.abs(Math.floor(Math.sin(i + 1) * 1e10)).toString(16);
          row.segmentsDone = row.segmentsTotal;
          ensureSegments(db, job.bookId, i, chs[i].text, seconds);
        } else if (i === done && done < chs.length) {
          row.status = 'processing';
          row.segmentsDone = Math.floor(((elapsed % SIM_SECONDS_PER_CHAPTER) / SIM_SECONDS_PER_CHAPTER) * row.segmentsTotal);
        }
      }
      if (done >= chs.length) {
        job.status = 'completed';
        job.progress = 1;
        job.completedAt = Date.now();
      }
    }
  }
}

// Segmentos simulados de sincronização texto↔áudio (§18)
function ensureSegments(db: any, bookId: string, chapterIdx: number, text: string, totalSeconds: number) {
  if (db.audioSegments.some((s: any) => s.bookId === bookId && s.chapterIdx === chapterIdx)) return;
  const N = 4;
  const chunk = Math.ceil(text.length / N);
  const per = totalSeconds / N;
  for (let i = 0; i < N; i++) {
    db.audioSegments.push({
      bookId, chapterIdx, segmentIndex: i,
      textStart: i * chunk, textEnd: Math.min(text.length, (i + 1) * chunk),
      audioStart: +(i * per).toFixed(2), audioEnd: +((i + 1) * per).toFixed(2),
    });
  }
}

// ─── Anotações independentes do PDF (camada própria) ───
function annStore(db: any): any[] {
  if (!Array.isArray(db.annotations)) db.annotations = [];
  return db.annotations;
}

Object.assign(localBackend, {
  async listAnnotations(_userId: string, bookId?: string) {
    const db = loadDB();
    const all = annStore(db) as any[];
    return (bookId ? all.filter((a) => a.bookId === bookId) : all)
      .slice()
      .sort((a, b) => a.page - b.page || (a.rects[0]?.y || 0) - (b.rects[0]?.y || 0));
  },
  async saveAnnotation(_userId: string, a: any) {
    const db = loadDB();
    const list = annStore(db);
    const i = list.findIndex((x: any) => x.id === a.id);
    if (i >= 0) list[i] = a; else list.push(a);
    saveDB();
  },
  async deleteAnnotation(_userId: string, id: string) {
    const db = loadDB();
    db.annotations = annStore(db).filter((x: any) => x.id !== id);
    saveDB();
  },
} as any);

// ─── Comunidade (demo): usuários simulados + presença + chat local ───
const ONLINE_MS = 3 * 60 * 1000;

Object.assign(localBackend, {
  async listUsers(userId: string) {
    const db = loadDB();
    const now = Date.now();
    const demo = (DEMO_SOCIAL.people as any[]).map((p, i) => ({
      id: p.id, name: p.name, color: p.color, bio: p.bio,
      lastSeen: now - (i === 0 ? 40_000 : i === 1 ? 120_000 : 26 * 3600_000),
      online: i < 2, isSelf: false, totalBooks: 12 + i * 7, readingNow: i % 3,
    }));
    const me = db.profile ? [{
      id: db.profile.id, name: db.profile.name, color: db.profile.color, bio: db.profile.bio,
      lastSeen: now, online: true, isSelf: true,
      totalBooks: db.books.length, readingNow: db.books.filter((b: any) => b.status === 'reading').length,
    }] : [];
    return [...me, ...demo].sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name, 'pt'));
  },
  async sendHeartbeat() { /* demo: sempre online */ },
  async listConversations(userId: string) {
    const db = loadDB();
    if (!db.chat) db.chat = { conversations: [], messages: [] };
    const users = await (localBackend as any).listUsers(userId);
    return (db.chat.conversations as any[]).map((c: any) => {
      const other = users.find((u: any) => u.id === c.otherUserId);
      const last = (db.chat.messages as any[]).filter((m: any) => m.conversationId === c.id).slice(-1)[0];
      return { id: c.id, kind: 'dm', otherUserId: c.otherUserId, otherUserName: other?.name, otherUserColor: other?.color, otherUserOnline: other?.online, lastMessage: last?.text, lastAt: last?.at };
    }).sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
  },
  async openDm(userId: string, otherId: string) {
    const db = loadDB();
    if (!db.chat) db.chat = { conversations: [], messages: [] };
    let c = (db.chat.conversations as any[]).find((x: any) => x.otherUserId === otherId);
    if (!c) { c = { id: uid(), otherUserId: otherId }; db.chat.conversations.push(c); saveDB(); }
    return (localBackend as any).listConversations(userId);
  },
  async listMessages(userId: string, conversationId: string) {
    const db = loadDB();
    if (!db.chat) return [];
    return (db.chat.messages as any[]).filter((m: any) => m.conversationId === conversationId);
  },
  async sendMessage(userId: string, conversationId: string, text: string) {
    const db = loadDB();
    if (!db.chat) db.chat = { conversations: [], messages: [] };
    const m = { id: uid(), conversationId, userId, text, at: Date.now() };
    db.chat.messages.push(m);
    saveDB();
    // demo: a outra pessoa responde uma vez, pra você ver o chat vivo
    const conv = (db.chat.conversations as any[]).find((c: any) => c.id === conversationId);
    if (conv && !conv.replied) {
      conv.replied = true;
      setTimeout(async () => {
        const d2 = loadDB();
        d2.chat.messages.push({ id: uid(), conversationId, userId: conv.otherUserId, text: 'Que bom ter você por aqui! O que você está lendo agora? 📚', at: Date.now() });
        saveDB();
      }, 2500);
    }
    return m as any;
  },
  onChatMessage(conversationId: string, cb: (m: any) => void) {
    const t = setInterval(async () => {
      const db = loadDB();
      const last = (db.chat?.messages as any[])?.filter((m: any) => m.conversationId === conversationId).slice(-1)[0];
      if (last && last.at > Date.now() - 4000) cb(last);
    }, 2000);
    return () => clearInterval(t);
  },
} as any);

// ─── Perfil social / comunidade (demo) ───
function persona(id: string) { return (DEMO_SOCIAL.people as any[]).find((p) => p.id === id); }
function toCommunityUser(p: any, online: boolean, isSelf: boolean, extra?: any): any {
  return { id: p.id, name: p.name, color: p.color, bio: p.bio || '', lastSeen: Date.now() - (online ? 30_000 : 26 * 3600_000), online, isSelf, totalBooks: extra?.totalBooks ?? 12, readingNow: extra?.readingNow ?? 1 };
}
function ensureSocial(db: any) {
  if (!db.mySocial) db.mySocial = {};
  if (!db.discussions) db.discussions = [];
  if (!db.dcomments) db.dcomments = [];
  if (!db.dreactions) db.dreactions = [];
  if (!db.savedDisc) db.savedDisc = [];
  if (!db.followers) db.followers = [];
}
function myPublic(db: any, userId: string): any {
  const s = db.mySocial || {};
  return { id: userId, username: s.username || null, name: db.profile?.name || 'Eu', color: db.profile?.color || '#6e1f2b', bio: db.profile?.bio || '', lastSeen: Date.now(), online: true, cover: s.cover || '', about: s.about || '', location: s.location || '', website: s.website || '', pronouns: s.pronouns || '', genres: s.genres || [], authors: s.authors || [], books: s.books || [], music: s.music || [], interests: s.interests || [], followers: (db.followers || []).length, following: (db.following || []).length, totalBooks: db.books.length, discussionsCount: db.discussions.filter((d: any) => d.userId === userId).length, isSelf: true };
}
function personaPublic(p: any, db: any): any {
  return { id: p.id, username: p.name.toLowerCase(), name: p.name, color: p.color, bio: p.bio, lastSeen: Date.now() - 30_000, online: true, cover: '', about: p.bio, location: '', website: '', pronouns: '', genres: p.genres, authors: [], books: [], music: [], interests: p.genres.map((g: string) => g.toLowerCase()), followers: 12, following: 8, totalBooks: 20, discussionsCount: db.discussions.filter((d: any) => d.userId === p.id).length, isSelf: false };
}
function decCounts(db: any, d: any) {
  return { ...d, commentsCount: db.dcomments.filter((c: any) => c.discussionId === d.id).length, reactions: reactCounts(db, d.id), reactedByMe: db.dreactions.filter((r: any) => r.discussionId === d.id && r.userId === 'me').map((r: any) => r.emoji), savedByMe: db.savedDisc.includes(d.id) };
}
function reactCounts(db: any, id: string) {
  const m: Record<string, number> = {};
  db.dreactions.filter((r: any) => r.discussionId === id).forEach((r: any) => { m[r.emoji] = (m[r.emoji] || 0) + 1; });
  return m;
}

Object.assign(localBackend, {
  async getPublicProfile(userId: string, targetId: string) {
    const db = loadDB(); ensureSocial(db);
    if (targetId === userId) return myPublic(db, userId);
    const p = persona(targetId);
    if (p) { const pub = personaPublic(p, db); pub.followedByMe = db.following.includes(targetId); return pub; }
    return null;
  },
  async updateSocial(userId: string, social: any, extra?: any) {
    const db = loadDB(); ensureSocial(db);
    db.mySocial = { ...db.mySocial, ...social };
    if (db.profile) { if (extra?.name) db.profile.name = extra.name; if (extra?.bio) db.profile.bio = extra.bio; if (extra?.color) db.profile.color = extra.color; }
    saveDB();
  },
  async getFollowers(userId: string) { const db = loadDB(); ensureSocial(db); return db.followers.map((id: string) => { const p = persona(id); return p ? toCommunityUser(p, true, false) : null; }).filter(Boolean); },
  async getFollowing(userId: string) { const db = loadDB(); return db.following.map((id: string) => { const p = persona(id); return p ? toCommunityUser(p, true, false) : null; }).filter(Boolean); },
  async searchUsers(userId: string, q: string) {
    const db = loadDB(); const nq = q.trim().toLowerCase();
    const all = (DEMO_SOCIAL.people as any[]).map((p) => toCommunityUser(p, true, false));
    if (!nq) return all;
    return all.filter((u) => u.name.toLowerCase().includes(nq) || (persona(u.id)?.genres || []).some((g: string) => g.toLowerCase().includes(nq)));
  },
  async listDiscussions(userId: string, mode: string) {
    const db = loadDB(); ensureSocial(db);
    let list = db.discussions.slice();
    if (mode === 'following') list = list.filter((d: any) => db.following.includes(d.userId) || d.userId === userId);
    const score = (d: any): number => { const c = decCounts(db, d); let s = Number(c.commentsCount) || 0; for (const k in (c.reactions as any)) s += Number((c.reactions as any)[k]) || 0; return s; };
    if (mode === 'popular') list = list.sort((a: any, b: any) => score(b) - score(a));
    else list = list.sort((a: any, b: any) => b.createdAt - a.createdAt);
    return list.map((d: any) => decCounts(db, d));
  },
  async getDiscussion(userId: string, id: string) { const db = loadDB(); ensureSocial(db); const d = db.discussions.find((x: any) => x.id === id); return d ? decCounts(db, d) : null; },
  async createDiscussion(userId: string, d: any) {
    const db = loadDB(); ensureSocial(db);
    const disc = { id: uid(), userId, title: d.title, content: d.content, category: d.category, bookId: d.bookId, authorName: d.authorName, tags: d.tags, status: 'published', createdAt: Date.now() };
    db.discussions.unshift(disc); saveDB();
    return decCounts(db, disc);
  },
  async listComments(userId: string, discussionId: string) { const db = loadDB(); ensureSocial(db); return db.dcomments.filter((c: any) => c.discussionId === discussionId).sort((a: any, b: any) => a.createdAt - b.createdAt); },
  async addComment(userId: string, discussionId: string, content: string, parentId: string | null) {
    const db = loadDB(); ensureSocial(db);
    const c = { id: uid(), discussionId, userId, parentId, content, createdAt: Date.now() };
    db.dcomments.push(c); saveDB(); return c;
  },
  async react(userId: string, discussionId: string, emoji: string) {
    const db = loadDB(); ensureSocial(db);
    const i = db.dreactions.findIndex((r: any) => r.discussionId === discussionId && r.userId === userId && r.emoji === emoji);
    if (i >= 0) db.dreactions.splice(i, 1); else db.dreactions.push({ discussionId, userId, emoji });
    saveDB();
  },
  async toggleSaveDiscussion(userId: string, discussionId: string) {
    const db = loadDB(); ensureSocial(db);
    const i = db.savedDisc.indexOf(discussionId);
    if (i >= 0) db.savedDisc.splice(i, 1); else db.savedDisc.push(discussionId);
    saveDB(); return i < 0;
  },
  async reportContent(userId: string, kind: string, id: string, reason: string) { /* demo: no-op */ },
} as any);
