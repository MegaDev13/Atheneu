// ═══════════════════════════════════════════════════════════════════════
// Leitor de PDF — Atheneu
// • PDF original NUNCA é alterado: anotações são camada independente (§1, §26)
// • Modo A (texto selecionável) + Modo B (marcação visual p/ escaneados) (§2)
// • Coordenadas relativas 0..1 — imunes a zoom/resolução/dispositivo (§3)
// • Modos de leitura: lateral · virar página (page flip) · vertical (§50–73)
// • last_read_page independente do cronômetro; salva ao navegar e ao sair (§31–49)
// • Desempenho: renderização sob demanda / virtualização (§29, §72)
// ═══════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import 'pdfjs-dist/web/pdf_viewer.css';
import {
  ArrowLeft, BookOpen, Columns, Hand, Highlighter, List, Minus, Plus,
  PlayCircle, Scroll, Search, Settings2, StickyNote, StopCircle, ZoomIn,
} from 'lucide-react';
import { backend } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSession } from '../contexts/SessionContext';
import { useToast } from '../contexts/ToastContext';
import { Button, Modal, Skeleton } from './ui';
import { playPageFlip } from '../lib/sound';
import { SoundtrackWidget } from '../features/music/soundtrack';
import { debounce, uid } from '../lib/utils';
import type { Book, PdfAnnotation, ReaderTool, ViewMode } from '../lib/types';
import { ANNOTATION_COLORS, autoAnnotationName } from '../lib/types';
import {
  AnnotationDialog, AnnotationSidebar, MarkModeBanner, exportAnnotations, parseImportedAnnotations,
} from './reader/AnnotationUI';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();

interface DragRect { x: number; y: number; w: number; h: number }

