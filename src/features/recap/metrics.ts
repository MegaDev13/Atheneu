// Métricas da retrospectiva — SEMPRE calculadas pelo sistema a partir dos dados
// reais (§18). A IA só narra/interpreta; nunca calcula (§47).
import type { Book, ReadingSession } from '../../lib/types';

export const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const daysInMonth = (y: number, m: number) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
export const lastDayOfMonth = (y: number, m: number) => daysInMonth(y, m);

// período [start, end) em ms, no fuso local (§34)
export function periodRange(period: string): { start: number; end: number } {
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-').map(Number);
    return { start: new Date(y, m - 1, 1).getTime(), end: new Date(y, m, 1).getTime() };
  }
  const y = Number(period);
  return { start: new Date(y, 0, 1).getTime(), end: new Date(y + 1, 0, 1).getTime() };
}

const inRange = (t: number, r: { start: number; end: number }) => t >= r.start && t < r.end;

export interface RecapMetrics {
  period: string;
  booksCompleted: number; booksStarted: number; booksAdded: number;
  pages: number; minutes: number; daysRead: number; sessions: number;
  avgPagesPerSession: number; longestStreak: number;
  topAuthor: { name: string; count: number } | null;
  topGenre: { name: string; pct: number } | null;
  topDay: { label: string; pages: number } | null;
  favoriteHour: { label: string } | null;
  favoriteBook: { title: string; rating: number } | null;   // só se houver avaliação (§7/8)
  mostReadBook: { title: string; minutes: number } | null;  // métrica objetiva (§9)
  longestBook: { title: string; pages: number } | null;
  evolution: Array<{ label: string; pages: number }>;
}

// mínimos configuráveis p/ uma métrica ser válida (§28)
const MIN = { favoriteHourSessions: 5, topGenreBooks: 3, topAuthorBooks: 2 };

