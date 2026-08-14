// ═══════════════════════════════════════════════════════════════════════
// THEME ENGINE · aplicar / salvar / histórico / importar / exportar / preview
// Independente da lógica de negócio (§7). Só escreve variáveis CSS no <html>.
// ═══════════════════════════════════════════════════════════════════════
import type { ThemeConfig } from './schema';
import { flattenTheme, sanitizeTheme, THEME_ENGINE_VERSION } from './schema';
import { PRESET_LIGHT, PRESET_DARK, PRESETS } from './presets';

const LS_APPLIED = 'atheneu-theme-applied';   // tema ativo (objeto completo)
const LS_SAVED = 'atheneu-themes-saved';     // biblioteca de temas salvos
const LS_MODE = 'atheneu-theme';             // 'light' | 'dark' (compat c/ ThemeContext)

let appliedVars: Array<[string, string]> = [];
let history: ThemeConfig[] = [];
let historyIndex = -1;
let previewing = false;

function readLS<T>(k: string, fb: T): T {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fb; } catch { return fb; }
}
function writeLS(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

// aplica vars inline no <html>; mode controla .dark; animações via [data-anim]
function paint(t: ThemeConfig) {
  const el = document.documentElement;
  // limpa vars do tema anterior
  for (const [k] of appliedVars) el.style.removeProperty(k);
  appliedVars = flattenTheme(t);
  for (const [k, v] of appliedVars) el.style.setProperty(k, v);
  el.classList.toggle('dark', t.mode === 'dark');
  el.setAttribute('data-anim', t.animations?.enabled === false ? 'off' : 'on');
  try { localStorage.setItem(LS_MODE, t.mode); } catch {}
}

export function getApplied(): ThemeConfig | null {
  return readLS<ThemeConfig | null>(LS_APPLIED, null);
}
export function getPresetForMode(mode: 'light' | 'dark'): ThemeConfig {
  return mode === 'dark' ? PRESET_DARK : PRESET_LIGHT;
}

// carrega no boot: tema salvo > preset do modo (claro/escuro do sistema)
export function initTheme() {
  const saved = getApplied();
  if (saved) { applyTheme(sanitizeTheme(saved), false); return; }
  const mode = readLS<string>(LS_MODE, matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(getPresetForMode(mode as any), false);
}

export function applyTheme(t: ThemeConfig, record = true) {
  const clean = sanitizeTheme(t);
  paint(clean);
  writeLS(LS_APPLIED, clean);
  if (record) {
    history = history.slice(0, historyIndex + 1);
    history.push(clean);
    if (history.length > 30) history.shift();
    historyIndex = history.length - 1;
  }
}

export function toggleMode() {
  const cur = getApplied() || PRESET_LIGHT;
  applyTheme({ ...cur, mode: cur.mode === 'dark' ? 'light' : 'dark' });
}

export function restoreDefault(mode?: 'light' | 'dark') {
  const m = mode || (getApplied()?.mode ?? 'light');
  applyTheme(getPresetForMode(m));
}

// preview sem gravar (§13)
export function previewTheme(t: ThemeConfig) { previewing = true; paint(sanitizeTheme(t)); }
export function commitPreview() { const t = getApplied(); previewing = false; if (t) writeLS(LS_APPLIED, t); }
export function cancelPreview() {
  previewing = false;
  const t = history[historyIndex] || getApplied() || PRESET_LIGHT;
  paint(t);
}

// histórico (§21)
export function canUndo() { return historyIndex > 0; }
export function canRedo() { return historyIndex < history.length - 1; }
export function undo() { if (canUndo()) { historyIndex--; paint(history[historyIndex]); writeLS(LS_APPLIED, history[historyIndex]); } }
export function redo() { if (canRedo()) { historyIndex++; paint(history[historyIndex]); writeLS(LS_APPLIED, history[historyIndex]); } }
export function pushHistory(t: ThemeConfig) { history = history.slice(0, historyIndex + 1); history.push(sanitizeTheme(t)); historyIndex = history.length - 1; }

// temas salvos (§22)
export interface SavedTheme extends ThemeConfig { savedAt: number; }
export function listSaved(): SavedTheme[] { return readLS<SavedTheme[]>(LS_SAVED, []); }
export function saveTheme(t: ThemeConfig, name?: string) {
  const s = { ...sanitizeTheme(t), name: name || t.name, savedAt: Date.now() } as SavedTheme;
  const list = listSaved().filter((x) => x.themeId !== s.themeId);
  list.push(s);
  writeLS(LS_SAVED, list);
  return s;
}
export function deleteSaved(themeId: string) { writeLS(LS_SAVED, listSaved().filter((x) => x.themeId !== themeId)); }
export function duplicateSaved(themeId: string) {
  const t = listSaved().find((x) => x.themeId === themeId);
  if (!t) return null;
  return saveTheme({ ...t, themeId: t.themeId + '-copy-' + Date.now().toString(36), name: t.name + ' (cópia)' });
}

// importar / exportar (§10) — tema é JSON puro, validado antes de aplicar
export function exportTheme(t: ThemeConfig): string {
  return JSON.stringify({ ...sanitizeTheme(t), compatibleWith: THEME_ENGINE_VERSION }, null, 2);
}
export function importTheme(json: string): { ok: true; theme: ThemeConfig } | { ok: false; error: string } {
  try {
    const raw = JSON.parse(json);
    if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'JSON inválido.' };
    if (raw.compatibleWith && raw.compatibleWith !== THEME_ENGINE_VERSION) {
      // tenta aplicar mesmo assim (sanitizer descarta o que não entender), mas avisa
    }
    const t = sanitizeTheme(raw);
    const flat = flattenTheme(t);
    if (flat.length === 0) return { ok: false, error: 'Nenhum token válido encontrado no arquivo.' };
    return { ok: true, theme: t };
  } catch {
    return { ok: false, error: 'Arquivo não é um tema JSON válido.' };
  }
}

export function allPresets() { return PRESETS; }
