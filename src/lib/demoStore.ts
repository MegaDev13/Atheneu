// ─── Modo demonstração ───────────────────────────────────────────────────────
// Quando o Supabase não está configurado, o Atheneu funciona com um banco local
// (localStorage), incluindo dados de exemplo para explorar todo o produto.
// Este código NUNCA é usado em produção quando VITE_SUPABASE_URL está presente.

import { uid } from './utils';
import { SEED_TEXTS } from './seedContent';
import type {
  Activity,
  AudioProgress,
  Book,
  Chapter,
  Club,
  BookComment,
  FeedItem,
  Goal,
  Highlight,
  Note,
  Notification,
  Person,
  Privacy,
  Profile,
  Prefs,
  Progress,
  ReadingSession,
  SocialBundle,
} from './types';

const KEY = 'atheneu-db-v2';
const SESSION_KEY = 'atheneu-session-v1';

export interface DemoDB {
  accounts: { id: string; email: string; name: string; hash: string }[];
  profile: Profile | null;
  books: Book[];
  chapters: Chapter[];
  progress: Progress[];
  sessions: ReadingSession[];
  highlights: Highlight[];
  notes: Note[];
  goals: Goal[];
  activities: Activity[];
  audio: AudioProgress[];
  notifications: Notification[];
  following: string[];
  // Extensão TTS + IA
  workers: DemoWorker[];
  jobs: DemoJob[];
  jobChapters: DemoJobChapter[];
  audioSegments: DemoAudioSegment[];
  ttsPrefs: { engine: string; voice: string; speed: number; language: string; quality: 'low' | 'medium' | 'high' };
  aiCache: { hash: string; operation: string; response: string; model: string; createdAt: number; expiresAt: number }[];
  aiLog: { operation: string; hash: string | null; model: string; status: string; tokensEstimated: number; at: number }[];
  annotations: any[];
  chat: { conversations: any[]; messages: any[] };
  mySocial: any;
  discussions: any[];
  dcomments: any[];
  dreactions: any[];
  savedDisc: string[];
  followers: string[];
}

export interface DemoWorker {
  id: string; deviceName: string; platform: string; status: string; active: boolean;
  engine: string; engineVersion: string; cpu: string; memory: string; battery: number | null;
  lastSeen: number; createdAt: number;
}
export interface DemoJob {
  id: string; bookId: string; status: string; priority: number; workerId: string | null;
  currentChapter: number; currentSegment: number; progress: number;
  engine: string; voice: string; speed: number; attempts: number;
  createdAt: number; startedAt: number | null; completedAt: number | null; errorMessage: string | null;
}
export interface DemoJobChapter {
  jobId: string; chapterIdx: number; status: string; storageKey: string | null; format: string;
  seconds: number; fileSize: number; fileHash: string | null; segmentsDone: number; segmentsTotal: number;
}
export interface DemoAudioSegment {
  bookId: string; chapterIdx: number; segmentIndex: number;
  textStart: number; textEnd: number; audioStart: number; audioEnd: number;
}

const DAY = 86400000;
const now = Date.now();

