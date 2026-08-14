// Visualização fiel do PDF (PDF.js) + marcações sobre a camada de texto.
// O texto extraído em segundo plano alimenta busca, notas, sessões e audiobook;
// aqui o usuário vê o documento exatamente como ele é.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, StickyNote,
  PlayCircle, StopCircle, Sparkles, PenLine, Loader2,
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';
import { openPdf } from '../features/library/pdf';
import { backend } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSession } from '../contexts/SessionContext';
import { useToast } from '../contexts/ToastContext';
import { Button, Drawer, Modal } from './ui';
import { debounce, fmt, relTime, uid } from '../lib/utils';
import type { Book, Highlight, HighlightColor, Note } from '../lib/types';

const HL_COLORS: { key: HighlightColor; css: string; label: string }[] = [
  { key: 'yellow', css: '#e0ba54', label: 'Amarelo' },
  { key: 'blue', css: '#5484be', label: 'Azul' },
  { key: 'green', css: '#4a966c', label: 'Verde' },
  { key: 'red', css: '#c4544e', label: 'Vermelho' },
];

export default function PdfViewer({ book, dark }: { book: Book; dark?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const { active, start, stop, updatePage } = useSession();

  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageNo, setPageNo] = useState(1);
  const [scale, setScale] = useState<number | null>(null); // null = ajustar à largura
  const [pageText, setPageText] = useState('');
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesOpen, setNotesOpen] = useState(false);
  const [sel, setSel] = useState<{ text: string; x: number; y: number } | null>(null);
  const [noteDraft, setNoteDraft] = useState<{ excerpt: string; text: string; tags: string } | null>(null);
  const [sessionSummary, setSessionSummary] = useState<any>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const pageTextRef = useRef('');

  const total = book.pages || doc?.numPages || 0;
  const sessionActiveHere = active && active.bookId === book.id;

  // ─── Carregar arquivo ───
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!user) return;
        const url = await backend.getBookFileUrl(user.id, book);
        if (!url) throw new Error('Arquivo indisponível');
        const buf = await (await fetch(url)).arrayBuffer();
        const d = await openPdf(buf);
        if (!alive) { d.destroy(); return; }
        setDoc(d);
        if (book.pages !== d.numPages) {
          // Contagem real do PDF (§ extensão): atualiza o livro uma única vez.
          const updated = { ...book, pages: d.numPages };
          backend.saveBook(user.id, updated).catch(() => {});
        }
        const [hls, nts] = await Promise.all([
          backend.listHighlights(user.id, book.id),
          backend.listNotes(user.id),
        ]);
        if (!alive) return;
        setHighlights(hls);
        setNotes(nts.filter((n) => n.bookId === book.id));
        // Retomar da página salva
        const prg = await backend.listProgress(user.id);
        const p = prg.find((x) => x.bookId === book.id);
        if (alive && p) setPageNo(Math.min(Math.max(1, p.page || p.chapter + 1), d.numPages));
      } catch (e: any) {
        console.error(e);
        setError('Não foi possível abrir este PDF.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, book.id]);

  // ─── Salvar progresso (página real do PDF) ───
  const saveProgress = useMemo(
    () =>
      debounce((pg: number) => {
        if (!user) return;
        backend
          .saveProgress(user.id, { bookId: book.id, chapter: pg - 1, location: 0, page: pg, updatedAt: Date.now() })
          .then(() => {
            if (active && active.bookId === book.id) updatePage(pg);
          })
          .catch(() => {});
      }, 700),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, book.id, active?.id]
  );

  useEffect(() => {
    saveProgress(pageNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNo]);

  // ─── Renderizar página ───
  useEffect(() => {
    if (!doc || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(pageNo);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      let s = scale;
      if (s === null && wrapRef.current) {
        s = Math.min(2, (wrapRef.current.clientWidth - 24) / base.width);
      }
      const viewport = page.getViewport({ scale: s || 1 });
      const canvas = canvasRef.current!;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined } as any).promise;
      if (cancelled) return;

      // Camada de texto (seleção + destaques)
      const container = textLayerRef.current;
      if (container) {
        container.innerHTML = '';
        container.style.width = `${viewport.width}px`;
        container.style.height = `${viewport.height}px`;
        const content = await page.getTextContent();
        try {
          const tl = new (pdfjs as any).TextLayer({ textContentSource: content, container, viewport });
          await tl.render();
        } catch (e) {
          console.warn('Camada de texto indisponível:', e);
        }
        if (cancelled) return;
        pageTextRef.current = (content.items as any[]).map((i: any) => i.str || '').join(' ');
        setPageText(pageTextRef.current);
        applyHighlights(container, pageTextRef.current);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, pageNo, scale]);

  // Aplica destaques salvos sobre os spans da camada de texto
  function applyHighlights(container: HTMLElement, text: string) {
    const hs = highlights.filter((h) => h.chapter === pageNo - 1 && h.end > h.start);
    if (hs.length === 0) return;
    const spans = Array.from(container.querySelectorAll('span'));
    let cursor = 0;
    const ranges = spans.map((sp) => {
      const len = (sp.textContent || '').length;
      const r = { el: sp as HTMLElement, start: cursor, end: cursor + len };
      cursor += len + 1; // espaço entre itens (igual à extração)
      return r;
    });
    for (const h of hs) {
      for (const r of ranges) {
        if (r.end > h.start && r.start < h.end) {
          r.el.classList.add(`hl-${h.color}`);
          r.el.style.borderRadius = '2px';
        }
      }
    }
    void text;
  }

  // ─── Seleção de texto → menu ───
  function handleSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return setSel(null);
    const text = selection.toString().trim();
    if (text.length < 2 || text.length > 4000) return setSel(null);
    const container = textLayerRef.current;
    if (!container || !container.contains(selection.anchorNode)) return setSel(null);
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    setSel({ text, x: rect.left + rect.width / 2, y: rect.top });
  }

  function addHighlight(color: HighlightColor) {
    if (!sel || !user) return;
    const idx = pageTextRef.current.indexOf(sel.text);
    const h: Highlight = {
      id: uid(), bookId: book.id, chapter: pageNo - 1,
      start: idx >= 0 ? idx : 0, end: idx >= 0 ? idx + sel.text.length : 0,
      text: sel.text, color, createdAt: Date.now(),
    };
    setHighlights((xs) => [...xs, h]);
    setSel(null);
    window.getSelection()?.removeAllRanges();
    if (textLayerRef.current) applyHighlights(textLayerRef.current, pageTextRef.current);
    backend.saveHighlight(user.id, h).catch(() => {});
    toast(`Destaque salvo na página ${pageNo}.`);
  }

  async function saveNoteDraft() {
    if (!noteDraft || !user) return;
    const n: Note = {
      id: uid(), bookId: book.id, chapter: pageNo - 1, excerpt: noteDraft.excerpt,
      text: noteDraft.text.trim(), tags: noteDraft.tags.split(',').map((t) => t.trim()).filter(Boolean),
      review: false, createdAt: Date.now(),
    };
    setNotes((xs) => [n, ...xs]);
    setNoteDraft(null);
    try {
      await backend.saveNote(user.id, n);
      toast('Nota salva.');
    } catch {
      toast('Não foi possível salvar a nota.', 'error');
    }
  }

  // Navegação por teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' && pageNo < total) setPageNo(pageNo + 1);
      if (e.key === 'ArrowLeft' && pageNo > 1) setPageNo(pageNo - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pageNo, total]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-3">
        <Loader2 size={26} className="animate-spin text-gold" />
        <p className="smallcaps">abrindo o PDF…</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="font-display text-2xl text-ink">{error || 'PDF indisponível.'}</p>
        <Button className="mt-5" onClick={() => nav('/app/biblioteca')}><ArrowLeft size={16} /> Voltar à biblioteca</Button>
      </div>
    );
  }

  const bg = dark ? '#14100c' : '#e9e2d2';
  const fg = dark ? '#e9dfc9' : '#241e15';

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col md:h-[calc(100vh-65px)]" style={{ background: bg, color: fg }}>
      {/* Barra superior */}
      <div className="flex items-center gap-1 border-b px-3 py-2" style={{ borderColor: 'color-mix(in srgb, currentColor 14%, transparent)' }}>
        <button onClick={() => nav('/app/biblioteca')} aria-label="Voltar à biblioteca" className="rounded-lg p-2 opacity-70 hover:opacity-100"><ArrowLeft size={17} /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px]">{book.title}</p>
          <p className="text-[11.5px] opacity-60">PDF original · texto extraído para busca e notas</p>
        </div>

        <div className="mx-2 flex items-center gap-1 text-[13px] tabular-nums">
          <button onClick={() => setPageNo(Math.max(1, pageNo - 1))} disabled={pageNo <= 1} className="rounded-lg p-1.5 opacity-70 hover:opacity-100 disabled:opacity-30" aria-label="Página anterior"><ChevronLeft size={16} /></button>
          <input
            value={pageNo}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (Number.isFinite(v)) setPageNo(Math.min(Math.max(1, v), total));
            }}
            className="h-7 w-12 rounded-md border border-line bg-transparent text-center text-[13px] focus:outline-none"
            aria-label="Número da página"
          />
          <span className="opacity-60">/ {fmt(total)}</span>
          <button onClick={() => setPageNo(Math.min(total, pageNo + 1))} disabled={pageNo >= total} className="rounded-lg p-1.5 opacity-70 hover:opacity-100 disabled:opacity-30" aria-label="Próxima página"><ChevronRight size={16} /></button>
        </div>

        <button onClick={() => setScale(Math.max(0.5, (scale || 1) - 0.15))} aria-label="Diminuir zoom" className="rounded-lg p-2 opacity-70 hover:opacity-100"><ZoomOut size={16} /></button>
        <button onClick={() => setScale(Math.min(3, (scale || 1) + 0.15))} aria-label="Aumentar zoom" className="rounded-lg p-2 opacity-70 hover:opacity-100"><ZoomIn size={16} /></button>
        <button onClick={() => setScale(null)} className="hidden rounded-lg px-2 py-1.5 text-[11.5px] font-medium opacity-70 hover:opacity-100 md:block">Ajustar</button>
        <button onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())} aria-label="Tela cheia" className="hidden rounded-lg p-2 opacity-70 hover:opacity-100 md:block"><Maximize size={16} /></button>

        {!sessionActiveHere ? (
          <button onClick={() => start(book.id, pageNo)} title="Iniciar sessão de leitura" className="rounded-lg p-2 opacity-70 hover:opacity-100"><PlayCircle size={18} /></button>
        ) : (
          <button onClick={async () => { const s = await stop(pageNo); setSessionSummary(s); }} title="Encerrar sessão" className="rounded-lg p-2 text-gold"><StopCircle size={18} /></button>
        )}
        <button onClick={() => setNotesOpen(true)} aria-label="Notas deste livro" className="relative rounded-lg p-2 opacity-70 hover:opacity-100">
          <StickyNote size={17} />
          {notes.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-wine text-[9px] font-bold text-white">{notes.length}</span>}
        </button>
      </div>

      {/* Página */}
      <div ref={wrapRef} className="flex-1 overflow-auto" onMouseUp={handleSelection}>
        <div className="relative mx-auto my-6 w-fit shadow-deep">
          <canvas ref={canvasRef} className="block rounded-sm" />
          <div ref={textLayerRef} className="textLayer" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} />
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="h-1 w-full bg-black/10">
        <div className="h-full bg-gold transition-[width] duration-300" style={{ width: `${(pageNo / Math.max(1, total)) * 100}%` }} />
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
              <button onClick={() => { setNoteDraft({ excerpt: sel.text, text: '', tags: '' }); setSel(null); window.getSelection()?.removeAllRanges(); }} title="Adicionar nota" className="rounded-lg p-1.5 text-mute hover:bg-wine-light hover:text-ink"><PenLine size={16} /></button>
              <button onClick={() => { navigator.clipboard?.writeText(sel.text); toast('Trecho copiado.', 'info'); setSel(null); }} title="Copiar" className="rounded-lg p-1.5 text-mute hover:bg-wine-light hover:text-ink">
                <span className="text-[11px] font-semibold">ABC</span>
              </button>
              <button onClick={() => nav(`/app/conhecimento?q=${encodeURIComponent(sel.text)}`)} title="Perguntar à IA sobre este trecho" className="rounded-lg p-1.5 text-mute hover:bg-wine-light hover:text-ink"><Sparkles size={16} /></button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notas */}
      <Drawer open={notesOpen} onClose={() => setNotesOpen(false)} title={`Notas e destaques · ${book.title}`}>
        {notes.length === 0 && highlights.length === 0 ? (
          <p className="py-8 text-center text-sm text-mute">Selecione um trecho no PDF para destacar ou anotar.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => (
              <button key={n.id} onClick={() => { setPageNo((n.chapter || 0) + 1); setNotesOpen(false); }} className="block w-full rounded-xl border border-line p-3.5 text-left">
                {n.excerpt && <p className="mb-2 border-l-2 border-gold pl-3 font-reader text-[13px] italic text-mute">“{n.excerpt}” <span className="not-italic text-faint">(pág. {(n.chapter || 0) + 1})</span></p>}
                <p className="text-[14px] text-ink">{n.text}</p>
                <p className="mt-1.5 text-[11px] text-faint">{relTime(n.createdAt)}</p>
              </button>
            ))}
            {highlights.map((h) => (
              <button key={h.id} onClick={() => { setPageNo(h.chapter + 1); setNotesOpen(false); }} className={`block w-full rounded-xl p-3 text-left text-[13.5px] hl-${h.color}`}>
                {h.text.length > 160 ? h.text.slice(0, 160) + '…' : h.text} <span className="text-[11px] opacity-70">(pág. {h.chapter + 1})</span>
              </button>
            ))}
          </div>
        )}
      </Drawer>

      {/* Nova nota */}
      <Modal open={!!noteDraft} onClose={() => setNoteDraft(null)} title={`Nova nota · página ${pageNo}`}>
        {noteDraft && (
          <div className="space-y-4">
            <p className="rounded-xl bg-card2/60 p-3.5 font-reader text-[14px] italic text-mute">“{noteDraft.excerpt}”</p>
            <textarea autoFocus value={noteDraft.text} onChange={(e) => setNoteDraft({ ...noteDraft, text: e.target.value })}
              placeholder="O que este trecho desperta em você?" rows={4}
              className="w-full rounded-xl border border-line bg-card2/50 p-3.5 text-[14.5px] text-ink placeholder:text-faint focus:border-gold focus:outline-none" aria-label="Texto da nota" />
            <input value={noteDraft.tags} onChange={(e) => setNoteDraft({ ...noteDraft, tags: e.target.value })}
              placeholder="Tags separadas por vírgula"
              className="h-11 w-full rounded-xl border border-line bg-card2/50 px-3.5 text-[14px] text-ink placeholder:text-faint focus:border-gold focus:outline-none" aria-label="Tags" />
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
          return (
            <div className="space-y-3 text-center">
              <p className="font-display text-2xl text-ink">Você leu durante {mins} minuto{mins === 1 ? '' : 's'}.</p>
              <p className="text-[14.5px] text-mute">Avançou {pages} página{pages === 1 ? '' : 's'}.</p>
              <Button className="mt-3" onClick={() => setSessionSummary(null)}>Continuar</Button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
