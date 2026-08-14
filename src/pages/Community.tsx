// Comunidade literária: feed (Seguindo/Descobrir/Populares), discussões livres,
// comentários encadeados, reações, tags, denúncia/bloqueio. Usa tokens do tema.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Bookmark, Flag, Heart, MessageSquare, Plus, Send, Tag as TagIcon, Users,
} from 'lucide-react';
import { backend } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button, Card, Input, Modal, Select, Tag } from '../components/ui';
import { RichText, sanitizeText, highlightMentions } from '../lib/rich';
import { relTime } from '../lib/utils';
import type { Discussion, DiscussionComment } from '../lib/types';

const CATEGORIES = ['Literatura', 'Filosofia', 'História', 'Ficção', 'Poesia', 'Autores', 'Livros', 'Recomendações', 'Adaptações', 'Teoria', 'Estudos', 'Geral'];
const EMOJIS = ['❤️', '💡', '😂', '🤔', '👏'];

export default function Community() {
  const { user } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<'following' | 'discover' | 'popular'>('discover');
  const [list, setList] = useState<Discussion[]>([]);
  const [current, setCurrent] = useState<Discussion | null>(null);
  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const dId = params.get('d');

  async function loadList() {
    if (!user) return;
    setList(await backend.listDiscussions(user.id, tab));
  }
  async function loadCurrent(id: string) {
    if (!user) return;
    const d = await backend.getDiscussion(user.id, id);
    setCurrent(d);
    if (d) setComments(await backend.listComments(user.id, id));
  }
  useEffect(() => { if (!dId) loadList(); }, [tab, user?.id, dId]);
  useEffect(() => { if (dId) loadCurrent(dId); }, [dId, user?.id]);

  return (
    <div className="mx-auto w-[min(1000px,94%)] py-6 md:py-8">
      {dId && current ? (
        <DiscussionView
          d={current} comments={comments}
          onBack={() => setParams({})}
          onChanged={() => loadCurrent(dId)}
        />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="smallcaps flex items-center gap-1.5"><Users size={13} /> comunidade</p>
              <h1 className="font-display text-[28px] text-ink">Comunidade</h1>
            </div>
            <Button onClick={() => setCreateOpen(true)}><Plus size={16} /> Nova discussão</Button>
          </div>
          <div className="mb-4 flex gap-1 rounded-xl border border-line p-1 w-fit">
            {([['following', 'Seguindo'], ['discover', 'Descobrir'], ['popular', 'Populares']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium ${tab === k ? 'bg-wine text-[#f7f0e2]' : 'text-mute hover:text-ink'}`}>{l}</button>
            ))}
          </div>
          <div className="space-y-3">
            {list.length === 0 && <Card className="p-8 text-center text-[13.5px] text-mute">Nenhuma discussão por aqui ainda. Comece uma!</Card>}
            {list.map((d) => (
              <Card key={d.id} className="cursor-pointer p-4" onClick={() => setParams({ d: d.id })}>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-semibold text-[#f7f0e2]" style={{ background: d.userColor || '#6e1f2b' }}>{(d.userName || '?')[0]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink">{d.userName}</p>
                    <p className="text-[11px] text-faint">{relTime(d.createdAt)} · {d.category}</p>
                  </div>
                </div>
                <h3 className="mt-2 font-display text-[17px] font-semibold text-ink">{d.title}</h3>
                <p className="mt-1 line-clamp-2 text-[13px] text-mute">{d.content.replace(/[#*>`-]/g, '').slice(0, 180)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {d.bookTitle && <Tag tone="wine">📖 {d.bookTitle}</Tag>}
                  {d.tags.slice(0, 3).map((t) => <Tag key={t}>#{t}</Tag>)}
                  <span className="ml-auto flex items-center gap-1 text-[12px] text-faint"><MessageSquare size={13} /> {d.commentsCount ?? 0}</span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
      <CreateDiscussion open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => { setCreateOpen(false); setParams({ d: id }); }} />
    </div>
  );
}

function CreateDiscussion({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Literatura');
  const [tags, setTags] = useState('');
  const [bookId, setBookId] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [books, setBooks] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open && user) backend.listBooks(user.id).then(setBooks); }, [open, user?.id]);

  async function submit() {
    if (!user) return;
    if (title.trim().length < 4) { toast('Dê um título à discussão.', 'info'); return; }
    setBusy(true);
    const d = await backend.createDiscussion(user.id, {
      title: sanitizeText(title, 140), content: sanitizeText(content), category,
      bookId: bookId || null, authorName: authorName || null,
      tags: tags.split(/[,#]/).map((t) => t.trim().replace(/\s+/g, '')).filter(Boolean).slice(0, 8),
    });
    setBusy(false);
    toast('Discussão publicada.');
    onCreated(d.id);
    setTitle(''); setContent(''); setTags('');
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova discussão" wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2"><span className="mb-1 block text-[13px] text-mute">Título</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: O niilismo em Dostoiévski…" /></label>
        <label className="block sm:col-span-2"><span className="mb-1 block text-[13px] text-mute">Conteúdo (markdown seguro: **negrito**, *itálico*, &gt; citação, - lista)</span>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6}
            className="w-full rounded-xl border border-line bg-card2/50 p-3 text-[14px] text-ink focus:border-gold focus:outline-none" /></label>
        <label className="block"><span className="mb-1 block text-[13px] text-mute">Categoria</span>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></label>
        <label className="block"><span className="mb-1 block text-[13px] text-mute">Livro relacionado (opcional)</span>
          <Select value={bookId} onChange={(e) => setBookId(e.target.value)}>
            <option value="">— nenhum —</option>
            {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </Select></label>
        <label className="block"><span className="mb-1 block text-[13px] text-mute">Autor relacionado (opcional)</span>
          <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Ex.: Machado de Assis" /></label>
        <label className="block"><span className="mb-1 block text-[13px] text-mute">Tags (# separadas por vírgula)</span>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="filosofia, platão" /></label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} loading={busy}><Send size={15} /> Publicar</Button>
      </div>
    </Modal>
  );
}

function DiscussionView({ d, comments, onBack, onChanged }: { d: Discussion; comments: DiscussionComment[]; onBack: () => void; onChanged: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const roots = comments.filter((c) => !c.parentId);
  const kids = (id: string) => comments.filter((c) => c.parentId === id);

  async function send() {
    if (!user || !text.trim()) return;
    await backend.addComment(user.id, d.id, sanitizeText(text, 4000), replyTo);
    setText(''); setReplyTo(null);
    onChanged();
  }

  return (
    <div>
      <button onClick={onBack} className="mb-3 flex items-center gap-1.5 text-[13px] text-mute hover:text-ink"><ArrowLeft size={15} /> Voltar ao feed</button>
      <Card className="p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold text-[#f7f0e2]" style={{ background: d.userColor || '#6e1f2b' }}>{(d.userName || '?')[0]}</span>
          <div className="flex-1"><p className="text-[14px] font-medium text-ink">{d.userName}</p><p className="text-[11.5px] text-faint">{relTime(d.createdAt)} · {d.category}</p></div>
          <button title="Denunciar" className="rounded p-1.5 text-faint hover:bg-wine-light hover:text-wine" onClick={async () => { if (user) { await backend.reportContent(user.id, 'discussion', d.id, 'conteúdo inadequado'); toast('Denúncia enviada. Obrigado.', 'info'); } }}><Flag size={15} /></button>
        </div>
        <h1 className="mt-3 font-display text-[22px] font-semibold text-ink">{d.title}</h1>
        <div className="mt-2"><RichText text={d.content} /></div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {d.bookTitle && <Tag tone="wine">📖 {d.bookTitle}</Tag>}
          {d.authorName && <Tag tone="pine">✍️ {d.authorName}</Tag>}
          {d.tags.map((t) => <Tag key={t}><TagIcon size={10} className="mr-1 inline" />{t}</Tag>)}
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
          {EMOJIS.map((e) => (
            <button key={e} onClick={async () => { if (user) { await backend.react(user.id, d.id, e); onChanged(); } }}
              className={`rounded-full border px-2.5 py-1 text-[13px] ${d.reactedByMe?.includes(e) ? 'border-wine bg-wine-light' : 'border-line opacity-70 hover:opacity-100'}`}>
              {e} {d.reactions?.[e] || 0}
            </button>
          ))}
        </div>
      </Card>

      {/* comentários */}
      <div className="mt-4 space-y-3">
        {roots.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-[#f7f0e2]" style={{ background: c.userColor || '#6e1f2b' }}>{(c.userName || '?')[0]}</span>
              <p className="flex-1 text-[13px] font-medium text-ink">{c.userName}</p>
              <span className="text-[11px] text-faint">{relTime(c.createdAt)}</span>
            </div>
            <p className="mt-2 text-[14px] text-ink">{highlightMentions(c.content)}</p>
            <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="mt-2 text-[12px] text-mute hover:text-ink">Responder</button>
            {kids(c.id).map((k) => (
              <div key={k.id} className="ml-6 mt-3 rounded-xl bg-card2/60 p-3">
                <p className="text-[12.5px] font-medium text-ink">{k.userName} <span className="ml-1 text-[10.5px] font-normal text-faint">{relTime(k.createdAt)}</span></p>
                <p className="mt-1 text-[13.5px] text-ink">{highlightMentions(k.content)}</p>
              </div>
            ))}
            {replyTo === c.id && (
              <div className="ml-6 mt-2 flex gap-2">
                <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Sua resposta…" />
                <Button onClick={send}><Send size={14} /></Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* novo comentário */}
      <Card className="mt-4 p-3">
        <div className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva um comentário…" />
          <Button onClick={send} disabled={!text.trim()}><Send size={15} /></Button>
        </div>
      </Card>
    </div>
  );
}
