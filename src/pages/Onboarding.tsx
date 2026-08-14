import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Headphones, BookOpen, CheckCheck } from 'lucide-react';
import { backend } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui';
import { CATEGORIES } from '../lib/seedContent';
import { uid } from '../lib/utils';

const STEPS = ['Interesses', 'Meta', 'Preferências', 'Revisão'];
const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [interests, setInterests] = useState<string[]>(profile?.prefs.interests || []);
  const [yearlyGoal, setYearlyGoal] = useState(profile?.prefs.yearlyGoal || 12);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'occasional'>(profile?.prefs.frequency || 'daily');
  const [format, setFormat] = useState<'read' | 'audio' | 'both'>(profile?.prefs.format || 'read');
  const [audioRate, setAudioRate] = useState(profile?.prefs.audioRate || 1);

  const toggleInterest = (c: string) =>
    setInterests((xs) => (xs.includes(c) ? xs.filter((x) => x !== c) : [...xs, c]));

  const canNext = step === 0 ? interests.length > 0 : true;

  async function finish() {
    if (!user) return;
    setSaving(true);
    try {
      const prefs = { interests, yearlyGoal, frequency, format, audioRate };
      await backend.saveProfile(user.id, { onboarded: true, prefs });
      await backend.saveGoal(user.id, { id: uid(), kind: 'books', target: yearlyGoal, period: 'year', createdAt: Date.now() });
      await backend.addActivity(user.id, { id: uid(), kind: 'goal', bookId: null, text: `definiu a meta de ler ${yearlyGoal} livros este ano`, at: Date.now() });
      await refreshProfile();
      nav('/app', { replace: true });
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-xl">
        {/* Indicador de etapas */}
        <div className="mb-8 flex items-center justify-center gap-2" role="list" aria-label="Etapas do onboarding">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-300 ${
                  i < step ? 'bg-pine text-[#f7f0e2]' : i === step ? 'bg-wine text-[#f7f0e2]' : 'bg-card2 text-faint'
                }`}
                aria-current={i === step ? 'step' : undefined}
              >
                {i < step ? <Check size={13} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`h-px w-8 transition-colors ${i < step ? 'bg-pine' : 'bg-line'}`} />}
            </div>
          ))}
        </div>

        <div className="card noise relative overflow-hidden p-8 md:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -32 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 && (
                <>
                  <p className="smallcaps mb-2 text-gold">passo 1 · interesses</p>
                  <h1 className="font-display text-[26px] text-ink">O que você pretende ler?</h1>
                  <p className="mt-2 text-sm text-mute">Escolha os campos que mais despertam sua curiosidade. Isso orienta recomendações e o mapa de conceitos.</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c} onClick={() => toggleInterest(c)} aria-pressed={interests.includes(c)}
                        className={`rounded-full border px-4 py-2 text-[13.5px] font-medium transition-all duration-200 ${
                          interests.includes(c)
                            ? 'border-wine bg-wine text-[#f7f0e2] shadow-card'
                            : 'border-line bg-card2/50 text-mute hover:border-gold/50 hover:text-ink'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <p className="smallcaps mb-2 text-gold">passo 2 · meta</p>
                  <h1 className="font-display text-[26px] text-ink">Qual a sua meta de leitura?</h1>
                  <div className="mt-8 text-center">
                    <p className="font-display text-6xl text-wine">{yearlyGoal}</p>
                    <p className="mt-1 text-sm text-mute">livros este ano</p>
                    <input
                      type="range" min={1} max={60} value={yearlyGoal}
                      onChange={(e) => setYearlyGoal(Number(e.target.value))}
                      className="mt-6 w-full" aria-label="Quantidade de livros por ano"
                    />
                    <p className="mt-3 text-[13px] text-faint">
                      ≈ {Math.max(1, Math.round(yearlyGoal / 12))} livro{Math.round(yearlyGoal / 12) > 1 ? 's' : ''} por mês
                    </p>
                  </div>
                  <div className="mt-8">
                    <p className="mb-2.5 text-[13px] font-medium text-mute">Com que frequência você costuma ler?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {([['daily', 'Todos os dias'], ['weekly', 'Algumas vezes por semana'], ['occasional', 'De vez em quando']] as const).map(([v, l]) => (
                        <button key={v} onClick={() => setFrequency(v)} aria-pressed={frequency === v}
                          className={`rounded-xl border px-3 py-2.5 text-[13px] font-medium transition-all ${frequency === v ? 'border-wine bg-wine-light text-wine' : 'border-line text-mute hover:text-ink'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <p className="smallcaps mb-2 text-gold">passo 3 · preferências</p>
                  <h1 className="font-display text-[26px] text-ink">Como você prefere absorver livros?</h1>
                  <div className="mt-6 grid gap-2">
                    {([
                      ['read', BookOpen, 'Ler', 'Gosto do texto à minha frente.'],
                      ['audio', Headphones, 'Escutar', 'Prefiro audiobooks, em movimento.'],
                      ['both', CheckCheck, 'Os dois', 'Alterno conforme o momento.'],
                    ] as const).map(([v, Icon, l, d]) => (
                      <button key={v} onClick={() => setFormat(v)} aria-pressed={format === v}
                        className={`flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all ${format === v ? 'border-wine bg-wine-light' : 'border-line hover:border-gold/50'}`}>
                        <Icon size={19} className={format === v ? 'text-wine' : 'text-faint'} />
                        <div>
                          <p className="text-[14.5px] font-medium text-ink">{l}</p>
                          <p className="text-[12.5px] text-mute">{d}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {(format === 'audio' || format === 'both') && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-5">
                      <p className="mb-2.5 text-[13px] font-medium text-mute">Velocidade padrão do audiobook</p>
                      <div className="flex flex-wrap gap-2">
                        {RATES.map((r) => (
                          <button key={r} onClick={() => setAudioRate(r)} aria-pressed={audioRate === r}
                            className={`rounded-lg border px-3.5 py-1.5 text-[13px] font-medium tabular-nums transition-all ${audioRate === r ? 'border-wine bg-wine text-[#f7f0e2]' : 'border-line text-mute hover:text-ink'}`}>
                            {r.toString().replace('.', ',')}×
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </>
              )}

              {step === 3 && (
                <>
                  <p className="smallcaps mb-2 text-gold">passo 4 · revisão</p>
                  <h1 className="font-display text-[26px] text-ink">Sua biblioteca está pronta.</h1>
                  <div className="mt-6 space-y-3 rounded-xl bg-card2/50 p-5 text-[14px]">
                    <p><span className="text-faint">Interesses:</span> <span className="text-ink">{interests.join(', ')}</span></p>
                    <p><span className="text-faint">Meta:</span> <span className="text-ink">{yearlyGoal} livros · {frequency === 'daily' ? 'leitura diária' : frequency === 'weekly' ? 'algumas vezes por semana' : 'de vez em quando'}</span></p>
                    <p><span className="text-faint">Formato:</span> <span className="text-ink">{format === 'read' ? 'leitura' : format === 'audio' ? 'audiobook' : 'leitura e audiobook'}{format !== 'read' ? ` · ${audioRate.toString().replace('.', ',')}×` : ''}</span></p>
                  </div>
                  <p className="mt-4 text-[13px] leading-relaxed text-mute">
                    Você pode ajustar tudo isso a qualquer momento no seu perfil. Boa leitura. 📖
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={() => (step === 0 ? nav('/app') : setStep(step - 1))} disabled={saving}>
              <ArrowLeft size={16} /> {step === 0 ? 'Pular' : 'Voltar'}
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
                Continuar <ArrowRight size={16} />
              </Button>
            ) : (
              <Button onClick={finish} loading={saving}>
                Entrar na minha biblioteca
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
