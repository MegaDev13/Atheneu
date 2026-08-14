import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Heart, Lightbulb, MessageCircle, Users, MessageSquare } from 'lucide-react';
import { backend } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, ProgressBar, Skeleton } from '../components/ui';
import ChatPanel from '../features/social/ChatPanel';
import { relTime } from '../lib/utils';
import type { Activity, Book, CommunityUser, Progress, SocialBundle } from '../lib/types';

const REACTIONS = [
  { icon: '❤️', label: 'amor' },
  { icon: '💡', label: 'insight' },
  { icon: '🤔', label: 'reflexão' },
  { icon: '👏', label: 'aplauso' },
];

export default function Clube() {
  const { user, profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('t') || 'feed';

  const [social, setSocial] = useState<SocialBundle | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<CommunityUser[]>([]);
  const [dmTarget, setDmTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState<Record<string, string[]>>({}); // id → reações locais

  useEffect(() => {
    if (!user) return;
    Promise.all([
      backend.getSocial(user.id),
      backend.listBooks(user.id),
      backend.listProgress(user.id),
      backend.listActivities(user.id),
      backend.listUsers(user.id),
    ])
      .then(([s, b, p, a, u]) => { setSocial(s); setBooks(b); setProgress(p); setActivities(a); setUsers(u); })
      .finally(() => setLoading(false));
    const t = setInterval(() => backend.listUsers(user.id).then(setUsers).catch(() => {}), 60_000);
    return () => clearInterval(t);
  }, [user?.id]);

  const following = social?.following || [];

  async function toggleFollow(personId: string) {
    if (!user || !social) return;
    const next = await backend.toggleFollow(user.id, personId);
    setSocial({ ...social, following: next });
  }

  if (loading || !social) {
    return <div className="mx-auto w-[min(1100px,94%)] py-8"><Skeleton className="mb-6 h-10 w-52" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-96 lg:col-span-2" /><Skeleton className="h-96" /></div></div>;
  }

  return (
    <div className="mx-auto w-[min(1100px,94%)] py-6 md:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="smallcaps">comunidade</p>
          <h1 className="font-display text-[30px] text-ink">Clube</h1>
        </div>
        <nav className="flex gap-1 rounded-xl border border-line p-1" aria-label="Seções do clube">
          {[['feed', 'Feed'], ['discussoes', 'Discussões'], ['chat', 'Chat']].map(([v, l]) => (
            <button key={v} onClick={() => setParams(v === 'feed' ? {} : { t: v }, { replace: true })}
              className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${tab === v ? 'bg-wine text-[#f7f0e2]' : 'text-mute hover:text-ink'}`}>
              {l}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
        <div>
          {tab === 'discussoes' ? (
            <Discussions social={social} books={books} progress={progress} reactions={reactions} setReactions={setReactions} />
          ) : tab === 'chat' ? (
            <ChatPanel activeDm={dmTarget} onConsumedDm={() => { setDmTarget(null); }} />
          ) : (
            <Feed social={social} books={books} activities={activities} />
          )}
        </div>

        {/* Coluna lateral */}
        <div className="space-y-4">
          {/* Lendo com você */}
          <Card className="p-5">
            <p className="smallcaps mb-3 flex items-center gap-1.5"><Users size={13} /> lendo com você</p>
            <ul className="space-y-3">
              {Object.entries(social.readers).flatMap(([bookId, rs]) =>
                rs
                  .filter((r) => following.includes(r.personId))
                  .slice(0, 2)
                  .map((r) => {
                    const person = social.people.find((p) => p.id === r.personId);
                    const book = books.find((b) => b.id === bookId);
                    if (!person || !book) return null;
                    return (
                      <li key={person.id + bookId} className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-[#f7f0e2]" style={{ background: person.color }}>{person.name[0]}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-ink"><strong>{person.name}</strong> · {book.title}</p>
                          <ProgressBar value={r.progress} className="mt-1" tone="pine" />
                        </div>
                        <span className="text-[11px] tabular-nums text-faint">{Math.round(r.progress * 100)}%</span>
                      </li>
                    );
                  })
              )}
            </ul>
          </Card>

          {/* Leitores do site: usuários reais + presença online (§ pedido) */}
          <Card className="p-5">
            <p className="smallcaps mb-3">leitores do site · {users.filter((u) => u.online).length} online</p>
            <ul className="space-y-3">
              {users.filter((u) => !u.isSelf).map((u) => (
                <li key={u.id} className="flex items-center gap-2.5">
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-[#f7f0e2]" style={{ background: u.color }}>
                    {u.name[0]}
                    <span
                      title={u.online ? 'online' : `visto ${relTime(u.lastSeen)}`}
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${u.online ? 'bg-pine' : 'bg-faint'}`}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {u.name} <span className="text-[10.5px] font-normal text-faint">{u.online ? '🟢 online' : '⚪ offline'}</span>
                    </p>
                    <p className="truncate text-[11.5px] text-faint">
                      {u.totalBooks} livro{u.totalBooks === 1 ? '' : 's'} · {u.readingNow} lendo agora
                    </p>
                  </div>
                  <button
                    onClick={() => { setDmTarget(u.id); setParams({ t: 'chat' }, { replace: true }); }}
                    title={`Conversar com ${u.name}`} aria-label={`Conversar com ${u.name}`}
                    className="rounded-lg p-2 text-mute hover:bg-wine-light hover:text-ink"
                  >
                    <MessageSquare size={15} />
                  </button>
                  {!following.includes(u.id) && (
                    <Button size="sm" variant="outline" onClick={() => toggleFollow(u.id)}>Seguir</Button>
                  )}
                </li>
              ))}
              {users.filter((u) => !u.isSelf).length === 0 && (
                <p className="py-3 text-center text-[12.5px] text-faint">Ainda não há outros leitores cadastrados.</p>
              )}
            </ul>
          </Card>

          {/* Clubes */}
          <Card className="p-5">
            <p className="smallcaps mb-3">clubes de leitura</p>
            <ul className="space-y-3">
              {social.clubs.map((c) => (
                <li key={c.id} className="rounded-xl border border-line p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-[14.5px] text-ink">{c.name}</p>
                    <span className="text-[11px] text-faint">{c.members} membros</span>
                  </div>
                  <p className="mt-1 text-[12px] text-mute">Livro atual: {c.bookTitle}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <ProgressBar value={c.progress} className="flex-1" tone="gold" />
                    <span className="text-[11px] tabular-nums text-faint">{Math.round(c.progress * 100)}%</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Feed ───
function Feed({ social, books, activities }: { social: SocialBundle; books: Book[]; activities: Activity[] }) {
  const items = useMemo(() => {
    const mine: any[] = activities.slice(0, 6).map((a) => ({
      id: 'me-' + a.id, personId: null, kind: a.kind, text: 'Você ' + a.text, at: a.at,
      bookTitle: books.find((b) => b.id === a.bookId)?.title || null,
    }));
    const theirs = social.feed.map((f) => ({ ...f }));
    return [...mine, ...theirs].sort((a, b) => b.at - a.at);
  }, [social, activities, books]);

  return (
    <div className="space-y-3">
      {items.map((it, i) => {
        const person = it.personId ? social.people.find((p) => p.id === it.personId) : null;
        const emoji = it.kind === 'finished' ? '📚' : it.kind === 'listening' || it.kind === 'audio' ? '🎧' : it.kind === 'comment' ? '💬' : it.kind === 'goal' ? '🎯' : it.kind === 'note' ? '✏️' : '📖';
        return (
          <motion.div key={it.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.3) }}>
            <Card className="flex items-start gap-3.5 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-[#f7f0e2]" style={{ background: person?.color || '#6e1f2b' }}>
                {person ? person.name[0] : '📖'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] leading-relaxed text-ink">
                  {person ? <strong className="font-semibold">{person.name}</strong> : 'Você'} {it.text}{' '}
                  {it.bookTitle && <em className="font-display font-medium text-wine">“{it.bookTitle}”</em>}
                </p>
                <p className="mt-1 flex items-center gap-2 text-[11.5px] text-faint">
                  <span aria-hidden>{emoji}</span> {relTime(it.at)}
                </p>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Discussões com proteção de spoiler ───
function Discussions({
  social, books, progress, reactions, setReactions,
}: {
  social: SocialBundle; books: Book[]; progress: Progress[];
  reactions: Record<string, string[]>; setReactions: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, typeof social.comments>();
    for (const c of social.comments) {
      const k = c.bookId;
      map.set(k, [...(map.get(k) || []), c]);
    }
    return [...map.entries()];
  }, [social]);

  function myChapter(bookId: string) {
    return progress.find((p) => p.bookId === bookId)?.chapter ?? -1;
  }

  return (
    <div className="space-y-4">
      {grouped.map(([bookId, comments]) => {
        const book = books.find((b) => b.id === bookId);
        const mine = myChapter(bookId);
        return (
          <Card key={bookId} className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-display text-[17px] text-ink">{book?.title || 'Livro'}</p>
                <p className="text-[12px] text-faint">{comments.length} comentários · discussão por capítulo</p>
              </div>
              <MessageCircle size={17} className="text-gold" />
            </div>
            <ul className="space-y-3">
              {comments.sort((a, b) => b.likes - a.likes).map((c) => {
                const person = social.people.find((p) => p.id === c.personId);
                const spoiler = c.chapter > mine + 1;
                const myReacts = reactions[c.id] || [];
                return (
                  <li key={c.id} className="rounded-xl bg-card2/50 p-4">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-[#f7f0e2]" style={{ background: person?.color }}>{person?.name[0]}</span>
                      <p className="text-[13px] font-medium text-ink">{person?.name}</p>
                      <span className="text-[11.5px] text-faint">· capítulo {c.chapter + 1} · {relTime(c.at)}</span>
                    </div>
                    {spoiler ? (
                      <SpoilerBlock text={c.text} />
                    ) : (
                      <p className="mt-2.5 text-[14px] leading-relaxed text-ink">{c.text}</p>
                    )}
                    <div className="mt-3 flex items-center gap-1.5">
                      {REACTIONS.map((r) => {
                        const active = myReacts.includes(r.icon);
                        return (
                          <button key={r.icon} aria-label={`Reagir com ${r.label}`} aria-pressed={active}
                            onClick={() => setReactions((prev) => {
                              const cur = prev[c.id] || [];
                              return { ...prev, [c.id]: active ? cur.filter((x) => x !== r.icon) : [...cur, r.icon] };
                            })}
                            className={`rounded-full border px-2 py-0.5 text-[12px] transition-all ${active ? 'border-wine bg-wine-light' : 'border-line opacity-70 hover:opacity-100'}`}>
                            {r.icon} {c.likes + (active ? 1 : 0)}
                          </button>
                        );
                      })}
                      <span className="ml-auto text-[11.5px] text-faint">responder</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
      {grouped.length === 0 && (
        <Card className="p-12 text-center">
          <MessageSquare size={28} className="mx-auto mb-3 text-gold" />
          <p className="font-display text-lg text-ink">As discussões aparecem aqui.</p>
          <p className="mt-1 text-sm text-mute">Comentários por livro e por capítulo, com proteção contra spoilers.</p>
        </Card>
      )}
    </div>
  );
}

function SpoilerBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2.5">
      {open ? (
        <p className="text-[14px] leading-relaxed text-ink">{text}</p>
      ) : (
        <button onClick={() => setOpen(true)} className="flex w-full items-center gap-2 rounded-xl border border-wine/30 bg-wine-light px-3.5 py-3 text-left text-[13px] text-wine">
          <AlertTriangle size={15} /> Possível spoiler à frente do seu capítulo — mostrar mesmo assim
        </button>
      )}
    </div>
  );
}

// ─── Chat (fase social 3) ───
function ChatSoon() {
  return (
    <Card className="noise flex flex-col items-center p-14 text-center">
      <MessageSquare size={32} className="mb-4 text-gold" />
      <p className="font-display text-xl text-ink">A praça literária está chegando.</p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-mute">
        Chat privado, salas por livro e por capítulo via Supabase Realtime — com presença em tempo real
        (“🟢 7 pessoas estão lendo este livro agora”). A arquitetura já está preparada no banco e será ativada na Fase Social 3.
      </p>
      <div className="mt-6 flex items-center gap-2 text-[12px] text-faint">
        <Lightbulb size={13} /> enquanto isso, participe das discussões por capítulo
      </div>
    </Card>
  );
}
