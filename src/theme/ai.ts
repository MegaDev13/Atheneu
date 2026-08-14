// ═══════════════════════════════════════════════════════════════════════
// IA DE TEMAS (§11–14)
// • Com Gemini: prompt estruturado de "theme designer" que devolve SÓ JSON
//   parcial (apenas tokens mudados) — nunca código (§12, §20).
// • Sem Gemini: designer LOCAL por palavras-chave, incremental sobre o tema
//   atual (preserva alterações anteriores, §14) — funciona offline.
// ═══════════════════════════════════════════════════════════════════════
import type { ThemeConfig } from './schema';
import { sanitizeTheme } from './schema';
import { aiAvailable, AI_CONFIG } from '../features/ai/config';
import { getAIProvider } from '../features/ai/gemini';

const SCHEMA_HINT = `colors{background,paper,surface,surfaceSecondary,text,textSecondary,textMuted,border,primary,primarySoft,secondary,accent,glow,success,warning,error}
typography{fontFamily,headingFont,readerFont,baseFontSize,lineHeight,letterSpacing}
radius{sm,md,lg,xl} shadows{card,deep,spine} effects{glassBlur,glassAlpha,borderWidth}
components{button{radius,shadow} card{radius,shadow,border} sidebar{background,active,activeText,width} chat{userBackground,otherBackground}}
mode("light"|"dark") animations{enabled,duration}`;

const DESIGNER_PROMPT = `VOCÊ É O THEME DESIGNER DA APLICAÇÃO.
Sua função é criar/modificar EXCLUSIVAMENTE a aparência, respeitando o Theme Schema.
Nunca altere lógica, APIs, banco, autenticação, rotas ou regras de negócio.
Não invente propriedades fora do schema. Não retorne código executável.
Retorne SOMENTE um JSON válido (sem markdown) com apenas os tokens que mudar.
Priorize: funcionalidade > acessibilidade > legibilidade > pedido visual.
THEME SCHEMA:
${SCHEMA_HINT}`;

