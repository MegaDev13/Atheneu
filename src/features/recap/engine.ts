// Fechamento idempotente de períodos + narrativa da retrospectiva.
// Métricas vêm de computeRecap (sistema); a IA só narra por cima (§17/18/47).
import { backend } from '../../services/api';
import { computeRecap, lastDayOfMonth, fmtMin, type RecapMetrics } from './metrics';
import type { Book, ReadingSession, RecapSnapshot } from '../../lib/types';
import { aiAvailable } from '../ai/config';
import { getAIProvider } from '../ai/gemini';

// fecha o mês anterior (e o ano anterior se janeiro) — idempotente (§33)
export async function ensureRecaps(userId: string): Promise<RecapSnapshot[]> {
  const now = new Date();
  const data = async () => {
    const [sessions, books] = await Promise.all([backend.listSessions(userId), backend.listBooks(userId)]);
    return { sessions, books };
  };
  // mês anterior completo
  const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthPeriod = `${pm.getFullYear()}-${String(pm.getMonth() + 1).padStart(2, '0')}`;
  const { sessions, books } = await data();
  const m = computeRecap(sessions, books, monthPeriod);
  if (m.pages > 0 || m.booksCompleted > 0) await backend.closeRecap(userId, monthPeriod, 'monthly', m);
  // ano anterior se estamos em janeiro
  if (now.getMonth() === 0) {
    const y = String(now.getFullYear() - 1);
    const ym = computeRecap(sessions, books, y);
    if (ym.pages > 0 || ym.booksCompleted > 0) await backend.closeRecap(userId, y, 'yearly', ym);
  }
  return backend.listRecaps(userId);
}

// narrativa: IA interpreta os dados (sem inventar números); fallback = templates (§17/43)
export async function buildNarrative(m: RecapMetrics): Promise<string[]> {
  const lines: string[] = [];
  const label = m.period.includes('-') ? mesLabel(m.period) : `o ano de ${m.period}`;
  if (m.pages === 0 && m.booksCompleted === 0) {
    return ['Este mês foi mais calmo 📖', 'Você ainda não registrou leituras neste período.', 'Que tal começar uma leitura?'];
  }
  const base = [
    `✨ ${cap(label)} foi assim: você leu ${m.pages.toLocaleString('pt-BR')} páginas em ${fmtMin(m.minutes)}.`,
    m.booksCompleted > 0 ? `📚 Você concluiu ${m.booksCompleted} livro${m.booksCompleted > 1 ? 's' : ''}.` : null,
    m.longestStreak > 1 ? `🔥 Sua maior sequência foi de ${m.longestStreak} dias lendo.` : null,
    m.topGenre ? `📚 Gênero do período: ${m.topGenre.name} (${m.topGenre.pct}% do que você leu).` : null,
    m.topAuthor ? `✍️ Autor do período: ${m.topAuthor.name}.` : null,
    m.topDay ? `📖 Seu dia mais literário: ${m.topDay.label}, com ${m.topDay.pages} páginas.` : null,
    m.favoriteBook ? `❤️ Seu favorito: ${m.favoriteBook.title} (${m.favoriteBook.rating}★).` : m.mostReadBook ? `📖 Você passou mais tempo lendo ${m.mostReadBook.title} (${fmtMin(m.mostReadBook.minutes)}).` : null,
  ].filter(Boolean) as string[];

  if (aiAvailable()) {
    try {
      const provider = getAIProvider();
      const { text } = await provider.generate(
        `Você narra a retrospectiva de leitura de uma pessoa. Use SOMENTE estes dados reais (não invente números): ${JSON.stringify(m)}. Escreva 2 frases curtas e pessoais em português, baseadas apenas nesses dados, sem afirmações psicológicas.`,
        { maxOutputTokens: 200 }
      );
      if (text) lines.push(text);
    } catch {}
  }
  return [...lines, ...base];
}

export function mesLabel(period: string) {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
