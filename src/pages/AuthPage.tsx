import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { backend } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button, Field, Input } from '../components/ui';
import { QUOTES } from '../lib/seedContent';
import { friendlyError } from '../lib/utils';

type Mode = 'login' | 'register' | 'recover';

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

/* Cena de biblioteca em SVG: arcos, estantes, luminária e partículas. */
function LibraryScene() {
  return (
    <svg viewBox="0 0 520 620" className="h-full w-full" aria-hidden preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="lampGlow" cx="50%" cy="28%" r="55%">
          <stop offset="0%" stopColor="rgba(233,196,120,.4)" />
          <stop offset="100%" stopColor="rgba(233,196,120,0)" />
        </radialGradient>
        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5d452c" /><stop offset="100%" stopColor="#3a2917" />
        </linearGradient>
      </defs>

      {/* Arcos */}
      <g stroke="rgba(233,223,201,.14)" strokeWidth="2" fill="none">
        <path d="M60 620 V 240 Q60 120 160 120 Q260 120 260 240 V620" />
        <path d="M260 620 V 240 Q260 120 360 120 Q460 120 460 240 V620" />
        <path d="M90 620 V 260 Q90 150 160 150 Q230 150 230 260 V620" opacity=".5" />
        <path d="M290 620 V 260 Q290 150 360 150 Q430 150 430 260 V620" opacity=".5" />
      </g>

      {/* Luz da luminária */}
      <ellipse cx="260" cy="200" rx="240" ry="200" fill="url(#lampGlow)" className="animate-glowpulse" />

      {/* Luminária */}
      <line x1="260" y1="0" x2="260" y2="110" stroke="rgba(233,223,201,.35)" strokeWidth="2" />
      <path d="M235 110 Q260 92 285 110 L278 132 Q260 122 242 132 Z" fill="#c9a96a" opacity=".85" />
      <circle cx="260" cy="136" r="7" fill="#ffd98a">
        <animate attributeName="opacity" values="1;.7;1" dur="4s" repeatCount="indefinite" />
      </circle>

      {/* Estante esquerda */}
      <g>
        {[250, 330, 410, 490].map((y, r) => (
          <g key={y}>
            <rect x="72" y={y} width="150" height="10" fill="url(#wood)" rx="2" />
            {Array.from({ length: 8 }).map((_, i) => {
              const h = 38 + ((i * 13 + r * 7) % 22);
              const colors = ['#6e1f2b', '#1e4d44', '#26364f', '#5a4630', '#3d3550', '#743e2a'];
              return (
                <rect key={i} x={78 + i * 18} y={y - h} width="14" height={h} rx="1.5"
                  fill={colors[(i + r) % colors.length]} opacity=".9" />
              );
            })}
          </g>
        ))}
      </g>
      {/* Estante direita */}
      <g>
        {[250, 330, 410, 490].map((y, r) => (
          <g key={y}>
            <rect x="298" y={y} width="150" height="10" fill="url(#wood)" rx="2" />
            {Array.from({ length: 8 }).map((_, i) => {
              const h = 36 + ((i * 17 + r * 5) % 24);
              const colors = ['#374a3a', '#5c2438', '#26364f', '#743e2a', '#1e4d44', '#5a4630'];
              return (
                <rect key={i} x={304 + i * 18} y={y - h} width="14" height={h} rx="1.5"
                  fill={colors[(i + r + 2) % colors.length]} opacity=".9" />
              );
            })}
          </g>
        ))}
      </g>

      {/* Partículas de poeira na luz */}
      {Array.from({ length: 14 }).map((_, i) => (
        <circle key={i} cx={150 + ((i * 47) % 240)} cy={120 + ((i * 31) % 160)} r={i % 3 === 0 ? 1.8 : 1}
          fill="#ffd98a" opacity={0.25 + (i % 4) * 0.12}>
          <animate attributeName="cy" values={`${120 + ((i * 31) % 160)};${150 + ((i * 31) % 160)};${120 + ((i * 31) % 160)}`}
            dur={`${5 + (i % 4)}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Piso */}
      <rect x="0" y="560" width="520" height="60" fill="rgba(0,0,0,.28)" />
    </svg>
  );
}

export default function AuthPage({ mode }: { mode: Mode }) {
  const nav = useNavigate();
  const location = useLocation() as any;
  const { user, profile, reload } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setQuoteIdx((i) => (i + 1) % QUOTES.length), 7000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setError(''); setSuccess(''); setTouched({});
  }, [mode]);

  // Já autenticado → segue o fluxo.
  useEffect(() => {
    if (user && profile && (mode === 'login' || mode === 'register')) {
      nav(profile.onboarded ? '/app' : '/onboarding', { replace: true });
    }
  }, [user, profile]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (mode === 'register' && name.trim().length < 2) e.name = 'Como devemos te chamar?';
    if (!emailOk(email)) e.email = 'Informe um e-mail válido.';
    if (pass.length < 8) e.pass = 'A senha precisa de pelo menos 8 caracteres.';
    if (mode === 'register' && pass2 !== pass) e.pass2 = 'As senhas não coincidem.';
    return e;
  }, [name, email, pass, pass2, mode]);

  const strength = useMemo(() => {
    let s = 0;
    if (pass.length >= 8) s++;
    if (/[A-Z]/.test(pass)) s++;
    if (/[0-9]/.test(pass)) s++;
    if (/[^A-Za-z0-9]/.test(pass)) s++;
    return s;
  }, [pass]);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setTouched({ name: true, email: true, pass: true, pass2: true });
    if (Object.keys(errors).length > 0) return;
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        const r = await backend.signIn(email.trim(), pass);
        if (!r.ok) throw new Error(r.message);
        await reload();
        nav(location.state?.from || '/app', { replace: true });
      } else if (mode === 'register') {
        const r = await backend.signUp(name.trim(), email.trim(), pass);
        if (!r.ok) throw new Error(r.message);
        if (r.message) setSuccess(r.message);
        else {
          await reload();
          nav('/onboarding', { replace: true });
        }
      } else {
        const r = await backend.resetPassword(email.trim());
        if (!r.ok) throw new Error(r.message);
        setSuccess(r.message || 'Enviamos as instruções para o seu e-mail.');
      }
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  const titles: Record<Mode, [string, string]> = {
    login: ['Bem-vindo de volta', 'Sua biblioteca sentiu sua falta.'],
    register: ['Abra sua biblioteca', 'Um lugar só seu para ler, ouvir e pensar.'],
    recover: ['Recuperar acesso', 'Acontece com os melhores leitores.'],
  };

  const quote = QUOTES[quoteIdx];

  return (
    <div className="flex min-h-screen">
      {/* Painel esquerdo: cena da biblioteca */}
      <div className="relative hidden w-[46%] overflow-hidden bg-[#151009] lg:block">
        <LibraryScene />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0d0a06] via-[#0d0a06]/70 to-transparent p-10 pt-24">
          <AnimatePresence mode="wait">
            <motion.blockquote
              key={quoteIdx}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.7 }}
            >
              <p className="font-display text-2xl italic leading-snug text-[#e9dfc9]">“{quote.text}”</p>
              <footer className="mt-3 text-[13px] uppercase tracking-[0.2em] text-[#a89877]">{quote.author}</footer>
            </motion.blockquote>
          </AnimatePresence>
        </div>
      </div>

      {/* Painel direito: cartão */}
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-[13px] text-faint hover:text-ink">
            <ArrowLeft size={15} /> Voltar
          </Link>
          <div className="card noise relative p-7 md:p-9">
            <div className="mb-7">
              <p className="smallcaps mb-2 text-gold">
                {mode === 'register' ? 'cadastro' : mode === 'login' ? 'entrar' : 'recuperação'}
              </p>
              <h1 className="font-display text-[28px] leading-tight text-ink">{titles[mode][0]}</h1>
              <p className="mt-1.5 text-[14px] text-mute">{titles[mode][1]}</p>
            </div>

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div key="ok" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 14 }}
                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-pine/15 text-pine"
                  >
                    <Check size={26} />
                  </motion.div>
                  <p className="font-display text-xl text-ink">Tudo certo.</p>
                  <p className="mx-auto mt-2 max-w-xs text-sm text-mute">{success}</p>
                  <div className="mt-6">
                    {mode === 'register' && user ? (
                      <Button onClick={() => nav('/onboarding')}>Continuar para o onboarding</Button>
                    ) : (
                      <Button onClick={() => nav('/entrar')}>Ir para o login</Button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.form key={mode} onSubmit={submit} noValidate initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} className="space-y-4">
                  {mode === 'register' && (
                    <Field label="Nome" error={touched.name ? errors.name : undefined}>
                      <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                        placeholder="Como aparece na lombada dos seus livros" autoComplete="name" invalid={!!(touched.name && errors.name)} />
                    </Field>
                  )}
                  <Field label="E-mail" error={touched.email ? errors.email : undefined}>
                    <div className="relative">
                      <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                        placeholder="voce@exemplo.com" autoComplete="email" className="pl-10" invalid={!!(touched.email && errors.email)} />
                    </div>
                  </Field>
                  {mode !== 'recover' && (
                    <Field label="Senha" error={touched.pass ? errors.pass : undefined}>
                      <div className="relative">
                        <KeyRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                        <Input type={showPass ? 'text' : 'password'} value={pass} onChange={(e) => setPass(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, pass: true }))}
                          placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="pl-10 pr-11" invalid={!!(touched.pass && errors.pass)} />
                        <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink">
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {mode === 'register' && pass.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex h-1 flex-1 gap-1">
                            {[0, 1, 2, 3].map((i) => (
                              <div key={i} className={`flex-1 rounded-full transition-colors duration-300 ${i < strength ? (strength <= 2 ? 'bg-gold' : 'bg-pine') : 'bg-line'}`} />
                            ))}
                          </div>
                          <span className="text-[11px] text-faint">{['fraca', 'fraca', 'média', 'boa', 'forte'][strength]}</span>
                        </div>
                      )}
                    </Field>
                  )}
                  {mode === 'register' && (
                    <Field label="Confirmar senha" error={touched.pass2 ? errors.pass2 : undefined}>
                      <Input type={showPass ? 'text' : 'password'} value={pass2} onChange={(e) => setPass2(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, pass2: true }))}
                        placeholder="••••••••" autoComplete="new-password" invalid={!!(touched.pass2 && errors.pass2)} />
                    </Field>
                  )}

                  <AnimatePresence>
                    {error && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0 }}
                        role="alert" className="rounded-xl border border-wine/30 bg-wine-light px-3.5 py-2.5 text-[13px] text-wine">
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <Button type="submit" loading={loading} className="w-full" size="lg">
                    {mode === 'login' ? 'Entrar na biblioteca' : mode === 'register' ? 'Criar minha conta' : 'Enviar link de recuperação'}
                  </Button>

                  <div className="flex flex-col items-center gap-2 pt-1 text-[13.5px] text-mute">
                    {mode === 'login' && (
                      <>
                        <Link to="/registrar" className="font-medium text-wine hover:underline">Não tenho conta — criar cadastro</Link>
                        <Link to="/recuperar" className="hover:text-ink hover:underline">Esqueci minha senha</Link>
                      </>
                    )}
                    {mode === 'register' && <Link to="/entrar" className="font-medium text-wine hover:underline">Já tenho conta — entrar</Link>}
                    {mode === 'recover' && <Link to="/entrar" className="font-medium text-wine hover:underline">Lembrei a senha — voltar</Link>}
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
          <p className="mt-4 text-center text-[11.5px] text-faint">
            Senhas nunca são armazenadas pela aplicação — a autenticação é feita pelo Supabase Auth.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
