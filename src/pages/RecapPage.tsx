// RETROSPECTIVA (Reading Wrapped) — experiência narrativa mensal/anual.
// Métricas calculadas pelo sistema; IA só narra. Usa o Theme Engine existente.
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Sparkles, Timer, Flame, PenLine, Award } from 'lucide-react';
import { backend } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card } from '../components/ui';
import { ensureRecaps, buildNarrative, mesLabel } from '../features/recap/engine';
import { fmtMin, type RecapMetrics } from '../features/recap/metrics';
import type { RecapSnapshot } from '../lib/types';

const cardAnim = {
  initial: { opacity: 0, y: 24, scale: 0.98 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as any },
};

export default function RecapPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [recaps, setRecaps] = useState<RecapSnapshot[]>([]);
  const [period, setPeriod] = useState<string | null>(params.get('period'));
  const [narrative, setNarrative] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    ensureRecaps(user.id).then(async (rs) => {
      setRecaps(rs);
      const sel = rs.find((r) => r.period === (params.get('period') || '')) || rs[0];
      if (sel) {
        setPeriod(sel.period);
        if (!sel.viewed) backend.markRecapViewed(user.id, sel.id).catch(() => {});
        setNarrative(await buildNarrative(sel.metrics));
      }
      setLoading(false);
    });
  }, [user?.id]);

  async function pick(p: string) {
    if (!user) return;
    setPeriod(p);
    const r = recaps.find((x) => x.period === p);
    if (r) { if (!r.viewed) backend.markRecapViewed(user.id, r.id).catch(() => {}); setNarrative(await buildNarrative(r.metrics)); }
  }

  const current = recaps.find((r) => r.period === period);
  const m: RecapMetrics | null = current?.metrics || null;
  const monthly = recaps.filter((r) => r.kind === 'monthly');
  const yearly = recaps.filter((r) => r.kind === 'yearly');

  return (
    <div className="mx-auto w-[min(900px,94%)] py-6 md:py-10">
      <div className="mb-5 flex items-center gap-2">
        <Sparkles size={20} className="text-gold" />
        <h1 className="font-display text-[28px] text-ink">Sua retrospectiva de leitura</h1>
      </div>

      {/* arquivo histórico */}
      <div className="mb-6 flex flex-wrap gap-2">
        {monthly.map((r) => (
          <button key={r.id} onClick={() => pick(r.period)} className={`rounded-full border px-3 py-1.5 text-[12.5px] ${period === r.period ? 'border-wine bg-wine text-[#f7f0e2]' : 'border-line text-mute'}`}>
            {mesLabel(r.period)}
          </button>
        ))}
        {yearly.map((r) => (
          <button key={r.id} onClick={() => pick(r.period)} className={`rounded-full border px-3 py-1.5 text-[12.5px] ${period === r.period ? 'border-gold bg-gold text-[#1c1a17]' : 'border-line text-mute'}`}>
            🏆 {r.period}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3"><div className="skeleton h-40" /><div className="skeleton h-40" /></div>
      ) : !m ? (
        <Card className="p-10 text-center">
          <p className="font-display text-[22px] text-ink">Este mês foi mais calmo 📖</p>
          <p className="mt-2 text-sm text-mute">Você ainda não registrou leituras neste período.</p>
          <Button className="mt-4" onClick={() => nav('/app/biblioteca')}>Começar uma leitura</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* narrativa em sequência */}
          {narrative.map((line, i) => (
            <motion.div key={i} {...cardAnim}>
              <Card className="p-6 text-center">
                <p className="font-display text-[20px] leading-relaxed text-ink">{line}</p>
              </Card>
            </motion.div>
          ))}

          {/* cards de métricas */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat icon={BookOpen} v={String(m.booksCompleted)} l="livros concluídos" />
            <Stat icon={BookOpen} v={m.pages.toLocaleString('pt-BR')} l="páginas lidas" />
            <Stat icon={Timer} v={fmtMin(m.minutes)} l="de leitura" />
            <Stat icon={Flame} v={String(m.longestStreak)} l="dias seguidos" />
            <Stat icon={PenLine} v={String(m.sessions)} l="sessões" />
            <Stat icon={Award} v={m.topAuthor?.name || '—'} l="autor do período" small />
          </div>

          {/* evolução */}
          <Card className="p-6">
            <p className="smallcaps mb-3">evolução ({m.period.includes('-') ? 'semanas' : 'meses'})</p>
            <div className="flex h-32 items-end gap-2">
              {m.evolution.map((e, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <motion.div initial={{ height: 0 }} whileInView={{ height: `${maxPct(e.pages, m)}%` }} viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.05 }} className="w-full rounded-t-md bg-gradient-to-t from-wine to-gold" />
                  <span className="text-[10px] text-faint">{e.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <motion.div {...cardAnim}>
            <Card className="p-8 text-center">
              <p className="font-display text-[22px] text-ink">{m.period.includes('-') ? 'Até o próximo mês.' : 'Até o próximo ano.'}</p>
              <p className="mt-1 text-sm text-mute">Sua biblioteca continua crescendo. 📚</p>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function maxPct(v: number, m: RecapMetrics) {
  const max = Math.max(...m.evolution.map((e) => e.pages), 1);
  return Math.max(4, (v / max) * 100);
}
function Stat({ icon: Icon, v, l, small }: { icon: any; v: string; l: string; small?: boolean }) {
  return (
    <Card className="p-4 text-center">
      <Icon size={16} className="mx-auto mb-1 text-gold" />
      <p className={`font-display text-ink ${small ? 'truncate text-[16px]' : 'text-[22px]'}`}>{v}</p>
      <p className="mt-0.5 text-[10.5px] uppercase tracking-wider text-faint">{l}</p>
    </Card>
  );
}