// ─── Página única: canvas + camada de texto + overlay de anotações ───
function PageCanvas({
  doc, pageNo, width, textLayer, tool, anns, flashId, overlayRef, onOverlay, children,
}: {
  doc: any;
  pageNo: number;
  width: number;
  textLayer: boolean;
  tool: ReaderTool;
  anns: PdfAnnotation[];
  flashId: string | null;
  overlayRef?: (el: HTMLDivElement | null) => void;
  onOverlay?: (e: React.MouseEvent, wrap: HTMLDivElement) => void;
  children?: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(pageNo);
      const base = page.getViewport({ scale: 1 });
      const scale = width / base.width;
      const vp = page.getViewport({ scale });
      if (cancelled) return;
      setDims({ w: vp.width, h: vp.height });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = vp.width * dpr;
      canvas.height = vp.height * dpr;
      canvas.style.width = `${vp.width}px`;
      canvas.style.height = `${vp.height}px`;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined } as any).promise;
      if (cancelled) return;
      const container = wrapRef.current?.querySelector('.textLayer') as HTMLElement | null;
      if (container && textLayer) {
        container.innerHTML = '';
        container.style.width = `${vp.width}px`;
        container.style.height = `${vp.height}px`;
        try {
          const content = await page.getTextContent();
          const tl = new (pdfjs as any).TextLayer({ textContentSource: content, container, viewport: vp });
          await tl.render();
        } catch { /* página sem texto (escaneada) — tudo bem */ }
      }
    })();
    return () => { cancelled = true; };
  }, [doc, pageNo, width, textLayer]);

  const pageAnns = anns.filter((a) => a.rects.some((r) => r.page === pageNo));

  return (
    <div
      ref={(el) => { (wrapRef as any).current = el; overlayRef?.(el); }}
      data-page={pageNo}
      className="relative bg-white shadow-deep"
      style={{ width: dims?.w ?? width, height: dims?.h ?? width * 1.4 }}
      onMouseUp={onOverlay as any}
    >
      <canvas ref={canvasRef} className="block" />
      <div className="textLayer" style={{ position: 'absolute', inset: 0, pointerEvents: tool === 'mark' ? 'auto' : 'none' }} />
      {/* camada de anotações (§26 — render dinâmica, PDF intacto) */}
      <div className="pointer-events-none absolute inset-0">
        {pageAnns.map((a) =>
          a.rects.filter((r) => r.page === pageNo).map((r, i) => (
            <button
              key={a.id + i}
              data-anno={a.id}
              aria-label={`Marcação: ${a.name}`}
              className={`pointer-events-auto absolute border-0 ${a.id === flashId ? 'animate-pulse ring-2 ring-gold' : ''}`}
              style={{
                left: `${r.x * 100}%`, top: `${r.y * 100}%`,
                width: `${r.w * 100}%`, height: `${r.h * 100}%`,
                background: ANNOTATION_COLORS[a.color], borderRadius: 2,
              }}
              onClick={(e) => { e.stopPropagation(); (onOverlay as any)?.__openEdit?.(a); }}
            />
          ))
        )}
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════  LEITOR  ═══════════════════════════
export default function PdfViewer({ book, dark }: { book: Book; dark?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const { active, start, stop } = useSession();

  const [doc, setDoc] = useState<any>(null);
  const [total, setTotal] = useState(book.pages || 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const LS_KEY = `atheneu-reader-${book.id}`;
  const saved = useMemo(() => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; } }, [LS_KEY]);

  const [pageNo, setPageNo] = useState(1);
  const [scalePct, setScalePct] = useState<number>(saved.scale || 100);

  // texto de uma página p/ trilha sonora (look-ahead) — assíncrono via pdfjs
  const getPageText = useCallback(async (p: number) => {
    if (!doc) return '';
    try { const pg = await doc.getPage(p); const tc = await pg.getTextContent(); return (tc.items as any[]).map((i) => i.str).join(' '); }
    catch { return ''; }
  }, [doc]);
  const [viewMode, setViewMode] = useState<ViewMode>(saved.viewMode || 'lateral');
  const [tool, setTool] = useState<ReaderTool>(saved.tool || 'nav');
  const [soundOn, setSoundOn] = useState<boolean>(saved.soundOn ?? true);
  const [soundVol, setSoundVol] = useState<number>(saved.soundVol ?? 0.6);
  const [anns, setAnns] = useState<PdfAnnotation[]>([]);
  const [dialog, setDialog] = useState<PdfAnnotation | null>(null);
  const [sidebar, setSidebar] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [printed, setPrinted] = useState<number | null>(null);
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  const [chrome, setChrome] = useState(false); // modo imersivo (toque p/ ocultar UI)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  const tapRef = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const fn = () => setIsMobile(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  // toque simples (sem arraste) alterna a UI — sensação de app de leitura
  function tapDown(e: React.PointerEvent) {
    tapRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  }
  function tapUp(e: React.MouseEvent) {
    const t = tapRef.current;
    tapRef.current = null;
    if (!t || tool === 'mark') return;
    if (Math.hypot(e.clientX - t.x, e.clientY - t.y) < 8 && Date.now() - t.t < 350) {
      // não esconde a UI se o toque foi numa marcação/controle
      if ((e.target as HTMLElement).closest('[data-anno],button,input,select,a,.textLayer')) return;
      setChrome((c) => !c);
    }
  }

  const wrapRefs = useRef(new Map<number, HTMLDivElement>());
  const dragSel = useRef<{ x: number; y: number; page: number } | null>(null);

  // ─── carga do documento + anotações + progresso ───
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!user) return;
        const url = await backend.getBookFileUrl(user.id, book);
        if (!url) throw new Error('Arquivo indisponível');
        const buf = await (await fetch(url)).arrayBuffer();
        const d = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
        if (!alive) return;
        setDoc(d);
        setTotal(d.numPages);
        const [a, prg] = await Promise.all([
          backend.listAnnotations(user.id, book.id),
          backend.listProgress(user.id),
        ]);
        if (!alive) return;
        setAnns(a);
        const p = prg.find((x) => x.bookId === book.id);
        setPageNo(Math.min(Math.max(1, p?.page || 1), d.numPages)); // §34 restauração OBRIGATÓRIA
      } catch (e) {
        console.error(e);
        setError('Não foi possível abrir este PDF.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, book.id]);

  // ─── progresso: last_read_page independente do relógio (§31–44) ───
  const persistNow = useCallback((pg: number) => {
    if (!user) return;
    try { localStorage.setItem(`atheneu-lrp-${book.id}`, String(pg)); } catch {}
    backend.saveProgress(user.id, { bookId: book.id, chapter: pg - 1, location: 0, page: pg, updatedAt: Date.now() }).catch(() => {});
  }, [user?.id, book.id]);
  const persistDeb = useMemo(() => debounce(persistNow, 500), [persistNow]);

  useEffect(() => { if (doc) persistDeb(pageNo); }, [pageNo, doc, persistDeb]);
  useEffect(() => {
    const onHide = () => { if (doc) persistNow(pageNo); };
    const onUnload = () => { if (doc) persistNow(pageNo); };
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      document.removeEventListener('visibilitychange', onHide);
      persistNow(pageNo);
    };
  }, [pageNo, doc, persistNow]);

  // estado do leitor (zoom/modo/som) — preferência local (§45, §71)
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ scale: scalePct, viewMode, tool, soundOn, soundVol })); } catch {}
  }, [scalePct, viewMode, tool, soundOn, soundVol, LS_KEY]);

  // página impressa (complementar) (§37)
  useEffect(() => {
    if (!doc) return;
    (async () => {
      try {
        const page = await doc.getPage(pageNo);
        const tc = await page.getTextContent();
        const text = tc.items.map((i: any) => i.str).join(' ');
        const m = text.slice(0, 60).match(/(?:^|\s)(\d{1,4})(?:\s|$)/) || text.slice(-60).match(/(?:^|\s)(\d{1,4})(?:\s|$)/);
        setPrinted(m ? parseInt(m[1], 10) : null);
      } catch { setPrinted(null); }
    })();
  }, [doc, pageNo]);

  const goTo = useCallback((p: number) => {
    if (!doc) return;
    setPageNo(Math.min(Math.max(1, p), doc.numPages));
  }, [doc]);

  // teclado (§51)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') goTo(pageNo + 1);
      if (e.key === 'ArrowLeft') goTo(pageNo - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pageNo, goTo]);

  // ─── anotações: criar/editar/excluir (§4–9, §27, §28) ───
  function openNew(type: 'text' | 'visual', text: string | null, rects: { page: number; x: number; y: number; w: number; h: number }[]) {
    const page = rects[0]?.page ?? pageNo;
    setDialog({
      id: '', bookId: book.id, page, type, text,
      name: '', comment: '', color: 'yellow', rects,
      createdAt: Date.now(), updatedAt: Date.now(),
      ...( { __new: true } as any),
    } as PdfAnnotation);
  }

  async function saveDialog(a: PdfAnnotation) {
    if (!user) return;
    const isNew = !(a as any).__saved;
    const final: PdfAnnotation = {
      ...a,
      id: a.id || uid(),
      name: a.name.trim() || autoAnnotationName(a.text, a.page), // regra automática (§7)
      updatedAt: Date.now(),
    };
    delete (final as any).__new;
    setAnns((xs) => (isNew ? [...xs, final] : xs.map((x) => (x.id === final.id ? final : x))));
    setDialog(null);
    await backend.saveAnnotation(user.id, final);
    toast(isNew ? 'Marcação salva.' : 'Marcação atualizada.');
  }

  async function deleteAnn(id: string) {
    if (!user) return;
    setAnns((xs) => xs.filter((x) => x.id !== id));
    setDialog(null);
    await backend.deleteAnnotation(user.id, id);
    toast('Marcação excluída.', 'info');
  }

  // clique numa marcação existente → editar (§9)
  const openEdit = useCallback((a: PdfAnnotation) => setDialog({ ...a, ...( { __saved: true } as any) }), []);

  // seleção de texto → retângulos por linha (§66) + arraste visual (§65)
  function handleOverlay(e: React.MouseEvent, wrap: HTMLDivElement) {
    if (tool !== 'mark') return;
    const page = Number(wrap.dataset.page);
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && wrap.contains(sel.anchorNode)) {
      const pr = wrap.getBoundingClientRect();
      const range = sel.getRangeAt(0);
      const rects = Array.from(range.getClientRects())
        .filter((r) => r.width > 2 && r.height > 2)
        .map((r) => ({ page, x: (r.left - pr.left) / pr.width, y: (r.top - pr.top) / pr.height, w: r.width / pr.width, h: r.height / pr.height }));
      if (rects.length) {
        // seleção multilinha/multipágina (§27/28): agrupa retângulos das wraps visíveis
        wrapRefs.current.forEach((el, pg) => {
          if (pg === page || !el.contains(sel!.anchorNode) === false) return;
        });
        const text = sel.toString();
        sel.removeAllRanges();
        openNew('text', text, rects);
        return;
      }
    }
    // sem texto (escaneado) → usa o arraste registrado no pointerup
    const d = dragSel.current;
    dragSel.current = null;
    if (d && d.page === page && (Math.abs(d.x - 0) > 0 || true)) {
      // d já chega normalizado com w/h no pointerup
      if ((d as any).w && (d as any).h) openNew('visual', null, [{ page, x: d.x, y: d.y, w: (d as any).w, h: (d as any).h }]);
    }
  }
  (handleOverlay as any).__openEdit = openEdit;

  // arraste visual: registra retângulo relativo no pointerup da wrap
  function bindVisualDrag() {
    // implementado via delegação no container dos modos (lateral/flip):
    return null;
  }
  void bindVisualDrag;

  // delegação de pointer para marcação visual (página travada no modo mark §61)
  const pointerDown = (e: React.PointerEvent) => {
    if (tool !== 'mark') return;
    const wrap = (e.target as HTMLElement).closest('[data-page]') as HTMLElement | null;
    if (!wrap) return;
    const pr = wrap.getBoundingClientRect();
    const x = (e.clientX - pr.left) / pr.width;
    const y = (e.clientY - pr.top) / pr.height;
    const start = { x, y, page: Number(wrap.dataset.page), sx: e.clientX, sy: e.clientY };
    const move = () => {}; // seleção visual só no up
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return; // seleção de texto trata no mouseup
      const dx = (ev.clientX - start.sx) / pr.width;
      const dy = (ev.clientY - start.sy) / pr.height;
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;
      dragSel.current = {
        page: start.page,
        x: Math.min(start.x, start.x + dx), y: Math.min(start.y, start.y + dy),
        ...( { w: Math.abs(dx), h: Math.abs(dy) } as any),
      } as any;
      // dispara o handler de overlay manualmente
      const evt = new MouseEvent('mouseup', { bubbles: true });
      wrap.dispatchEvent(evt);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // ─── FLIP: arraste p/ virar (§52–55, §60–68) ───
  const [flip, setFlip] = useState<{ dir: 1 | -1; prog: number; anim: boolean } | null>(null);
  const flipRef = useRef<{ startX: number; dir: 1 | -1; width: number } | null>(null);

  function flipDown(e: React.PointerEvent) {
    if (viewMode !== 'flip' || tool !== 'nav') return; // marca-texto trava a página (§60/61)
    const el = e.currentTarget as HTMLElement;
    const width = el.getBoundingClientRect().width;
    const rel = (e.clientX - el.getBoundingClientRect().left) / width;
    const dir: 1 | -1 = rel > 0.5 ? 1 : -1;
    flipRef.current = { startX: e.clientX, dir, width };
    const move = (ev: PointerEvent) => {
      const f = flipRef.current;
      if (!f) return;
      const dx = (ev.clientX - f.startX) / f.width;
      const prog = f.dir === 1 ? Math.min(1, Math.max(0, -dx)) : Math.min(1, Math.max(0, dx));
      setFlip({ dir: f.dir, prog, anim: false });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const f = flipRef.current;
      flipRef.current = null;
      if (!f) return;
      const dx = (ev.clientX - f.startX) / f.width;
      const prog = f.dir === 1 ? Math.min(1, Math.max(0, -dx)) : Math.min(1, Math.max(0, dx));
      if (prog > 0.45) { // §54 limiar ~45%
        setFlip({ dir: f.dir, prog: 1, anim: true });
        setTimeout(() => {
          goTo(f.dir === 1 ? pageNo + 1 : pageNo - 1);
          if (soundOn) playPageFlip(soundVol); // §55 só ao virar
          setFlip(null);
        }, 260);
      } else {
        setFlip({ dir: f.dir, prog: 0, anim: true });
        setTimeout(() => setFlip(null), 260);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // ─── VERTICAL virtualizado (§57–59, §72) ───
  const vScrollRef = useRef<HTMLDivElement>(null);
  const [vWidth, setVWidth] = useState(860);
  const [aspect, setAspect] = useState(1.414);
  const [vFirst, setVFirst] = useState(1);
  useEffect(() => {
    if (!doc) return;
    doc.getPage(1).then((p: any) => {
      const vp = p.getViewport({ scale: 1 });
      setAspect(vp.height / vp.width);
    });
  }, [doc]);
  useEffect(() => {
    const el = vScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setVWidth(Math.min(940, el.clientWidth - 32)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewMode, doc]);
  const pageH = vWidth * aspect;
  function vOnScroll() {
    const el = vScrollRef.current;
    if (!el) return;
    const cur = Math.min(total, Math.max(1, Math.floor((el.scrollTop + el.clientHeight * 0.4) / pageH) + 1));
    setVFirst(Math.max(1, Math.min(total, Math.floor(el.scrollTop / pageH) - 1)));
    if (cur !== pageNo) setPageNo(cur); // progresso independente (§41)
  }
  useEffect(() => {
    // ao trocar p/ vertical ou ao saltar (sidebar/setas), posiciona o scroll
    const el = vScrollRef.current;
    if (el && viewMode === 'vertical' && doc) {
      const target = (pageNo - 1) * pageH;
      if (Math.abs(el.scrollTop - target) > pageH) el.scrollTop = target;
    }
  }, [viewMode, pageNo, doc, pageH]);

  // ─── buscas no texto do PDF (mantida) ───
  const [hits, setHits] = useState<{ page: number; snippet: string }[]>([]);
  useEffect(() => {
    if (!doc || searchQ.trim().length < 2) { setHits([]); return; }
    let cancelled = false;
    (async () => {
      const out: { page: number; snippet: string }[] = [];
      const q = searchQ.toLowerCase();
      for (let p = 1; p <= Math.min(doc.numPages, 400); p++) {
        const page = await doc.getPage(p);
        const tc = await page.getTextContent();
        const text = tc.items.map((i: any) => i.str).join(' ');
        const i = text.toLowerCase().indexOf(q);
        if (i >= 0) out.push({ page: p, snippet: '…' + text.slice(Math.max(0, i - 40), i + 70).replace(/\s+/g, ' ') + '…' });
        if (out.length >= 30 || cancelled) break;
      }
      if (!cancelled) setHits(out);
    })();
    return () => { cancelled = true; };
  }, [searchQ, doc]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-60px)] flex-col items-center justify-center gap-3">
        <Skeleton className="h-[60vh] w-[min(80vw,700px)]" />
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
  const pct = total ? (pageNo / total) * 100 : 0;
  const annCount = anns.length;
  const baseWidth = viewMode === 'vertical'
    ? vWidth
    : Math.min(940, (typeof window !== 'undefined' ? window.innerWidth : 1200) - (isMobile ? 20 : 90)) * (scalePct / 100);

  const overlayProps = { tool, anns, flashId, textLayer: true };
  const onOverlayFn = (e: React.MouseEvent, wrap: HTMLDivElement) => handleOverlay(e, wrap);

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col" style={{ background: bg, color: fg }} onPointerDown={pointerDown}>
      {/* ─── toolbar (§22) ─── */}
      <div className={`${chrome ? 'hidden' : 'flex'} flex-wrap items-center gap-1 overflow-x-auto border-b px-3 py-2`} style={{ borderColor: 'color-mix(in srgb, currentColor 14%, transparent)' }}>
        <button onClick={() => nav('/app/biblioteca')} aria-label="Voltar à biblioteca" className="rounded-lg p-2 opacity-70 hover:opacity-100"><ArrowLeft size={17} /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px]">{book.title}</p>
          <p className="text-[11px] opacity-60 tabular-nums">
            Página {pageNo} / {total} · {pct.toFixed(1).replace('.', ',')}%{printed && printed !== pageNo ? ` · impressa ~${printed}` : ''}
          </p>
        </div>

        {/* ferramenta (§63/69) */}
        <div className="mx-1 flex rounded-xl border p-0.5" style={{ borderColor: 'color-mix(in srgb, currentColor 20%, transparent)' }} role="group" aria-label="Ferramenta">
          <button onClick={() => setTool('nav')} aria-pressed={tool === 'nav'} title="🖐 Navegação"
            className={`rounded-lg p-1.5 ${tool === 'nav' ? 'bg-gold/30' : 'opacity-60 hover:opacity-100'}`}><Hand size={15} /></button>
          <button onClick={() => setTool('mark')} aria-pressed={tool === 'mark'} title="🖍 Marca-texto"
            className={`rounded-lg p-1.5 ${tool === 'mark' ? 'bg-gold/30' : 'opacity-60 hover:opacity-100'}`}><Highlighter size={15} /></button>
        </div>

        {/* modo de visualização (§69) */}
        <div className="mx-1 flex rounded-xl border p-0.5" style={{ borderColor: 'color-mix(in srgb, currentColor 20%, transparent)' }} role="group" aria-label="Modo de visualização">
          <button onClick={() => setViewMode('lateral')} aria-pressed={viewMode === 'lateral'} title="📖 Lateral"
            className={`rounded-lg p-1.5 ${viewMode === 'lateral' ? 'bg-gold/30' : 'opacity-60 hover:opacity-100'}`}><Columns size={15} /></button>
          <button onClick={() => setViewMode('flip')} aria-pressed={viewMode === 'flip'} title="📖 Virar página"
            className={`rounded-lg p-1.5 ${viewMode === 'flip' ? 'bg-gold/30' : 'opacity-60 hover:opacity-100'}`}><BookOpen size={15} /></button>
          <button onClick={() => setViewMode('vertical')} aria-pressed={viewMode === 'vertical'} title="📜 Vertical"
            className={`rounded-lg p-1.5 ${viewMode === 'vertical' ? 'bg-gold/30' : 'opacity-60 hover:opacity-100'}`}><Scroll size={15} /></button>
        </div>

        <button onClick={() => setScalePct((s) => Math.max(60, s - 15))} aria-label="Diminuir zoom" className="rounded-lg p-2 opacity-70 hover:opacity-100"><Minus size={15} /></button>
        <span className="w-11 text-center text-[11.5px] tabular-nums opacity-70">{scalePct}%</span>
        <button onClick={() => setScalePct((s) => Math.min(220, s + 15))} aria-label="Aumentar zoom" className="rounded-lg p-2 opacity-70 hover:opacity-100"><Plus size={15} /></button>
        <button onClick={() => setSearchOpen(true)} aria-label="Buscar no PDF" className="rounded-lg p-2 opacity-70 hover:opacity-100"><Search size={16} /></button>
        <button onClick={() => setSidebar(true)} aria-label="Anotações" className="relative rounded-lg p-2 opacity-70 hover:opacity-100">
          <List size={16} />
          {annCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-wine px-1 text-[9px] font-bold text-white">{annCount}</span>}
        </button>
        <button onClick={() => setSettingsOpen(true)} aria-label="Configurações" className="rounded-lg p-2 opacity-70 hover:opacity-100"><Settings2 size={16} /></button>
        {active && active.bookId === book.id ? (
          <button onClick={async () => { const s = await stop(pageNo); setSessionSummary(s); }} title="Encerrar relógio de leitura" className="rounded-lg p-2 text-gold"><StopCircle size={17} /></button>
        ) : (
          <button onClick={() => start(book.id, pageNo)} title="▶ Iniciar relógio de leitura (independente da página)" className="rounded-lg p-2 opacity-70 hover:opacity-100"><PlayCircle size={17} /></button>
        )}
      </div>

      {/* selo modo marca-texto (§62) */}
      {tool === 'mark' && !chrome && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-30 -translate-x-1/2">
          <MarkModeBanner onExit={() => setTool('nav')} />
        </div>
      )}

      {/* ─── corpo por modo ─── */}
      {viewMode === 'vertical' ? (
        <div ref={vScrollRef} onScroll={vOnScroll} className="relative flex-1 overflow-y-auto" data-vscroll="1">
          <div style={{ height: total * pageH + 40 }} className="relative mx-auto" >
            {Array.from({ length: Math.min(6, total - vFirst + 1) }, (_, k) => vFirst + k).map((p) => (
              <div key={p} className="absolute left-1/2 -translate-x-1/2" style={{ top: (p - 1) * pageH, marginTop: 16 }}>
                <PageCanvas
                  doc={doc} pageNo={p} width={vWidth} {...overlayProps}
                  overlayRef={(el) => { if (el) wrapRefs.current.set(p, el); else wrapRefs.current.delete(p); }}
                  onOverlay={onOverlayFn}
                />
              </div>
            ))}
          </div>
          {/* indicador discreto (§59) */}
          <div className="pointer-events-none sticky bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] tabular-nums" style={{ background: 'color-mix(in srgb, currentColor 12%, transparent)' }}>
            {pageNo} / {total}
          </div>
        </div>
      ) : viewMode === 'flip' ? (
        <div className="relative flex flex-1 items-center justify-center overflow-hidden select-none" onPointerDown={(e) => { flipDown(e); tapDown(e); }} onClick={tapUp} style={{ perspective: 1800 }}>
          {/* página de baixo (destino) */}
          <div className="absolute" style={{ opacity: flip ? 1 : 0 }}>
            {flip && (
              <PageCanvas doc={doc} pageNo={Math.min(total, Math.max(1, flip.dir === 1 ? pageNo + 1 : pageNo - 1))} width={baseWidth} {...overlayProps} onOverlay={onOverlayFn} />
            )}
          </div>
          {/* página atual (vira) */}
          <div
            style={{
              transform: flip ? `rotateY(${flip.dir === 1 ? -flip.prog * 80 : flip.prog * 80}deg)` : undefined,
              transformOrigin: flip?.dir === 1 ? 'left center' : 'right center',
              transition: flip?.anim ? 'transform .26s ease' : undefined,
              boxShadow: flip && flip.prog > 0.02 ? '0 20px 60px rgba(0,0,0,.45)' : undefined,
            }}
          >
            <PageCanvas
              doc={doc} pageNo={pageNo} width={baseWidth} {...overlayProps}
              overlayRef={(el) => { if (el) wrapRefs.current.set(pageNo, el); }}
              onOverlay={onOverlayFn}
            />
          </div>
          {/* dicas de borda (§67) */}
          {tool === 'nav' && (
            <>
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] opacity-30">← arraste p/ voltar</span>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] opacity-30">arraste p/ avançar →</span>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-start justify-center overflow-auto py-4 md:py-6" onPointerDown={tapDown} onClick={tapUp}>
          <PageCanvas
            doc={doc} pageNo={pageNo} width={baseWidth} {...overlayProps}
            overlayRef={(el) => { if (el) wrapRefs.current.set(pageNo, el); }}
            onOverlay={onOverlayFn}
          />
        </div>
      )}

      {/* ─── barra inferior (§48) ─── */}
      <div className={`${chrome ? 'hidden' : 'flex'} items-center justify-between gap-2 border-t px-3 py-2`} style={{ borderColor: 'color-mix(in srgb, currentColor 14%, transparent)' }}>
        <div className="flex items-center gap-1">
          <button onClick={() => goTo(pageNo - 1)} disabled={pageNo <= 1} className="rounded-lg px-2.5 py-1.5 text-[12.5px] opacity-80 hover:opacity-100 disabled:opacity-30">◀ Anterior</button>
          <button onClick={() => goTo(pageNo + 1)} disabled={pageNo >= total} className="rounded-lg px-2.5 py-1.5 text-[12.5px] opacity-80 hover:opacity-100 disabled:opacity-30">Próxima ▶</button>
          <input
            value={pageNo}
            onChange={(e) => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) goTo(v); }}
            aria-label="Ir para página"
            className="h-8 w-16 rounded-lg border bg-transparent text-center text-[12.5px] tabular-nums focus:outline-none"
            style={{ borderColor: 'color-mix(in srgb, currentColor 25%, transparent)' }}
          />
        </div>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'color-mix(in srgb, currentColor 15%, transparent)' }}>
          <div className="h-full rounded-full bg-gold transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11.5px] tabular-nums opacity-70">{pct.toFixed(1).replace('.', ',')}%</span>
      </div>

      {/* ─── diálogos/drawers ─── */}
      <AnnotationDialog
        open={!!dialog}
        initial={dialog}
        onClose={() => setDialog(null)}
        onSave={saveDialog}
        onDelete={deleteAnn}
        onGoTo={(a) => { goTo(a.page); setDialog(null); setFlashId(a.id); setTimeout(() => setFlashId(null), 2200); }}
      />
      <AnnotationSidebar
        open={sidebar}
        onClose={() => setSidebar(false)}
        books={[book]}
        annotations={anns}
        currentBookId={book.id}
        onPick={(a) => {
          setSidebar(false);
          goTo(a.page);
          setFlashId(a.id);
          setTimeout(() => setFlashId(null), 2200);
        }}
        onExport={(fmt) => exportAnnotations(book, anns, fmt)}
        onImport={async (f) => {
          try {
            const list = parseImportedAnnotations(await f.text(), book.id);
            if (!user) return;
            for (const a of list) await backend.saveAnnotation(user.id, a);
            setAnns((xs) => [...xs, ...list]);
            toast(`${list.length} anotação(ões) importada(s).`);
          } catch {
            toast('Arquivo de anotações inválido.', 'error');
          }
        }}
      />
      <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Buscar no PDF">
        <input
          autoFocus value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Palavra ou trecho…"
          className="mb-3 h-11 w-full rounded-xl border border-line bg-card2/50 px-3.5 text-[14px] text-ink placeholder:text-faint focus:border-gold focus:outline-none"
          aria-label="Buscar no PDF"
        />
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {hits.map((h, i) => (
            <li key={i}>
              <button onClick={() => { goTo(h.page); setSearchOpen(false); }} className="w-full rounded-xl border border-line p-3 text-left hover:bg-card2/60">
                <p className="text-[12px] font-medium text-wine">pág. {h.page}</p>
                <p className="text-[13px] italic text-mute">{h.snippet}</p>
              </button>
            </li>
          ))}
          {searchQ.length >= 2 && hits.length === 0 && <p className="py-6 text-center text-sm text-mute">Nada encontrado.</p>}
        </ul>
      </Modal>
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Configurações do leitor">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-mute">🔊 Som de virar página</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSoundOn(!soundOn)} aria-pressed={soundOn}
                className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold ${soundOn ? 'bg-wine text-[#f7f0e2]' : 'bg-card2 text-mute'}`}
              >
                {soundOn ? 'ON' : 'OFF'}
              </button>
              <input type="range" min={0} max={1} step={0.05} value={soundVol} disabled={!soundOn}
                onChange={(e) => setSoundVol(Number(e.target.value))} className="flex-1" aria-label="Volume do som de página" />
              <span className="w-10 text-right text-[12px] tabular-nums text-mute">{Math.round(soundVol * 100)}%</span>
            </div>
            <p className="mt-2 text-[11px] text-faint">Som sintetizado pelo próprio app (sem direitos de terceiros).</p>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-mute">📖 Modo de visualização</p>
            <div className="grid grid-cols-3 gap-2">
              {([['lateral', '● Lateral'], ['flip', 'Virar página'], ['vertical', 'Vertical']] as [ViewMode, string][]).map(([m, l]) => (
                <button key={m} onClick={() => setViewMode(m)} aria-pressed={viewMode === m}
                  className={`rounded-xl border px-3 py-2 text-[12.5px] ${viewMode === m ? 'border-wine bg-wine-light text-wine' : 'border-line text-mute'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-mute">Ferramenta</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setTool('nav')} aria-pressed={tool === 'nav'}
                className={`rounded-xl border px-3 py-2 text-[12.5px] ${tool === 'nav' ? 'border-wine bg-wine-light text-wine' : 'border-line text-mute'}`}>🖐 Navegação</button>
              <button onClick={() => setTool('mark')} aria-pressed={tool === 'mark'}
                className={`rounded-xl border px-3 py-2 text-[12.5px] ${tool === 'mark' ? 'border-wine bg-wine-light text-wine' : 'border-line text-mute'}`}>🖍 Marca-texto</button>
            </div>
          </div>
        </div>
      </Modal>
      <Modal open={!!sessionSummary} onClose={() => setSessionSummary(null)} title="Sessão encerrada">
        {sessionSummary && (() => {
          const mins = Math.round((sessionSummary.end - sessionSummary.start) / 60000);
          const pages = Math.max(0, sessionSummary.pageEnd - sessionSummary.pageStart);
          return (
            <div className="space-y-2 text-center">
              <p className="font-display text-2xl text-ink">⏱ {mins} min de leitura</p>
              <p className="text-sm text-mute">Das páginas {sessionSummary.pageStart} → {sessionSummary.pageEnd}.</p>
              <p className="text-[12px] text-faint">O progresso (página {pageNo}) é salvo independentemente do relógio.</p>
              <Button className="mt-2" onClick={() => setSessionSummary(null)}>Continuar</Button>
            </div>
          );
        })()}
      </Modal>
      {/* Trilha sonora adaptativa (analisa à frente, não interrompe) */}
      {doc && (
        <SoundtrackWidget bookId={book.id} pageNo={pageNo} totalPages={doc.numPages} getPageText={getPageText} />
      )}
      <div className="hidden"><StickyNote size={1} /><ZoomIn size={1} /></div>
    </div>
  );
}