function extractJson(text: string): any {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

// funde um patch parcial sobre o tema atual (incremental, §14)
export function mergePatch(current: ThemeConfig, patch: any): ThemeConfig {
  const base = sanitizeTheme(current);
  const p = sanitizeTheme({ ...patch, themeId: base.themeId, name: patch?.name || base.name, mode: patch?.mode || base.mode });
  return {
    ...base,
    mode: p.mode,
    name: p.name,
    description: p.description || base.description,
    colors: { ...base.colors, ...p.colors },
    typography: { ...base.typography, ...p.typography },
    radius: { ...base.radius, ...p.radius },
    shadows: { ...base.shadows, ...p.shadows },
    effects: { ...base.effects, ...p.effects },
    animations: { ...base.animations, ...p.animations },
    components: { ...base.components, ...p.components },
  };
}

// ─── designer local (offline) ───
export function localDesigner(prompt: string, current: ThemeConfig): ThemeConfig {
  const p = prompt.toLowerCase();
  const t = sanitizeTheme(current);
  const has = (...w: string[]) => w.some((x) => p.includes(x));

  if (has('amoled')) return mergePatch(current, { mode: 'dark', colors: { background: '#000', paper: '#050505', surface: '#0a0a0a', surfaceSecondary: '#141414', border: 'rgba(255,255,255,.1)' } });
  if (has('cyberpunk', 'neon')) return mergePatch(current, { mode: 'dark', colors: { background: '#0b0714', surface: '#170d26', primary: '#ff2e88', secondary: '#00e5ff', accent: '#b96bff', border: 'rgba(0,229,255,.22)' } });
  if (has('terminal')) return mergePatch(current, { mode: 'dark', colors: { background: '#020a04', surface: '#06180d', text: '#b8ffcf', primary: '#50ffa0' }, typography: { fontFamily: 'monospace', headingFont: 'monospace' }, radius: { sm: '0px', md: '0px', lg: '0px', xl: '0px' } });
  if (has('medieval', 'castelo')) return mergePatch(current, { mode: 'dark', colors: { background: '#171310', surface: '#241d17', primary: '#8a5a2b', accent: '#c9a94a', border: 'rgba(201,169,106,.25)' } });
  if (has('nature', 'floresta', 'verde')) return mergePatch(current, { mode: 'light', colors: { background: '#eef3ea', surface: '#fbfdf8', primary: '#2f6b3a', secondary: '#5a8a4a' } });
  if (has('minimal', 'minimalista')) return mergePatch(current, { mode: 'light', colors: { background: '#fafafa', surface: '#fff', primary: '#111', accent: '#999' }, shadows: { card: '0 1px 2px rgba(0,0,0,.04)' }, effects: { glassBlur: '0px', glassAlpha: '1' } });
  if (has('vidro', 'glass', 'transpar')) return mergePatch(current, { mode: 'dark', effects: { glassBlur: '18px', glassAlpha: '.5' }, colors: { surface: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.14)' } });
  if (has('profissional', 'sóbrio', 'corporat')) return mergePatch(current, { mode: 'light', colors: { primary: '#1f4e79', accent: '#6b7f92', background: '#f4f6f8' } });
  if (has('retro', 'vintage', 'anos 70')) return mergePatch(current, { mode: 'light', colors: { background: '#f4e8d3', primary: '#c65a1e', accent: '#b08830' }, shadows: { card: '4px 4px 0 rgba(61,43,31,.25)' } });
  if (has('futurist')) return mergePatch(current, { mode: 'dark', colors: { background: '#0a0f14', primary: '#22d3ee', secondary: '#818cf8' } });

  // modificadores incrementais
  const patch: any = { colors: {}, effects: {}, components: {} };
  let touched = false;
  if (has('mais escuro', 'escuro', 'dark', 'noite')) { patch.mode = 'dark'; touched = true; }
  if (has('mais claro', 'claro', 'light', 'branco')) { patch.mode = 'light'; touched = true; }
  if (has('menos brilho', 'diminua o brilho', 'sem brilho')) { patch.colors.glow = 'rgba(0,0,0,0)'; patch.colors.accent = t.colors?.accent || '#888'; touched = true; }
  if (has('mais transpar', 'vidro')) { patch.effects.glassBlur = '18px'; patch.effects.glassAlpha = '.5'; touched = true; }
  if (has('sidebar discreta', 'sidebar minimal', 'sidebar elegante')) { patch.components.sidebar = { active: 'rgba(128,128,128,.12)', activeText: t.colors?.text || '#333' }; touched = true; }
  if (has('arredond', 'curvas suaves', 'bordas redondas')) { patch.radius = { sm: '12px', md: '16px', lg: '20px', xl: '26px' }; touched = true; }
  if (has('cantos retos', 'sem arredond')) { patch.radius = { sm: '0px', md: '0px', lg: '0px', xl: '0px' }; touched = true; }
  // cores pedidas
  const colorWords: Array<[string[], string, string]> = [
    [['azul'], '#2563eb', '#60a5fa'], [['roxo', 'violeta'], '#7c3aed', '#a78bfa'], [['verde'], '#16a34a', '#4ade80'],
    [['vermelho', 'vinho'], '#b91c1c', '#f87171'], [['dourado', 'ouro'], '#b08830', '#d4af37'], [['laranja'], '#ea580c', '#fb923c'],
    [['rosa', 'pink'], '#db2777', '#f472b6'], [['ciano', 'turquesa'], '#0891b2', '#22d3ee'],
  ];
  for (const [ws, light, dark] of colorWords) {
    if (ws.some((w) => p.includes(w))) { patch.colors.primary = patch.mode === 'dark' ? dark : light; patch.colors.accent = patch.mode === 'dark' ? dark : light; touched = true; }
  }
  if (!touched) {
    // sem pistas: gera uma variação sutil (mantém tudo, só ajusta primária)
    patch.colors.primary = t.colors?.primary || '#7c2e3a';
  }
  return mergePatch(current, patch);
}

// ─── entrada única ───
export async function generateTheme(prompt: string, current: ThemeConfig): Promise<ThemeConfig> {
  if (aiAvailable()) {
    try {
      const provider = getAIProvider();
      const full = `${DESIGNER_PROMPT}\n\nTEMA ATUAL (JSON):\n${JSON.stringify(current)}\n\nPEDIDO DO USUÁRIO:\n"${prompt}"\n\nRetorne SOMENTE o JSON parcial.`;
      const { text } = await provider.generate(full, { maxOutputTokens: AI_CONFIG.maxOutputTokens });
      const patch = extractJson(text);
      if (patch) return mergePatch(current, patch);
    } catch (e) {
      console.warn('[theme-ai] Gemini falhou; usando designer local.', e);
    }
  }
  return localDesigner(prompt, current);
}
