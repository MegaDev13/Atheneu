import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, Search, LayoutGrid, List, Archive, BookOpen, Headphones, Pencil,
  Trash2, Upload, Star, X, Users, StickyNote,
} from 'lucide-react';
import { backend } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button, Card, Drawer, Field, Input, Modal, ProgressBar, Select, Skeleton, Tag } from '../components/ui';
import BookCover from '../components/BookCover';
import { parseFile, fileToCoverDataUrl } from '../features/library/parse';
import { extractPdfToChapters } from '../features/library/pdf';
import { CATEGORIES } from '../lib/seedContent';
import { fmt, friendlyError, norm, relTime, uid } from '../lib/utils';
import type { Book, BookStatus, Chapter, Progress, SocialBundle } from '../lib/types';

const STATUS_LABEL: Record<BookStatus, string> = {
  want: 'Quero ler', reading: 'Lendo', paused: 'Pausado', finished: 'Concluído',
};

type View = 'grid' | 'list' | 'shelf';

export default function Library() {
  const { user } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const location = useLocation() as any;

  const [books, setBooks] = useState<Book[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [annCounts, setAnnCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('grid');
  const [filter, setFilter] = useState<'all' | BookStatus>('all');
  const [sort, setSort] = useState('recent');
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(!!location.state?.openAdd);
  const [detail, setDetail] = useState<Book | null>(null);
  const [social, setSocial] = useState<SocialBundle | null>(null);

  async function load() {
    if (!user) return;
    try {
      const [b, p] = await Promise.all([backend.listBooks(user.id), backend.listProgress(user.id)]);
      setBooks(b); setProgress(p);
      backend.listAnnotations(user.id).then((as) => {
        const m: Record<string, number> = {};
        as.forEach((a) => { m[a.bookId] = (m[a.bookId] || 0) + 1; });
        setAnnCounts(m);
      }).catch(() => {});
      backend.getSocial(user.id).then(setSocial).catch(() => {});
    } catch (e) {
      console.error(e);
      toast('Não foi possível carregar sua biblioteca. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user?.id]);

  const pctOf = (b: Book) => {
    if (b.status === 'finished') return 1;
    const p = progress.find((x) => x.bookId === b.id);
    if (!p) return 0;
    if (b.pages > 0) return Math.min(1, Math.max(0.01, p.page / b.pages));
    return Math.min(1, Math.max(0.01, (p.chapter + p.location) / 3));
  };

  const filtered = useMemo(() => {
    let xs = books;
    if (filter !== 'all') xs = xs.filter((b) => b.status === filter);
    if (query.trim()) {
      const q = norm(query);
      xs = xs.filter((b) => norm(b.title).includes(q) || norm(b.author).includes(q) || norm(b.genre).includes(q));
    }
    const sorted = [...xs];
    switch (sort) {
      case 'title': sorted.sort((a, b) => a.title.localeCompare(b.title, 'pt')); break;
      case 'author': sorted.sort((a, b) => a.author.localeCompare(b.author, 'pt')); break;
      case 'progress': sorted.sort((a, b) => pctOf(b) - pctOf(a)); break;
      case 'added': sorted.sort((a, b) => b.addedAt - a.addedAt); break;
      default: sorted.sort((a, b) => b.lastAccess - a.lastAccess);
    }
    return sorted;
  }, [books, filter, query, sort, progress]);

  return (
    <div className="mx-auto w-[min(1200px,94%)] py-6 md:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="smallcaps">sua estante</p>
          <h1 className="font-display text-[30px] text-ink">Biblioteca</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar título, autor…"
              className="h-10 w-48 rounded-xl border border-line bg-card2/50 pl-9 pr-3 text-[13.5px] text-ink placeholder:text-faint focus:border-gold focus:outline-none md:w-64"
              aria-label="Pesquisar na biblioteca"
            />
          </div>
          <Button onClick={() => setAddOpen(true)}><Plus size={16} /> Adicionar</Button>
        </div>
      </div>

      {/* Filtros + ordenação + visualização */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar por status">
          {([['all', 'Todos'], ['reading', 'Lendo'], ['paused', 'Pausados'], ['finished', 'Concluídos'], ['want', 'Quero ler']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} role="tab" aria-selected={filter === v}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-all ${filter === v ? 'border-wine bg-wine text-[#f7f0e2]' : 'border-line text-mute hover:border-gold/50 hover:text-ink'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar"
            className="h-9 rounded-xl border border-line bg-card2/50 px-3 text-[12.5px] text-mute focus:border-gold focus:outline-none">
            <option value="recent">Recentemente acessados</option>
            <option value="title">Título</option>
            <option value="author">Autor</option>
            <option value="progress">Progresso</option>
            <option value="added">Data adicionada</option>
          </select>
          <div className="flex rounded-xl border border-line p-0.5" role="tablist" aria-label="Modo de visualização">
            {([['grid', LayoutGrid], ['list', List], ['shelf', Archive]] as const).map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)} aria-label={`Visualização ${v}`} aria-selected={view === v} role="tab"
                className={`rounded-lg p-1.5 transition-colors ${view === v ? 'bg-wine text-[#f7f0e2]' : 'text-faint hover:text-ink'}`}>
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-[2/3]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyShelf hasBooks={books.length > 0} onAdd={() => setAddOpen(true)} query={query} />
      ) : view === 'shelf' ? (
        <ShelfView books={filtered} pctOf={pctOf} onOpen={setDetail} />
      ) : view === 'list' ? (
        <ListView books={filtered} pctOf={pctOf} onOpen={setDetail} />
      ) : (
        <GridView
          books={filtered} pctOf={pctOf} onOpen={setDetail}
          annCounts={annCounts} progress={progress}
          onContinue={(b) => nav(`/app/ler/${b.id}`)}
        />
      )}

      <AddBookModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={(b) => { setAddOpen(false); load(); setDetail(b); }} />
      <BookDetail
        book={detail} progress={detail ? progress.find((p) => p.bookId === detail.id) ?? null : null}
        pct={detail ? pctOf(detail) : 0} social={social}
        onClose={() => setDetail(null)}
        onChange={(b) => { setBooks((xs) => xs.map((x) => (x.id === b.id ? b : x))); setDetail(b); }}
        onDeleted={() => { setDetail(null); load(); }}
      />
    </div>
  );
}

function EmptyShelf({ hasBooks, onAdd, query }: { hasBooks: boolean; onAdd: () => void; query: string }) {
  return (
    <div className="flex flex-col items-center py-14 text-center">
      <svg width="260" height="120" viewBox="0 0 260 120" aria-hidden className="mb-6 opacity-90">
        <rect x="10" y="86" width="240" height="12" rx="3" fill="#5d4126" />
        <rect x="10" y="86" width="240" height="3" fill="#7a5b3a" />
        {[40, 78, 116, 154, 192].map((x, i) => (
          <g key={x} opacity={0.35 + (i % 3) * 0.12}>
            <rect x={x} y={86 - 34 - (i % 2) * 8} width="16" height={34 + (i % 2) * 8} rx="2" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeDasharray="4 3" />
          </g>
        ))}
      </svg>
      <p className="font-display text-2xl text-ink">
        {query ? 'Nenhum livro encontrado.' : 'Sua estante está esperando pelos primeiros livros.'}
      </p>
      <p className="mt-2 max-w-sm text-sm text-mute">
        {query ? 'Tente outra busca ou limpe o filtro.' : 'Adicione um EPUB, PDF, TXT ou DOCX e comece sua jornada.'}
      </p>
      {!query && !hasBooks && (
        <Button className="mt-6" onClick={onAdd}><Plus size={16} /> Adicionar meu primeiro livro</Button>
      )}
    </div>
  );
}

function GridView({ books, pctOf, onOpen, annCounts, progress, onContinue }: {
  books: Book[]; pctOf: (b: Book) => number; onOpen: (b: Book) => void;
  annCounts: Record<string, number>; progress: Progress[]; onContinue: (b: Book) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {books.map((b, i) => {
        const pr = progress.find((x) => x.bookId === b.id);
        const nAnn = annCounts[b.id] || 0;
        return (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="group text-left"
          >
            <button onClick={() => onOpen(b)} className="block w-full text-left" aria-label={`${b.title}, ${b.author}`}>
              <div className="relative transition-transform duration-300 ease-out group-hover:-translate-y-2 group-hover:rotate-[-1deg]">
                <BookCover title={b.title} author={b.author} cover={b.cover} className="aspect-[2/3] w-full shadow-card group-hover:shadow-deep" />
                <div className="absolute inset-x-0 bottom-0 h-1 rounded-b-md bg-black/20">
                  <div className="h-full rounded-l-sm bg-gold" style={{ width: `${pctOf(b) * 100}%` }} />
                </div>
              </div>
              <p className="mt-3 truncate font-display text-[15px] leading-tight text-ink">{b.title}</p>
              <p className="truncate text-[12.5px] text-faint">{b.author}</p>
              <p className="mt-0.5 text-[11px] tabular-nums text-mute">
                {pr ? `pág. ${pr.page} / ${b.pages || '—'} · ${Math.round(pctOf(b) * 100)}%` : STATUS_LABEL[b.status]}
                {nAnn > 0 && <span className="ml-1.5 rounded-full bg-wine-light px-1.5 py-0.5 text-[10px] text-wine">🖍 {nAnn}</span>}
              </p>
            </button>
            {(b.status === 'reading' || pr) && (
              <button
                onClick={() => onContinue(b)}
                className="mt-1.5 text-[12px] font-semibold text-wine opacity-80 hover:underline group-hover:opacity-100"
              >
                CONTINUAR LEITURA →
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function ListView({ books, pctOf, onOpen }: { books: Book[]; pctOf: (b: Book) => number; onOpen: (b: Book) => void }) {
  return (
    <div className="card divide-y divide-line overflow-hidden">
      {books.map((b) => (
        <button key={b.id} onClick={() => onOpen(b)} className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-card2/50">
          <BookCover title={b.title} author={b.author} cover={b.cover} compact className="h-16 w-11 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[15.5px] text-ink">{b.title}</p>
            <p className="truncate text-[12.5px] text-faint">{b.author} · {b.genre}</p>
          </div>
          <div className="hidden w-40 md:block"><ProgressBar value={pctOf(b)} /></div>
          <span className="w-20 shrink-0 text-right text-[12px] tabular-nums text-mute">{Math.round(pctOf(b) * 100)}%</span>
          <Tag tone={b.status === 'reading' ? 'wine' : b.status === 'finished' ? 'pine' : 'default'}>{STATUS_LABEL[b.status]}</Tag>
        </button>
      ))}
    </div>
  );
}

function ShelfView({ books, pctOf, onOpen }: { books: Book[]; pctOf: (b: Book) => number; onOpen: (b: Book) => void }) {
  const rows: Book[][] = [];
  for (let i = 0; i < books.length; i += 9) rows.push(books.slice(i, i + 9));
  return (
    <div className="space-y-10">
      {rows.map((row, r) => (
        <div key={r}>
          <div className="flex min-h-[190px] items-end justify-center gap-1.5 px-6">
            {row.map((b, i) => (
              <motion.button
                key={b.id}
                initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: r * 0.1 + i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => onOpen(b)}
                className="group relative flex flex-col items-center"
                aria-label={`${b.title}, ${b.author} — ${Math.round(pctOf(b) * 100)}% lido`}
              >
                <div
                  className="relative w-11 origin-bottom rounded-t-[3px] shadow-spine transition-all duration-300 ease-out group-hover:-translate-y-2.5 group-hover:rotate-[-2deg] group-hover:shadow-deep md:w-12"
                  style={{ height: `${132 + (i % 3) * 16}px`, background: 'transparent' }}
                >
                  <BookCover title={b.title} author={b.author} cover={b.cover} compact className="h-full w-full rounded-t-[3px]" />
                </div>
                {/* Tooltip */}
                <div className="pointer-events-none absolute -top-14 left-1/2 z-10 w-44 -translate-x-1/2 rounded-xl border border-line bg-card px-3 py-2 text-center opacity-0 shadow-deep transition-all duration-200 group-hover:-translate-y-1 group-hover:opacity-100">
                  <p className="truncate font-display text-[12.5px] text-ink">{b.title}</p>
                  <p className="truncate text-[11px] text-faint">{b.author} · {Math.round(pctOf(b) * 100)}%</p>
                </div>
              </motion.button>
            ))}
          </div>
          <div className="shelf-board mx-auto w-full max-w-4xl" />
        </div>
      ))}
    </div>
  );
}

// ─── Adicionar livro ───
function AddBookModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (b: Book) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<{ chapters: { title: string; text: string }[]; pages: number } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('Literatura');
  const [description, setDescription] = useState('');
  const [coverData, setCoverData] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) { setFile(null); setParsed(null); setTitle(''); setAuthor(''); setDescription(''); setCoverData(''); setParsing(false); setError(''); }
  }, [open]);

  async function pickFile(f: File) {
    setFile(f); setError(''); setParsing(true); setParsed(null);
    try {
      const p = await parseFile(f);
      setParsed({ chapters: p.chapters, pages: p.pagesEstimate });
      if (p.title && !title) setTitle(p.title);
      if (p.author && !author) setAuthor(p.author);
      if (p.format === 'pdf') {
        toast(`PDF com ${p.pagesEstimate} página${p.pagesEstimate === 1 ? '' : 's'} detectado. O texto será extraído em segundo plano.`, 'info');
      } else {
        toast(`Texto extraído: ${p.chapters.length} capítulo${p.chapters.length === 1 ? '' : 's'}.`, 'info');
      }
    } catch (e: any) {
      console.error(e);
      setError(friendlyError(e));
      setParsed({ chapters: [], pages: 0 });
    } finally {
      setParsing(false);
    }
  }

  async function save() {
    if (!user || !title.trim()) { setError('Dê um título ao livro.'); return; }
    setSaving(true);
    try {
      const id = uid();
      let fileKey: string | null = null;
      if (file) fileKey = await backend.saveFile(user.id, id, file);
      let cover: string | null = null;
      if (coverData) cover = await backend.saveCover(user.id, id, coverData);

      const book: Book = {
        id, title: title.trim(), author: author.trim() || 'Autor desconhecido', genre,
        description: description.trim(), cover, format: file ? ((file.name.split('.').pop() || 'txt').toLowerCase() as Book['format']) : 'txt',
        status: 'want', pages: parsed?.pages || 0, rating: 0,
        addedAt: Date.now(), lastAccess: Date.now(), fileKey, fileSize: file?.size || 0,
      };
      await backend.saveBook(user.id, book);
      if (parsed && parsed.chapters.length > 0) {
        const chapters: Chapter[] = parsed.chapters.map((c, i) => ({
          id: uid(), bookId: id, index: i, title: c.title, text: c.text,
        }));
        await backend.saveChapters(chapters);
      }
      // PDF: a exibição é fiel ao arquivo; o texto é extraído em segundo plano
      // (busca, notas, sessões, estatísticas e audiobook passam a funcionar).
      if (book.format === 'pdf' && file) {
        const pdfFile = file;
        (async () => {
          try {
            toast('Extraindo texto do PDF em segundo plano…', 'info');
            const buf = await pdfFile.arrayBuffer();
            const n = await extractPdfToChapters(user.id, id, buf);
            toast(`Texto extraído: ${n} página(s) prontas para busca, notas e audiobook.`);
          } catch (e) {
            console.error('Falha na extração do PDF:', e);
            toast('Não foi possível extrair o texto deste PDF — a visualização continua normal.', 'error');
          }
        })();
      }
      await backend.addActivity(user.id, { id: uid(), kind: 'added', bookId: id, text: `adicionou ${book.title} à biblioteca`, at: Date.now() });
      toast(`${book.title} entrou na sua estante.`);
      onSaved(book);
    } catch (e: any) {
      setError(friendlyError(e));
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar livro" wide>
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        {/* Capa */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-full">
            {coverData ? (
              <div className="relative">
                <img src={coverData} alt="Capa selecionada" className="aspect-[2/3] w-full rounded-md object-cover shadow-card" />
                <button onClick={() => setCoverData(null)} aria-label="Remover capa" className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"><X size={13} /></button>
              </div>
            ) : (
              <BookCover title={title || 'Sem título'} author={author || '—'} className="aspect-[2/3] w-full" />
            )}
          </div>
          <label className="cursor-pointer text-[12.5px] font-medium text-wine hover:underline">
            Enviar capa
            <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setCoverData(await fileToCoverDataUrl(f));
            }} />
          </label>
        </div>

        {/* Formulário */}
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) pickFile(f); }}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors ${file ? 'border-pine/50 bg-pine/5' : 'border-line hover:border-gold/50'}`}
          >
            {file ? (
              <>
                <p className="text-[14px] font-medium text-ink">{file.name}</p>
                <p className="text-[12px] text-mute">
                  {parsing ? 'Extraindo texto…' : parsed ? `${parsed.chapters.length} capítulo(s) · ~${parsed.pages} página(s)` : ''}
                </p>
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setParsed(null); }}>Trocar arquivo</Button>
              </>
            ) : (
              <>
                <Upload size={22} className="text-gold" />
                <p className="text-[14px] font-medium text-ink">Arraste o arquivo do livro</p>
                <p className="text-[12px] text-faint">EPUB · PDF · TXT · DOCX</p>
                <Button variant="outline" size="sm" type="button" onClick={() => fileRef.current?.click()}>Escolher arquivo</Button>
                <input ref={fileRef} type="file" accept=".epub,.pdf,.txt,.docx" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
              </>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Título"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da obra" /></Field>
            <Field label="Autor"><Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Quem escreveu" /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Gênero">
              <Select value={genre} onChange={(e) => setGenre(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Descrição (opcional)">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Sobre o que é este livro?" />
            </Field>
          </div>

          {error && <p role="alert" className="rounded-xl border border-wine/30 bg-wine-light px-3.5 py-2.5 text-[13px] text-wine">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={save} loading={saving} disabled={parsing}>
              <Plus size={16} /> Colocar na estante
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Detalhes do livro ───
function BookDetail({
  book, progress, pct, social, onClose, onChange, onDeleted,
}: {
  book: Book | null; progress: Progress | null; pct: number; social: SocialBundle | null;
  onClose: () => void; onChange: (b: Book) => void; onDeleted: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const readers = book && social ? social.readers[book.id] || [] : [];

  async function setStatus(s: BookStatus) {
    if (!book || !user) return;
    const updated = { ...book, status: s, lastAccess: Date.now() };
    onChange(updated);
    try {
      await backend.saveBook(user.id, updated);
      if (s === 'finished') {
        await backend.addActivity(user.id, { id: uid(), kind: 'finished', bookId: book.id, text: `concluiu ${book.title}`, at: Date.now() });
        toast(`Você concluiu ${book.title}. 🎉`);
      }
    } catch (e) {
      toast('Não foi possível salvar. Tente novamente.', 'error');
    }
  }

  return (
    <Drawer open={!!book} onClose={onClose} title="Detalhes do livro">
      {book && (
        <div className="space-y-5">
          <div className="flex gap-4">
            <BookCover title={book.title} author={book.author} cover={book.cover} className="h-40 w-[104px] shrink-0 shadow-deep" />
            <div className="min-w-0">
              <h3 className="font-display text-[20px] leading-snug text-ink">{book.title}</h3>
              <p className="text-[13.5px] text-mute">{book.author}</p>
              <p className="mt-1 text-[12px] text-faint">{book.genre} · ~{fmt(book.pages)} páginas</p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[11.5px] text-faint"><span>{progress ? `pág. ${progress.page}` : 'não iniciado'}</span><span>{Math.round(pct * 100)}%</span></div>
                <ProgressBar value={pct} />
              </div>
            </div>
          </div>

          {book.description && <p className="text-[13.5px] leading-relaxed text-mute">{book.description}</p>}

          <Field label="Status">
            <Select value={book.status} onChange={(e) => setStatus(e.target.value as BookStatus)}>
              <option value="want">Quero ler</option>
              <option value="reading">Lendo</option>
              <option value="paused">Pausado</option>
              <option value="finished">Concluído</option>
            </Select>
          </Field>

          {/* Avaliação */}
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-mute">Sua avaliação</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} aria-label={`${n} estrelas`} onClick={async () => {
                  if (!user) return;
                  const updated = { ...book, rating: book.rating === n ? 0 : n };
                  onChange(updated);
                  await backend.saveBook(user.id, updated).catch(() => {});
                }}>
                  <Star size={19} className={n <= book.rating ? 'fill-gold text-gold' : 'text-line'} />
                </button>
              ))}
            </div>
          </div>

          {/* Presença social */}
          {readers.length > 0 && (
            <div className="rounded-xl bg-card2/60 p-4">
              <p className="mb-2.5 flex items-center gap-1.5 text-[12.5px] font-medium text-mute">
                <Users size={13} className="text-pine" /> {readers.length} pessoa{readers.length > 1 ? 's' : ''} que você segue {readers.length > 1 ? 'estão lendo' : 'está lendo'} este livro
              </p>
              <ul className="space-y-2">
                {readers.slice(0, 4).map((r) => {
                  const p = social!.people.find((x) => x.id === r.personId);
                  if (!p) return null;
                  return (
                    <li key={r.personId} className="flex items-center gap-2.5 text-[12.5px]">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-[#f7f0e2]" style={{ background: p.color }}>{p.name[0]}</span>
                      <span className="w-16 truncate text-ink">{p.name}</span>
                      <ProgressBar value={r.progress} className="flex-1" tone="pine" />
                      <span className="w-9 text-right tabular-nums text-faint">{Math.round(r.progress * 100)}%</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => nav(`/app/ler/${book.id}`)}><BookOpen size={16} /> Ler</Button>
            <Button variant="outline" onClick={() => nav(`/app/ouvir?livro=${book.id}`)}><Headphones size={16} /> Ouvir</Button>
            <Button variant="outline" onClick={() => nav(`/app/notas?livro=${book.id}`)}><StickyNote size={16} /> Notas</Button>
            <Button variant="outline" onClick={() => nav(`/app/clube?t=discussoes`)}><Users size={16} /> Discussão</Button>
          </div>

          <Button
            variant="danger" className="w-full"
            onClick={async () => {
              if (!user) return;
              if (!confirm(`Remover "${book.title}" da sua biblioteca?`)) return;
              await backend.deleteBook(user.id, book.id);
              toast('Livro removido.', 'info');
              onDeleted();
            }}
          >
            <Trash2 size={15} /> Remover da biblioteca
          </Button>
        </div>
      )}
    </Drawer>
  );
}
