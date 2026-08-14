// Presets usam EXATAMENTE o mesmo Theme Engine dos temas gerados por IA (§15).
import type { ThemeConfig } from './schema';
import { THEME_ENGINE_VERSION } from './schema';

const base = (over: Partial<ThemeConfig> & { themeId: string; name: string }): ThemeConfig => ({
  version: '1.0',
  mode: 'light',
  description: '',
  createdBy: 'preset',
  compatibleWith: THEME_ENGINE_VERSION,
  colors: {}, typography: {}, radius: {}, shadows: {}, effects: {}, components: {},
  ...over,
});

export const PRESET_LIGHT = base({
  themeId: 'light', name: 'Light (padrão)', mode: 'light',
  description: 'Marfim clássico da biblioteca Atheneu.',
});

export const PRESET_DARK = base({
  themeId: 'dark', name: 'Dark · Biblioteca noturna', mode: 'dark',
  description: 'Luz quente de leitura sobre âmbar profundo.',
});

export const PRESET_AMOLED = base({
  themeId: 'amoled', name: 'AMOLED', mode: 'dark',
  description: 'Preto puro p/ economia de bateria.',
  colors: { background: '#000000', paper: '#050505', surface: '#0a0a0a', surfaceSecondary: '#121212', text: '#e8e8e8', textSecondary: '#a8a8a8', textMuted: '#707070', border: 'rgba(255,255,255,.1)', primary: '#8ab4ff', primarySoft: 'rgba(138,180,255,.14)', secondary: '#6fd3a6', accent: '#d0b26e', glow: 'rgba(138,180,255,.08)' },
  shadows: { card: '0 1px 2px rgba(0,0,0,.7), 0 12px 32px -18px rgba(0,0,0,.9)', deep: '0 2px 6px rgba(0,0,0,.8), 0 28px 60px -24px #000' },
});

export const PRESET_MINIMAL = base({
  themeId: 'minimal', name: 'Minimal', mode: 'light',
  description: 'Branco premium, sem ornamentos.',
  colors: { background: '#fafafa', paper: '#ffffff', surface: '#ffffff', surfaceSecondary: '#f2f2f2', text: '#1a1a1a', textSecondary: '#555555', textMuted: '#8a8a8a', border: 'rgba(0,0,0,.08)', primary: '#111111', primarySoft: 'rgba(0,0,0,.05)', secondary: '#444444', accent: '#999999', glow: 'rgba(0,0,0,.03)' },
  radius: { sm: '4px', md: '6px', lg: '10px', xl: '12px' },
  shadows: { card: '0 1px 2px rgba(0,0,0,.04)', deep: '0 8px 24px -12px rgba(0,0,0,.12)', spine: 'none' },
  typography: { headingFont: "'Inter', system-ui, sans-serif" },
  effects: { glassBlur: '0px', glassAlpha: '1' },
});

export const PRESET_GLASS = base({
  themeId: 'glass', name: 'Glass', mode: 'dark',
  description: 'Vidro e transparência com brilhos suaves.',
  colors: { background: '#101418', paper: '#141a20', surface: 'rgba(255,255,255,.06)', surfaceSecondary: 'rgba(255,255,255,.09)', text: '#eef2f6', textSecondary: '#aab6c2', textMuted: '#7d8a96', border: 'rgba(255,255,255,.14)', primary: '#6ea8fe', primarySoft: 'rgba(110,168,254,.16)', secondary: '#7ee0c0', accent: '#e6c079', glow: 'rgba(110,168,254,.12)' },
  effects: { glassBlur: '18px', glassAlpha: '.5', borderWidth: '1px' },
  radius: { sm: '10px', md: '14px', lg: '18px', xl: '24px' },
  shadows: { card: '0 8px 32px rgba(0,0,0,.35)', deep: '0 16px 48px rgba(0,0,0,.5)' },
});

export const PRESET_CYBERPUNK = base({
  themeId: 'cyberpunk', name: 'Cyberpunk', mode: 'dark',
  description: 'Neon azul/roxo sobre cidade escura.',
  colors: { background: '#0b0714', paper: '#120a1e', surface: '#170d26', surfaceSecondary: '#221237', text: '#f2eaff', textSecondary: '#b9a6e0', textMuted: '#7f6ba8', border: 'rgba(0,229,255,.22)', primary: '#ff2e88', primarySoft: 'rgba(255,46,136,.15)', secondary: '#00e5ff', accent: '#b96bff', glow: 'rgba(0,229,255,.15)', success: '#3ef2a5', warning: '#ffd166', error: '#ff5470' },
  radius: { sm: '2px', md: '4px', lg: '8px', xl: '10px' },
  shadows: { card: '0 0 0 1px rgba(0,229,255,.25), 0 0 24px rgba(0,229,255,.12)', deep: '0 0 0 1px rgba(255,46,136,.35), 0 0 40px rgba(255,46,136,.2)' },
  typography: { headingFont: "'Inter', system-ui, sans-serif", letterSpacing: '.02em' },
});