function seedDB(): DemoDB {
  const mkBook = (
    id: string,
    title: string,
    author: string,
    genre: string,
    status: Book['status'],
    description: string,
    pages: number,
    addedDaysAgo: number,
    lastDaysAgo: number,
    rating = 0
  ): Book => ({
    id: `b-${id}`,
    title,
    author,
    genre,
    description,
    cover: null,
    format: 'seed',
    status,
    pages,
    rating,
    addedAt: now - addedDaysAgo * DAY,
    lastAccess: now - lastDaysAgo * DAY,
    fileKey: null,
    fileSize: 0,
  });

  const books: Book[] = [
    mkBook('crime', 'Crime e Castigo', 'Fiódor Dostoiévski', 'Literatura', 'reading', 'Raskólnikov, um jovem miserável de Petersburgo, concebe um ato terrível para provar uma ideia — e descobre que o verdadeiro tribunal é a própria consciência.', 520, 62, 0, 0),
    mkBook('casmurro', 'Dom Casmurro', 'Machado de Assis', 'Literatura', 'reading', 'Bento Santiago reconstrói a própria vida para responder à pergunta que o consome: Capitu o traiu? O maior romance de Machado de Assis.', 256, 40, 1, 0),
    mkBook('meditacoes', 'Meditações', 'Marco Aurélio', 'Filosofia', 'reading', 'Anotações privadas do imperador romano: um manual de serenidade, dever e lucidez diante do mundo.', 240, 31, 2, 0),
    mkBook('sisifo', 'O Mito de Sísifo', 'Albert Camus', 'Filosofia', 'want', 'Ensaio sobre o absurdo: a vida vale a pena ser vivida mesmo sem sentido dado de fora?', 144, 12, 12, 0),
    mkBook('liberdade', 'Sobre a Liberdade', 'John Stuart Mill', 'Política', 'finished', 'O clássico ensaio sobre os limites do poder da sociedade sobre o indivíduo.', 208, 120, 30, 5),
    mkBook('riqueza', 'A Riqueza das Nações', 'Adam Smith', 'Economia', 'finished', 'Divisão do trabalho, troca e a mão invisível: o fundamento da economia moderna.', 840, 90, 45, 4),
  ];

  const chapters: Chapter[] = [];
  for (const [key, data] of Object.entries(SEED_TEXTS)) {
    data.chapters.forEach((c, i) =>
      chapters.push({ id: `c-${key}-${i}`, bookId: `b-${key}`, index: i, title: c.title, text: c.text })
    );
  }

  const progress: Progress[] = [
    { bookId: 'b-crime', chapter: 2, location: 0.42, page: 96, updatedAt: now - 3600000 },
    { bookId: 'b-casmurro', chapter: 1, location: 0.7, page: 118, updatedAt: now - DAY },
    { bookId: 'b-meditacoes', chapter: 1, location: 0.3, page: 54, updatedAt: now - 2 * DAY },
    { bookId: 'b-liberdade', chapter: 1, location: 1, page: 208, updatedAt: now - 30 * DAY },
  ];

  // Sessões de leitura dos últimos ~70 dias (para estatísticas e jornada).
  const sessions: ReadingSession[] = [];
  const bookCycle = ['b-crime', 'b-casmurro', 'b-meditacoes', 'b-liberdade', 'b-riqueza'];
  for (let d = 68; d >= 0; d--) {
    if (d % 7 === 3) continue; // alguns dias sem leitura
    const count = d % 5 === 0 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const pages = 8 + ((d * 7 + k * 13) % 26);
      sessions.push({
        id: uid(),
        bookId: bookCycle[(d + k) % bookCycle.length],
        start: now - d * DAY - (20 + k * 3) * 3600000,
        end: now - d * DAY - (20 + k * 3) * 3600000 + (pages * 1.9 + 6) * 60000,
        pageStart: 40 + ((d * 11) % 160),
        pageEnd: 40 + ((d * 11) % 160) + pages,
      });
    }
  }

  const highlights: Highlight[] = [
    { id: uid(), bookId: 'b-meditacoes', chapter: 0, start: 0, end: 0, text: 'Ao despertar, dize a ti mesmo: encontrarei hoje um indiscreto, um ingrato, um insolente…', color: 'yellow', createdAt: now - 5 * DAY },
    { id: uid(), bookId: 'b-meditacoes', chapter: 1, start: 0, end: 0, text: 'Em parte alguma encontra o homem retiro mais tranquilo e mais sereno do que em sua própria alma.', color: 'green', createdAt: now - 4 * DAY },
    { id: uid(), bookId: 'b-sisifo', chapter: 2, start: 0, end: 0, text: 'A própria luta para chegar aos cumes é suficiente para encher um coração de homem.', color: 'blue', createdAt: now - 9 * DAY },
    { id: uid(), bookId: 'b-casmurro', chapter: 2, start: 0, end: 0, text: 'olhos que eu definiria de ressaca — olhos de onda que se retém e puxa', color: 'red', createdAt: now - 3 * DAY },
    { id: uid(), bookId: 'b-crime', chapter: 0, start: 0, end: 0, text: 'não era um simples ensaio: era o primeiro passo.', color: 'yellow', createdAt: now - 1 * DAY },
    { id: uid(), bookId: 'b-liberdade', chapter: 1, start: 0, end: 0, text: 'A verdade ganha mais com o erro que a desafia do que com a repetição que a adormece.', color: 'blue', createdAt: now - 32 * DAY },
  ];

  const notes: Note[] = [
    { id: uid(), bookId: 'b-meditacoes', chapter: 1, excerpt: 'retiro mais tranquilo e mais sereno do que em sua própria alma', text: 'O retiro interior: a serenidade não depende do lugar, mas do juízo. Relacionar com Epicteto e com a ideia de "cidadela interior" de Pierre Hadot.', tags: ['estoicismo', 'serenidade'], review: true, createdAt: now - 4 * DAY },
    { id: uid(), bookId: 'b-sisifo', chapter: 2, excerpt: 'É preciso imaginar Sísifo feliz.', text: 'A felicidade não vem da ausência do fardo, mas da consciência e da recusa do consolo. Camus responde ao niilismo com revolta lúcida.', tags: ['absurdo', 'niilismo', 'revolta'], review: true, createdAt: now - 9 * DAY },
    { id: uid(), bookId: 'b-crime', chapter: 0, excerpt: null, text: 'A ideia que precede o ato já é um tribunal. Dostoiévski mostra que o castigo começa antes do crime.', tags: ['moral', 'consciência'], review: false, createdAt: now - 1 * DAY },
    { id: uid(), bookId: 'b-liberdade', chapter: 0, excerpt: 'Sobre si mesmo, sobre o seu corpo e o seu espírito, o indivíduo é soberano.', text: 'O princípio do dano como fronteira da liberdade individual. Comparar com a noção estoica de "o que depende de nós".', tags: ['liberdade', 'indivíduo'], review: true, createdAt: now - 32 * DAY },
    { id: uid(), bookId: null, chapter: null, excerpt: null, text: 'Pergunta para a próxima sessão de revisão: o que muda quando a liberdade é definida apenas pela ausência de dano a terceiros?', tags: ['liberdade', 'perguntas'], review: true, createdAt: now - 2 * DAY },
  ];

  const goals: Goal[] = [
    { id: uid(), kind: 'books', target: 20, period: 'year', createdAt: now - 180 * DAY },
    { id: uid(), kind: 'pages', target: 400, period: 'month', createdAt: now - 40 * DAY },
  ];

  const activities: Activity[] = [
    { id: uid(), kind: 'highlight', bookId: 'b-crime', text: 'destacou um trecho em Crime e Castigo', at: now - DAY },
    { id: uid(), kind: 'note', bookId: 'b-crime', text: 'criou uma nota em Crime e Castigo', at: now - DAY },
    { id: uid(), kind: 'added', bookId: 'b-sisifo', text: 'adicionou O Mito de Sísifo à biblioteca', at: now - 12 * DAY },
    { id: uid(), kind: 'finished', bookId: 'b-liberdade', text: 'concluiu Sobre a Liberdade', at: now - 30 * DAY },
  ];

  const audio: AudioProgress[] = [
    { bookId: 'b-meditacoes', chapter: 1, seconds: 132, rate: 1, updatedAt: now - 2 * DAY },
  ];

  const notifications: Notification[] = [
    { id: uid(), icon: '👥', text: 'Maria começou a ler Crime e Castigo — vocês dois estão no capítulo 2.', at: now - 2 * 3600000, read: false, href: '/app/clube' },
    { id: uid(), icon: '💬', text: 'João respondeu ao seu comentário no capítulo 1 de Crime e Castigo.', at: now - 5 * 3600000, read: false, href: '/app/clube' },
    { id: uid(), icon: '📚', text: 'O Clube de Filosofia iniciou um novo livro: O Mito de Sísifo.', at: now - DAY, read: false, href: '/app/clube' },
    { id: uid(), icon: '🎯', text: 'Você atingiu 60% da sua meta anual de leitura.', at: now - 2 * DAY, read: true, href: '/app/jornada/metas' },
  ];

  return {
    accounts: [],
    profile: null,
    books,
    chapters,
    progress,
    sessions,
    highlights,
    notes,
    goals,
    activities,
    audio,
    notifications,
    following: ['p-maria', 'p-joao', 'p-ana'],
    workers: [
      {
        id: 'w-demo', deviceName: 'Worker de demonstração', platform: 'demo', status: 'online', active: true,
        engine: 'Kokoro', engineVersion: '1.0 (simulado)', cpu: '8 núcleos', memory: '16 GB', battery: null,
        lastSeen: now, createdAt: now - 30 * DAY,
      },
      {
        id: 'w-demo2', deviceName: 'Galaxy A20 (exemplo)', platform: 'android', status: 'offline', active: true,
        engine: 'Kokoro', engineVersion: '1.0 (simulado)', cpu: 'Octa-core', memory: '3 GB', battery: 64,
        lastSeen: now - 26 * 3600000, createdAt: now - 60 * DAY,
      },
    ],
    jobs: [],
    jobChapters: [],
    audioSegments: [],
    ttsPrefs: { engine: 'kokoro', voice: 'pf_dora', speed: 1, language: 'pt-BR', quality: 'high' },
    aiCache: [],
    aiLog: [],
    annotations: [],
    chat: { conversations: [], messages: [] },
    mySocial: {
      username: 'shay', pronouns: '', location: 'Brasil', website: '',
      cover: '', about: 'Sou apaixonado por filosofia, literatura russa e história antiga. Gosto de ler à noite.',
      genres: ['Filosofia', 'Literatura'], authors: ['Dostoiévski', 'Machado de Assis'],
      books: [{ title: 'Crime e Castigo', author: 'Fiódor Dostoiévski', note: 'Meu favorito', rating: 5, category: 'favorito' }],
      music: [{ title: 'Clair de Lune', artist: 'Debussy', note: 'Para ler à noite' }],
      interests: ['filosofia', 'literatura russa', 'história antiga'],
    },
    discussions: [
      { id: 'd-seed1', userId: 'p-maria', title: 'O niilismo em Dostoiévski é desespero ou libertação?', content: 'Relendo **Crime e Castigo**, fiquei com a sensação de que o niilismo de Raskólnikov não é só destruição — é também uma tentativa dolorida de reconstruir.\n\n> Se a alma é imortal, tudo muda.\n\nO que vocês acham?', category: 'Filosofia', bookId: 'b-crime', authorName: 'Dostoiévski', tags: ['niilismo', 'dostoiévski'], status: 'published', createdAt: now - 2 * DAY },
      { id: 'd-seed2', userId: 'p-joao', title: 'Marco Aurélio: a cidadela interior ainda faz sentido?', content: 'A ideia de recuar para a própria mente como refúgio (*cidadela interior*) me parece muito atual numa era de ruído constante.\n\n- Alguém aplica isso no dia a dia?\n- Como lidar quando o "refúgio" vira fuga?', category: 'Filosofia', bookId: 'b-meditacoes', authorName: 'Marco Aurélio', tags: ['estoicismo'], status: 'published', createdAt: now - 5 * DAY },
      { id: 'd-seed3', userId: 'p-carlos', title: 'Machado de Assis: Capitu traiu ou não? (sem brigas 😄)', content: 'A pergunta eterna. Meu argumento: o narrador é *ciumento e não confiável*, então o livro é sobre a impossibilidade de saber.\n\n---\n\nQuero ouvir leituras diferentes!', category: 'Literatura', bookId: 'b-casmurro', authorName: 'Machado de Assis', tags: ['machado', 'literatura-brasileira'], status: 'published', createdAt: now - 8 * DAY },
    ],
    dcomments: [
      { id: 'c-seed1', discussionId: 'd-seed1', userId: 'p-joao', parentId: null, content: 'Para mim é libertação que vira peso — ele se liberta da moral e descobre que não sabia viver sem ela.', createdAt: now - 1 * DAY },
      { id: 'c-seed2', discussionId: 'd-seed1', userId: 'p-maria', parentId: 'c-seed1', content: 'Exato! A liberdade sem chão é o verdadeiro castigo.', createdAt: now - 20 * 3600000 },
      { id: 'c-seed3', discussionId: 'd-seed3', userId: 'p-ana', parentId: null, content: 'O livro é um tribunal sem veredicto — e essa é a genialidade.', createdAt: now - 6 * DAY },
    ],
    dreactions: [ { discussionId: 'd-seed1', userId: 'p-joao', emoji: '💡' }, { discussionId: 'd-seed3', userId: 'p-maria', emoji: '❤️' } ],
    savedDisc: [],
    followers: ['p-maria', 'p-joao'],
  };
}

