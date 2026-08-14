// ─── Pipeline de IA econômico (§21–35) ────────────────────────────────────
//
//   Pergunta → pesquisa local → seleção de contexto mínimo → cache?
//     → limite diário? → rate limit? → Gemini → registrar + cachear
//
// Nada aqui é chamado automaticamente: apenas por ação explícita do usuário (§25).

import { backend } from '../../services/api';
import { keywords } from '../../lib/utils';
import { AI_CONFIG, AI_OPERATIONS, aiAvailable } from './config';
import { getAIProvider, buildPrompt } from './gemini';
import type { AiContext } from './localEngine';
import type { AiOperation } from '../../lib/types';

export interface AiResult {
  status: 'ok' | 'cache' | 'limit' | 'rate' | 'error' | 'quota' | 'unavailable';
  text: string;
  model?: string;
  tokens?: number;
}

// §23 · Normalização básica sem alterar significado
export function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[?!.,;:…]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function hashText(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const RATE_KEY = 'atheneu-ai-last-call';

export function rateLimited(): boolean {
  const last = Number(localStorage.getItem(RATE_KEY) || 0);
  return Date.now() - last < AI_CONFIG.rateLimitSeconds * 1000;
}

function markCalled() {
  localStorage.setItem(RATE_KEY, String(Date.now()));
}

// §27/§28/§34 · Recuperação e seleção de contexto mínimo
export function selectContext(question: string, ctx: AiContext): string {
  const kws = keywords(question);
  if (kws.length === 0) return '';
  const match = (s: string) => {
    const ns = s.toLowerCase();
    return kws.filter((k) => ns.includes(k)).length;
  };

  type Piece = { score: number; text: string; kind: string };
  const pieces: Piece[] = [];

  for (const b of ctx.books) {
    const score = match(`${b.title} ${b.author} ${b.genre} ${b.description}`);
    if (score > 0) pieces.push({ score, kind: 'book', text: `Livro: "${b.title}" — ${b.author} (${b.genre})${b.description ? '. ' + b.description : ''}` });
  }
  for (const n of ctx.notes) {
    const score = match(`${n.text} ${n.excerpt || ''} ${n.tags.join(' ')}`);
    if (score > 0) pieces.push({ score: score + 1, kind: 'note', text: `Nota do usuário: ${n.text}${n.excerpt ? ` (sobre o trecho: "${n.excerpt}")` : ''}` });
  }
  for (const h of ctx.highlights) {
    const score = match(h.text);
    if (score > 0) pieces.push({ score, kind: 'highlight', text: `Trecho destacado pelo usuário: "${h.text.slice(0, 300)}"` });
  }

  // 1) ordenar por relevância 2) remover duplicados 3) limitar tamanho
  pieces.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  let out = '';
  for (const p of pieces) {
    const key = p.text.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    if (out.length + p.text.length + 3 > AI_CONFIG.maxContextChars) {
      if (out.length === 0) out = p.text.slice(0, AI_CONFIG.maxContextChars);
      break;
    }
    out += (out ? '\n' : '') + '- ' + p.text;
  }
  return out;
}

// §26 · Classificação simples: Gemini só para perguntas conceituais/analíticas.
// Buscas por título/palavra exata são respondidas localmente, sem custo.
export function shouldUseAI(question: string, ctx: AiContext): boolean {
  // `q` já está normalizado (sem acentos) — o padrão acompanha essa forma.
  const q = normalizeQuestion(question);
  const conceptual = /(por que|porque|como|qual a relacao|qual relacao|compare|diferenca|semelhanca|explique|o que (e|significa|diz)|analise|resumo|sintese|tema|conceito|ideia|filosofia|licao|ensina|dialogo entre|relacao entre)/.test(q);
  const hasContent = selectContext(question, ctx).length > 0;
  return conceptual && hasContent;
}

export interface AskOptions {
  userId: string;
  question: string;
  operation: AiOperation;
  context: string; // já selecionado (mínimo)
  system?: string;
}

export async function askAI(opts: AskOptions): Promise<AiResult> {
  const { userId, question, operation, context } = opts;

  if (!aiAvailable()) {
    return { status: 'unavailable', text: 'A IA ainda não foi configurada (VITE_GEMINI_API_KEY ou VITE_AI_ENDPOINT).' };
  }

  // §22 · Cache primeiro — nunca chamar de novo o que já foi respondido
  const hash = await hashText(`${operation}::${normalizeQuestion(question)}`);
  try {
    const cached = await backend.aiGetCache(userId, operation, hash);
    if (cached) {
      await backend.aiLogRequest(userId, { operation, hash, model: cached.model, status: 'cache', tokensEstimated: 0, at: Date.now() });
      return { status: 'cache', text: cached.response, model: cached.model };
    }
  } catch (e) {
    console.warn('Falha ao consultar cache de IA; seguindo sem cache.', e);
  }

  // §29 · Limite diário
  const today = await backend.aiCountToday(userId).catch(() => 0);
  if (today >= AI_CONFIG.dailyLimit) {
    return { status: 'limit', text: 'Você atingiu o limite diário de consultas da IA. O limite será renovado amanhã.' };
  }

  // §30 · Rate limit
  if (rateLimited()) {
    return { status: 'rate', text: `Aguarde alguns segundos entre consultas (limite: 1 a cada ${AI_CONFIG.rateLimitSeconds}s).` };
  }

  if (!context.trim()) {
    return { status: 'error', text: 'Não encontrei trechos relevantes na sua biblioteca para esta pergunta — por isso não vou consumir uma consulta da IA.' };
  }

  markCalled();
  const provider = getAIProvider();
  const prompt = buildPrompt(
    opts.system || 'Você é um assistente de leitura que conhece apenas os livros e anotações do próprio usuário.',
    context,
    question
  );

  try {
    const { text, tokensEstimated } = await provider.generate(prompt);
    const ttlDays = AI_OPERATIONS[operation]?.cacheDays ?? AI_CONFIG.cacheDurationDays;
    await Promise.all([
      backend.aiLogRequest(userId, { operation, hash, model: provider.name, status: 'success', tokensEstimated, at: Date.now() }),
      ttlDays > 0
        ? backend.aiSetCache(userId, {
            hash, operation, response: text, model: provider.name,
            createdAt: Date.now(), expiresAt: Date.now() + ttlDays * 86400000,
          })
        : Promise.resolve(),
    ]);
    return { status: 'ok', text, model: provider.name, tokens: tokensEstimated };
  } catch (e: any) {
    const status = e?.status === 429 ? 'quota' : 'error';
    await backend.aiLogRequest(userId, { operation, hash, model: provider.name, status, tokensEstimated: 0, at: Date.now() }).catch(() => {});
    console.error('[IA] falha:', e);
    // §32 · fallback: a aplicação continua funcionando sem IA
    return {
      status,
      text: 'A IA está temporariamente indisponível. Você ainda pode pesquisar sua biblioteca normalmente — os resultados locais continuam acima.',
    };
  }
}
