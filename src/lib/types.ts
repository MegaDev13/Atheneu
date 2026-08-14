// ─── Modelo de dados do Atheneu ──────────────────────────────────────────────
// Espelha o schema SQL em supabase/migrations (nomenclatura camelCase aqui,
// snake_case no banco; o adaptador Supabase faz a conversão).

export type BookStatus = 'want' | 'reading' | 'paused' | 'finished';

export interface Prefs {
  interests: string[];
  yearlyGoal: number;
  frequency: 'daily' | 'weekly' | 'occasional';
  format: 'read' | 'audio' | 'both';
  audioRate: number;
}

export type Visibility = 'public' | 'followers' | 'private';

export interface Privacy {
  library: Visibility;
  progress: Visibility;
  activity: Visibility;
  notes: 'private' | 'club';
  highlights: 'private' | 'club';
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  bio: string;
  color: string;
  onboarded: boolean;
  prefs: Prefs;
  privacy: Privacy;
  createdAt: number;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  description: string;
  cover: string | null; // dataURL ou URL pública (bucket covers)
  format: 'txt' | 'epub' | 'pdf' | 'docx' | 'seed';
  status: BookStatus;
  pages: number; // estimativa de páginas
  rating: number; // 0–5
  addedAt: number;
  lastAccess: number;
  fileKey: string | null; // chave no storage (ou dataURL em modo demo)
  fileSize: number;
}

export interface Chapter {
  id: string;
  bookId: string;
  index: number;
  title: string;
  text: string;
}

export interface Progress {
  bookId: string;
  chapter: number;
  location: number; // 0–1 dentro do capítulo
  page: number;
  updatedAt: number;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  start: number;
  end: number;
  pageStart: number;
  pageEnd: number;
}

export type HighlightColor = 'yellow' | 'blue' | 'green' | 'red';

export interface Highlight {
  id: string;
  bookId: string;
  chapter: number;
  start: number; // índice do trecho no texto do capítulo
  end: number;
  text: string;
  color: HighlightColor;
  createdAt: number;
}

export interface Note {
  id: string;
  bookId: string | null;
  chapter: number | null;
  excerpt: string | null;
  text: string;
  tags: string[];
  review: boolean; // marcada para revisão
  createdAt: number;
}

export interface Goal {
  id: string;
  kind: 'books' | 'pages' | 'minutes';
  target: number;
  period: 'year' | 'month';
  createdAt: number;
}

export interface Activity {
  id: string;
  kind: 'added' | 'finished' | 'started' | 'note' | 'audio' | 'goal' | 'highlight';
  bookId: string | null;
  text: string;
  at: number;
}

export interface AudioProgress {
  bookId: string;
  chapter: number;
  seconds: number;
  rate: number;
  updatedAt: number;
}

export interface Notification {
  id: string;
  icon: string;
  text: string;
  at: number;
  read: boolean;
  href: string | null;
}

// ─── Camada social (fase social 1+) ─────────────────────────────────────────
export interface Person {
  id: string;
  name: string;
  color: string;
  bio: string;
  genres: string[];
}

export interface FeedItem {
  id: string;
  personId: string | null; // null = você
  kind: 'started' | 'finished' | 'listening' | 'comment' | 'goal' | 'note';
  bookTitle: string | null;
  text: string;
  at: number;
}

export interface ReaderPresence {
  personId: string;
  progress: number;
  page: number;
  updatedAt: number;
}

export interface DiscussionComment {
  id: string;
  personId: string;
  bookId: string;
  chapter: number;
  text: string;
  likes: number;
  at: number;
}

export interface Club {
  id: string;
  name: string;
  members: number;
  bookTitle: string;
  progress: number;
  color: string;
}

// ─── TTS distribuído (§1–19 da extensão) ────────────────────────────────
export type WorkerPlatform = 'windows' | 'android' | 'linux' | 'macos' | 'demo';

export interface TtsWorker {
  id: string;
  deviceName: string;
  platform: WorkerPlatform;
  status: 'online' | 'offline' | 'paused';
  active: boolean;
  engine: string;
  engineVersion: string;
  cpu: string;
  memory: string;
  battery: number | null;
  lastSeen: number;
  createdAt: number;
}

export type JobStatus = 'queued' | 'claimed' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface TtsJob {
  id: string;
  bookId: string;
  status: JobStatus;
  priority: 0 | 1 | 2; // 0 baixa · 1 normal · 2 alta
  workerId: string | null;
  currentChapter: number;
  currentSegment: number;
  progress: number;
  engine: string;
  voice: string;
  speed: number;
  attempts: number;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  errorMessage: string | null;
}

