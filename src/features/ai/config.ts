// ─── Configuração central da IA (§39) ────────────────────────────────────
// Todos os limites vivem aqui — nunca espalhados pelo código.
// Os valores podem ser sobrescritos por variáveis de ambiente sem mudar a lógica.
//
// IMPORTANTE (§41): os limites do tier gratuito do Gemini mudam. Consulte a
// documentação oficial no momento da configuração e ajuste aqui:
// https://ai.google.dev/gemini-api/docs/rate-limits

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const AI_CONFIG = {
  // Consultas Gemini por usuário por dia (§29)
  dailyLimit: num(import.meta.env.VITE_AI_DAILY_LIMIT, 10),
  // Mínimo de segundos entre duas consultas (§30)
  rateLimitSeconds: num(import.meta.env.VITE_AI_RATE_LIMIT_SECONDS, 5),
  // Validade do cache em dias (§22)
  cacheDurationDays: num(import.meta.env.VITE_AI_CACHE_DURATION_DAYS, 30),
  // Máximo de caracteres de contexto enviados ao modelo (§27, §34)
  maxContextChars: num(import.meta.env.VITE_AI_MAX_CONTEXT, 6000),
  // Máximo de tokens de saída (§35)
  maxOutputTokens: num(import.meta.env.VITE_AI_MAX_OUTPUT, 512),
  // Modelo utilizado (não assumir disponibilidade permanente — §41)
  model: (import.meta.env.VITE_AI_MODEL as string) || 'gemini-2.0-flash',
};

// Operações com política de cache própria (§36). TTL em dias; 0 = sem cache.
export const AI_OPERATIONS: Record<string, { cacheDays: number; needsContext: boolean }> = {
  answer_library_question: { cacheDays: AI_CONFIG.cacheDurationDays, needsContext: true },
  summarize_chapter: { cacheDays: AI_CONFIG.cacheDurationDays, needsContext: true },
  explain_concept: { cacheDays: AI_CONFIG.cacheDurationDays, needsContext: true },
  compare_books: { cacheDays: AI_CONFIG.cacheDurationDays, needsContext: true },
  generate_review_question: { cacheDays: 7, needsContext: true },
  extract_concepts: { cacheDays: AI_CONFIG.cacheDurationDays, needsContext: true },
};

export const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
export const AI_PROXY_ENDPOINT = (import.meta.env.VITE_AI_ENDPOINT as string) || '';

// ─── Chave do Google AI Studio do PRÓPRIO usuário (§ pedido) ───
// A chave fica no navegador do usuário (localStorage) e gerencia a conta DELE.
// Prioridade: chave do usuário > chave do ambiente (build).
const USER_KEY_LS = 'atheneu-gemini-key';
export const getUserGeminiKey = (): string => {
  try { return localStorage.getItem(USER_KEY_LS) || ''; } catch { return ''; }
};
export const setUserGeminiKey = (k: string) => {
  try { k.trim() ? localStorage.setItem(USER_KEY_LS, k.trim()) : localStorage.removeItem(USER_KEY_LS); } catch {}
};
export const effectiveGeminiKey = (): string => getUserGeminiKey() || GEMINI_API_KEY;
export const usingUserKey = (): boolean => Boolean(getUserGeminiKey());

// A IA está habilitada quando existe proxy seguro OU chave (do usuário ou do build).
export const aiAvailable = () => Boolean(AI_PROXY_ENDPOINT || effectiveGeminiKey());
