import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, ChevronLeft, ChevronRight, List, Search, Type, Maximize,
  StickyNote, PlayCircle, StopCircle, PenLine, Users, Sparkles,
} from 'lucide-react';
import { backend } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSession } from '../contexts/SessionContext';
import { useToast } from '../contexts/ToastContext';
import { Button, Drawer, Modal, ProgressBar, Skeleton } from '../components/ui';
import PdfViewer from '../components/PdfViewer';
import { debounce, fmt, friendlyError, relTime, uid } from '../lib/utils';
import type { Book, Chapter, Highlight, HighlightColor, Note, Progress, SocialBundle } from '../lib/types';

type ReaderTheme = 'light' | 'dark' | 'sepia';

const READER_THEMES: Record<ReaderTheme, { bg: string; text: string; name: string }> = {
  light: { bg: '#faf6ec', text: '#241e15', name: 'Claro' },
  sepia: { bg: '#f0e2c8', text: '#3a2e1c', name: 'Sépia' },
  dark: { bg: '#171310', text: '#e5dcc6', name: 'Escuro' },
};

const HL_COLORS: { key: HighlightColor; css: string; label: string }[] = [
  { key: 'yellow', css: '#e0ba54', label: 'Amarelo' },
  { key: 'blue', css: '#5484be', label: 'Azul' },
  { key: 'green', css: '#4a966c', label: 'Verde' },
  { key: 'red', css: '#c4544e', label: 'Vermelho' },
];

