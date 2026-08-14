// UI da camada de anotações: diálogo criar/editar + barra lateral por livro
// + busca/ordenação/contadores + exportação (TXT/JSON/PDF) e importação.
import { useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  ChevronDown, ChevronRight, Download, MessageSquare, Pencil, Search,
  Target, Trash2, Upload, X,
} from 'lucide-react';
import type { Book, PdfAnnotation } from '../../lib/types';
import { ANNOTATION_COLORS, AnnotationColor } from '../../lib/types';
import { Button, Drawer, Input, Modal, Select } from '../ui';
import { fmtDate } from '../../lib/utils';

export const COLOR_KEYS = Object.keys(ANNOTATION_COLORS) as AnnotationColor[];

// ─── Diálogo criar/editar anotação (§7, §8, §9) ───
export function AnnotationDialog({
  open, initial, onClose, onSave, onDelete, onGoTo,
}: {
  open: boolean;
  initial: PdfAnnotation | null; // null = fechada; "nova" vem com defaults
  onClose: () => void;
  onSave: (a: PdfAnnotation) => void;
  onDelete?: (id: string) => void;
  onGoTo?: (a: PdfAnnotation) => void;
}) {
  const [draft, setDraft] = useState<PdfAnnotation | null>(initial);
  // sincroniza quando `initial` muda enquanto aberto
  const [seen, setSeen] = useState<PdfAnnotation | null>(null);
  if (initial !== seen) { setSeen(initial); setDraft(initial ? { ...initial } : null); }

  if (!open || !draft) return null;
  return (
    <Modal open={open} onClose={onClose} title={draft.id && initial && !initialIsNew(initial) ? 'Editar marcação' : 'Nova marcação'}>
      <div className="space-y-4">
        {draft.text && (
          <p className="rounded-xl bg-card2/60 p-3 font-reader text-[13.5px] italic text-mute">“{draft.text.length > 220 ? draft.text.slice(0, 220) + '…' : draft.text}”</p>
        )}
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-mute">Nome da marcação (opcional)</span>
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Definição de justiça" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-mute">Comentário</span>
          <textarea
            value={draft.comment}
            onChange={(e) => setDraft({ ...draft, comment: e.target.value })}
            rows={3}
            placeholder="Ex.: Comparar com República IV"
            className="w-full rounded-xl border border-line bg-card2/50 p-3 text-[14px] text-ink placeholder:text-faint focus:border-gold focus:outline-none"
          />
        </label>
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-mute">Cor</span>
          <div className="flex gap-2">
            {COLOR_KEYS.map((c) => (
              <button
                key={c}
                aria-label={`Cor ${c}`}
                aria-pressed={draft.color === c}
                onClick={() => setDraft({ ...draft, color: c })}
                className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${draft.color === c ? 'border-ink' : 'border-transparent'}`}
                style={{ background: ANNOTATION_COLORS[c] }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2 pt-1">
          <div className="flex gap-1.5">
            {onDelete && initial && !initialIsNew(initial) && (
              <Button variant="danger" size="sm" onClick={() => onDelete(draft.id)}><Trash2 size={14} /> Excluir</Button>
            )}
            {onGoTo && initial && !initialIsNew(initial) && (
              <Button variant="outline" size="sm" onClick={() => onGoTo(draft)}><Target size={14} /> Ir para</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" onClick={() => onSave(draft)}>Salvar</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function initialIsNew(a: PdfAnnotation) {
  return (a as any).__new === true;
}

// ─── Exportação / importação (§19, §20) ───
function annHeader(book: Book) {
  return `Livro: ${book.title}\nAutor: ${book.author}\nExportado em: ${new Date().toLocaleString('pt-BR')}\n${'─'.repeat(46)}\n\n`;
}

export function exportAnnotations(book: Book, anns: PdfAnnotation[], format: 'txt' | 'json' | 'pdf') {
  const sorted = [...anns].sort((a, b) => a.page - b.page);
  const fname = `atheneu-anotacoes-${book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`;
  const download = (blob: Blob, ext: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${fname}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  if (format === 'json') {
    download(new Blob([JSON.stringify({ book: { title: book.title, author: book.author }, annotations: sorted }, null, 2)], { type: 'application/json' }), 'json');
    return;
  }
  if (format === 'txt') {
    let out = annHeader(book);
    sorted.forEach((a, i) => {
      out += `MARCAÇÃO ${i + 1}\nNome: ${a.name}\nPágina: ${a.page}\nTexto: ${a.text || '(marcação visual)'}\nComentário: ${a.comment || '—'}\n\n`;
    });
    download(new Blob([out], { type: 'text/plain;charset=utf-8' }), 'txt');
    return;
  }
  // PDF
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 56;
  let y = 64;
  const line = (txt: string, size = 10, style: 'normal' | 'bold' | 'italic' = 'normal', color: [number, number, number] = [35, 30, 22]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.setTextColor(...color);
    const parts = doc.splitTextToSize(txt, W - M * 2) as string[];
    for (const p of parts) {
      if (y > 780) { doc.addPage(); y = 64; }
      doc.text(p, M, y);
      y += size * 1.45;
    }
  };
  line(`Livro: ${book.title}`, 16, 'bold');
  line(`Autor: ${book.author}`, 11, 'italic', [110, 95, 70]);
  line(`Exportado em ${new Date().toLocaleString('pt-BR')} · ${sorted.length} marcação(ões)`, 9, 'normal', [140, 125, 100]);
  y += 10;
  sorted.forEach((a, i) => {
    line(`${i + 1}. ${a.name || '(sem nome)'}  —  pág. ${a.page}`, 11, 'bold');
    if (a.text) line(`Texto: ${a.text}`, 9.5, 'italic', [90, 80, 60]);
    if (a.comment) line(`Comentário: ${a.comment}`, 9.5, 'normal', [60, 60, 60]);
    y += 8;
  });
  doc.save(`${fname}.pdf`);
}

export function parseImportedAnnotations(raw: string, bookId: string): PdfAnnotation[] {
  const data = JSON.parse(raw);
  const list = Array.isArray(data) ? data : data.annotations;
  if (!Array.isArray(list)) throw new Error('JSON sem lista de anotações');
  return list
    .filter((a) => a && a.rects && a.page)
    .map((a) => ({
      id: crypto.randomUUID(),
      bookId,
      page: Number(a.page),
      type: a.type === 'visual' ? 'visual' : 'text',
      text: a.text ?? null,
      name: String(a.name || ''),
      comment: String(a.comment || ''),
      color: (COLOR_KEYS as string[]).includes(a.color) ? a.color : 'yellow',
      rects: a.rects,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
}

// ─── Barra lateral ANOTAÇÕES (§10–13) ───
export function AnnotationSidebar({
  open, onClose, books, annotations, currentBookId, onPick, onExport, onImport,
}: {
  open: boolean;
  onClose: () => void;
  books: Book[];
  annotations: PdfAnnotation[];
  currentBookId: string;
  onPick: (a: PdfAnnotation) => void;
  onExport: (fmt: 'txt' | 'json' | 'pdf') => void;
  onImport: (file: File) => void;
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'page' | 'recent' | 'old' | 'alpha'>('page');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const byBook = useMemo(() => {
    const nq = q.trim().toLowerCase();
    const match = (a: PdfAnnotation) =>
      !nq ||
      a.name.toLowerCase().includes(nq) ||
      (a.text || '').toLowerCase().includes(nq) ||
      a.comment.toLowerCase().includes(nq);
    const sortFn = (a: PdfAnnotation, b: PdfAnnotation) =>
      sort === 'page'
        ? a.page - b.page || (a.rects[0]?.y || 0) - (b.rects[0]?.y || 0)
        : sort === 'recent'
          ? b.createdAt - a.createdAt
          : sort === 'old'
            ? a.createdAt - b.createdAt
            : a.name.localeCompare(b.name, 'pt');
    const map = new Map<string, PdfAnnotation[]>();
    for (const a of annotations) {
      if (!match(a)) continue;
      map.set(a.bookId, [...(map.get(a.bookId) || []), a]);
    }
    for (const list of map.values()) list.sort(sortFn);
    return map;
  }, [annotations, q, sort]);

  const order = [currentBookId, ...books.map((b) => b.id).filter((id) => id !== currentBookId)];

  return (
    <Drawer open={open} onClose={onClose} title="Anotações">
      <div className="mb-3 space-y-2">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔎 Pesquisar anotações…"
            aria-label="Pesquisar anotações"
            className="h-10 w-full rounded-xl border border-line bg-card2/50 pl-9 pr-3 text-[13.5px] text-ink placeholder:text-faint focus:border-gold focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={sort} onChange={(e) => setSort(e.target.value as any)} className="!h-9 flex-1 text-[13px]" aria-label="Ordenar anotações">
            <option value="page">Por página</option>
            <option value="recent">Mais recentes</option>
            <option value="old">Mais antigas</option>
            <option value="alpha">Nome (A–Z)</option>
          </Select>
          <Button variant="outline" size="sm" onClick={() => onExport('txt')} title="Exportar TXT">TXT</Button>
          <Button variant="outline" size="sm" onClick={() => onExport('json')} title="Exportar JSON">JSON</Button>
          <Button variant="outline" size="sm" onClick={() => onExport('pdf')} title="Exportar PDF">PDF</Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} title="Importar JSON" aria-label="Importar anotações">
            <Upload size={13} />
          </Button>
          <input
            ref={fileRef} type="file" accept="application/json,.json" className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.currentTarget.value = ''; }}
          />
        </div>
      </div>

      {order.map((bid) => {
        const book = books.find((b) => b.id === bid);
        const list = byBook.get(bid) || [];
        if (!book || (list.length === 0 && q.trim())) return null;
        const isCur = bid === currentBookId;
        const closed = collapsed[bid] && !isCur;
        return (
          <div key={bid} className="mb-2">
            <button
              onClick={() => setCollapsed((c) => ({ ...c, [bid]: !closed }))}
              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left hover:bg-card2/60"
            >
              {closed ? <ChevronRight size={14} className="text-faint" /> : <ChevronDown size={14} className="text-faint" />}
              <span className={`truncate text-[13.5px] font-semibold ${isCur ? 'text-wine' : 'text-ink'}`}>{book.title}</span>
              <span className="ml-auto rounded-full bg-card2 px-2 py-0.5 text-[11px] tabular-nums text-mute">
                {list.length || (byBook.get(bid)?.length ?? 0) || annotations.filter((a) => a.bookId === bid).length}
              </span>
            </button>
            {!closed && (
              <ul className="ml-4 border-l border-line pl-3">
                {(list.length ? list : annotations.filter((a) => a.bookId === bid).sort((a, b) => a.page - b.page)).map((a) => (
                  <li key={a.id}>
                    <button onClick={() => onPick(a)} className="group flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-card2/60">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ANNOTATION_COLORS[a.color] }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-ink">{a.name}</span>
                        <span className="block text-[11px] text-faint">pág. {a.page}{a.comment ? ' · 💬' : ''} · {fmtDate(a.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      {annotations.length === 0 && (
        <p className="py-10 text-center text-[13px] text-mute">
          Nenhuma anotação ainda.<br />Ative o 🖍 Marca-texto no leitor e selecione um trecho ou área.
        </p>
      )}
    </Drawer>
  );
}

// Pequeno selo de modo marca-texto (§62)
export function MarkModeBanner({ onExit }: { onExit: () => void }) {
  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-gold/50 bg-gold/15 px-3.5 py-1.5 text-[12px] font-medium text-gold shadow-card">
      🖍 MARCA-TEXTO ATIVO — página travada para arraste
      <button onClick={onExit} aria-label="Sair do modo marca-texto" className="ml-1 rounded-full p-0.5 hover:bg-gold/20"><X size={12} /></button>
    </div>
  );
}

// Ícones re-exportados p/ toolbar do leitor
export { Pencil, MessageSquare, Download };
