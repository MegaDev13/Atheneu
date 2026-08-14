// Personalizar aparência (§13–22): IA + manual + preview + presets + salvos + histórico.
import { useEffect, useRef, useState } from 'react';
import {
  Brush, Copy, Download, Eraser, Palette, Redo2, Save, Sparkles, Trash2, Undo2, Upload, Wand2,
} from 'lucide-react';
import * as engine from '../theme/engine';
import { generateTheme } from '../theme/ai';
import { PRESETS } from '../theme/presets';
import type { ThemeConfig } from '../theme/schema';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { Button, Card, Input, Select } from '../components/ui';

const FONT_OPTIONS = [
  { label: 'Serifada clássica (Fraunces)', value: "'Fraunces', Georgia, serif" },
  { label: 'Sans moderna (Inter)', value: "'Inter', system-ui, sans-serif" },
  { label: 'Serifada de leitura (Source Serif)', value: "'Source Serif 4', Georgia, serif" },
  { label: 'Monoespaçada (Terminal)', value: "'JetBrains Mono', 'Fira Mono', monospace" },
  { label: 'Geométrica', value: "'Poppins', 'Inter', sans-serif" },
];

export default function Appearance() {
  const { refresh } = useTheme();
  const { toast } = useToast();
  const [draft, setDraft] = useState<ThemeConfig>(() => engine.getApplied() || PRESETS[0]);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewOn, setPreviewOn] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(engine.getApplied() || PRESETS[0]); }, []);

  // preview ao vivo enquanto edita
  useEffect(() => {
    if (previewOn) engine.previewTheme(draft);
  }, [draft, previewOn]);

  function set<K extends keyof ThemeConfig>(k: K, v: ThemeConfig[K]) {
    setDraft((d) => ({ ...d, [k]: v } as ThemeConfig));
  }
  const setTok = (section: 'colors' | 'typography' | 'radius' | 'effects', key: string, val: string) =>
    setDraft((d) => ({ ...d, [section]: { ...(d as any)[section], [key]: val } } as ThemeConfig));

  function apply(commit = true) {
    if (commit) {
      engine.commitPreview();
      engine.applyTheme(draft);
      refresh();
      toast(`Tema “${draft.name}” aplicado.`);
    } else {
      setPreviewOn(true);
      engine.previewTheme(draft);
    }
  }

  async function aiGenerate() {
    if (!prompt.trim()) { toast('Descreva o tema que você quer.', 'info'); return; }
    setBusy(true);
    const base = previewOn ? draft : engine.getApplied() || PRESETS[0];
    const next = await generateTheme(prompt, base);
    setDraft({ ...next, name: next.name || prompt.slice(0, 24) });
    setPreviewOn(true);
    engine.previewTheme(next);
    setBusy(false);
    toast('Tema gerado — veja o preview e clique Aplicar.', 'info');
  }

  function exportCurrent() {
    const blob = new Blob([engine.exportTheme(draft)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${draft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'tema'}.theme.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast('Tema exportado (.theme.json).');
  }

  function onImportFile(f: File) {
    const r = new FileReader();
    r.onload = () => {
      const res = engine.importTheme(String(r.result));
      if (!res.ok) { toast(res.error, 'error'); return; }
      setDraft(res.theme);
      setPreviewOn(true);
      engine.previewTheme(res.theme);
      toast('Tema importado — revise e clique Aplicar.', 'info');
    };
    r.readAsText(f);
  }

  const saved = engine.listSaved();

  return (
    <div className="mx-auto w-[min(1100px,94%)] py-6 md:py-8">
      <div className="mb-6 flex items-center gap-2">
        <Palette size={20} className="text-wine" />
        <h1 className="font-display text-[28px] text-ink">Personalizar aparência</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        {/* Coluna esquerda: IA + manual */}
        <div className="space-y-4">
          {/* MODO IA */}
          <Card className="p-5">
            <p className="smallcaps mb-3 flex items-center gap-1.5"><Sparkles size={13} /> modo IA</p>
            <textarea
              value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
              placeholder="Descreva como você quer que seu site seja. Ex.: “tema cyberpunk escuro com azul neon e roxo”"
              className="w-full rounded-xl border border-line bg-card2/50 p-3 text-[14px] text-ink placeholder:text-faint focus:border-gold focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={aiGenerate} loading={busy}><Wand2 size={15} /> Gerar tema</Button>
              <Button variant="outline" onClick={() => apply(false)}><Sparkles size={15} /> Preview</Button>
              <Button variant="outline" onClick={() => apply(true)}><Brush size={15} /> Aplicar</Button>
              <Button variant="outline" onClick={aiGenerate} disabled={busy} title="Gerar de novo"><Redo2 size={15} /> Regenerar</Button>
              <Button variant="outline" onClick={() => { engine.undo(); refresh(); setDraft(engine.getApplied() || draft); }} disabled={!engine.canUndo()}><Undo2 size={15} /> Desfazer</Button>
            </div>
            <p className="mt-2 text-[11.5px] text-faint">A IA altera apenas a camada visual — funcionalidade, dados e segurança nunca mudam.</p>
          </Card>

          {/* MODO MANUAL */}
          <Card className="p-5">
            <p className="smallcaps mb-3">modo manual</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block text-[12px] text-mute">Nome do tema</span>
                <Input value={draft.name} onChange={(e) => set('name', e.target.value)} /></label>
              <label className="block"><span className="mb-1 block text-[12px] text-mute">Modo</span>
                <Select value={draft.mode} onChange={(e) => set('mode', e.target.value as any)}>
                  <option value="light">Claro</option><option value="dark">Escuro</option>
                </Select></label>
              <label className="block"><span className="mb-1 block text-[12px] text-mute">Cor primária</span>
                <input type="color" value={(draft.colors?.primary || '#7c2e3a')} onChange={(e) => setTok('colors', 'primary', e.target.value)} className="h-10 w-full cursor-pointer rounded-lg border border-line bg-card2/50" /></label>
              <label className="block"><span className="mb-1 block text-[12px] text-mute">Fundo</span>
                <input type="color" value={(draft.colors?.background || '#f2ecdf')} onChange={(e) => setTok('colors', 'background', e.target.value)} className="h-10 w-full cursor-pointer rounded-lg border border-line bg-card2/50" /></label>
              <label className="block"><span className="mb-1 block text-[12px] text-mute">Fonte de títulos</span>
                <Select value={draft.typography?.headingFont || FONT_OPTIONS[0].value} onChange={(e) => setTok('typography', 'headingFont', e.target.value)}>
                  {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </Select></label>
              <label className="block"><span className="mb-1 block text-[12px] text-mute">Arredondamento</span>
                <Select value={draft.radius?.xl || '20px'} onChange={(e) => { const v = e.target.value; setDraft((d) => ({ ...d, radius: { sm: `${+v / 2}px`, md: `${+v * 0.6}px`, lg: `${+v * 0.8}px`, xl: v } } as ThemeConfig)); }}>
                  <option value="0px">Retos</option><option value="12px">Discretos</option><option value="20px">Médios</option><option value="28px">Arredondados</option>
                </Select></label>
              <label className="block"><span className="mb-1 block text-[12px] text-mute">Vidro (blur)</span>
                <input type="range" min={0} max={24} value={parseInt(draft.effects?.glassBlur || '12')} onChange={(e) => setTok('effects', 'glassBlur', `${e.target.value}px`)} className="w-full" /></label>
              <label className="flex items-center gap-2 self-end pb-2">
                <input type="checkbox" checked={draft.animations?.enabled !== false} onChange={(e) => setDraft((d) => ({ ...d, animations: { ...d.animations, enabled: e.target.checked } } as ThemeConfig))} />
                <span className="text-[13px] text-mute">Animar interface</span>
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => apply(true)}><Brush size={15} /> Aplicar</Button>
              <Button variant="outline" onClick={() => { engine.restoreDefault(); refresh(); setDraft(engine.getApplied() || PRESETS[0]); toast('Tema padrão restaurado.', 'info'); }}><Eraser size={15} /> Restaurar padrão</Button>
            </div>
          </Card>

          {/* PRESETS */}
          <Card className="p-5">
            <p className="smallcaps mb-3">presets (mesmo engine da IA)</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {PRESETS.map((p) => (
                <button key={p.themeId}
                  onClick={() => { setDraft(p); setPreviewOn(true); engine.previewTheme(p); }}
                  onDoubleClick={() => { engine.applyTheme(p); refresh(); toast(`Preset “${p.name}” aplicado.`); }}
                  className="rounded-xl border border-line p-2 text-left hover:border-gold/50"
                  title={p.description}
                >
                  <span className="mb-1 flex h-8 overflow-hidden rounded-md border border-line">
                    <i style={{ background: p.colors?.background || '#fff', flex: 2 }} />
                    <i style={{ background: p.colors?.primary || '#7c2e3a', flex: 1 }} />
                    <i style={{ background: p.colors?.accent || '#a2814a', flex: 1 }} />
                  </span>
                  <span className="block truncate text-[11.5px] text-ink">{p.name}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Coluna direita: salvos + histórico + import/export */}
        <div className="space-y-4">
          <Card className="p-5">
            <p className="smallcaps mb-3">temas salvos</p>
            <div className="mb-3 flex gap-2">
              <Button size="sm" onClick={() => { engine.saveTheme(draft); toast('Tema salvo.'); }}>
                <Save size={14} /> Salvar atual
              </Button>
              <Button size="sm" variant="outline" onClick={exportCurrent}><Download size={14} /> Exportar</Button>
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload size={14} /> Importar</Button>
              <input ref={fileRef} type="file" accept=".json,application/json" className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportFile(f); e.currentTarget.value = ''; }} />
            </div>
            {saved.length === 0 && <p className="py-4 text-center text-[12.5px] text-mute">Nenhum tema salvo ainda.</p>}
            <ul className="space-y-2">
              {saved.map((s) => (
                <li key={s.themeId} className="flex items-center gap-2 rounded-xl border border-line p-2">
                  <span className="flex h-7 w-10 overflow-hidden rounded-md border border-line">
                    <i style={{ background: s.colors?.background || '#fff', flex: 2 }} />
                    <i style={{ background: s.colors?.primary || '#7c2e3a', flex: 1 }} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{s.name}</span>
                  <button title="Aplicar" className="rounded p-1.5 text-mute hover:bg-card2" onClick={() => { engine.applyTheme(s); refresh(); toast(`“${s.name}” aplicado.`); }}><Brush size={14} /></button>
                  <button title="Duplicar" className="rounded p-1.5 text-mute hover:bg-card2" onClick={() => { engine.duplicateSaved(s.themeId); toast('Duplicado.'); refresh(); }}><Copy size={14} /></button>
                  <button title="Excluir" className="rounded p-1.5 text-mute hover:bg-wine-light hover:text-wine" onClick={() => { engine.deleteSaved(s.themeId); toast('Excluído.', 'info'); refresh(); }}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <p className="smallcaps mb-3">histórico</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { engine.undo(); refresh(); }} disabled={!engine.canUndo()}><Undo2 size={14} /> Desfazer</Button>
              <Button size="sm" variant="outline" onClick={() => { engine.redo(); refresh(); }} disabled={!engine.canRedo()}><Redo2 size={14} /> Refazer</Button>
              <Button size="sm" variant="outline" onClick={() => { engine.restoreDefault(); refresh(); }}>Restaurar</Button>
            </div>
            <p className="mt-2 text-[11.5px] text-faint">Cada aplicação de tema entra no histórico; você pode voltar a qualquer versão anterior.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
