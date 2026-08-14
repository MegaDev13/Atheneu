// Sessões de leitura (§23): início/fim, livro, páginas, duração.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { backend } from '../services/api';
import { useAuth } from './AuthContext';
import { uid } from '../lib/utils';
import type { ReadingSession } from '../lib/types';

interface ActiveSession {
  id: string;
  bookId: string;
  start: number;
  pageStart: number;
  pageEnd: number;
}

interface SessionState {
  active: ActiveSession | null;
  startedAt: number | null;
  start: (bookId: string, page: number) => void;
  stop: (page: number) => Promise<ReadingSession | null>;
  updatePage: (page: number) => void;
}

const Ctx = createContext<SessionState>({
  active: null, startedAt: null, start: () => {}, stop: async () => null, updatePage: () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [active, setActive] = useState<ActiveSession | null>(() => {
    try {
      const raw = localStorage.getItem('atheneu-active-session');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (active) localStorage.setItem('atheneu-active-session', JSON.stringify(active));
      else localStorage.removeItem('atheneu-active-session');
    } catch {}
  }, [active]);

  const start = useCallback((bookId: string, page: number) => {
    setActive({ id: uid(), bookId, start: Date.now(), pageStart: page, pageEnd: page });
  }, []);

  const updatePage = useCallback((page: number) => {
    setActive((a) => (a ? { ...a, pageEnd: Math.max(a.pageEnd, page) } : a));
  }, []);

  const stop = useCallback(
    async (page: number) => {
      if (!active || !user) return null;
      const session: ReadingSession = {
        id: active.id,
        bookId: active.bookId,
        start: active.start,
        end: Date.now(),
        pageStart: active.pageStart,
        pageEnd: Math.max(page, active.pageEnd),
      };
      setActive(null);
      try {
        await backend.saveSession(user.id, session);
      } catch (e) {
        console.error('Falha ao salvar sessão', e);
      }
      return session;
    },
    [active, user]
  );

  return (
    <Ctx.Provider value={{ active, startedAt: active?.start ?? null, start, stop, updatePage }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSession = () => useContext(Ctx);
