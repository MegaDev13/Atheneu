import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Play, Pause, RotateCcw, RotateCw, Headphones, ListMusic, Volume2, Loader2,
  CheckCircle2, Clock3, RefreshCw, XCircle, Cpu,
} from 'lucide-react';
import { backend } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button, Card, Skeleton } from '../components/ui';
import BookCover from '../components/BookCover';
import { fmtClock, relTime } from '../lib/utils';
import type { Book, BookAudioState, Chapter, TtsPrefs, TtsWorker } from '../lib/types';

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];
const WPM = 160;

const JOB_STATUS_LABEL: Record<string, string> = {
  queued: 'na fila', claimed: 'reivindicado', processing: 'processando', paused: 'pausado',
  completed: 'concluído', failed: 'falhou', cancelled: 'cancelado',
};

export default function Audiobooks() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [params] = useSearchParams();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentId, setCurrentId] = useState<string | null>(params.get('livro'));
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [audioState, setAudioState] = useState<BookAudioState | null>(null);
  const [allJobs, setAllJobs] = useState<import('../lib/types').TtsJob[]>([]);
  const [workers, setWorkers] = useState<TtsWorker[]>([]);
  const [prefs, setPrefs] = useState<TtsPrefs>({ engine: 'kokoro', voice: '', speed: 1, language: 'pt-BR', quality: 'high' });
  const [priority, setPriority] = useState<0 | 1 | 2>(1);
  const [generating, setGenerating] = useState(false);

  // Player
  const [chapterIdx, setChapterIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(profile?.prefs.audioRate || 1);
  const [volume, setVolume] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const synthTimer = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([backend.listBooks(user.id), backend.getTtsPrefs(user.id), backend.listWorkers(user.id)])
      .then(([bs, p, ws]) => {
        setBooks(bs); setPrefs(p); setWorkers(ws);
        if (!currentId && bs.length > 0) setCurrentId(bs.filter((b) => b.status === 'reading')[0]?.id || bs[0].id);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const book = books.find((b) => b.id === currentId) || null;

  const refreshState = useCallback(async () => {
    if (!user || !currentId) return;
    const [st, jobs] = await Promise.all([
      backend.getBookAudioState(user.id, currentId),
      backend.listJobs(user.id),
    ]);
    setAudioState(st);
    setAllJobs(jobs);
  }, [user?.id, currentId]);

  useEffect(() => {
    if (!user || !currentId) return;
    backend.getChapters(currentId).then(setChapters);
    refreshState();
    const t = setInterval(refreshState, 4000); // acompanhamento leve da fila
    return () => clearInterval(t);
  }, [user?.id, currentId]);

  const chapter = chapters[chapterIdx];
  const chapterSeconds = useMemo(
    () => (chapter ? (chapter.text.split(/\s+/).length / WPM) * 60 : 0),
    [chapter]
  );
  const chapterState = audioState?.chapters.find((c) => c.chapterIdx === chapter?.index);
  const chapterReady = chapterState?.status === 'done' || (!audioState?.job && chapters.length > 0); // sem job: prévia local
  const chapterAudioSeconds = chapterState?.status === 'done' && chapterState.seconds > 0 ? chapterState.seconds : chapterSeconds;

  // ─── Geração (ação explícita) ───
  async function generate() {
    if (!user || !book) return;
    setGenerating(true);
    try {
      await backend.createJob(user.id, book.id, priority, prefs);
      const online = workers.filter((w) => w.status === 'online' && w.active).length;
      toast(online > 0 ? 'Trabalho enviado para a fila de processamento.' : 'Na fila. Nenhum worker online agora — o job aguarda um dispositivo.', 'info');
      await refreshState();
    } catch {
      toast('Não foi possível criar o trabalho de áudio.', 'error');
    } finally {
      setGenerating(false);
    }
  }

  // ─── Reprodução ───
  function stopAll() {
    audioRef.current?.pause();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    if (synthTimer.current) clearInterval(synthTimer.current);
    synthTimer.current = null;
    setPlaying(false);
  }

  async function play() {
    if (!chapter || !user || !book) return;
    stopAll();
    setPlaying(true);
    if (chapterState?.status === 'done') {
      const url = await backend.getAudioUrl(user.id, book.id, chapter.index);
      if (url && audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.playbackRate = rate;
        audioRef.current.volume = volume;
        audioRef.current.currentTime = Math.min(elapsed, chapterAudioSeconds - 1);
        audioRef.current.play().catch(() => fallbackSpeech());
        return;
      }
    }
    fallbackSpeech();
  }

  // Prévia local (voz do navegador) — usada quando ainda não há áudio gerado.
  function fallbackSpeech() {
    if (!chapter) return;
    if (!('speechSynthesis' in window)) {
      toast('Este capítulo ainda está sendo gerado e seu navegador não oferece prévia de voz.', 'info');
      setPlaying(false);
      return;
    }
    const words = chapter.text.split(/\s+/);
    const startWord = Math.min(words.length - 1, Math.floor((elapsed / 60) * WPM));
    const u = new SpeechSynthesisUtterance(words.slice(startWord).join(' '));
    u.lang = prefs.language || 'pt-BR';
    u.rate = rate;
    u.volume = volume;
    u.onend = () => {
      setPlaying(false);
      if (synthTimer.current) clearInterval(synthTimer.current);
      if (chapterIdx < chapters.length - 1) { setChapterIdx(chapterIdx + 1); setElapsed(0); }
    };
    window.speechSynthesis.speak(u);
    const startedAt = Date.now();
    const base = elapsed;
    synthTimer.current = setInterval(() => setElapsed(base + ((Date.now() - startedAt) / 1000) * rate), 1000);
  }

  function pause() {
    stopAll();
    backend.saveAudioProgress(user!.id, { bookId: currentId!, chapter: chapterIdx, seconds: elapsed, rate, updatedAt: Date.now() }).catch(() => {});
  }

  function seek(delta: number) {
    const next = Math.max(0, Math.min(chapterAudioSeconds, elapsed + delta));
    setElapsed(next);
    if (playing) play();
  }

  // Segmentos de sincronização (§18) — destaque do trecho correspondente
  const [segments, setSegments] = useState<import('../lib/types').AudioSegmentMeta[]>([]);
  useEffect(() => {
    if (!user || !book) return;
    backend.getAudioSegments(user.id, book.id, chapterIdx).then(setSegments).catch(() => setSegments([]));
  }, [user?.id, book?.id, chapterIdx, audioState?.readyChapters]);

  useEffect(() => {
    const seg = segments.find((s) => elapsed >= s.audioStart && elapsed < s.audioEnd);
    setActiveSegment(seg ? seg.segmentIndex : null);
  }, [elapsed, segments]);

  function onAudioTime() {
    const a = audioRef.current;
    if (!a) return;
    setElapsed(a.currentTime);
  }

  useEffect(() => () => stopAll(), []);
  useEffect(() => { stopAll(); setElapsed(0); }, [currentId]);

  // Retomar progresso salvo
  useEffect(() => {
    if (!user || !currentId) return;
    backend.getAudioProgress(user.id, currentId).then((p) => {
      if (p) { setChapterIdx(p.chapter); setElapsed(p.seconds); setRate(p.rate || 1); }
    });
  }, [user?.id, currentId]);

  if (loading) {
    return <div className="mx-auto w-[min(1100px,94%)] py-8"><Skeleton className="mb-6 h-10 w-64" /><Skeleton className="h-64" /></div>;
  }

  const onlineWorkers = workers.filter((w) => w.status === 'online' && w.active);

  return (
    <div className="mx-auto w-[min(1100px,94%)] py-6 md:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="smallcaps">audiobooks</p>
          <h1 className="font-display text-[30px] text-ink">Escute</h1>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* ─── Player / geração ─── */}
        <Card className="p-6 md:p-8">
          {book ? (
            <>
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <BookCover title={book.title} author={book.author} cover={book.cover} className="h-44 w-[116px] shadow-deep" />
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="text-[12.5px] uppercase tracking-wider text-gold">
                    {audioState && audioState.readyChapters > 0
                      ? `${audioState.readyChapters}/${audioState.totalChapters} capítulos prontos`
                      : chapter ? `Capítulo ${chapterIdx + 1} de ${chapters.length}` : 'processando…'}
                  </p>
                  <h2 className="mt-1 font-display text-2xl text-ink">{book.title}</h2>
                  <p className="text-sm text-mute">{book.author}</p>
                  <p className="mt-1.5 truncate text-[12.5px] text-faint">{chapter?.title}</p>
                  {chapterState?.status === 'done' ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-pine/10 px-2.5 py-1 text-[11px] font-medium text-pine">
                      <CheckCircle2 size={11} /> áudio gerado · {prefs.engine}
                    </p>
                  ) : (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold">
                      <Volume2 size={11} /> prévia com voz do navegador
                    </p>
                  )}
                </div>
              </div>

              {/* Barra */}
              <div className="mt-7">
                <input
                  type="range" min={0} max={Math.max(1, Math.round(chapterAudioSeconds))}
                  value={Math.min(elapsed, chapterAudioSeconds)}
                  onChange={(e) => { const v = Number(e.target.value); setElapsed(v); if (playing) play(); }}
                  className="w-full" aria-label="Posição no capítulo"
                />
                <div className="mt-1 flex justify-between text-[12px] tabular-nums text-faint">
                  <span>{fmtClock(elapsed)}</span>
                  <span>-{fmtClock(Math.max(0, chapterAudioSeconds - elapsed))}</span>
                </div>
              </div>

              {/* Controles */}
              <div className="mt-5 flex items-center justify-center gap-4">
                <button onClick={() => seek(-15)} aria-label="Retroceder 15 segundos" className="rounded-full p-2.5 text-mute transition-colors hover:bg-wine-light hover:text-ink">
                  <RotateCcw size={21} />
                </button>
                <button
                  onClick={() => (playing ? pause() : play())}
                  aria-label={playing ? 'Pausar' : 'Reproduzir'}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-wine text-[#f7f0e2] shadow-deep transition-transform hover:scale-105 active:scale-95"
                >
                  {playing ? <Pause size={26} /> : <Play size={26} className="ml-1" />}
                </button>
                <button onClick={() => seek(15)} aria-label="Avançar 15 segundos" className="rounded-full p-2.5 text-mute transition-colors hover:bg-wine-light hover:text-ink">
                  <RotateCw size={21} />
                </button>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-1.5" role="group" aria-label="Velocidade de reprodução">
                  {RATES.map((r) => (
                    <button key={r} onClick={() => { setRate(r); if (playing) setTimeout(play, 50); }} aria-pressed={rate === r}
                      className={`rounded-lg border px-2.5 py-1 text-[12px] font-medium tabular-nums transition-all ${rate === r ? 'border-wine bg-wine text-[#f7f0e2]' : 'border-line text-mute hover:text-ink'}`}>
                      {r.toString().replace('.', ',')}×
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 size={15} className="text-faint" />
                  <input type="range" min={0} max={1} step={0.05} value={volume}
                    onChange={(e) => { const v = Number(e.target.value); setVolume(v); if (audioRef.current) audioRef.current.volume = v; }}
                    className="w-24" aria-label="Volume" />
                </div>
              </div>

              {/* Texto sincronizado (§18) */}
              {segments.length > 0 && chapter && (
                <div className="mt-6 rounded-xl bg-card2/50 p-4">
                  <p className="smallcaps mb-2">texto sincronizado</p>
                  <p className="font-reader text-[14px] leading-relaxed text-mute">
                    {segments.map((s) => (
                      <span key={s.segmentIndex} className={s.segmentIndex === activeSegment ? 'hl-yellow' : ''}>
                        {chapter.text.slice(s.textStart, s.textEnd)}{' '}
                      </span>
                    ))}
                  </p>
                </div>
              )}

              <audio ref={audioRef} onTimeUpdate={onAudioTime} onEnded={() => { setPlaying(false); if (chapterIdx < chapters.length - 1) { setChapterIdx(chapterIdx + 1); setElapsed(0); } }} className="hidden" />
            </>
          ) : (
            <p className="py-16 text-center text-mute">Adicione um livro à biblioteca para escutá-lo.</p>
          )}
        </Card>

        {/* ─── Coluna lateral ─── */}
        <div className="space-y-4">
          {/* Capítulos com status (§17, §45) */}
          <Card className="p-5">
            <p className="smallcaps mb-3 flex items-center gap-1.5"><ListMusic size={13} /> capítulos</p>
            <ul className="max-h-60 space-y-1 overflow-y-auto">
              {chapters.map((c, i) => {
                const st = audioState?.chapters.find((x) => x.chapterIdx === i);
                const icon =
                  st?.status === 'done' ? <CheckCircle2 size={13} className="text-pine" /> :
                  st?.status === 'processing' ? <Loader2 size={13} className="animate-spin text-gold" /> :
                  st?.status === 'failed' ? <XCircle size={13} className="text-wine" /> :
                  <Clock3 size={13} className="text-faint" />;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => { setChapterIdx(i); setElapsed(0); stopAll(); }}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition-colors ${i === chapterIdx ? 'bg-wine-light font-medium text-wine' : 'text-mute hover:bg-card2'}`}
                    >
                      <span className="w-5 shrink-0 text-[11px] tabular-nums opacity-60">{i + 1}.</span>
                      <span className="min-w-0 flex-1 truncate">{c.title}</span>
                      {icon}
                      {st?.status === 'done' && <span className="text-[10.5px] tabular-nums text-faint">{fmtClock(st.seconds)}</span>}
                      {st?.status === 'processing' && st.segmentsTotal > 0 && (
                        <span className="text-[10.5px] tabular-nums text-faint">{st.segmentsDone}/{st.segmentsTotal}</span>
                      )}
                    </button>
                  </li>
                );
              })}
              {chapters.length === 0 && <p className="py-4 text-center text-[13px] text-faint">Sem capítulos processados ainda.</p>}
            </ul>

            {/* Gerar audiobook (ação explícita — §25 equivalente para TTS) */}
            {book && (
              <div className="mt-4 border-t border-line pt-4">
                {audioState?.job && ['queued', 'claimed', 'processing', 'paused'].includes(audioState.job.status) ? (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                      <span className="flex items-center gap-1.5 text-mute">
                        <Loader2 size={13} className="animate-spin text-gold" /> {JOB_STATUS_LABEL[audioState.job.status]}
                      </span>
                      <span className="tabular-nums text-faint">{Math.round(audioState.job.progress * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-line/60">
                      <div className="h-full rounded-full bg-gold transition-[width] duration-700" style={{ width: `${audioState.job.progress * 100}%` }} />
                    </div>
                    <Button variant="danger" size="sm" className="mt-3 w-full" onClick={async () => { await backend.cancelJob(user!.id, audioState.job!.id); refreshState(); toast('Trabalho cancelado — o estado foi preservado.', 'info'); }}>
                      Cancelar processamento
                    </Button>
                  </div>
                ) : audioState && audioState.readyChapters === audioState.totalChapters && audioState.totalChapters > 0 ? (
                  <p className="flex items-center gap-1.5 text-[12.5px] text-pine"><CheckCircle2 size={13} /> Audiobook completo.</p>
                ) : (
                  <>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[12.5px] font-medium text-mute">Prioridade</p>
                      <select value={priority} onChange={(e) => setPriority(Number(e.target.value) as 0 | 1 | 2)}
                        className="h-8 rounded-lg border border-line bg-card2/50 px-2 text-[12px] text-mute focus:outline-none" aria-label="Prioridade do trabalho">
                        <option value={2}>Alta</option><option value={1}>Normal</option><option value={0}>Baixa</option>
                      </select>
                    </div>
                    <Button className="w-full" onClick={generate} loading={generating} disabled={chapters.length === 0}>
                      <Headphones size={15} /> Gerar audiobook
                    </Button>
                    <p className="mt-2 text-[11.5px] leading-relaxed text-faint">
                      {onlineWorkers.length > 0
                        ? `${onlineWorkers.length} worker(s) online: ${onlineWorkers.map((w) => w.deviceName).join(', ')}.`
                        : 'Nenhum worker online — o trabalho fica na fila até um dispositivo assumir.'}
                    </p>
                  </>
                )}
              </div>
            )}
          </Card>

          {/* Fila de trabalhos */}
          <Card className="p-5">
            <p className="smallcaps mb-3 flex items-center gap-1.5"><RefreshCw size={13} /> fila de processamento</p>
            {allJobs.length === 0 ? (
              <p className="py-3 text-center text-[12.5px] text-faint">Nenhum trabalho ainda.</p>
            ) : (
              <ul className="space-y-2.5">
                {allJobs.slice(0, 5).map((j) => {
                  const b = books.find((x) => x.id === j.bookId);
                  const w = workers.find((x) => x.id === j.workerId);
                  return (
                    <li key={j.id} className="rounded-xl border border-line p-3">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-[13px] font-medium text-ink">{b?.title || 'Livro'}</p>
                        <span className="text-[11px] text-faint">{relTime(j.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 text-[11.5px] text-mute">
                        {JOB_STATUS_LABEL[j.status]}
                        {w ? ` · ${w.deviceName}` : ''}
                        {j.status === 'processing' ? ` · capítulo ${j.currentChapter + 1}` : ''}
                      </p>
                      <div className="mt-1.5 h-1 rounded-full bg-line/60">
                        <div className={`h-full rounded-full ${j.status === 'failed' || j.status === 'cancelled' ? 'bg-wine/50' : 'bg-gold'}`} style={{ width: `${j.progress * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Preferências de TTS (§19) */}
          <Card className="p-5">
            <p className="smallcaps mb-3 flex items-center gap-1.5"><Cpu size={13} /> preferências de tts</p>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-mute">Engine</span>
                <select value={prefs.engine} onChange={async (e) => { const p = { ...prefs, engine: e.target.value }; setPrefs(p); await backend.saveTtsPrefs(user!.id, p); }}
                  className="h-9 w-full rounded-lg border border-line bg-card2/50 px-2.5 text-[13px] text-ink focus:outline-none">
                  <option value="kokoro">Kokoro (local)</option>
                  <option value="piper">Piper (local)</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-mute">Voz</span>
                <input value={prefs.voice} placeholder="ex.: pf_dora"
                  onChange={async (e) => { const p = { ...prefs, voice: e.target.value }; setPrefs(p); await backend.saveTtsPrefs(user!.id, p); }}
                  className="h-9 w-full rounded-lg border border-line bg-card2/50 px-2.5 text-[13px] text-ink placeholder:text-faint focus:outline-none" />
              </label>
              <p className="text-[11px] leading-relaxed text-faint">
                TTS 100% local nos seus dispositivos (Workers) — sem custo por geração.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
