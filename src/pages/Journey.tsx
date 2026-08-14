import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { BookOpen, Clock, Flame, Gauge, LibraryBig, Timer } from 'lucide-react';
import { backend } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, Skeleton } from '../components/ui';
import { computeStats } from '../lib/stats';
import { fmt, fmtHours } from '../lib/utils';
import type { Book, Note, ReadingSession } from '../lib/types';

const PIE_COLORS = ['#7c2e3a', '#1e4d44', '#a2814a', '#26364f', '#5a4630', '#3d3550'];

export default function Journey() {
  const { user } = useAuth();
  const location = useLocation() as any;
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([backend.listBooks(user.id), backend.listSessions(user.id), backend.listNotes(user.id)])
      .then(([b, s, n]) => { setBooks(b); setSessions(s); setNotes(n); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const stats = useMemo(() => computeStats(sessions, books, notes, []), [sessions, books, notes]);
  const summary = location.state?.sessionSummary as ReadingSession | undefined;

  const tooltipStyle = {
    background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
    fontSize: 12.5, color: 'var(--ink)',
  } as const;

  if (loading) {
    return (
      <div className="mx-auto w-[min(1100px,94%)] py-8">
        <Skeleton className="mb-6 h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-[min(1100px,94%)] py-6 md:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="smallcaps">estatísticas</p>
          <h1 className="font-display text-[30px] text-ink">Minha jornada</h1>
        </div>
        <nav className="flex gap-1 rounded-xl border border-line p-1" aria-label="Seções da jornada">
          <NavLink to="/app/jornada" end className={({ isActive }) => `rounded-lg px-3.5 py-1.5 text-[13px] font-medium ${isActive ? 'bg-wine text-[#f7f0e2]' : 'text-mute hover:text-ink'}`}>Visão geral</NavLink>
          <NavLink to="/app/jornada/metas" className={({ isActive }) => `rounded-lg px-3.5 py-1.5 text-[13px] font-medium ${isActive ? 'bg-wine text-[#f7f0e2]' : 'text-mute hover:text-ink'}`}>Metas</NavLink>
        </nav>
      </div>

      {summary && (
        <Card className="mb-5 border-pine/40 bg-pine/5 p-5">
          <p className="text-[14.5px] text-ink">
            📖 Última sessão: você leu <strong>{Math.round((summary.end - summary.start) / 60000)} minutos</strong> e avançou{' '}
            <strong>{Math.max(0, summary.pageEnd - summary.pageStart)} páginas</strong>.
          </p>
        </Card>
      )}

      {/* Cartões principais */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {[
          { icon: BookOpen, v: fmt(stats.totalPages), l: 'páginas lidas' },
          { icon: LibraryBig, v: String(stats.finishedBooks), l: 'livros concluídos' },
          { icon: Clock, v: fmtHours(stats.minutes), l: 'horas de leitura' },
          { icon: Timer, v: String(stats.sessionCount), l: 'sessões' },
          { icon: Gauge, v: `${stats.pagesPerHour}`, l: 'páginas/hora' },
          { icon: Flame, v: `${stats.streak}`, l: 'dias seguidos' },
        ].map(({ icon: Icon, v, l }) => (
          <Card key={l} className="p-4 text-center">
            <Icon size={17} className="mx-auto mb-2 text-gold" />
            <p className="font-display text-[24px] leading-none text-ink">{v}</p>
            <p className="mt-1.5 text-[11px] uppercase tracking-wider text-faint">{l}</p>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <p className="smallcaps mb-4">evolução · páginas por dia (8 semanas)</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.daily} margin={{ left: -18, top: 6 }}>
                <defs>
                  <linearGradient id="pagesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c2e3a" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#7c2e3a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10.5, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={false} interval={9} />
                <YAxis tick={{ fontSize: 10.5, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--ink-soft)' }} />
                <Area type="monotone" dataKey="pages" name="páginas" stroke="var(--wine)" strokeWidth={2} fill="url(#pagesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <p className="smallcaps mb-4">gêneros</p>
          {stats.genreCounts.length === 0 ? (
            <p className="py-10 text-center text-sm text-mute">Sem dados ainda.</p>
          ) : (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.genreCounts} dataKey="value" nameKey="name" innerRadius={42} outerRadius={62} paddingAngle={3} strokeWidth={0}>
                      {stats.genreCounts.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 space-y-1.5">
                {stats.genreCounts.slice(0, 4).map((g, i) => (
                  <li key={g.name} className="flex items-center gap-2 text-[12.5px] text-mute">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {g.name}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card className="p-6 lg:col-span-2">
          <p className="smallcaps mb-4">minutos por dia</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.daily.slice(-28)} margin={{ left: -18 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10.5, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--wine-light)' }} />
                <Bar dataKey="minutes" name="minutos" fill="var(--pine)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <p className="smallcaps mb-4">autores mais lidos</p>
          <ul className="space-y-3">
            {stats.topAuthors.map((a) => (
              <li key={a.name}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span className="truncate text-ink">{a.name}</span>
                  <span className="tabular-nums text-faint">{a.count} sessões</span>
                </div>
                <div className="h-1.5 rounded-full bg-line/60">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${(a.count / Math.max(1, stats.topAuthors[0].count)) * 100}%` }} />
                </div>
              </li>
            ))}
            {stats.topAuthors.length === 0 && <p className="py-6 text-center text-sm text-mute">Comece a ler para ver seus autores.</p>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