// ─── Personas e vida social de demonstração ─────────────────────────────────
const PEOPLE: Person[] = [
  { id: 'p-maria', name: 'Maria', color: '#1e4d44', bio: 'Leio russos, releio os gregos.', genres: ['Literatura', 'Filosofia'] },
  { id: 'p-joao', name: 'João', color: '#26364f', bio: 'Filosofia e café, nesta ordem.', genres: ['Filosofia'] },
  { id: 'p-ana', name: 'Ana', color: '#5a4630', bio: 'Economia com história.', genres: ['Economia', 'História'] },
  { id: 'p-carlos', name: 'Carlos', color: '#3d3550', bio: 'Ficção, sobretudo ficção.', genres: ['Ficção', 'Literatura'] },
  { id: 'p-beatriz', name: 'Beatriz', color: '#6e1f2b', bio: 'Ciência é a melhor literatura.', genres: ['Ciência'] },
];

const SOCIAL_FEED: FeedItem[] = [
  { id: 'f1', personId: 'p-maria', kind: 'started', bookTitle: 'Crime e Castigo', text: 'começou a ler', at: now - 2 * 3600000 },
  { id: 'f2', personId: 'p-joao', kind: 'listening', bookTitle: 'Meditações', text: 'está ouvindo', at: now - 5 * 3600000 },
  { id: 'f3', personId: 'p-ana', kind: 'finished', bookTitle: 'A Riqueza das Nações', text: 'terminou', at: now - 9 * 3600000 },
  { id: 'f4', personId: 'p-carlos', kind: 'comment', bookTitle: 'Crime e Castigo', text: 'comentou um trecho de', at: now - DAY },
  { id: 'f5', personId: 'p-maria', kind: 'goal', bookTitle: null, text: 'atingiu a meta mensal de leitura 🎯', at: now - 2 * DAY },
  { id: 'f6', personId: 'p-beatriz', kind: 'note', bookTitle: 'Sobre a Liberdade', text: 'compartilhou uma nota de', at: now - 3 * DAY },
];

