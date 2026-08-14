import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, Plus, Target, Trash2 } from 'lucide-react';
import { backend } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button, Card, Field, Input, Modal, ProgressRing, Select } from '../components/ui';
import { goalStatus } from '../lib/stats';
import { fmt, uid } from '../lib/utils';
import type { Book, Goal, ReadingSession } from '../lib/types';

const KIND_LABEL = { books: 'Livros', pages: 'Páginas', minutes: 'Tempo (min)' } as const;

export default function Goals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [open, setOpen] = useState(false);

  const [kind, setKind] = useState<Goal['kind']>('books');
  const [target, setTarget] = useState(20);
  const [period, setPeriod] = useState<Goal['period']>('year');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([backend.listGoals(user.id), backend.listBooks(user.id), backend.listSessions(user.id)])
      .then(([g, b, s]) => { setGoals(g); setBooks(b); setSessions(s); })
      .catch(() => {});
  }, [user?.id]);

  async function createGoal() {
    if (!user || target < 1) return;
    setSaving(true);
    try {
      const g: Goal = { id: uid(), kind, target, period, createdAt: Date.now() };
      await backend.saveGoal(user.id, g);
      setGoals((xs) => [...xs, g]);
      setOpen(false);
      toast('Meta criada. Boa leitura! 🎯');
    } catch {
      toast('Não foi possível criar a meta.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-[min(1100px,94%)] py-6 md:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="smallcaps">metas</p>
          <h1 className="font-display text-[30px] text-ink">Minha jornada · Metas</h1>
        </div>
        <div className="flex items-center gap-3">
          <nav className="flex gap-1 rounded-xl border border-line p-1" aria-label="Seções da jornada">
            <NavLink to="/app/jornada" className="rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-mute hover:text-ink">Visão geral</NavLink>
            <NavLink to="/app/jornada/metas" className="rounded-lg bg-wine px-3.5 py-1.5 text-[13px] font-medium text-[#f7f0e2]">Metas</NavLink>
          </nav>
          <Button onClick={() => setOpen(true)}><Plus size={16} /> Nova meta</Button>
        </div>
      </div>

      {goals.length === 0 ? (
        <Card className="flex flex-col items-center p-14 text-center">
          <Target size={34} className="mb-3 text-gold" />
          <p className="font-display text-xl text-ink">Nenhuma meta definida.</p>
          <p className="mt-2 max-w-sm text-sm text-mute">Exemplo: “Ler 20 livros em 2026.” O Atheneu calcula o ritmo necessário para você chegar lá.</p>
          <Button className="mt-5" onClick={() => setOpen(true)}><Plus size={16} /> Criar minha primeira meta</Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => {
            const gs = goalStatus(g, books, sessions);
            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={`p-6 ${gs.met ? 'border-gold/50' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-display text-[20px] text-ink">
                        {g.kind === 'books' ? `Ler ${g.target} livros` : g.kind === 'pages' ? `Ler ${fmt(g.target)} páginas` : `${fmt(g.target)} minutos de leitura`}{' '}
                        <span className="text-mute">{gs.periodLabel}</span>
                      </p>
                      <p className="mt-1 text-[13px] text-mute">
                        {gs.met ? 'Meta atingida — parabéns! ✨' : `${fmt(gs.done)} de ${fmt(g.target)} · faltam ${gs.remainingDays} dias`}
                      </p>
                      {gs.paceText && (
                        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-card2/60 px-3 py-2 text-[12.5px] text-mute">
                          <CalendarDays size={13} className="shrink-0 text-gold" /> {gs.paceText}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <ProgressRing value={gs.pct} size={92} stroke={8} />
                      <button
                        onClick={async () => {
                          if (!user) return;
                          await backend.deleteGoal(user.id, g.id);
                          setGoals((xs) => xs.filter((x) => x.id !== g.id));
                          toast('Meta removida.', 'info');
                        }}
                        aria-label="Excluir meta" className="rounded-lg p-1.5 text-faint hover:bg-wine-light hover:text-wine"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova meta">
        <div className="space-y-4">
          <Field label="O que você quer medir?">
            <Select value={kind} onChange={(e) => setKind(e.target.value as Goal['kind'])}>
              <option value="books">Livros concluídos</option>
              <option value="pages">Páginas lidas</option>
              <option value="minutes">Tempo de leitura</option>
            </Select>
          </Field>
          <Field label="Quantidade">
            <Input type="number" min={1} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
          </Field>
          <Field label="Período">
            <Select value={period} onChange={(e) => setPeriod(e.target.value as Goal['period'])}>
              <option value="year">Anual ({new Date().getFullYear()})</option>
              <option value="month">Mensal</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={createGoal} loading={saving}><Target size={15} /> Criar meta</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
