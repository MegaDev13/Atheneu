// ═══════════════════════════════════════════════════════════════════════
// THEME ENGINE · Schema + validação + mapeamento token → variável CSS
// O tema é DADOS declarativos. Nunca executa código. A IA e os imports só
// podem produzir valores que passem por sanitizeTheme().
// ═══════════════════════════════════════════════════════════════════════

export interface ThemeConfig {
  version: string;
  themeId: string;
  name: string;
  description?: string;
  mode: 'light' | 'dark';
  createdBy?: string;
  compatibleWith?: string;
  colors?: Record<string, string>;
  typography?: Record<string, string>;
  radius?: Record<string, string>;
  shadows?: Record<string, string>;
  effects?: Record<string, string>;
  animations?: Record<string, string | number | boolean>;
  components?: Record<string, Record<string, string>>;
}

export const THEME_ENGINE_VERSION = 'theme-engine-v1';

// mapeamento schema → variável CSS existente (não cria CSS novo à toa)
const COLOR_MAP: Record<string, string> = {
  background: '--bg', paper: '--paper', surface: '--card', surfaceSecondary: '--card2',
  text: '--ink', textSecondary: '--ink-soft', textMuted: '--ink-faint', border: '--line',
  primary: '--wine', primarySoft: '--wine-light', secondary: '--pine', accent: '--gold',
  glow: '--glow', success: '--success', warning: '--warning', error: '--error',
};
const TYPO_MAP: Record<string, string> = {
  fontFamily: '--font-sans', headingFont: '--font-display', readerFont: '--font-reader',
  baseFontSize: '--font-size-md', lineHeight: '--line-height', letterSpacing: '--letter-spacing',
};
const RADIUS_MAP: Record<string, string> = { sm: '--radius-sm', md: '--radius-md', lg: '--radius-lg', xl: '--radius-xl' };
const SHADOW_MAP: Record<string, string> = { card: '--shadow-card', deep: '--shadow-deep', spine: '--shadow-spine' };
const EFFECT_MAP: Record<string, string> = {
  glassBlur: '--glass-blur', glassAlpha: '--glass-alpha', borderWidth: '--border-width', density: '--density',
};
const COMP_MAP: Record<string, Record<string, string>> = {
  button: { radius: '--button-radius', shadow: '--button-shadow' },
  card: { radius: '--card-radius', shadow: '--card-shadow', border: '--card-border' },
  input: { radius: '--input-radius', background: '--input-bg' },
  sidebar: { background: '--sidebar-bg', border: '--sidebar-border', width: '--sidebar-width', active: '--sidebar-active', activeText: '--sidebar-active-text' },
  chat: { userBackground: '--chat-user-bg', userText: '--chat-user-text', otherBackground: '--chat-other-bg', otherText: '--chat-other-text' },
};

// ─── segurança (§20): tema é dado, nunca código ───
const FORBIDDEN = /javascript:|expression|@import|url\s*\(\s*['"]?javascript|<\s*script|eval\(|function\s*\(|`|<%|import\s*\(/i;
const DANGEROUS_CHARS = /[{};<>]/;

export function isSafeValue(v: unknown): boolean {
  if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') return false;
  const s = String(v);
  if (FORBIDDEN.test(s)) return false;
  // permite var(...), rgb(...), rgba(...), hex, palavras, números, %, vírgula, espaço, /, ( )
  if (DANGEROUS_CHARS.test(s.replace(/var\([^)]*\)/g, '').replace(/rgb[a]?\([^)]*\)/g, '').replace(/calc\([^)]*\)/g, '').replace(/color-mix\([^)]*\)/g, ''))) return false;
  return s.length <= 200;
}

// valida + limpa um tema, descartando qualquer chave/valor fora do schema ou inseguro
export function sanitizeTheme(raw: any): ThemeConfig {
  const t: ThemeConfig = {
    version: '1.0',
    themeId: String(raw?.themeId || 'custom-' + Date.now()),
    name: String(raw?.name || 'Tema personalizado').slice(0, 40),
    description: String(raw?.description || ''),
    mode: raw?.mode === 'dark' ? 'dark' : 'light',
    createdBy: String(raw?.createdBy || 'user'),
    compatibleWith: THEME_ENGINE_VERSION,
  };
  const pick = (src: any, map: Record<string, string>) => {
    const out: Record<string, string> = {};
    if (!src || typeof src !== 'object') return out;
    for (const [k, target] of Object.entries(map)) {
      const v = src[k];
      if (v !== undefined && isSafeValue(v as any)) out[k] = String(v);
    }
    return out;
  };
  t.colors = pick(raw?.colors, COLOR_MAP);
  t.typography = pick(raw?.typography, TYPO_MAP);
  t.radius = pick(raw?.radius, RADIUS_MAP);
  t.shadows = pick(raw?.shadows, SHADOW_MAP);
  t.effects = pick(raw?.effects, EFFECT_MAP);
  t.components = {};
  if (raw?.components && typeof raw.components === 'object') {
    for (const [comp, map] of Object.entries(COMP_MAP)) {
      const c = pick(raw.components[comp], map);
      if (Object.keys(c).length) t.components[comp] = c;
    }
  }
  if (raw?.animations && typeof raw.animations === 'object') {
    t.animations = {};
    for (const k of ['enabled', 'duration', 'intensity']) {
      const v = raw.animations[k];
      if (v !== undefined && isSafeValue(v)) t.animations[k] = v;
    }
  }
  return t;
}

// converte o tema em pares [cssVar, valor] para aplicar no <html>
export function flattenTheme(t: ThemeConfig): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const push = (src: Record<string, string> | undefined, map: Record<string, string>) => {
    if (!src) return;
    for (const [k, v] of Object.entries(src)) if (map[k]) out.push([map[k], v]);
  };
  push(t.colors, COLOR_MAP);
  push(t.typography, TYPO_MAP);
  push(t.radius, RADIUS_MAP);
  push(t.shadows, SHADOW_MAP);
  push(t.effects, EFFECT_MAP);
  if (t.components) for (const [comp, vals] of Object.entries(t.components)) push(vals, COMP_MAP[comp] || {});
  return out;
}

// contraste mínimo (acessibilidade §17): luminância relativa simples
export function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const c = [0, 8, 16].map((s) => {
    let v = ((n >> s) & 255) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrastRatio(a: string, b: string): number | null {
  const la = luminance(a); const lb = luminance(b);
  if (la == null || lb == null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