export function computeRecap(sessions: ReadingSession[], books: Book[], period: string): RecapMetrics {
  const r = periodRange(period);
  const ss = sessions.filter((s) => inRange(s.start, r));
  const bookById = new Map(books.map((b) => [b.id, b]));

  const pages = ss.reduce((a, s) => a + Math.max(0, s.pageEnd - s.pageStart), 0);
  const minutes = ss.reduce((a, s) => a + (s.end - s.start) / 60000, 0);

  const daySet = new Set(ss.map((s) => new Date(s.start).toDateString()));
  const daysRead = daySet.size;

  // maior sequência de dias consecutivos (§14)
  const days = [...daySet].map((d) => new Date(d).getTime()).sort((a, b) => a - b);
  let streak = 0, best = 0;
  for (let i = 0; i < days.length; i++) {
    streak = i > 0 && days[i] - days[i - 1] <= 86400000 * 1.5 ? streak + 1 : 1;
    best = Math.max(best, streak);
  }

  // por livro: minutos + páginas
  const perBook = new Map<string, { minutes: number; pages: number }>();
  for (const s of ss) {
    const cur = perBook.get(s.bookId) || { minutes: 0, pages: 0 };
    cur.minutes += (s.end - s.start) / 60000;
    cur.pages += Math.max(0, s.pageEnd - s.pageStart);
    perBook.set(s.bookId, cur);
  }

  const completed = books.filter((b) => b.status === 'finished');
  const started = books.filter((b) => b.status === 'reading' || b.status === 'finished');

  // autor mais lido (por sessões/tempo) — mínimo 2 (§28)
  const authorCount = new Map<string, number>();
  for (const [id, v] of perBook) {
    const b = bookById.get(id); if (!b) continue;
    authorCount.set(b.author, (authorCount.get(b.author) || 0) + v.minutes);
  }
  const topAuthorArr = [...authorCount.entries()].sort((a, b) => b[1] - a[1]);
  const topAuthor = topAuthorArr.length >= MIN.topAuthorBooks ? { name: topAuthorArr[0][0], count: Math.round(topAuthorArr[0][1] / 60) } : null;

  // gênero predominante (mínimo 3 livros) c/ % (§10/28)
  const genrePages = new Map<string, number>();
  const genreBooks = new Map<string, Set<string>>();
  for (const [id, v] of perBook) {
    const b = bookById.get(id); if (!b) continue;
    genrePages.set(b.genre, (genrePages.get(b.genre) || 0) + v.pages);
    genreBooks.set(b.genre, (genreBooks.get(b.genre) || new Set()).add(id));
  }
  let topGenre: RecapMetrics['topGenre'] = null;
  const eligible = [...genreBooks.entries()].filter(([, s]) => s.size >= MIN.topGenreBooks);
  if (eligible.length) {
    eligible.sort((a, b) => (genrePages.get(b[0]) || 0) - (genrePages.get(a[0]) || 0));
    const total = [...genrePages.values()].reduce((a, b) => a + b, 0) || 1;
    topGenre = { name: eligible[0][0], pct: Math.round(((genrePages.get(eligible[0][0]) || 0) / total) * 100) };
  }

  // dia de maior leitura (§12)
  const byDay = new Map<string, number>();
  for (const s of ss) {
    const k = new Date(s.start).toDateString();
    byDay.set(k, (byDay.get(k) || 0) + Math.max(0, s.pageEnd - s.pageStart));
  }
  const topDayArr = [...byDay.entries()].sort((a, b) => b[1] - a[1]);
  const topDay = topDayArr.length ? { label: new Date(topDayArr[0][0]).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }), pages: topDayArr[0][1] } : null;

  // horário preferido (mínimo de sessões) (§13/28)
  let favoriteHour: RecapMetrics['favoriteHour'] = null;
  if (ss.length >= MIN.favoriteHourSessions) {
    const buckets = new Map<number, number>();
    for (const s of ss) { const h = new Date(s.start).getHours(); buckets.set(h, (buckets.get(h) || 0) + 1); }
    const [h] = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0];
    const band = h < 6 ? 'madrugada' : h < 12 ? 'manhã' : h < 18 ? 'tarde' : 'noite';
    favoriteHour = { label: `${h}h–${h + 1}h (${band})` };
  }

  // favorito SOMENTE com avaliação explícita (§7/8); senão, mais lido (§9)
  const rated = books.filter((b) => b.rating > 0).sort((a, b) => b.rating - a.rating);
  const favoriteBook = rated.length ? { title: rated[0].title, rating: rated[0].rating } : null;
  let mostReadBook: RecapMetrics['mostReadBook'] = null;
  if (!favoriteBook) {
    const arr = [...perBook.entries()].sort((a, b) => b[1].minutes - a[1].minutes);
    if (arr.length) { const b = bookById.get(arr[0][0]); if (b) mostReadBook = { title: b.title, minutes: Math.round(arr[0][1].minutes) }; }
  }

  // livro mais longo (páginas) entre os lidos
  let longestBook: RecapMetrics['longestBook'] = null;
  const read = [...perBook.keys()].map((id) => bookById.get(id)).filter(Boolean) as Book[];
  if (read.length) { const L = read.sort((a, b) => b.pages - a.pages)[0]; longestBook = { title: L.title, pages: L.pages }; }

  // evolução (páginas por mês p/ anual; por semana p/ mensal)
  const isYear = /^\d{4}$/.test(period);
  const evolution: Array<{ label: string; pages: number }> = [];
  if (isYear) {
    for (let m = 0; m < 12; m++) {
      const ms = new Date(Number(period), m, 1).getTime();
      const me = new Date(Number(period), m + 1, 1).getTime();
      const p = ss.filter((s) => s.start >= ms && s.start < me).reduce((a, s) => a + Math.max(0, s.pageEnd - s.pageStart), 0);
      evolution.push({ label: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][m], pages: p });
    }
  } else {
    for (let w = 0; w < 5; w++) {
      const ws = r.start + w * 7 * 86400000;
      const we = ws + 7 * 86400000;
      const p = ss.filter((s) => s.start >= ws && s.start < we).reduce((a, s) => a + Math.max(0, s.pageEnd - s.pageStart), 0);
      evolution.push({ label: `sem ${w + 1}`, pages: p });
    }
  }

  return {
    period,
    booksCompleted: completed.length, booksStarted: started.length,
    booksAdded: books.filter((b) => inRange(b.addedAt, r)).length,
    pages, minutes, daysRead, sessions: ss.length,
    avgPagesPerSession: ss.length ? Math.round(pages / ss.length) : 0,
    longestStreak: best, topAuthor, topGenre, topDay, favoriteHour, favoriteBook, mostReadBook, longestBook, evolution,
  };
}

export function fmtMin(min: number) {
  const h = Math.floor(min / 60); const m = Math.round(min % 60);
  return h ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
}