export default function Reader() {
  const { bookId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { active, start, stop, updatePage } = useSession();

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [social, setSocial] = useState<SocialBundle | null>(null);
  const [loading, setLoading] = useState(true);

  const [chapterIdx, setChapterIdx] = useState(0);
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('atheneu-font') || 19));
  const [lineHeight, setLineHeight] = useState(() => Number(localStorage.getItem('atheneu-lh') || 1.9));
  const [rtheme, setRtheme] = useState<ReaderTheme>(() => {
    const saved = localStorage.getItem('atheneu-rtheme') as ReaderTheme | null;
    return saved && READER_THEMES[saved] ? saved : 'light';
  });
  const [tocOpen, setTocOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [sel, setSel] = useState<{ text: string; x: number; y: number } | null>(null);
  const [noteDraft, setNoteDraft] = useState<{ excerpt: string; text: string; tags: string } | null>(null);
  const [sessionSummary, setSessionSummary] = useState<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const appliedInitial = useRef(false);
  const restoredRef = useRef(false);

  // ─── Carregamento ───
  useEffect(() => {
    if (!user || !bookId) return;
    setLoading(true);
    (async () => {
      try {
        const books = await backend.listBooks(user.id);
        const b = books.find((x) => x.id === bookId) || null;
        setBook(b);
        if (!b) return;
        const [chs, hls, nts, prg] = await Promise.all([
          backend.getChapters(bookId),
          backend.listHighlights(user.id, bookId),
          backend.listNotes(user.id),
          backend.listProgress(user.id),
        ]);
        setChapters(chs);
        setHighlights(hls);
        setNotes(nts.filter((n) => n.bookId === bookId));
        const p = prg.find((x) => x.bookId === bookId) || null;
        setProgress(p);
        if (p && !appliedInitial.current) {
          appliedInitial.current = true;
          setChapterIdx(Math.min(p.chapter, Math.max(0, chs.length - 1)));
        }
        backend.getSocial(user.id).then(setSocial).catch(() => {});
        // Marca acesso e status
        const updated = { ...b, lastAccess: Date.now(), status: b.status === 'want' ? 'reading' as const : b.status };
        setBook(updated);
        backend.saveBook(user.id, updated).catch(() => {});
      } catch (e) {
        console.error(e);
        toast('Não foi possível abrir este livro. Tente novamente.', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, bookId]);

  // ─── Persistência de progresso (debounced) ───
  const saveProgress = useMemo(
    () =>
      debounce((ch: number, loc: number) => {
        if (!user || !bookId) return;
        const totalPages = book?.pages || Math.max(8, Math.round(chapters.reduce((a, c) => a + c.text.split(/\s+/).length, 0) / 280));
        const page = Math.max(1, Math.round(((ch + loc) / Math.max(1, chapters.length)) * totalPages));
        backend
          .saveProgress(user.id, { bookId, chapter: ch, location: loc, page, updatedAt: Date.now() })
          .then(() => {
            setProgress({ bookId, chapter: ch, location: loc, page, updatedAt: Date.now() });
            if (active && active.bookId === bookId) updatePage(page);
          })
          .catch((e) => console.error(e));
      }, 900),
    [user?.id, bookId, chapters.length, book?.pages, active?.id]
  );

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const loc = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
    saveProgress(chapterIdx, loc);
  }, [chapterIdx, saveProgress]);

  // Restaurar posição ao trocar de capítulo (uma única vez na carga inicial)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loading) return;
    if (progress && progress.chapter === chapterIdx && !restoredRef.current) {
      restoredRef.current = true;
      el.scrollTop = progress.location * (el.scrollHeight - el.clientHeight);
    } else {
      el.scrollTop = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIdx, loading]);

  useEffect(() => {
    localStorage.setItem('atheneu-font', String(fontSize));
    localStorage.setItem('atheneu-lh', String(lineHeight));
    localStorage.setItem('atheneu-rtheme', rtheme);
  }, [fontSize, lineHeight, rtheme]);

  const chapter = chapters[chapterIdx];
  const rt = READER_THEMES[rtheme];

  // ─── Segmentos com destaques ───
  const segments = useMemo(() => {
    if (!chapter) return [];
    const hs = highlights
      .filter((h) => h.chapter === chapterIdx && h.end > h.start)
      .sort((a, b) => a.start - b.start);
    const out: { text: string; color?: HighlightColor }[] = [];
    let cursor = 0;
    for (const h of hs) {
      const start = Math.max(cursor, h.start);
      const end = Math.min(chapter.text.length, h.end);
      if (end <= start) continue;
      if (start > cursor) out.push({ text: chapter.text.slice(cursor, start) });
      out.push({ text: chapter.text.slice(start, end), color: h.color });
      cursor = end;
    }
    if (cursor < chapter.text.length) out.push({ text: chapter.text.slice(cursor) });
    return out.length ? out : [{ text: chapter.text }];
  }, [chapter, highlights, chapterIdx]);

  // ─── Seleção de texto → menu ───
  function handleSelection(e: React.MouseEvent) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) { setSel(null); return; }
    const text = selection.toString().trim();
    if (text.length < 2 || text.length > 4000) { setSel(null); return; }
    const container = textRef.current;
    if (!container || !container.contains(selection.anchorNode)) { setSel(null); return; }
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    setSel({ text, x: rect.left + rect.width / 2, y: rect.top });
  }

  function addHighlight(color: HighlightColor) {
    if (!sel || !chapter || !user || !bookId) return;
    const idx = chapter.text.indexOf(sel.text);
    const h: Highlight = {
      id: uid(), bookId, chapter: chapterIdx,
      start: idx >= 0 ? idx : 0, end: idx >= 0 ? idx + sel.text.length : 0,
      text: sel.text, color, createdAt: Date.now(),
    };
    setHighlights((xs) => [...xs, h]);
    setSel(null);
    window.getSelection()?.removeAllRanges();
    backend.saveHighlight(user.id, h).catch((e) => console.error(e));
    toast('Trecho destacado.');
  }

  function startNote() {
    if (!sel) return;
    setNoteDraft({ excerpt: sel.text, text: '', tags: '' });
    setSel(null);
    window.getSelection()?.removeAllRanges();
  }

  async function saveNoteDraft() {
    if (!noteDraft || !user || !bookId) return;
    const n: Note = {
      id: uid(), bookId, chapter: chapterIdx, excerpt: noteDraft.excerpt,
      text: noteDraft.text.trim(), tags: noteDraft.tags.split(',').map((t) => t.trim()).filter(Boolean),
      review: false, createdAt: Date.now(),
    };
    setNotes((xs) => [n, ...xs]);
    setNoteDraft(null);
    try {
      await backend.saveNote(user.id, n);
      await backend.addActivity(user.id, { id: uid(), kind: 'note', bookId, text: `criou uma nota em ${book?.title || 'um livro'}`, at: Date.now() });
      toast('Nota salva.');
    } catch (e) {
      toast('Não foi possível salvar a nota.', 'error');
    }
  }

  // ─── Navegação ───
  const goTo = (idx: number) => {
    setChapterIdx(Math.min(Math.max(0, idx), chapters.length - 1));
    setTocOpen(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') goTo(chapterIdx + 1);
      if (e.key === 'ArrowLeft') goTo(chapterIdx - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chapterIdx, chapters.length]);

  // Busca no livro
  const searchResults = useMemo(() => {
    if (searchQ.trim().length < 2) return [];
    const q = searchQ.toLowerCase();
    const out: { chapter: number; title: string; snippet: string }[] = [];
    for (const c of chapters) {
      const i = c.text.toLowerCase().indexOf(q);
      if (i >= 0) {
        out.push({ chapter: c.index, title: c.title, snippet: '…' + c.text.slice(Math.max(0, i - 40), i + 80).replace(/\n+/g, ' ') + '…' });
      }
    }
    return out.slice(0, 12);
  }, [searchQ, chapters]);

  // Sessão
  const totalPages = book?.pages || 1;
  const sessionActiveHere = active && active.bookId === bookId;

  const presence = useMemo(() => {
    if (!social || !bookId) return [];
    return social.readers[bookId] || [];
  }, [social, bookId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Skeleton className="mb-4 h-6 w-40" /><Skeleton className="mb-10 h-10 w-72" />
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="mb-3 h-4 w-full" />)}
      </div>
    );
  }

  if (!book) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="font-display text-2xl text-ink">Livro não encontrado.</p>
        <Button className="mt-5" onClick={() => nav('/app/biblioteca')}><ArrowLeft size={16} /> Voltar à biblioteca</Button>
      </div>
    );
  }

  // PDF: exibição fiel ao arquivo original (PDF.js) + texto extraído em segundo plano.
  if (book.format === 'pdf' && book.fileKey) {
    return <PdfViewer book={book} dark={document.documentElement.classList.contains('dark')} />;
  }

  if (chapters.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="font-display text-2xl text-ink">Este livro ainda está sendo preparado.</p>
        <p className="mt-3 text-sm leading-relaxed text-mute">
          O arquivo foi armazenado com segurança. A extração do texto acontece no pipeline de processamento
          (frontend → Supabase → worker → texto). Assim que concluir, a leitura ficará disponível aqui.
        </p>
        <Button className="mt-6" variant="outline" onClick={() => nav('/app/biblioteca')}><ArrowLeft size={16} /> Voltar à biblioteca</Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col md:h-[calc(100vh-65px)]" style={{ background: rt.bg, color: rt.text, transition: 'background .4s ease, color .4s ease' }}>
      {/* Barra superior */}
      <div className="flex items-center gap-1 border-b px-3 py-2" style={{ borderColor: 'color-mix(in srgb, currentColor 14%, transparent)' }}>
        <button onClick={() => nav('/app/biblioteca')} aria-label="Voltar à biblioteca" className="rounded-lg p-2 opacity-70 hover:opacity-100"><ArrowLeft size={17} /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px]">{book.title}</p>
          <p className="truncate text-[11.5px] opacity-60">{chapter.title}</p>
        </div>
        {presence.length > 0 && (
          <span className="mr-1 hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] opacity-80 sm:flex" style={{ borderColor: 'color-mix(in srgb, currentColor 20%, transparent)' }}>
            <Users size={11} /> {presence.length} lendo
          </span>
        )}
        {!sessionActiveHere ? (
          <button onClick={() => start(book.id, progress?.page || 1)} title="Iniciar sessão de leitura" className="rounded-lg p-2 opacity-70 hover:opacity-100"><PlayCircle size={18} /></button>
        ) : (
          <button
            onClick={async () => { const s = await stop(progress?.page || 0); setSessionSummary(s); }}
            title="Encerrar sessão" className="rounded-lg p-2 text-gold"
          >
            <StopCircle size={18} />
          </button>
        )}
        <button onClick={() => setTocOpen(true)} aria-label="Índice" className="rounded-lg p-2 opacity-70 hover:opacity-100"><List size={17} /></button>
        <button onClick={() => setSearchOpen(true)} aria-label="Buscar no livro" className="rounded-lg p-2 opacity-70 hover:opacity-100"><Search size={17} /></button>
        <button onClick={() => setSettingsOpen(true)} aria-label="Aparência do texto" className="rounded-lg p-2 opacity-70 hover:opacity-100"><Type size={17} /></button>
        <button onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()} aria-label="Tela cheia" className="hidden rounded-lg p-2 opacity-70 hover:opacity-100 md:block"><Maximize size={17} /></button>
        <button onClick={() => setNotesOpen(true)} aria-label="Notas deste livro" className="relative rounded-lg p-2 opacity-70 hover:opacity-100">
          <StickyNote size={17} />
          {notes.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-wine text-[9px] font-bold text-white">{notes.length}</span>}
        </button>
      </div>

      {/* Área de leitura */}
      <div ref={scrollRef} onScroll={onScroll} onMouseUp={handleSelection} className="flex-1 overflow-y-auto scroll-smooth">
        <article className="mx-auto max-w-prose2 px-6 py-10 md:py-14">
          <p className="smallcaps mb-2" style={{ color: 'color-mix(in srgb, currentColor 55%, transparent)' }}>
            {book.title} · {chapterIdx + 1}/{chapters.length}
          </p>
          <h2 className="mb-8 font-display text-[26px] leading-tight md:text-[30px]">{chapter.title}</h2>
          <div ref={textRef} className="font-reader dropcap whitespace-pre-wrap" style={{ fontSize, lineHeight }}>
            {segments.map((s, i) =>
              s.color ? <mark key={i} className={`hl-${s.color}`}>{s.text}</mark> : <span key={i}>{s.text}</span>
            )}
          </div>

          <div className="mt-14 flex items-center justify-between">
            <Button variant="outline" onClick={() => goTo(chapterIdx - 1)} disabled={chapterIdx === 0}>
              <ChevronLeft size={16} /> Anterior
            </Button>
            <span className="text-[12px] opacity-50 tabular-nums">
              {progress ? `página ${progress.page} de ~${fmt(totalPages)}` : `~${fmt(totalPages)} páginas`}
            </span>
            <Button variant="outline" onClick={() => goTo(chapterIdx + 1)} disabled={chapterIdx === chapters.length - 1}>
              Próximo <ChevronRight size={16} />
            </Button>
          </div>
        </article>
      </div>

      {/* Progresso */}
      <div className="px-0">
        <ProgressBar value={(chapterIdx + (progress && progress.bookId === bookId && progress.chapter === chapterIdx ? progress.location : 0)) / chapters.length} />
      </div>

      {/* Menu de seleção */}
      <AnimatePresence>
        {sel && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSel(null)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed z-50 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-line bg-card p-1.5 shadow-deep"
              style={{ left: Math.min(Math.max(sel.x, 150), window.innerWidth - 150), top: Math.max(sel.y - 56, 8) }}
              role="menu" aria-label="Ações sobre o trecho selecionado"
            >
              {HL_COLORS.map((c) => (
                <button key={c.key} onClick={() => addHighlight(c.key)} aria-label={`Destacar em ${c.label}`} className="rounded-lg p-1.5 hover:bg-wine-light">
                  <span className="block rounded-full border border-black/10" style={{ width: 17, height: 17, background: c.css }} />
                </button>
              ))}
              <span className="mx-0.5 h-5 w-px bg-line" />
              <button onClick={startNote} title="Adicionar nota" className="rounded-lg p-1.5 text-mute hover:bg-wine-light hover:text-ink"><PenLine size={16} /></button>
              <button
                onClick={() => { navigator.clipboard?.writeText(sel.text); toast('Trecho copiado.', 'info'); setSel(null); }}
                title="Copiar" className="rounded-lg p-1.5 text-mute hover:bg-wine-light hover:text-ink"
              >
                <span className="text-[11px] font-semibold">ABC</span>
              </button>
              <button
                onClick={() => nav(`/app/conhecimento?q=${encodeURIComponent(sel.text)}`)}
                title="Perguntar à IA sobre este trecho" className="rounded-lg p-1.5 text-mute hover:bg-wine-light hover:text-ink"
              >
                <Sparkles size={16} />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Drawer: índice */}
      <Drawer open={tocOpen} onClose={() => setTocOpen(false)} title="Índice">
        <ul className="space-y-1">
          {chapters.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => goTo(c.index)}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-[14px] transition-colors ${c.index === chapterIdx ? 'bg-wine-light font-medium text-wine' : 'text-mute hover:bg-card2'}`}
              >
                <span className="mr-2 text-[11px] tabular-nums opacity-60">{c.index + 1}.</span>{c.title}
              </button>
            </li>
          ))}
        </ul>
      </Drawer>

      {/* Drawer: busca */}
      <Drawer open={searchOpen} onClose={() => { setSearchOpen(false); setSearchQ(''); }} title="Buscar no livro">
        <input autoFocus value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Palavra ou trecho…"
          className="mb-4 h-11 w-full rounded-xl border border-line bg-card2/60 px-3.5 text-[15px] text-ink placeholder:text-faint focus:border-gold focus:outline-none" aria-label="Buscar no livro" />
        <ul className="space-y-2">
          {searchResults.map((r, i) => (
            <li key={i}>
              <button onClick={() => { goTo(r.chapter); setSearchOpen(false); }} className="w-full rounded-xl border border-line p-3 text-left transition-colors hover:bg-card2/60">
                <p className="text-[12.5px] font-medium text-wine">{r.title}</p>
                <p className="mt-1 text-[13px] italic leading-relaxed text-mute">{r.snippet}</p>
              </button>
            </li>
          ))}
          {searchQ.length >= 2 && searchResults.length === 0 && <p className="py-6 text-center text-sm text-mute">Nada encontrado neste livro.</p>}
        </ul>
      </Drawer>

      {/* Drawer: aparência */}
      <Drawer open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Aparência">
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-[13px] font-medium text-mute">Tema de leitura</p>
            <div className="flex gap-2">
              {(Object.keys(READER_THEMES) as ReaderTheme[]).map((t) => (
                <button key={t} onClick={() => setRtheme(t)} aria-pressed={rtheme === t}
                  className={`flex-1 rounded-xl border-2 p-3 text-center text-[12.5px] font-medium transition-all ${rtheme === t ? 'border-wine' : 'border-line'}`}
                  style={{ background: READER_THEMES[t].bg, color: READER_THEMES[t].text }}>
                  {READER_THEMES[t].name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 flex justify-between text-[13px] font-medium text-mute"><span>Tamanho da fonte</span><span className="tabular-nums">{fontSize}px</span></p>
            <input type="range" min={15} max={28} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full" aria-label="Tamanho da fonte" />
          </div>
          <div>
            <p className="mb-2 flex justify-between text-[13px] font-medium text-mute"><span>Espaçamento</span><span className="tabular-nums">{lineHeight.toFixed(1)}</span></p>
            <input type="range" min={1.4} max={2.4} step={0.1} value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))} className="w-full" aria-label="Espaçamento entre linhas" />
          </div>
        </div>
      </Drawer>

      {/* Drawer: notas */}
      <Drawer open={notesOpen} onClose={() => setNotesOpen(false)} title={`Notas e destaques · ${book.title}`}>
        {notes.length === 0 && highlights.length === 0 ? (
          <p className="py-8 text-center text-sm text-mute">Selecione um trecho no texto para destacar ou anotar.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => (
              <div key={n.id} className="rounded-xl border border-line p-3.5">
                {n.excerpt && <p className="mb-2 border-l-2 border-gold pl-3 font-reader text-[13.5px] italic text-mute">“{n.excerpt}”</p>}
                <p className="text-[14px] text-ink">{n.text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {n.tags.map((t) => <span key={t} className="rounded-full bg-card2 px-2 py-0.5 text-[11px] text-mute">{t}</span>)}
                  <span className="ml-auto text-[11px] text-faint">{relTime(n.createdAt)}</span>
                </div>
              </div>
            ))}
            {highlights.map((h) => (
              <button key={h.id} onClick={() => { goTo(h.chapter); setNotesOpen(false); }} className={`block w-full rounded-xl p-3 text-left text-[13.5px] hl-${h.color}`}>
                {h.text.length > 160 ? h.text.slice(0, 160) + '…' : h.text}
              </button>
            ))}
          </div>
        )}
      </Drawer>

      {/* Modal: nova nota */}
      <Modal open={!!noteDraft} onClose={() => setNoteDraft(null)} title="Nova nota">
        {noteDraft && (
          <div className="space-y-4">
            <p className="rounded-xl bg-card2/60 p-3.5 font-reader text-[14px] italic text-mute">“{noteDraft.excerpt}”</p>
            <textarea
              autoFocus value={noteDraft.text} onChange={(e) => setNoteDraft({ ...noteDraft, text: e.target.value })}
              placeholder="O que este trecho desperta em você?" rows={4}
              className="w-full rounded-xl border border-line bg-card2/50 p-3.5 text-[14.5px] text-ink placeholder:text-faint focus:border-gold focus:outline-none"
              aria-label="Texto da nota"
            />
            <input
              value={noteDraft.tags} onChange={(e) => setNoteDraft({ ...noteDraft, tags: e.target.value })}
              placeholder="Tags separadas por vírgula (ex.: estoicismo, liberdade)"
              className="h-11 w-full rounded-xl border border-line bg-card2/50 px-3.5 text-[14px] text-ink placeholder:text-faint focus:border-gold focus:outline-none"
              aria-label="Tags"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setNoteDraft(null)}>Cancelar</Button>
              <Button onClick={saveNoteDraft} disabled={noteDraft.text.trim().length === 0}><PenLine size={15} /> Salvar nota</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Resumo da sessão */}
      <Modal open={!!sessionSummary} onClose={() => setSessionSummary(null)} title="Sessão encerrada">
        {sessionSummary && (() => {
          const mins = Math.round((sessionSummary.end - sessionSummary.start) / 60000);
          const pages = Math.max(0, sessionSummary.pageEnd - sessionSummary.pageStart);
          const rate = mins > 0 ? Math.round((pages / mins) * 60) : 0;
          return (
            <div className="space-y-3 text-center">
              <p className="font-display text-2xl text-ink">Você leu durante {mins} minuto{mins === 1 ? '' : 's'}.</p>
              <p className="text-[14.5px] text-mute">Avançou {pages} página{pages === 1 ? '' : 's'}.</p>
              <p className="text-[13px] text-faint">Ritmo de aproximadamente {rate} páginas/hora.</p>
              <Button className="mt-3" onClick={() => setSessionSummary(null)}>Continuar</Button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
