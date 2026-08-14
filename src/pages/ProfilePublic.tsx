// Perfil público personalizável (capa, foto, bio, interesses, livros/autores/música,
// seguidores/seguindo, seguir/deixar de seguir, DM). Compatível com o Theme Engine.
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Globe, Link as LinkIcon, MapPin, MessageSquare, Music, UserPlus, UserCheck } from 'lucide-react';
import { backend } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button, Card, Modal, Tag } from '../components/ui';
import type { CommunityUser, PublicProfile } from '../lib/types';

export default function ProfilePublic() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [p, setP] = useState<PublicProfile | null>(null);
  const [listOpen, setListOpen] = useState<'followers' | 'following' | null>(null);
  const [people, setPeople] = useState<CommunityUser[]>([]);
  const [canMsg, setCanMsg] = useState(true);

  async function load() {
    if (user && id) {
      setP(await backend.getPublicProfile(user.id, id));
      if (id !== user.id) backend.canMessage(user.id, id).then(setCanMsg).catch(() => setCanMsg(true));
    }
  }
  useEffect(() => { load(); }, [id, user?.id]);

  async function toggleFollow() {
    if (!user || !p) return;
    await backend.toggleFollow(user.id, p.id);
    toast(p.followedByMe ? 'Deixou de seguir.' : 'Agora você segue ' + p.name + '.', 'info');
    load();
  }

  async function openList(kind: 'followers' | 'following') {
    if (!user || !p) return;
    setListOpen(kind);
    setPeople(kind === 'followers' ? await backend.getFollowers(user.id, p.id) : await backend.getFollowing(user.id, p.id));
  }

  if (!p) return <div className="py-20 text-center text-mute">Carregando perfil…</div>;

  return (
    <div className="mx-auto w-[min(900px,94%)] py-6">
      <button onClick={() => nav(-1)} className="mb-3 flex items-center gap-1.5 text-[13px] text-mute hover:text-ink"><ArrowLeft size={15} /> Voltar</button>

      {/* Capa + foto */}
      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
        <div className="h-32 md:h-40" style={{ background: p.cover ? `url(${p.cover}) center/cover` : 'linear-gradient(120deg, var(--wine), var(--pine))' }} />
        <div className="p-5 pt-0">
          <div className="-mt-10 flex items-end justify-between">
            <span className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-card text-2xl font-semibold text-[#f7f0e2]" style={{ background: p.color }}>{p.name[0]}</span>
            {!p.isSelf && (
              <div className="flex gap-2 pb-1">
                {canMsg && (
                  <Button size="sm" variant="outline" onClick={async () => { await backend.openDm(user!.id, p.id); nav('/app/mensagens'); }}><MessageSquare size={14} /> Enviar mensagem</Button>
                )}
                <Button size="sm" onClick={toggleFollow}>{p.followedByMe ? <><UserCheck size={14} /> Seguindo</> : <><UserPlus size={14} /> Seguir</>}</Button>
              </div>
            )}
          </div>
          <h1 className="mt-2 font-display text-[24px] font-semibold text-ink">{p.name}</h1>
          {p.username && <p className="text-[13px] text-wine">@{p.username}</p>}
          {p.bio && <p className="mt-1 text-[14px] text-mute">{p.bio}</p>}
          <div className="mt-1 flex flex-wrap gap-3 text-[12.5px] text-faint">
            {p.location && <span className="flex items-center gap-1"><MapPin size={12} /> {p.location}</span>}
            {p.website && <a className="flex items-center gap-1 text-wine" href={p.website} target="_blank" rel="noreferrer"><LinkIcon size={12} /> site</a>}
            {p.pronouns && <span>{p.pronouns}</span>}
            <span className={p.online ? 'text-pine' : ''}>{p.online ? '🟢 online' : '⚪ offline'}</span>
          </div>
          <div className="mt-3 flex gap-4 text-[13.5px]">
            <button onClick={() => openList('followers')} className="hover:text-wine"><b className="text-ink">{p.followers}</b> <span className="text-mute">seguidores</span></button>
            <button onClick={() => openList('following')} className="hover:text-wine"><b className="text-ink">{p.following}</b> <span className="text-mute">seguindo</span></button>
            <span><b className="text-ink">{p.totalBooks}</b> <span className="text-mute">livros</span></span>
            <span><b className="text-ink">{p.discussionsCount}</b> <span className="text-mute">discussões</span></span>
          </div>
        </div>
      </div>

      {p.about && <Card className="mt-4 p-5"><p className="smallcaps mb-2">sobre mim</p><p className="whitespace-pre-wrap text-[14px] text-ink">{p.about}</p></Card>}

      {(p.genres.length > 0 || p.interests.length > 0) && (
        <Card className="mt-4 p-5"><p className="smallcaps mb-2">interesses & gêneros</p>
          <div className="flex flex-wrap gap-2">{p.genres.map((g) => <Tag key={g} tone="wine">{g}</Tag>)}{p.interests.map((g) => <Tag key={g}>#{g}</Tag>)}</div>
        </Card>
      )}

      {p.books.length > 0 && (
        <Card className="mt-4 p-5"><p className="smallcaps mb-2 flex items-center gap-1.5"><BookOpen size={13} /> livros favoritos</p>
          <div className="grid gap-2 sm:grid-cols-2">{p.books.map((b, i) => (
            <div key={i} className="rounded-xl border border-line p-3"><p className="font-display text-[15px] font-semibold text-ink">{b.title}</p><p className="text-[12.5px] text-mute">{b.author}</p>{b.note && <p className="mt-1 text-[12px] italic text-faint">“{b.note}”</p>}</div>
          ))}</div>
        </Card>
      )}

      {p.authors.length > 0 && (
        <Card className="mt-4 p-5"><p className="smallcaps mb-2">autores favoritos</p>
          <div className="flex flex-wrap gap-2">{p.authors.map((a) => <Tag key={a} tone="pine">✍️ {a}</Tag>)}</div>
        </Card>
      )}

      {p.music.length > 0 && (
        <Card className="mt-4 p-5"><p className="smallcaps mb-2 flex items-center gap-1.5"><Music size={13} /> música favorita</p>
          <div className="grid gap-2 sm:grid-cols-2">{p.music.map((m, i) => (
            <div key={i} className="rounded-xl border border-line p-3"><p className="text-[14px] font-medium text-ink">{m.title}</p><p className="text-[12.5px] text-mute">{m.artist}</p>{m.note && <p className="mt-1 text-[12px] italic text-faint">{m.note}</p>}</div>
          ))}</div>
        </Card>
      )}

      <Modal open={!!listOpen} onClose={() => setListOpen(null)} title={listOpen === 'followers' ? 'Seguidores' : 'Seguindo'}>
        <div className="space-y-2">
          {people.length === 0 && <p className="py-6 text-center text-[13px] text-mute">Ninguém por aqui ainda.</p>}
          {people.map((u) => (
            <button key={u.id} onClick={() => { setListOpen(null); nav(`/app/perfil/${u.id}`); }} className="flex w-full items-center gap-2.5 rounded-xl border border-line p-2 text-left hover:border-gold/50">
              <span className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-semibold text-[#f7f0e2]" style={{ background: u.color }}>{u.name[0]}</span>
              <span className="flex-1 text-[13.5px] text-ink">{u.name}</span>
              <span className={u.online ? 'text-[11px] text-pine' : 'text-[11px] text-faint'}>{u.online ? 'online' : 'offline'}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
