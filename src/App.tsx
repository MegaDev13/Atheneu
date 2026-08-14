import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { SessionProvider } from './contexts/SessionContext';
import AppShell from './components/AppShell';

const Landing = lazy(() => import('./pages/Landing'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Library = lazy(() => import('./pages/Library'));
const Reader = lazy(() => import('./pages/Reader'));
const Notes = lazy(() => import('./pages/Notes'));
const Journey = lazy(() => import('./pages/Journey'));
const Goals = lazy(() => import('./pages/Goals'));
const Audiobooks = lazy(() => import('./pages/Audiobooks'));
const Devices = lazy(() => import('./pages/Devices'));
const Knowledge = lazy(() => import('./pages/Knowledge'));
const Clube = lazy(() => import('./pages/Clube'));
const Profile = lazy(() => import('./pages/Profile'));
const Appearance = lazy(() => import('./pages/Appearance'));
const Community = lazy(() => import('./pages/Community'));
const ProfilePublic = lazy(() => import('./pages/ProfilePublic'));
const Messages = lazy(() => import('./pages/Messages'));
const RecapPage = lazy(() => import('./pages/RecapPage'));

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-[#8a3440] to-[#54141f]">
          <span className="font-display text-xl text-[#f2ead8]">A</span>
        </div>
        <p className="smallcaps">abrindo a biblioteca…</p>
      </div>
    </div>
  );
}

function BootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8a3440] to-[#54141f] shadow-deep">
        <span className="font-display text-2xl text-[#f2ead8]">A</span>
      </div>
    </div>
  );
}

function RequireAuth({ children, needsOnboarding }: { children: React.ReactNode; needsOnboarding?: boolean }) {
  const { loading, user, profile } = useAuth();
  const location = useLocation();
  if (loading) return <BootScreen />;
  if (!user) return <Navigate to="/entrar" state={{ from: location.pathname }} replace />;
  if (needsOnboarding === undefined && profile && !profile.onboarded) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

function ReaderRedirect() {
  // /app/ler sem id: segue para o livro atual ou para a biblioteca.
  return <Navigate to="/app/biblioteca" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <SessionProvider>
            <MotionConfig reducedMotion="user">
              <BrowserRouter basename={(import.meta.env.VITE_BASE as string | undefined) && (import.meta.env.VITE_BASE as string) !== './' ? (import.meta.env.VITE_BASE as string) : undefined}>
                <Suspense fallback={<FullScreenLoader />}>
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/entrar" element={<AuthPage mode="login" />} />
                    <Route path="/registrar" element={<AuthPage mode="register" />} />
                    <Route path="/recuperar" element={<AuthPage mode="recover" />} />
                    <Route
                      path="/onboarding"
                      element={
                        <RequireAuth needsOnboarding>
                          <Onboarding />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/app"
                      element={
                        <RequireAuth>
                          <AppShell />
                        </RequireAuth>
                      }
                    >
                      <Route index element={<Dashboard />} />
                      <Route path="biblioteca" element={<Library />} />
                      <Route path="ler" element={<ReaderRedirect />} />
                      <Route path="ler/:bookId" element={<Reader />} />
                      <Route path="notas" element={<Notes />} />
                      <Route path="ouvir" element={<Audiobooks />} />
                      <Route path="dispositivos" element={<Devices />} />
                      <Route path="clube" element={<Clube />} />
                      <Route path="conhecimento" element={<Knowledge />} />
                      <Route path="jornada" element={<Journey />} />
                      <Route path="jornada/metas" element={<Goals />} />
                      <Route path="perfil" element={<Profile />} />
                      <Route path="perfil/:id" element={<ProfilePublic />} />
                      <Route path="comunidade" element={<Community />} />
                      <Route path="mensagens" element={<Messages />} />
                      <Route path="retrospectiva" element={<RecapPage />} />
                      <Route path="aparencia" element={<Appearance />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </MotionConfig>
          </SessionProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
