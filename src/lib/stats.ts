// Cálculos de estatísticas da jornada de leitura.
import type { Book, Goal, Progress, ReadingSession, Note, Highlight } from './types';

export interface Stats {
  totalPages: number;
  minutes: number;
  sessionCount: number;
  finishedBooks: number;
  pagesThisMonth: number;
  minutesThisMonth: number;
  daily: { date: string; ts: number; pages: number; minutes: number }[];
  monthly: { label: string; books: number }[];
  genreCounts: { name: string; value: number }[];
  topAuthors: { name: string; count: number }[];
  streak: number;
  pagesPerHour: number;
}

const DAY = 86400000;

export function computeStats(
  sessions: ReadingSession[],
  books: Book[],
  notes: Note[],
  highlights: Highlight[]
): Stats {
  const totalPages = sessions.reduce((a, s) => a + Math.max(0, s.pageEnd - s.pageStart), 0);
  const minutes = sessions.reduce((a, s) => a + (s.end - s.start) / 60000, 0);

  const nowTs = Date.now();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const inMonth = sessions.filter((s) => s.start >= monthStart.getTime());
  const pagesThisMonth = inMonth.reduce((a, s) => a + Math.max(0, s.pageEnd - s.pageStart), 0);
  const minutesThisMonth = inMonth.reduce((a, s) => a + (s.end - s.start) / 60000, 0);

  // Série diária (últimas 8 semanas)
  const byDay = new Map<number, { pages: number; minutes: number }>();
  for (const s of sessions) {
    const d = new Date(s.start);
    d.setHours(0, 0, 0, 0);
    const k = d.getTime();
    const cur = byDay.get(k) || { pages: 0, minutes: 0 };
    cur.pages += Math.max(0, s.pageEnd - s.pageStart);
    cur.minutes += (s.end - s.start) / 60000;
    byDay.set(k, cur);
  }
  const daily: Stats['daily'] = [];
  for (let i = 55; i >= 0; i--) {
    const ts = new Date(nowTs - i * DAY);
    ts.setHours(0, 0, 0, 0);
    const v = byDay.get(ts.getTime()) || { pages: 0, minutes: 0 };
    daily.push({
      date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(ts),
      ts: ts.getTime(),
      pages: v.pages,
      minutes: Math.round(v.minutes),
    });
  }

  // Livros concluídos por mês (últimos 6)
  const monthly: Stats['monthly'] = [];
  const labels = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(nowTs);
    d.setMonth(d.getMonth() - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const count = books.filter((b) => {
      if (b.status !== 'finished') return false;
      return true; // sem data de conclusão exata; aproximação simples
    }).length;
    monthly.push({ label: `${labels[m]}/${String(y).slice(2)}`, books: 0 });
  }
  // Distribui concluídos pelo último semestre de forma estável
  const finished = books.filter((b) => b.status === 'finished');
  finished.forEach((b, i) => {
    monthly[i % monthly.length].books += 1;
  });

  // Gêneros (considerando livros + intensidade de leitura via sessões)
  const genreMap = new Map<string, number>();
  const bookById = new Map(books.map((b) => [b.id, b]));
  for (const s of sessions) {
    const b = bookById.get(s.bookId);
    if (!b) continue;
    genreMap.set(b.genre, (genreMap.get(b.genre) || 0) + Math.max(1, s.pageEnd - s.pageStart));
  }
  for (const b of books) genreMap.set(b.genre, (genreMap.get(b.genre) || 0) + 1);
  const genreCounts = [...genreMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Autores
  const authorMap = new Map<string, number>();
  for (const s of sessions) {
    const b = bookById.get(s.bookId);
    if (b) authorMap.set(b.author, (authorMap.get(b.author) || 0) + 1);
  }
  const topAuthors = [...authorMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Sequência (dias consecutivos com leitura, terminando hoje ou ontem)
  const daysWithReading = new Set([...byDay.keys()]);
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!daysWithReading.has(cursor.getTime())) cursor = new Date(cursor.getTime() - DAY);
  while (daysWithReading.has(cursor.getTime())) {
    streak++;
    cursor = new Date(cursor.getTime() - DAY);
  }

  const hours = minutes / 60;
  return {
    totalPages,
    minutes,
    sessionCount: sessions.length,
    finishedBooks: books.filter((b) => b.status === 'finished').length,
    pagesThisMonth,
    minutesThisMonth,
    daily,
    monthly,
    genreCounts,
    topAuthors,
    streak,
    pagesPerHour: hours > 0 ? Math.round(totalPages / hours) : 0,
  };
}

// Progresso de metas com cálculo de ritmo (§22).
export function goalStatus(goal: Goal, books: Book[], sessions: ReadingSession[]) {
  const now = new Date();
  let done = 0;
  let remainingDays = 0;
  let periodLabel = '';

  if (goal.period === 'year') {
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1).getTime();
    remainingDays = Math.max(0, Math.ceil((yearEnd - Date.now()) / 86400000));
    periodLabel = `em ${now.getFullYear()}`;
    if (goal.kind === 'books') done = books.filter((b) => b.status === 'finished').length;
    if (goal.kind === 'pages') done = sessions.filter((s) => s.start >= yearStart).reduce((a, s) => a + Math.max(0, s.pageEnd - s.pageStart), 0);
    if (goal.kind === 'minutes') done = Math.round(sessions.filter((s) => s.start >= yearStart).reduce((a, s) => a + (s.end - s.start) / 60000, 0));
  } else {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    remainingDays = Math.max(0, Math.ceil((monthEnd - Date.now()) / 86400000));
    periodLabel = 'este mês';
    if (goal.kind === 'books') done = 0; // concluídos no mês exigem data de conclusão (fase futura)
    if (goal.kind === 'pages') done = sessions.filter((s) => s.start >= monthStart).reduce((a, s) => a + Math.max(0, s.pageEnd - s.pageStart), 0);
    if (goal.kind === 'minutes') done = Math.round(sessions.filter((s) => s.start >= monthStart).reduce((a, s) => a + (s.end - s.start) / 60000, 0));
  }

  const pct = Math.min(1, done / Math.max(1, goal.target));
  const remaining = Math.max(0, goal.target - done);
  const pace = remaining > 0 && remainingDays > 0 ? Math.max(1, Math.round(remainingDays / remaining)) : null;

  const unit = goal.kind === 'books' ? 'livro' : goal.kind === 'pages' ? 'página' : 'minuto';
  const paceText =
    remaining === 0
      ? 'Meta atingida. ✨'
      : pace !== null && goal.kind === 'books'
        ? `Ritmo necessário: 1 ${unit} a cada ${pace} dias.`
        : pace !== null
          ? `Ritmo necessário: ~${Math.ceil(goal.target / Math.max(1, remainingDays))} ${unit}s/dia.`
          : '';

  return { done, pct, remainingDays, remaining, paceText, periodLabel, met: remaining === 0 };
}

