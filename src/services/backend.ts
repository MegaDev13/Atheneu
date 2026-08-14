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
  ChatMessage,
  CommunityUser,
  Conversation,
  Discussion,
  DiscussionComment,
  PublicProfile,
  SocialProfile,
  Goal,
  Highlight,
  Note,
  Notification,
  PdfAnnotation,
  Profile,
  Progress,
  ReadingSession,
  SessionUser,
  SocialBundle,
  TtsJob,
  TtsPrefs,
  TtsWorker,
  RecapSnapshot,
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

  // ─── Anotações independentes do PDF ───
  listAnnotations(userId: string, bookId?: string): Promise<PdfAnnotation[]>;
  saveAnnotation(userId: string, a: PdfAnnotation): Promise<void>;
  deleteAnnotation(userId: string, id: string): Promise<void>;

  // ─── Comunidade: usuários reais, presença e chat ───
  listUsers(userId: string): Promise<CommunityUser[]>;
  sendHeartbeat(userId: string): Promise<void>;
  listConversations(userId: string): Promise<Conversation[]>;
  openDm(userId: string, otherId: string): Promise<Conversation[]>;
  listMessages(userId: string, conversationId: string): Promise<ChatMessage[]>;
  sendMessage(userId: string, conversationId: string, text: string): Promise<ChatMessage>;
  onChatMessage(conversationId: string, cb: (m: ChatMessage) => void): () => void;

  // ─── Perfil social ───
  getPublicProfile(userId: string, targetId: string): Promise<PublicProfile | null>;
  updateSocial(userId: string, social: SocialProfile, extra?: Partial<{ name: string; bio: string; color: string }>): Promise<void>;
  getFollowers(userId: string, targetId: string): Promise<CommunityUser[]>;
  getFollowing(userId: string, targetId: string): Promise<CommunityUser[]>;
  searchUsers(userId: string, q: string): Promise<CommunityUser[]>;

  // ─── Discussões / comunidade ───
  listDiscussions(userId: string, mode: 'following' | 'discover' | 'popular'): Promise<Discussion[]>;
  getDiscussion(userId: string, id: string): Promise<Discussion | null>;
  createDiscussion(userId: string, d: { title: string; content: string; category: string; bookId: string | null; authorName: string | null; tags: string[] }): Promise<Discussion>;
  listComments(userId: string, discussionId: string): Promise<DiscussionComment[]>;
  addComment(userId: string, discussionId: string, content: string, parentId: string | null): Promise<DiscussionComment>;
  react(userId: string, discussionId: string, emoji: string): Promise<void>;
  toggleSaveDiscussion(userId: string, discussionId: string): Promise<boolean>;
  reportContent(userId: string, kind: 'discussion' | 'comment', id: string, reason: string): Promise<void>;

  // ─── Perfil: privacidade/preview + mensagens (permissão/leitura/notif) ───
  updatePrivacy(userId: string, privacy: any): Promise<void>;
  getPrivacy(userId: string): Promise<any>;
  previewProfile(userId: string, as: 'public' | 'follower' | 'mutual' | 'self'): Promise<PublicProfile>;
  canMessage(userId: string, targetId: string): Promise<boolean>;
  blockUser(userId: string, targetId: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
  markConversationRead(userId: string, conversationId: string): Promise<void>;
  getNotifyPrefs(userId: string): Promise<any>;
  setNotifyPrefs(userId: string, prefs: any): Promise<void>;

  // ─── Retrospectiva (Reading Wrapped) ───
  listRecaps(userId: string): Promise<RecapSnapshot[]>;
  closeRecap(userId: string, period: string, kind: 'monthly' | 'yearly', metrics: any): Promise<RecapSnapshot>;
  markRecapViewed(userId: string, id: string): Promise<void>;
}
