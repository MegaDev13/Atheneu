import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Home, LibraryBig, BookOpen, Headphones, Users, Brain, BarChart3, User,
  Bell, LogOut, Moon, Sun, Timer, Plus, Monitor,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSession } from '../contexts/SessionContext';
import { backend, isDemo } from '../services/api';
import type { Notification } from '../lib/types';
import { relTime } from '../lib/utils';

function Logo({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#8a3440] to-[#54141f] shadow-card">
        <span className="font-display text-lg leading-none text-[#f2ead8]">A</span>
      </div>
      {!small && (
        <div>
          <p className="font-display text-[19px] leading-none tracking-tight text-ink">Atheneu</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-faint">biblioteca viva</p>
        </div>
      )}
    </div>
  );
}

const NAV = [
  { to: '/app', icon: Home, label: 'Início', end: true },
  { to: '/app/biblioteca', icon: LibraryBig, label: 'Biblioteca' },
  { to: '/app/ler', icon: BookOpen, label: 'Leitura' },
  { to: '/app/ouvir', icon: Headphones, label: 'Ouvir' },
  { to: '/app/dispositivos', icon: Monitor, label: 'Dispositivos' },
  { to: '/app/clube', icon: Users, label: 'Clube' },
  { to: '/app/conhecimento', icon: Brain, label: 'Conhecimento' },
  { to: '/app/jornada', icon: BarChart3, label: 'Minha jornada' },
];

const MOBILE_NAV = [
  { to: '/app', icon: Home, label: 'Início', end: true },
  { to: '/app/biblioteca', icon: LibraryBig, label: 'Biblioteca' },
  { to: '/app/clube', icon: Users, label: 'Clube' },
  { to: '/app/ouvir', icon: Headphones, label: 'Áudio' },
  { to: '/app/perfil', icon: User, label: 'Perfil' },
];

function SessionPill() {
  const { active, startedAt, stop } = useSession();
  const nav = useNavigate();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  if (!active) return null;
  const secs = Math.floor((now - (startedAt || now)) / 1000);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      onClick={async () => {
        const s = await stop(0);
        if (s) nav('/app/jornada', { state: { sessionSummary: s } });
      }}
      className="fixed bottom-20 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-gold/40 bg-card px-4 py-2 text-sm shadow-deep md:bottom-6 md:left-auto md:right-6 md:translate-x-0"
      aria-label="Encerrar sessão de leitura"
    >
      <Timer size={15} className="text-gold" />
      <span className="font-medium tabular-nums text-ink">{mm}:{ss}</span>
      <span className="text-faint">· encerrar</span>
    </motion.button>
  );
}

function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    backend.listNotifications(user.id).then(setItems).catch(() => {});
  }, [user?.id, open]);

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && user) backend.markNotificationsRead(user.id).catch(() => {});
        }}
        className="relative rounded-xl p-2 text-mute transition-colors hover:bg-wine-light hover:text-ink"
        aria-label={`Notificações${unread ? ` (${unread} não lidas)` : ''}`}
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-wine" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
              className="card absolute right-0 z-50 mt-2 w-80 overflow-hidden p-2"
            >
              <p className="smallcaps px-3 py-2">Notificações</p>
              <div className="max-h-80 overflow-y-auto">
                {items.length === 0 && <p className="px-3 pb-3 text-sm text-mute">Sem novidades por aqui.</p>}
                {items.map((n) => (
                  <div key={n.id} className={`flex gap-2.5 rounded-xl px-3 py-2.5 text-sm ${n.read ? 'opacity-70' : 'bg-wine-light/60'}`}>
                    <span aria-hidden>{n.icon}</span>
                    <div>
                      <p className="leading-snug text-ink">{n.text}</p>
                      <p className="mt-0.5 text-[11.5px] text-faint">{relTime(n.at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AppShell() {
  const { profile, user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [demoNotice, setDemoNotice] = useState(() => !localStorage.getItem('atheneu-demo-dismissed'));

  // Presença: heartbeat de "estou online" (independente de qualquer outra ação)
  useEffect(() => {
    if (!user) return;
    backend.sendHeartbeat(user.id).catch(() => {});
    const t = setInterval(() => backend.sendHeartbeat(user.id).catch(() => {}), 60_000);
    return () => clearInterval(t);
  }, [user?.id]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-paper/80 px-4 py-5 backdrop-blur-md md:flex">
        <Logo />
        <nav className="mt-7 flex flex-1 flex-col gap-1" aria-label="Navegação principal">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-200 ${
                  isActive ? 'bg-wine-light text-wine' : 'text-mute hover:bg-card2 hover:text-ink'
                }`
              }
            >
              <Icon size={17} className="transition-transform duration-200 group-hover:scale-110" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2">
          <NavLink to="/app/biblioteca" state={{ openAdd: true }} className="flex items-center gap-2 rounded-xl border border-gold/40 px-3 py-2 text-[13px] font-medium text-gold transition-colors hover:bg-gold/10">
            <Plus size={15} /> Adicionar livro
          </NavLink>
          <div className="flex items-center justify-between rounded-xl bg-card2/60 px-3 py-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-[#f7f0e2]" style={{ background: profile?.color || '#6e1f2b' }}>
                {profile?.name?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">{profile?.name || user?.name}</p>
                <p className="truncate text-[11px] text-faint">{user?.email}</p>
              </div>
            </div>
            <button onClick={() => signOut()} aria-label="Sair da conta" className="rounded-lg p-1.5 text-faint hover:bg-wine-light hover:text-wine">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Área principal */}
      <div className="flex min-h-screen flex-1 flex-col md:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/80 px-4 py-3 backdrop-blur-md md:px-8">
          <div className="md:hidden"><Logo /></div>
          <div className="hidden md:block">
            <p className="font-display text-[15px] italic text-mute">“Um livro é um machado para o mar congelado dentro de nós.”</p>
          </div>
          <div className="flex items-center gap-1">
            {isDemo && demoNotice && (
              <span className="mr-2 hidden items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11.5px] font-medium text-gold lg:flex">
                Modo demonstração
                <button onClick={() => { localStorage.setItem('atheneu-demo-dismissed', '1'); setDemoNotice(false); }} aria-label="Dispensar aviso">×</button>
              </span>
            )}
            <button onClick={toggle} aria-label="Alternar tema claro/escuro" className="rounded-xl p-2 text-mute transition-colors hover:bg-wine-light hover:text-ink">
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 pb-24 md:pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom nav mobile */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-line bg-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
          aria-label="Navegação inferior"
        >
          {MOBILE_NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-medium transition-colors ${isActive ? 'text-wine' : 'text-faint'}`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>

        <SessionPill />
      </div>
    </div>
  );
}