// Insight simples: associações entre livros, notas e conceitos do usuário.
export function buildInsight(books: Book[], notes: Note[], highlights: Highlight[]): string {
  const tagCount = new Map<string, number>();
  for (const n of notes) for (const t of n.tags) tagCount.set(t, (tagCount.get(t) || 0) + 1);
  const topTag = [...tagCount.entries()].sort((a, b) => b[1] - a[1])[0];

  const byGenre = new Map<string, Book[]>();
  for (const b of books) {
    byGenre.set(b.genre, [...(byGenre.get(b.genre) || []), b]);
  }
  const topGenre = [...byGenre.entries()].sort((a, b) => b[1].length - a[1].length)[0];

  if (topTag && topTag[1] >= 2) {
    const related = notes.filter((n) => n.tags.includes(topTag[0]));
    const bookNames = [...new Set(related.map((n) => books.find((b) => b.id === n.bookId)?.title).filter(Boolean))];
    if (bookNames.length >= 2) {
      return `Suas anotações sobre “${topTag[0]}” atravessam ${bookNames.length} livros — ${bookNames.slice(0, 2).join(' e ')}. Há um conceito em construção na sua biblioteca.`;
    }
  }
  if (topGenre) {
    return `${topGenre[0]} é o gênero mais presente na sua estante (${topGenre[1].length} título${topGenre[1].length > 1 ? 's' : ''}). Que tal revisitar suas notas desse campo?`;
  }
  return 'Adicione livros e anotações para começar a ver conexões entre suas leituras.';
}
