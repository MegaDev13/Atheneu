import { motion, MotionConfig, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  BookOpen, Headphones, Brain, GitBranch, BarChart3, ArrowRight, Moon, Sparkles,
} from 'lucide-react';
import BookCover from '../components/BookCover';
import { Button } from '../components/ui';
import { useTheme } from '../contexts/ThemeContext';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.65, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] } }),
};

function ParticleField() {
  const reduced = useReducedMotion();
  if (reduced) return null;
  const dots = Array.from({ length: 26 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {dots.map((i) => (
        <span
          key={i}
          className="absolute rounded-full bg-gold"
          style={{
            width: i % 4 === 0 ? 3 : 2,
            height: i % 4 === 0 ? 3 : 2,
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 100}%`,
            opacity: 0.12 + (i % 5) * 0.05,
            animation: `floaty ${6 + (i % 5)}s ease-in-out ${i * 0.4}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function SectionHead({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="mx-auto mb-10 max-w-2xl text-center">
      <p className="smallcaps mb-3 text-gold">{kicker}</p>
      <h2 className="font-display text-3xl text-ink md:text-4xl">{title}</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-mute">{sub}</p>
    </motion.div>
  );
}

export default function Landing() {
  const { theme, toggle } = useTheme();
  const reduced = useReducedMotion();

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen overflow-x-clip">
        {/* ─── Navbar ─── */}
        <header className="fixed inset-x-0 top-0 z-50">
          <div className="glass mx-auto mt-3 flex w-[min(1100px,94%)] items-center justify-between rounded-2xl px-4 py-2.5 shadow-card md:px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#8a3440] to-[#54141f]">
                <span className="font-display text-lg text-[#f2ead8]">A</span>
              </div>
              <span className="font-display text-xl text-ink">Atheneu</span>
            </div>
            <nav className="hidden items-center gap-6 text-[13.5px] font-medium text-mute md:flex" aria-label="Seções">
              <a href="#leia" className="hover:text-ink">Leia</a>
              <a href="#escute" className="hover:text-ink">Escute</a>
              <a href="#entenda" className="hover:text-ink">Entenda</a>
              <a href="#conecte" className="hover:text-ink">Conecte</a>
              <a href="#acompanhe" className="hover:text-ink">Acompanhe</a>
            </nav>
            <div className="flex items-center gap-2">
              <button onClick={toggle} aria-label="Alternar tema" className="rounded-xl p-2 text-mute hover:bg-wine-light hover:text-ink">
                {theme === 'dark' ? <Sparkles size={17} /> : <Moon size={17} />}
              </button>
              <Link to="/entrar"><Button variant="ghost" size="sm">Entrar</Button></Link>
              <Link to="/registrar"><Button size="sm">Criar conta</Button></Link>
            </div>
          </div>
        </header>

        {/* ─── Hero ─── */}
        <section className="relative flex min-h-[92vh] items-center pt-28">
          <ParticleField />
          <div className="mx-auto grid w-[min(1140px,92%)] items-center gap-12 md:grid-cols-2">
            <div>
              <motion.p variants={fadeUp} initial="hidden" animate="show" className="smallcaps mb-4 text-gold">
                biblioteca digital pessoal
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 34 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="font-display text-[44px] leading-[1.06] tracking-tight text-ink md:text-6xl"
              >
                Sua biblioteca.<br />
                Sua leitura.<br />
                <em className="text-wine">Seu conhecimento.</em>
              </motion.h1>
              <motion.p
                variants={fadeUp} custom={2} initial="hidden" animate="show"
                className="mt-6 max-w-md text-[16px] leading-relaxed text-mute"
              >
                O Atheneu acompanha toda a sua jornada: leia, escute audiobooks, anote, destaque,
                conecte ideias entre livros e veja sua evolução intelectual ao longo do tempo.
              </motion.p>
              <motion.div variants={fadeUp} custom={3} initial="hidden" animate="show" className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/registrar">
                  <Button size="lg">Começar gratuitamente <ArrowRight size={17} /></Button>
                </Link>
                <a href="#leia">
                  <Button size="lg" variant="outline">Explorar</Button>
                </a>
              </motion.div>
            </div>

            {/* Composição: livros flutuando */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative hidden h-[420px] select-none md:block"
              aria-hidden
            >
              <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/10 blur-3xl" />
              <motion.div animate={reduced ? {} : { y: [0, -14, 0], rotate: [-4, -2.5, -4] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} className="absolute left-6 top-10 w-40">
                <BookCover title="Meditações" author="Marco Aurélio" className="aspect-[2/3] shadow-deep" />
              </motion.div>
              <motion.div animate={reduced ? {} : { y: [0, -20, 0], rotate: [3, 5, 3] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }} className="absolute right-8 top-24 w-44">
                <BookCover title="Crime e Castigo" author="Fiódor Dostoiévski" className="aspect-[2/3] shadow-deep" />
              </motion.div>
              <motion.div animate={reduced ? {} : { y: [0, -10, 0], rotate: [-1, 1.5, -1] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }} className="absolute bottom-2 left-1/2 w-36 -translate-x-1/2">
                <BookCover title="O Mito de Sísifo" author="Albert Camus" className="aspect-[2/3] shadow-deep" />
              </motion.div>
              <div className="absolute bottom-10 left-1/2 h-px w-72 -translate-x-1/2 goldline" />
            </motion.div>
          </div>
        </section>

        {/* ─── Leia ─── */}
        <section id="leia" className="mx-auto w-[min(1140px,92%)] py-24">
          <SectionHead
            kicker="leia" title="Um leitor feito para horas de leitura"
            sub="Tipografia editorial, modo claro, escuro e sépia, destaques e notas a um gesto — sem depender do visualizador do navegador."
          />
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="card mx-auto max-w-3xl p-8 md:p-12">
            <p className="smallcaps mb-6">Capítulo III · O muro e os olhos de ressaca</p>
            <p className="dropcap font-reader text-[17px] leading-[1.85] text-ink md:text-[18px]">
              Foi ali que Capitu, ainda menina, me disse as primeiras palavras que me ficaram para sempre
              gravadas. <mark className="hl-yellow">Falávamos do seminário, da minha mãe, do futuro</mark>, e
              ela, com aqueles olhos que eu definiria de <mark className="hl-green">ressaca — olhos de onda que
              se retém e puxa</mark> — me perguntou se eu teria ânimo de ser padre.
            </p>
            <div className="mt-8 flex items-center gap-2 text-[12px] text-faint">
              <BookOpen size={14} className="text-wine" /> Fonte, espaçamento e tema ajustáveis · destaques em 4 cores
            </div>
          </motion.div>
        </section>

        {/* ─── Escute ─── */}
        <section id="escute" className="border-y border-line bg-paper/60 py-24">
          <div className="mx-auto w-[min(1140px,92%)]">
            <SectionHead
              kicker="escute" title="Transforme sua estante em audiobooks"
              sub="Um pipeline dedicado converte seus livros em áudio capítulo a capítulo, e o player retoma de onde você parou — com velocidade ajustável."
            />
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="card mx-auto flex max-w-2xl items-center gap-5 p-6">
              <BookCover title="Meditações" author="Marco Aurélio" className="h-24 w-16 shrink-0" compact />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg text-ink">Meditações</p>
                <p className="text-[13px] text-mute">Livro IV · 12:48 restantes</p>
                <div className="mt-3 h-1.5 w-full rounded-full bg-line/60">
                  <div className="h-full w-[62%] rounded-full bg-wine" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden rounded-lg border border-line px-2 py-1 text-[11px] text-mute sm:block">1,25×</span>
                <button className="flex h-12 w-12 items-center justify-center rounded-full bg-wine text-[#f7f0e2] shadow-card" aria-label="Reproduzir">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                </button>
              </div>
            </motion.div>
            <p className="mt-6 flex items-center justify-center gap-2 text-[13px] text-faint">
              <Headphones size={14} /> Leitura ↔ áudio sincronizados: continue no audiobook sem perder o trecho.
            </p>
          </div>
        </section>

        {/* ─── Entenda ─── */}
        <section id="entenda" className="mx-auto w-[min(1140px,92%)] py-24">
          <SectionHead
            kicker="entenda" title="Pergunte à sua biblioteca"
            sub="Uma IA que conhece os seus livros, as suas notas e os seus destaques — e responde com referências ao que você já leu."
          />
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="mx-auto max-w-2xl space-y-3">
            <div className="card ml-auto max-w-[85%] bg-wine p-4 text-right text-[14px] text-[#f7f0e2]">
              Quais livros falam sobre niilismo?
            </div>
            <div className="card max-w-[85%] p-4 text-[14px] leading-relaxed text-ink">
              Encontrei referências em <em>O Mito de Sísifo</em> (Camus responde ao niilismo com a revolta lúcida)
              e nas suas notas de <em>Crime e Castigo</em>, onde você escreveu que “o castigo começa antes do crime”.
              <span className="mt-2 block text-[12px] text-faint">2 livros · 3 anotações relacionadas</span>
            </div>
            <div className="flex justify-center pt-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-1.5 text-[12.5px] text-mute">
                <Brain size={14} className="text-pine" /> Notas, destaques e conceitos, sempre isolados por usuário
              </span>
            </div>
          </motion.div>
        </section>

        {/* ─── Conecte ─── */}
        <section id="conecte" className="border-y border-line bg-paper/60 py-24">
          <div className="mx-auto w-[min(1140px,92%)]">
            <SectionHead
              kicker="conecte" title="Um mapa do seu pensamento"
              sub="Conceitos recorrentes nas suas leituras se ligam entre si: niilismo, absurdo, liberdade, moral — e os livros onde eles aparecem."
            />
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="card relative mx-auto max-w-2xl overflow-hidden p-8">
              <svg viewBox="0 0 600 260" className="w-full" aria-label="Mapa de conceitos: niilismo ligado a Nietzsche e Camus; moral e absurdo ligados à existência">
                <g stroke="var(--line)" strokeWidth="1.4">
                  <line x1="300" y1="46" x2="170" y2="130" /><line x1="300" y1="46" x2="430" y2="130" />
                  <line x1="170" y1="130" x2="240" y2="212" /><line x1="430" y1="130" x2="360" y2="212" />
                  <line x1="240" y1="212" x2="360" y2="212" />
                </g>
                {[
                  { x: 300, y: 40, t: 'NIILISMO', big: true },
                  { x: 170, y: 130, t: 'NIETZSCHE' },
                  { x: 430, y: 130, t: 'CAMUS' },
                  { x: 240, y: 212, t: 'MORAL' },
                  { x: 360, y: 212, t: 'EXISTÊNCIA' },
                ].map((n) => (
                  <g key={n.t}>
                    <circle cx={n.x} cy={n.y} r={n.big ? 30 : 22} fill="var(--wine-light)" stroke="var(--wine)" strokeOpacity=".5" />
                    <text x={n.x} y={n.y + 3} textAnchor="middle" fontSize={n.big ? 10 : 8.5} fill="var(--ink)" fontFamily="Inter, sans-serif" letterSpacing="1.5">{n.t}</text>
                  </g>
                ))}
              </svg>
              <p className="mt-4 flex items-center justify-center gap-2 text-[13px] text-faint">
                <GitBranch size={14} /> Nós interativos mostram livros, trechos e notas de cada conceito
              </p>
            </motion.div>
          </div>
        </section>

        {/* ─── Acompanhe ─── */}
        <section id="acompanhe" className="mx-auto w-[min(1140px,92%)] py-24">
          <SectionHead
            kicker="acompanhe" title="Sua evolução, página a página"
            sub="Metas, sessões de leitura, ritmo, gêneros e autores: uma jornada que se desenha sozinha enquanto você lê."
          />
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="grid gap-4 md:grid-cols-4">
            {[
              { n: '27', l: 'livros na estante' },
              { n: '4.218', l: 'páginas lidas' },
              { n: '62 h', l: 'de leitura' },
              { n: '12 dias', l: 'de sequência' },
            ].map((s, i) => (
              <div key={s.l} className="card p-6 text-center">
                <p className="font-display text-3xl text-wine">{s.n}</p>
                <p className="mt-1 text-[12.5px] uppercase tracking-wider text-faint">{s.l}</p>
              </div>
            ))}
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card mx-auto mt-4 max-w-3xl p-6">
            <p className="smallcaps mb-4">páginas por semana</p>
            <div className="flex h-28 items-end gap-2" aria-hidden>
              {[35, 52, 41, 66, 58, 74, 49, 81, 63, 92, 70, 100].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-wine/70 to-wine"
                />
              ))}
            </div>
          </motion.div>
        </section>

        {/* ─── CTA final ─── */}
        <section className="relative overflow-hidden border-t border-line bg-paper/60 py-24">
          <ParticleField />
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="font-display text-3xl text-ink md:text-4xl">Uma biblioteca clássica,<br />reinventada para hoje.</h2>
            <p className="mt-4 text-mute">Comece gratuitamente. Sua estante está esperando.</p>
            <div className="mt-8 flex justify-center gap-3">
              <Link to="/registrar"><Button size="lg">Criar minha biblioteca</Button></Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-line py-8">
          <div className="mx-auto flex w-[min(1140px,92%)] flex-col items-center justify-between gap-3 text-[12.5px] text-faint md:flex-row">
            <span className="font-display text-base text-ink">Atheneu</span>
            <span>Leitura · Áudio · Conhecimento · Comunidade</span>
            <span>© 2026</span>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
