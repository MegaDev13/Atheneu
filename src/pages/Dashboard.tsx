import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Headphones, Target, Sparkles, Clock, ArrowRight, PlayCircle,
  Plus, LibraryBig, StickyNote, Flame,
} from 'lucide-react';
import { backend } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSession } from '../contexts/SessionContext';
import { Button, Card, ProgressBar, ProgressRing, Skeleton } from '../components/ui';
import BookCover from '../components/BookCover';
import { buildInsight, computeStats, goalStatus } from '../lib/stats';
import { fmt, fmtHours, greeting, relTime } from '../lib/utils';
import type { Activity, Book, Goal, Note, Progress, ReadingSession, SocialBundle } from '../lib/types';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { active, start } = useSession();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [social, setSocial] = useState<SocialBundle | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [b, p, s, g, a, n, so] = await Promise.all([
          backend.listBooks(user.id),
          backend.listProgress(user.id),
          backend.listSessions(user.id),
          backend.listGoals(user.id),
          backend.listActivities(user.id),
          backend.listNotes(user.id),
          backend.getSocial(user.id),
        ]);
        setBooks(b); setProgress(p); setSessions(s); setGoals(g); setActivities(a); setNotes(n); setSocial(so);
      } catch (e) {
        console.error('Erro ao carregar dashboard', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const current = useMemo(() => {
    const reading = books.filter((b) => b.status === 'reading');
    if (reading.length === 0) return null;
    return reading.sort((a, b) => b.lastAccess - a.lastAccess)[0];
  }, [books]);

  const currentProgress = current ? progress.find((p) => p.bookId === current.id) : null;
  const pct = useMemo(() => {
    if (!current) return 0;
    if (currentProgress && current.pages > 0) {
      return Math.min(1, Math.max(0.02, currentProgress.page / current.pages));
    }
    const loc = currentProgress ? (currentProgress.chapter + currentProgress.location) / 3 : 0;
    return Math.min(1, Math.max(0.02, loc));
  }, [current, currentProgress]);

  const audioBook = useMemo(() => {
    const withAudio = books.filter((b) => ['reading', 'paused', 'finished', 'want'].includes(b.status));
    return withAudio.sort((a, b) => b.lastAccess - a.lastAccess)[1] || withAudio[0] || null;
  }, [books]);

  const stats = useMemo(() => computeStats(sessions, books, notes, []), [sessions, books, notes]);
  const yearGoal = goals.find((g) => g.period === 'year' && g.kind === 'books');
  const gs = yearGoal ? goalStatus(yearGoal, books, sessions) : null;
  const insight = useMemo(() => buildInsight(books, notes, []), [books, notes]);

  const firstName = (profile?.name || user?.name || '').split(' ')[0];

  if (loading) {
    return (
      <div className="mx-auto w-[min(1200px,94%)] py-8">
        <Skeleton className="mb-6 h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-56 md:col-span-2" /><Skeleton className="h-56" />
          <Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-[min(1200px,94%)] py-6 md:py-8">
      {/* Saudação */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="smallcaps mb-1">
            {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
          </p>
          <h1 className="font-display text-[30px] leading-tight text-ink md:text-[34px]">
            {greeting()}, {firstName}.
          </h1>
        </div>
        {!active && current && (
          <Button variant="outline" onClick={() => start(current.id, currentProgress?.page || 1)}>
            <PlayCircle size={16} /> Iniciar sessão de leitura
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Continuar lendo */}
        <Card className="p-6 lg:col-span-2">
          {current ? (
            <div className="flex flex-col gap-6 sm:flex-row">
              <motion.div
                whileHover={{ y: -4, rotate: -1 }}
                className="mx-auto shrink-0 sm:mx-0"
                onClick={() => nav(`/app/ler/${current.id}`)}
                role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && nav(`/app/ler/${current.id}`)}
              >
                <BookCover title={current.title} author={current.author} cover={current.cover} className="h-48 w-32 cursor-pointer shadow-deep" />
              </motion.div>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="smallcaps text-wine">continuar lendo</p>
                <h2 className="mt-1 font-display text-2xl leading-snug text-ink">{current.title}</h2>
                <p className="text-[14px] text-mute">{current.author}</p>
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-[12.5px] text-mute">
                    <span>{currentProgress ? `página ${currentProgress.page}` : 'primeiras páginas'}</span>
                    <span className="tabular-nums">{Math.round(pct * 100)}%</span>
                  </div>
                  <ProgressBar value={pct} />
                </div>
                <p className="mt-2 text-[12px] text-faint">último acesso {relTime(current.lastAccess)}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Button onClick={() => nav(`/app/ler/${current.id}`)}>
                    <BookOpen size={16} /> Continuar
                  </Button>
                  <Button variant="outline" onClick={() => nav('/app/ouvir')}>
                    <Headphones size={16} /> Continuar no audiobook
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <LibraryBig size={34} className="mb-3 text-gold" />
              <p className="font-display text-xl text-ink">Sua estante está esperando pelos primeiros livros.</p>
              <Link to="/app/biblioteca" state={{ openAdd: true }} className="mt-4">
                <Button><Plus size={16} /> Adicionar meu primeiro livro</Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Meta */}
        <Card className="flex flex-col items-center justify-center p-6 text-center">
          <p className="smallcaps mb-3">meta de leitura</p>
          {gs && yearGoal ? (
            <>
              <ProgressRing value={gs.pct} size={110} stroke={9} />
              <p className="mt-3 text-[14px] text-mute">
                <strong className="font-display text-lg text-ink">{gs.done}</strong> de {yearGoal.target} livros {gs.periodLabel}
              </p>
              {gs.paceText && <p className="mt-1.5 max-w-[220px] text-[12px] leading-relaxed text-faint">{gs.paceText}</p>}
              <Link to="/app/jornada/metas" className="mt-3 text-[13px] font-medium text-wine hover:underline">Ver metas</Link>
            </>
          ) : (
            <>
              <Target size={30} className="mb-2 text-gold" />
              <p className="text-sm text-mute">Defina uma meta para acompanhar seu ritmo.</p>
              <Link to="/app/jornada/metas"><Button size="sm" variant="outline" className="mt-3">Criar meta</Button></Link>
            </>
          )}
        </Card>

        {/* Números */}
        {[
          { icon: BookOpen, label: 'páginas no mês', value: fmt(stats.pagesThisMonth) },
          { icon: Clock, label: 'tempo no mês', value: fmtHours(stats.minutesThisMonth) },
          { icon: Flame, label: 'sequência', value: `${stats.streak} dia${stats.streak === 1 ? '' : 's'}` },
        ].map(({ icon: Icon, label, value }, i) => (
          <Card key={label} className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-wine-light text-wine">
              <Icon size={19} />
            </div>
            <div>
              <p className="font-display text-[26px] leading-none text-ink">{value}</p>
              <p className="mt-1 text-[12px] uppercase tracking-wider text-faint">{label}</p>
            </div>
          </Card>
        ))}

        {/* Continue escutando */}
        <Card className="p-6 lg:col-span-2">
          <p className="smallcaps mb-3 text-wine">continue escutando</p>
          {audioBook ? (
            <div className="flex items-center gap-4">
              <BookCover title={audioBook.title} author={audioBook.author} cover={audioBook.cover} compact className="h-20 w-14 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg text-ink">{audioBook.title}</p>
                <p className="text-[13px] text-mute">{audioBook.author}</p>
                <div className="mt-2"><ProgressBar value={0.35} tone="pine" /></div>
              </div>
              <button
                onClick={() => nav('/app/ouvir')}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pine text-[#f7f0e2] shadow-card transition-transform hover:scale-105"
                aria-label={`Ouvir ${audioBook.title}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
              </button>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-mute">Nenhum audiobook iniciado ainda.</p>
          )}
        </Card>

        {/* Insight */}
        <Card className="noise p-6">
          <p className="smallcaps mb-3 flex items-center gap-1.5 text-gold"><Sparkles size={13} /> insight da sua biblioteca</p>
          <p className="font-display text-[16.5px] italic leading-relaxed text-ink">{insight}</p>
          <Link to="/app/conhecimento" className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-wine hover:underline">
            Explorar conceitos <ArrowRight size={13} />
          </Link>
        </Card>

        {/* Atividade recente */}
        <Card className="p-6 lg:col-span-2">
          <p className="smallcaps mb-4">atividade recente</p>
          {activities.length === 0 ? (
            <p className="py-4 text-sm text-mute">Sua atividade aparecerá aqui conforme você lê.</p>
          ) : (
            <ul className="space-y-1">
              {activities.slice(0, 5).map((a) => {
                const book = books.find((b) => b.id === a.bookId);
                return (
                  <li key={a.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-card2/60">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card2 text-mute">
                      {a.kind === 'added' ? <Plus size={16} /> : a.kind === 'note' ? <StickyNote size={15} /> : a.kind === 'finished' ? <BookOpen size={15} /> : <BookOpen size={15} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] text-ink">Você {a.text}</p>
                    </div>
                    <span className="shrink-0 text-[11.5px] text-faint">{relTime(a.at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Presença social */}
        <Card className="p-6">
          <p className="smallcaps mb-3">lendo com você</p>
          {social && Object.keys(social.readers).length > 0 && current && social.readers[current.id]?.length ? (
            <ul className="space-y-3">
              {social.readers[current.id].slice(0, 4).map((r) => {
                const person = social.people.find((p) => p.id === r.personId);
                if (!person) return null;
                return (
                  <li key={r.personId} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold text-[#f7f0e2]" style={{ background: person.color }}>
                      {person.name[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink">{person.name}</p>
                      <ProgressBar value={r.progress} className="mt-1" tone="pine" />
                    </div>
                    <span className="text-[11.5px] tabular-nums text-faint">{Math.round(r.progress * 100)}%</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm leading-relaxed text-mute">Quando pessoas que você segue estiverem lendo os mesmos livros, você verá o progresso delas aqui.</p>
          )}
          <Link to="/app/clube" className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-wine hover:underline">
            Ir ao clube <ArrowRight size={13} />
          </Link>
        </Card>
      </div>
    </div>
  );
}