const SOCIAL_READERS: Record<string, { personId: string; progress: number; page: number }[]> = {
  'b-crime': [
    { personId: 'p-maria', progress: 0.82, page: 427 },
    { personId: 'p-joao', progress: 0.74, page: 388 },
    { personId: 'p-carlos', progress: 0.51, page: 265 },
    { personId: 'p-ana', progress: 0.34, page: 177 },
  ],
  'b-meditacoes': [
    { personId: 'p-joao', progress: 0.61, page: 96 },
    { personId: 'p-beatriz', progress: 0.22, page: 34 },
  ],
  'b-casmurro': [{ personId: 'p-carlos', progress: 0.58, page: 149 }],
  'b-sisifo': [{ personId: 'p-joao', progress: 0.9, page: 121 }],
};

const SOCIAL_COMMENTS: BookComment[] = [
  { id: 'd1', personId: 'p-joao', bookId: 'b-crime', chapter: 0, text: 'Essa passagem do "primeiro passo" muda completamente a interpretação do personagem. Ele já se condenou antes do ato.', likes: 12, at: now - 6 * 3600000 },
  { id: 'd2', personId: 'p-maria', bookId: 'b-crime', chapter: 0, text: 'Discordo em parte. Acho que ele ainda acredita na própria teoria — o que desmorona é o corpo, não a ideia.', likes: 8, at: now - 5 * 3600000 },
  { id: 'd3', personId: 'p-carlos', bookId: 'b-crime', chapter: 2, text: 'O bilhete da família no fim do capítulo é o momento em que o amor vira tribunal. Dostoiévski é cruel demais.', likes: 15, at: now - 3 * 3600000 },
  { id: 'd4', personId: 'p-ana', bookId: 'b-crime', chapter: 2, text: 'Reli três vezes esse trecho. Cada releitura o final fica mais pesado.', likes: 4, at: now - 2 * 3600000 },
  { id: 'd5', personId: 'p-joao', bookId: 'b-meditacoes', chapter: 1, text: 'O "retiro interior" virou meu exercício diário. Cinco minutos de silêncio antes de tudo.', likes: 21, at: now - DAY },
  { id: 'd6', personId: 'p-beatriz', bookId: 'b-liberdade', chapter: 1, text: 'A frase sobre o erro que desafia a verdade deveria estar em todas as escolas.', likes: 9, at: now - 4 * DAY },
];

