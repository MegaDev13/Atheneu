import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { backend } from '../services/api';
import type { Profile, SessionUser } from '../lib/types';

interface AuthState {
  loading: boolean;
  user: SessionUser | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthState>({
  loading: true, user: null, profile: null, refreshProfile: async () => {}, reload: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const p = await backend.getProfile(user.id);
      setProfile(p);
    } catch (e) {
      console.error('Falha ao carregar perfil', e);
    }
  }, [user?.id]);

  useEffect(() => {
    let alive = true;
    backend
      .init()
      .then(({ user }) => {
        if (!alive) return;
        setUser(user);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        if (alive) setLoading(false);
      });
    const unsub = backend.onAuthChange((u) => {
      setUser(u);
      if (!u) setProfile(null);
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (user) refreshProfile();
    else setProfile(null);
  }, [user?.id]);

  const signOut = useCallback(async () => {
    await backend.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  // Reconsulta o backend pela sessão atual (usado após login/cadastro em modo demo).
  const reload = useCallback(async () => {
    try {
      const { user } = await backend.init();
      setUser(user);
      if (user) {
        const p = await backend.getProfile(user.id);
        setProfile(p);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <AuthCtx.Provider value={{ loading, user, profile, refreshProfile, reload, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
