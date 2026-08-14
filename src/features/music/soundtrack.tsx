// TRILHA SONORA ADAPTATIVA (§1–24): analisa páginas FUTURAS em background (look-ahead),
// detecta transições de atmosfera e prepara a trilha ANTES do leitor chegar (§22).
// Não revela spoilers (§5): o popup só diz "recomendação preparada".
import { useCallback, useEffect, useRef, useState } from 'react';
import { Music, Music2, Play, Settings2, Square, X } from 'lucide-react';
import { analyzeBlock, detectMood, MOOD_LABEL, moodDistance, type Mood } from './mood';
import { ambient } from './ambient';

export interface SoundtrackSettings {
  auto: boolean; prepareAhead: boolean; autoSwitch: boolean; popup: boolean;
  instrumentalOnly: boolean; preferMyArtists: boolean; volume: number;
}
const DEFAULTS: SoundtrackSettings = { auto: true, prepareAhead: true, autoSwitch: true, popup: false, instrumentalOnly: false, preferMyArtists: false, volume: 0.5 };
const LS = 'atheneu-soundtrack';
export const loadSoundtrackSettings = (): SoundtrackSettings => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LS) || '{}') }; } catch { return DEFAULTS; }
};
const saveSettings = (s: SoundtrackSettings) => { try { localStorage.setItem(LS, JSON.stringify(s)); } catch {} };

interface Segment { start: number; end: number; mood: Mood }
const BLOCK = 6;      // páginas por bloco de análise (§7)
const MARGIN = 4;     // margem de antecipação (§9)

export function SoundtrackWidget({ bookId, pageNo, totalPages, getPageText }: {
  bookId: string; pageNo: number; totalPages: number; getPageText: (i: number) => Promise<string>;
}) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<SoundtrackSettings>(loadSoundtrackSettings);
  const [playing, setPlaying] = useState(false);
  const [currentMood, setCurrentMood] = useState<Mood | null>(null);
  const [pending, setPending] = useState<Mood | null>(null); // recomendação preparada (popup)
  const segRef = useRef<Segment[]>([]);
  const analyzedUntil = useRef(0);
  const lastMood = useRef<Mood | null>(null);
  const busy = useRef(false);

  useEffect(() => { saveSettings(settings); ambient.setVolume(settings.volume); }, [settings]);

  // análise antecipada em background (§9/12) — cache por bloco, sem repetir (§8)
  const analyzeAhead = useCallback(async (from: number) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const start = Math.max(1, from);
      const end = Math.min(totalPages, start + BLOCK);
      if (end <= analyzedUntil.current) return;
      const texts: string[] = [];
      for (let p = Math.max(1, analyzedUntil.current + 1); p <= end; p++) texts.push(await getPageText(p));
      if (texts.length === 0) return;
      // analisa em sub-blocos p/ detectar transições dentro do bloco
      const per = 2;
      for (let i = 0; i < texts.length; i += per) {
        const { mood } = analyzeBlock(texts.slice(i, i + per));
        const s = Math.max(1, analyzedUntil.current + 1) + i;
        segRef.current.push({ start: s, end: s + per - 1, mood });
      }
      analyzedUntil.current = end;
    } finally { busy.current = false; }
  }, [getPageText, totalPages]);

  // ao mudar de página: garante margem + detecta mood atual + transição (§3/6)
  useEffect(() => {
    if (!settings.auto) return;
    if (settings.prepareAhead && analyzedUntil.current < pageNo + MARGIN) analyzeAhead(pageNo);
    (async () => {
      const seg = segRef.current.find((s) => pageNo >= s.start && pageNo <= s.end);
      const mood = seg?.mood ?? detectMood(await getPageText(pageNo)).mood;
      setCurrentMood(mood);
      if (lastMood.current && mood !== lastMood.current && moodDistance(lastMood.current, mood) >= 1) {
        if (settings.autoSwitch && !settings.popup) { ambient.play(mood); setPlaying(true); }
        else setPending(mood);
      }
      lastMood.current = mood;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNo, settings]);

  const applyPending = () => { if (pending) { ambient.play(pending); setPlaying(true); setPending(null); } };

  const manual = async () => { const m = detectMood(await getPageText(pageNo)).mood; ambient.play(m); setPlaying(true); setCurrentMood(m); };

  const stop = () => { ambient.stop(); setPlaying(false); setPending(null); };

  return (
    <>
      {/* popup discreto de transição (§19) */}
      {pending && (
        <div className="fixed bottom-24 right-4 z-[70] w-64 rounded-2xl border border-line bg-card p-4 shadow-deep md:bottom-6">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">✨ Nova trilha preparada</p>
          <p className="mt-1 text-[13px] text-mute">🎵 Trilha {MOOD_LABEL[pending]} — pronta pra este momento da leitura.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={applyPending} className="flex items-center gap-1 rounded-lg bg-wine px-3 py-1.5 text-[12px] font-medium text-[#f7f0e2]"><Play size={12} /> Tocar</button>
            <button onClick={() => setPending(null)} className="rounded-lg p-1.5 text-faint hover:bg-card2" aria-label="Fechar"><X size={14} /></button>
          </div>
        </div>
      )}

      {/* botão flutuante da trilha */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Trilha sonora da leitura"
        className="fixed bottom-24 right-4 z-[65] flex h-12 w-12 items-center justify-center rounded-full border border-line bg-card text-wine shadow-deep md:bottom-6 md:right-20"
      >
        {playing ? <Music2 size={20} className="animate-pulse" /> : <Music size={20} />}
      </button>

      {/* painel */}
      {open && (
        <div className="fixed bottom-40 right-4 z-[66] w-72 rounded-2xl border border-line bg-card p-4 shadow-deep md:bottom-20 md:right-20">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink"> Trilha sonora da leitura</p>
            <button onClick={() => setOpen(false)} className="rounded p-1 text-faint" aria-label="Fechar"><X size={14} /></button>
          </div>
          <p className="mb-3 text-[12px] text-mute">Atmosfera atual: <strong className="text-ink">{currentMood ? MOOD_LABEL[currentMood] : '—'}</strong></p>
          <div className="mb-3 flex gap-2">
            <button onClick={playing ? stop : manual} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-wine px-3 py-2 text-[12.5px] font-medium text-[#f7f0e2]">
              {playing ? <><Square size={13} /> Parar</> : <><Play size={13} /> Recomendar p/ esta página</>}
            </button>
          </div>
          <label className="mb-2 flex items-center justify-between text-[12.5px] text-mute">Volume
            <input type="range" min={0} max={1} step={0.05} value={settings.volume} onChange={(e) => setSettings({ ...settings, volume: Number(e.target.value) })} className="w-24" />
          </label>
          <div className="space-y-1.5 text-[12.5px] text-mute">
            {([['auto', 'Recomendações automáticas'], ['prepareAhead', 'Preparar próximas páginas'], ['autoSwitch', 'Trocar na mudança de atmosfera'], ['popup', 'Mostrar popup antes da troca']] as const).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2">
                <input type="checkbox" checked={(settings as any)[k]} onChange={(e) => setSettings({ ...settings, [k]: e.target.checked })} /> {l}
              </label>
            ))}
          </div>
          <p className="mt-2 flex items-center gap-1 text-[10.5px] text-faint"><Settings2 size={11} /> A IA analisa à frente e não revela spoilers.</p>
        </div>
      )}
    </>
  );
}