const CLUBS: Club[] = [
  { id: 'cl1', name: 'Clube de Filosofia', members: 84, bookTitle: 'O Mito de Sísifo', progress: 0.68, color: '#1e4d44' },
  { id: 'cl2', name: 'Clube de Literatura Russa', members: 142, bookTitle: 'Crime e Castigo', progress: 0.54, color: '#6e1f2b' },
  { id: 'cl3', name: 'Economia para Curiosos', members: 37, bookTitle: 'A Riqueza das Nações', progress: 0.31, color: '#5a4630' },
];

export const DEMO_SOCIAL: SocialBundle = {
  people: PEOPLE,
  following: ['p-maria', 'p-joao', 'p-ana'],
  readers: SOCIAL_READERS as any,
  feed: SOCIAL_FEED,
  comments: SOCIAL_COMMENTS,
  clubs: CLUBS,
};

// ─── Persistência local ──────────────────────────────────────────────────────
let cache: DemoDB | null = null;

export function loadDB(): DemoDB {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      cache = JSON.parse(raw) as DemoDB;
      return cache!;
    }
  } catch (e) {
    console.warn('Falha ao ler dados locais; recriando.', e);
  }
  cache = seedDB();
  saveDB();
  return cache;
}

export function saveDB() {
  if (!cache) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Não foi possível salvar localmente (armazenamento cheio?).', e);
  }
}

export function getSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionUserId(id: string | null) {
  if (id) localStorage.setItem(SESSION_KEY, id);
  else localStorage.removeItem(SESSION_KEY);
}

// Hash simples para senhas em modo demo (NÃO usar em produção — o backend real
// usa Supabase Auth, que nunca armazena senhas na aplicação).
export async function hashPassword(pw: string): Promise<string> {
  const data = new TextEncoder().encode('atheneu-demo::' + pw);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function defaultPrefs(): Prefs {
  return { interests: [], yearlyGoal: 12, frequency: 'daily', format: 'read', audioRate: 1 };
}

export function defaultPrivacy(): Privacy {
  return { library: 'public', progress: 'followers', activity: 'followers', notes: 'private', highlights: 'private' };
}