export const PRESET_TERMINAL = base({
  themeId: 'terminal', name: 'Terminal', mode: 'dark',
  description: 'Fósforo verde sobre preto, monoespaçada.',
  colors: { background: '#020a04', paper: '#04120a', surface: '#06180d', surfaceSecondary: '#0a2413', text: '#b8ffcf', textSecondary: '#7ddba2', textMuted: '#4d9c6f', border: 'rgba(80,255,160,.25)', primary: '#50ffa0', primarySoft: 'rgba(80,255,160,.12)', secondary: '#37e08a', accent: '#c8ff80', glow: 'rgba(80,255,160,.1)' },
  typography: { fontFamily: "'JetBrains Mono', 'Fira Mono', monospace", headingFont: "'JetBrains Mono', monospace", readerFont: "'JetBrains Mono', monospace" },
  radius: { sm: '0px', md: '0px', lg: '0px', xl: '0px' },
  shadows: { card: '0 0 0 1px rgba(80,255,160,.25)', deep: '0 0 24px rgba(80,255,160,.15)' },
});

export const PRESET_RETRO = base({
  themeId: 'retro', name: 'Retro', mode: 'light',
  description: 'Creme anos 70, laranja queimado e marrom.',
  colors: { background: '#f4e8d3', paper: '#faf1de', surface: '#fff8e7', surfaceSecondary: '#f0e2c4', text: '#3d2b1f', textSecondary: '#7a5c43', textMuted: '#a08363', border: 'rgba(61,43,31,.25)', primary: '#c65a1e', primarySoft: 'rgba(198,90,30,.12)', secondary: '#7a8b3f', accent: '#b08830', glow: 'rgba(198,90,30,.12)' },
  radius: { sm: '10px', md: '14px', lg: '18px', xl: '22px' },
  shadows: { card: '4px 4px 0 rgba(61,43,31,.25)', deep: '8px 8px 0 rgba(61,43,31,.3)' },
});

export const PRESET_MEDIEVAL = base({
  themeId: 'medieval', name: 'Medieval', mode: 'dark',
  description: 'Pedra, madeira e dourado de castelo.',
  colors: { background: '#171310', paper: '#1d1814', surface: '#241d17', surfaceSecondary: '#2e251d', text: '#e8dcc3', textSecondary: '#b3a284', textMuted: '#847458', border: 'rgba(201,169,106,.25)', primary: '#8a5a2b', primarySoft: 'rgba(201,169,106,.12)', secondary: '#5b6b3a', accent: '#c9a94a', glow: 'rgba(201,169,106,.1)' },
  typography: { headingFont: "'Fraunces', Georgia, serif" },
  radius: { sm: '4px', md: '6px', lg: '8px', xl: '10px' },
  shadows: { card: 'inset 0 0 0 1px rgba(201,169,106,.3), 0 8px 24px rgba(0,0,0,.5)', deep: '0 16px 48px rgba(0,0,0,.7)' },
});

export const PRESET_NATURE = base({
  themeId: 'nature', name: 'Nature', mode: 'light',
  description: 'Verde floresta e tons de folha.',
  colors: { background: '#eef3ea', paper: '#f5f8f1', surface: '#fbfdf8', surfaceSecondary: '#e6efe0', text: '#22301f', textSecondary: '#51624b', textMuted: '#7d8f76', border: 'rgba(34,48,31,.15)', primary: '#2f6b3a', primarySoft: 'rgba(47,107,58,.1)', secondary: '#5a8a4a', accent: '#a3803a', glow: 'rgba(47,107,58,.1)' },
  radius: { sm: '12px', md: '16px', lg: '20px', xl: '26px' },
});

export const PRESET_PROFESSIONAL = base({
  themeId: 'professional', name: 'Professional', mode: 'light',
  description: 'Azul corporativo discreto, menos colorido.',
  colors: { background: '#f4f6f8', paper: '#f9fafb', surface: '#ffffff', surfaceSecondary: '#eef1f4', text: '#1c2733', textSecondary: '#4a5b6b', textMuted: '#7c8b99', border: 'rgba(28,39,51,.12)', primary: '#1f4e79', primarySoft: 'rgba(31,78,121,.08)', secondary: '#3a6ea5', accent: '#6b7f92', glow: 'rgba(31,78,121,.06)' },
  shadows: { card: '0 1px 3px rgba(16,24,40,.08)', deep: '0 12px 32px -12px rgba(16,24,40,.2)' },
  radius: { sm: '6px', md: '8px', lg: '10px', xl: '12px' },
  effects: { glassBlur: '6px', glassAlpha: '.9' },
});

export const PRESET_FUTURISTIC = base({
  themeId: 'futuristic', name: 'Futuristic', mode: 'dark',
  description: 'Aço escuro com ciano limpo.',
  colors: { background: '#0a0f14', paper: '#0e151b', surface: '#121b22', surfaceSecondary: '#1a2630', text: '#e6f1f7', textSecondary: '#9fb6c3', textMuted: '#6d8492', border: 'rgba(94,234,212,.18)', primary: '#22d3ee', primarySoft: 'rgba(34,211,238,.12)', secondary: '#818cf8', accent: '#f0abfc', glow: 'rgba(34,211,238,.1)' },
  radius: { sm: '8px', md: '12px', lg: '16px', xl: '20px' },
  shadows: { card: '0 4px 24px rgba(0,0,0,.4)', deep: '0 16px 48px rgba(0,0,0,.55)' },
});

export const PRESETS: ThemeConfig[] = [
  PRESET_LIGHT, PRESET_DARK, PRESET_AMOLED, PRESET_MINIMAL, PRESET_GLASS, PRESET_CYBERPUNK,
  PRESET_TERMINAL, PRESET_RETRO, PRESET_MEDIEVAL, PRESET_NATURE, PRESET_PROFESSIONAL, PRESET_FUTURISTIC,
];
