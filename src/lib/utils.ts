// Utilitários de formatação e helpers gerais.

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const nf = new Intl.NumberFormat('pt-BR');
export const fmt = (n: number) => nf.format(Math.round(n));

export const fmtDate = (ts: number) =>
  new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(new Date(ts));

export const fmtDateFull = (ts: number) =>
  new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(ts)
  );

export const fmtClock = (secs: number) => {
  const s = Math.max(0, Math.round(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    : `${m}:${String(ss).padStart(2, '0')}`;
};

export const fmtHours = (minutes: number) => {
  const h = minutes / 60;
  return h >= 1 ? `${h.toFixed(1).replace('.', ',')} h` : `${Math.round(minutes)} min`;
};

export function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d} dia${d > 1 ? 's' : ''}`;
  return fmtDate(ts);
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Hash determinístico simples → índice de paleta de capas.
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// Paletas de capas geradas proceduralmente (estilo encadernação clássica).
export const COVER_PALETTES = [
  { a: '#6e1f2b', b: '#3f0f17', ink: '#f0e3cf' }, // vinho
  { a: '#1e4d44', b: '#0f2b26', ink: '#e6ead9' }, // verde profundo
  { a: '#26364f', b: '#121c2c', ink: '#e4e6ef' }, // azul noite
  { a: '#5a4630', b: '#33261a', ink: '#efe4cd' }, // couro
  { a: '#3d3550', b: '#211c2e', ink: '#e9e2f0' }, // ameixa
  { a: '#743e2a', b: '#40201525', ink: '#f3e6d4' }, // terracota
  { a: '#374a3a', b: '#1c281f', ink: '#e8ecdd' }, // musgo
  { a: '#5c2438', b: '#2e101c', ink: '#f1e0e0' }, // bordô rosado
];

export function coverPalette(seedText: string, explicit?: number) {
  const i = (explicit ?? hashStr(seedText)) % COVER_PALETTES.length;
  return COVER_PALETTES[i];
}

// Normalização para busca (minúsculas, sem acentos).
export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const STOPWORDS = new Set(
  'a o e é de do da dos das em no na nos nas um uma uns umas para por com sobre entre que se seu sua meus minhas qual quais como onde quando quem tem têm são é ser está estão foi era sobre meu minha sua suas ao aos à às os as'.split(
    ' '
  )
);

export function keywords(q: string): string[] {
  return norm(q)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// Traduz erros técnicos em mensagens amigáveis (especificação §35).
export function friendlyError(e: any): string {
  console.error('[Atheneu] detalhe técnico:', e);
  const msg = String(e?.message || e || '');
  if (/fetch|network|failed to fetch/i.test(msg))
    return 'Não foi possível conectar. Verifique sua internet e tente novamente.';
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/already registered|already been registered/i.test(msg))
    return 'Este e-mail já possui uma conta. Tente entrar.';
  if (/password.*short|weak password/i.test(msg)) return 'Use uma senha com pelo menos 8 caracteres.';
  if (/rate limit/i.test(msg)) return 'Muitas tentativas seguidas. Aguarde um instante.';
  if (/email/i.test(msg) && /confirm/i.test(msg))
    return 'Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).';
  return 'Algo não saiu como esperado. Tente novamente em instantes.';
}

export function debounce<T extends (...a: any[]) => void>(fn: T, ms: number) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const WORDS_PER_PAGE = 280;
export const pagesForWords = (words: number) => Math.max(1, Math.round(words / WORDS_PER_PAGE));
