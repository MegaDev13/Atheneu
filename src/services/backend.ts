// ─── Contrato de backend ─────────────────────────────────────────────────────
// O app conversa apenas com esta interface. Duas implementações existem:
//   • LocalBackend  → modo demonstração (localStorage)
//   • SupabaseBackend → produção (Supabase Auth/Postgres/Storage/Realtime)

import type {
  Activity,
  AiCacheEntry,
  AiOperation,
  AiRequestEntry,
  AudioSegmentMeta,
  BookAudioState,
  AudioProgress,
  Book,
  Chapter,
  Goal,
  Highlight,
  Note,
  Notification,
  Profile,
  Progress,
  ReadingSession,
  SessionUser,
  SocialBundle,
  TtsJob,
  TtsPrefs,
  TtsWorker,
} from '../lib/types';

export interface Backend {
  mode: 'demo' | 'supabase';

  // Auth
  init(): Promise<{ user: SessionUser | null }>;
  signUp(name: string, email: string, password: string): Promise<{ ok: boolean; message?: string }>;
  signIn(email: string, password: string): Promise<{ ok: boolean; message?: string }>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<{ ok: boolean; message?: string }>;
  onAuthChange(cb: (user: SessionUser | null) => void): () => void;

  // Perfil / preferências
  getProfile(userId: string): Promise<Profile | null>;
  saveProfile(userId: string, patch: Partial<Profile>): Promise<void>;

  // Livros
  listBooks(userId: string): Promise<Book[]>;
  saveBook(userId: string, book: Book): Promise<void>;
  deleteBook(userId: string, bookId: string): Promise<void>;
  getChapters(bookId: string): Promise<Chapter[]>;
  saveChapters(chapters: Chapter[]): Promise<void>;
  saveFile(userId: string, bookId: string, file: File): Promise<string>; // retorna chave
  getBookFileUrl(userId: string, book: Book): Promise<string | null>; // URL para exibição (assinada/demo)
  saveCover(userId: string, bookId: string, dataUrl: string): Promise<string>; // retorna URL

  // Progresso / sessões
  listProgress(userId: string): Promise<Progress[]>;
  saveProgress(userId: string, p: Progress): Promise<void>;
  listSessions(userId: string): Promise<ReadingSession[]>;
  saveSession(userId: string, s: ReadingSession): Promise<void>;

  // Marcações
  listHighlights(userId: string, bookId?: string): Promise<Highlight[]>;
  saveHighlight(userId: string, h: Highlight): Promise<void>;
  deleteHighlight(userId: string, id: string): Promise<void>;
  listNotes(userId: string): Promise<Note[]>;
  saveNote(userId: string, n: Note): Promise<void>;
  deleteNote(userId: string, id: string): Promise<void>;

  // Metas / atividade / áudio / notificações
  listGoals(userId: string): Promise<Goal[]>;
  saveGoal(userId: string, g: Goal): Promise<void>;
  deleteGoal(userId: string, id: string): Promise<void>;
  listActivities(userId: string): Promise<Activity[]>;
  addActivity(userId: string, a: Activity): Promise<void>;
  getAudioProgress(userId: string, bookId: string): Promise<AudioProgress | null>;
  saveAudioProgress(userId: string, a: AudioProgress): Promise<void>;
  listNotifications(userId: string): Promise<Notification[]>;
  markNotificationsRead(userId: string): Promise<void>;

  // Social (fase social 1) — implementação completa apenas em modo demo por ora;
  // em modo Supabase, o feed usa a própria atividade + dados públicos já protegidos por RLS.
  getSocial(userId: string): Promise<SocialBundle>;
  toggleFollow(userId: string, personId: string): Promise<string[]>;

  // ─── Workers / fila de TTS ───
  listWorkers(userId: string): Promise<TtsWorker[]>;
  updateWorker(userId: string, workerId: string, patch: Partial<TtsWorker>): Promise<void>;
  deleteWorker(userId: string, workerId: string): Promise<void>;
  getTtsPrefs(userId: string): Promise<TtsPrefs>;
  saveTtsPrefs(userId: string, prefs: TtsPrefs): Promise<void>;
  listJobs(userId: string): Promise<TtsJob[]>;
  createJob(userId: string, bookId: string, priority: 0 | 1 | 2, prefs: TtsPrefs): Promise<TtsJob>;
  cancelJob(userId: string, jobId: string): Promise<void>;
  getBookAudioState(userId: string, bookId: string): Promise<BookAudioState>;
  getAudioUrl(userId: string, bookId: string, chapterIdx: number): Promise<string | null>;
  getAudioSegments(userId: string, bookId: string, chapterIdx: number): Promise<AudioSegmentMeta[]>;

  // ─── IA: cache, histórico e limites ───
  aiGetCache(userId: string, operation: AiOperation, hash: string): Promise<AiCacheEntry | null>;
  aiSetCache(userId: string, entry: AiCacheEntry): Promise<void>;
  aiLogRequest(userId: string, entry: AiRequestEntry): Promise<void>;
  aiCountToday(userId: string): Promise<number>;
  aiGlobalToday(): Promise<number>;
}