export type ChapterJobStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface TtsJobChapter {
  jobId: string;
  chapterIdx: number;
  status: ChapterJobStatus;
  storageKey: string | null;
  format: string;
  seconds: number;
  fileSize: number;
  fileHash: string | null;
  segmentsDone: number;
  segmentsTotal: number;
}

export interface AudioSegmentMeta {
  chapterIdx: number;
  segmentIndex: number;
  textStart: number;
  textEnd: number;
  audioStart: number;
  audioEnd: number;
}

export interface TtsPrefs {
  engine: 'kokoro' | 'piper' | string;
  voice: string;
  speed: number;
  language: string;
  quality: 'low' | 'medium' | 'high';
}

// Estado agregado de áudio de um livro para o player (§17)
export interface BookAudioState {
  job: TtsJob | null;
  chapters: TtsJobChapter[];
  readyChapters: number;
  totalChapters: number;
}

// ─── Camada de IA (Gemini) ──────────────────────────────────────────────
export type AiOperation =
  | 'answer_library_question'
  | 'summarize_chapter'
  | 'explain_concept'
  | 'compare_books'
  | 'generate_review_question'
  | 'extract_concepts';

export interface AiCacheEntry {
  hash: string;
  operation: AiOperation;
  response: string;
  model: string;
  createdAt: number;
  expiresAt: number;
}

export interface AiRequestEntry {
  operation: AiOperation;
  hash: string | null;
  model: string;
  status: 'success' | 'error' | 'rate_limited' | 'quota' | 'cache';
  tokensEstimated: number;
  at: number;
}

export interface AiUsage {
  today: number;
  limit: number;
  globalToday: number;
}

// ─── Anotações independentes do PDF (camada própria) ─────────────────────
// O PDF original NUNCA é modificado: as marcações vivem no banco e são
// renderizadas dinamicamente sobre a página (coordenadas relativas 0..1,
// independentes de zoom/resolução/dispositivo).
export type AnnotationColor = 'yellow' | 'green' | 'blue' | 'red' | 'orange' | 'purple';

export const ANNOTATION_COLORS: Record<AnnotationColor, string> = {
  yellow: 'rgba(240,190,60,.45)',
  green: 'rgba(74,170,110,.42)',
  blue: 'rgba(80,140,210,.40)',
  red: 'rgba(215,80,75,.38)',
  orange: 'rgba(240,140,50,.42)',
  purple: 'rgba(150,90,200,.40)',
};

// Retângulo em coordenadas RELATIVAS à página (0..1)
export interface AnnoRect {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PdfAnnotation {
  id: string;
  bookId: string;
  page: number; // primeira página da marcação
  type: 'text' | 'visual'; // texto selecionável vs. marcação visual (PDF escaneado)
  text: string | null; // texto selecionado (modo A)
  name: string; // opcional p/ usuário; senão auto (início do texto ou "Página X")
  comment: string;
  color: AnnotationColor;
  rects: AnnoRect[]; // múltiplas linhas/páginas → mesma anotação
  createdAt: number;
  updatedAt: number;
}

// Nome automático (§7): início do texto + "…" ou "Página X"
export function autoAnnotationName(text: string | null, page: number, max = 48): string {
  if (text && text.trim()) {
    const t = text.trim().replace(/\s+/g, ' ');
    return t.length > max ? t.slice(0, max).trimEnd() + '…' : t;
  }
  return `Página ${page}`;
}

export type ViewMode = 'lateral' | 'flip' | 'vertical';
export type ReaderTool = 'nav' | 'mark';

// ─── Comunidade: usuários reais + presença + chat ────────────────────────
export interface CommunityUser {
  id: string;
  name: string;
  color: string;
  bio: string;
  lastSeen: number;
  online: boolean;
  isSelf: boolean;
  totalBooks: number;
  readingNow: number;
}

export interface Conversation {
  id: string;
  kind: 'dm';
  otherUserId: string | null;
  otherUserName?: string;
  otherUserColor?: string;
  otherUserOnline?: boolean;
  lastMessage?: string;
  lastAt?: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  userId: string;
  text: string;
  at: number;
}

export interface SocialBundle {
  people: Person[];
  following: string[];
  readers: Record<string, ReaderPresence[]>; // por bookId
  feed: FeedItem[];
  comments: DiscussionComment[];
  clubs: Club[];
}
