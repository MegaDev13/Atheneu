import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, StickyNote, Trash2, BookOpen, Repeat } from 'lucide-react';
import { backend } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button, EmptyState, Skeleton, Tag } from '../components/ui';
import BookCover from '../components/BookCover';
import { norm, relTime } from '../lib/utils';
import type { Book, Note } from '../lib/types';

export default function Notes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const bookFilter = params.get('livro');

  const [notes, setNotes] = useState<Note[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | null>(bookFilter ? null : null);

  useEffect(() => {
    if (!user) return;
    Promise.all([backend.listNotes(user.id), backend.listBooks(user.id)])
      .then(([n, b]) => { setNotes(n); setBooks(b); })
      .catch(() => toast('Não foi possível carregar suas notas.', 'error'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => s.add(t)));
    return [...s].sort();
  }, [notes]);

  const filtered = useMemo(() => {
    let xs = notes;
    if (bookFilter) xs = xs.filter((n) => n.bookId === bookFilter);
    if (tag) xs = xs.filter((n) => n.tags.includes(tag));
    if (q.trim()) {
      const nq = norm(q);
      xs = xs.filter((n) => norm(n.text).includes(nq) || norm(n.excerpt || '').includes(nq) || n.tags.some((t) => norm(t).includes(nq)));
    }
    return xs;
  }, [notes, q, tag, bookFilter]);

  return (
    <div className="mx-auto w-[min(900px,94%)] py-6 md:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="smallcaps">conhecimento</p>
          <h1 className="font-display text-[30px] text-ink">Notas</h1>
        </div>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar em todas as notas…" aria-label="Pesquisar notas"
            className="h-10 w-60 rounded-xl border border-line bg-card2/50 pl-9 pr-3 text-[13.5px] text-ink placeholder:text-faint focus:border-gold focus:outline-none md:w-72" />
        </div>
      </div>

      {bookFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[13px] text-mute">Mostrando notas de</span>
          <Tag tone="wine">{books.find((b) => b.id === bookFilter)?.title || 'um livro'}</Tag>
          <button onClick={() => nav('/app/notas')} className="text-[12.5px] font-medium text-wine hover:underline">limpar</button>
        </div>
      )}

      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          <button onClick={() => setTag(null)} className={`rounded-full border px-3 py-1 text-[12px] font-medium ${!tag ? 'border-wine bg-wine text-[#f7f0e2]' : 'border-line text-mute'}`}>Todas</button>
          {allTags.map((t) => (
            <button key={t} onClick={() => setTag(tag === t ? null : t)}
              className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${tag === t ? 'border-wine bg-wine text-[#f7f0e2]' : 'border-line text-mute hover:border-gold/50 hover:text-ink'}`}>
              {t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<StickyNote size={34} />}
          title="Nenhuma nota por aqui"
          subtitle="Selecione um trecho durante a leitura e escolha “Adicionar nota”. Suas ideias ficam guardadas e pesquisáveis."
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((n) => {
            const book = books.find((b) => b.id === n.bookId);
            return (
              <li key={n.id} className="card p-5">
                <div className="flex items-start gap-4">
                  {book && (
                    <button onClick={() => nav(`/app/ler/${book.id}`)} className="hidden shrink-0 sm:block" aria-label={`Abrir ${book.title}`}>
                      <BookCover title={book.title} author={book.author} cover={book.cover} compact className="h-20 w-14" />
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    {n.excerpt && (
                      <p className="mb-2 border-l-2 border-gold pl-3 font-reader text-[14.5px] italic leading-relaxed text-mute">“{n.excerpt}”</p>
                    )}
                    <p className="text-[15px] leading-relaxed text-ink">{n.text}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {book && (
                        <button onClick={() => nav(`/app/ler/${book.id}`)} className="flex items-center gap-1.5 text-[12px] font-medium text-wine hover:underline">
                          <BookOpen size={12} /> {book.title}{n.chapter !== null ? ` · cap. ${n.chapter + 1}` : ''}
                        </button>
                      )}
                      {n.tags.map((t) => <Tag key={t}>{t}</Tag>)}
                      {n.review && <Tag tone="gold"><Repeat size={10} className="mr-1 inline" />revisar</Tag>}
                      <span className="ml-auto text-[11.5px] text-faint">{relTime(n.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    {user && (
                      <button
                        onClick={async () => {
                          const upd = { ...n, review: !n.review };
                          setNotes((xs) => xs.map((x) => (x.id === n.id ? upd : x)));
                          await backend.saveNote(user.id, upd).catch(() => {});
                        }}
                        title={n.review ? 'Remover da revisão' : 'Marcar para revisar depois'}
                        className={`rounded-lg p-2 transition-colors ${n.review ? 'bg-gold/15 text-gold' : 'text-faint hover:bg-wine-light hover:text-ink'}`}
                        aria-pressed={n.review}
                      >
                        <Repeat size={15} />
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (!user) return;
                        setNotes((xs) => xs.filter((x) => x.id !== n.id));
                        await backend.deleteNote(user.id, n.id).catch(() => {});
                        toast('Nota removida.', 'info');
                      }}
                      title="Excluir nota" className="rounded-lg p-2 text-faint transition-colors hover:bg-wine-light hover:text-wine"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
