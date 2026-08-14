import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Download, LogOut, Moon, Shield, Sparkles, Sun } from 'lucide-react';
import { backend, isDemo } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { Button, Card, Field, Input, Select } from '../components/ui';
import { computeStats } from '../lib/stats';
import { aiAvailable, AI_CONFIG } from '../features/ai/config';
import type { Book, Note, ReadingSession, Visibility } from '../lib/types';

const AVATAR_COLORS = ['#6e1f2b', '#1e4d44', '#26364f', '#5a4630', '#3d3550', '#743e2a', '#374a3a', '#5c2438'];

export default function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { toast } = useToast();
  const nav = useNavigate();

  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [color, setColor] = useState(profile?.color || AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [aiUsage, setAiUsage] = useState<{ today: number; global: number } | null>(null);
  const [stats, setStats] = useState<{ finished: number; reading: number; want: number; genres: { name: string; value: number }[] } | null>(null);

  useEffect(() => {
    setName(profile?.name || '');
    setBio(profile?.bio || '');
    setColor(profile?.color || AVATAR_COLORS[0]);
  }, [profile?.id]);

  useEffect(() => {
    if (!user) return;
    Promise.all([backend.aiCountToday(user.id), backend.aiGlobalToday()])
      .then(([today, global]) => setAiUsage({ today, global }))
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    Promise.all([backend.listBooks(user.id), backend.listSessions(user.id), backend.listNotes(user.id)])
      .then(([books, sessions, notes]) => {
        const s = computeStats(sessions, books, notes, []);
        setStats({
          finished: books.filter((b) => b.status === 'finished').length,
          reading: books.filter((b) => b.status === 'reading').length,
          want: books.filter((b) => b.status === 'want').length,
          genres: s.genreCounts.slice(0, 4),
        });
      })
      .catch(() => {});
  }, [user?.id]);

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await backend.saveProfile(user.id, { name, bio, color });
      await refreshProfile();
      toast('Perfil atualizado.');
    } catch {
      toast('Não foi possível salvar. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function setPrivacy(field: 'library' | 'progress' | 'activity', value: Visibility) {
    if (!user || !profile) return;
    const privacy = { ...profile.privacy, [field]: value };
    await backend.saveProfile(user.id, { privacy });
    await refreshProfile();
    toast('Preferência de privacidade salva.', 'info');
  }

  const maxGenre = Math.max(1, ...(stats?.genres.map((g) => g.value) || [1]));

  return (
    <div className="mx-auto w-[min(900px,94%)] py-6 md:py-8">
      <p className="smallcaps">conta</p>
      <h1 className="mb-6 font-display text-[30px] text-ink">Perfil</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Identidade */}
        <Card className="p-6 md:col-span-2">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold text-[#f7f0e2] shadow-card" style={{ background: color }}>
                {(name || 'A')[0]?.toUpperCase()}
              </div>
              <div className="flex flex-wrap justify-center gap-1.5" aria-label="Cor do avatar">
                {AVATAR_COLORS.map((c) => (
                  <button key={c} onClick={() => setColor(c)} aria-pressed={color === c}
                    className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-ink' : 'border-transparent'}`}
                    style={{ background: c }} aria-label={`Cor ${c}`} />
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-3.5">
              <Field label="Nome"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Biografia" hint="Aparece no seu perfil público.">
                <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="O que você está lendo ultimamente?" />
              </Field>
              <div className="flex justify-end">
                <Button onClick={save} loading={saving}>Salvar alterações</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Perfil de leitura público (§75) */}
        <Card className="p-6">
          <p className="smallcaps mb-4">sua biblioteca em números</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { n: stats?.reading ?? 0, l: 'lendo agora' },
              { n: stats?.finished ?? 0, l: 'concluídos' },
              { n: stats?.want ?? 0, l: 'quero ler' },
            ].map((x) => (
              <div key={x.l} className="rounded-xl bg-card2/60 py-3.5">
                <p className="font-display text-[26px] leading-none text-ink">{x.n}</p>
                <p className="mt-1 text-[10.5px] uppercase tracking-wider text-faint">{x.l}</p>
              </div>
            ))}
          </div>
          <p className="smallcaps mb-2 mt-5">gêneros</p>
          <ul className="space-y-2.5">
            {(stats?.genres || []).map((g) => (
              <li key={g.name}>
                <div className="mb-1 flex justify-between text-[12.5px]"><span className="text-ink">{g.name}</span></div>
                <div className="h-2 rounded-full bg-line/50">
                  <div className="h-full rounded-full bg-gradient-to-r from-wine to-gold" style={{ width: `${(g.value / maxGenre) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* Privacidade (§53) */}
        <Card className="p-6">
          <p className="smallcaps mb-4 flex items-center gap-1.5"><Shield size={13} /> privacidade</p>
          <div className="space-y-4">
            <Field label="Biblioteca" hint="Quem pode ver sua estante.">
              <Select value={profile?.privacy.library || 'public'} onChange={(e) => setPrivacy('library', e.target.value as Visibility)}>
                <option value="public">Pública</option>
                <option value="followers">Somente seguidores</option>
                <option value="private">Privada</option>
              </Select>
            </Field>
            <Field label="Progresso de leitura" hint="Permite que seguidores vejam em que página você está.">
              <Select value={profile?.privacy.progress || 'followers'} onChange={(e) => setPrivacy('progress', e.target.value as Visibility)}>
                <option value="public">Público</option>
                <option value="followers">Seguidores</option>
                <option value="private">Privado</option>
              </Select>
            </Field>
            <Field label="Atividade" hint="Aparecer no feed do clube.">
              <Select value={profile?.privacy.activity || 'followers'} onChange={(e) => setPrivacy('activity', e.target.value as Visibility)}>
                <option value="public">Pública</option>
                <option value="followers">Seguidores</option>
                <option value="private">Privada</option>
              </Select>
            </Field>
            <p className="rounded-xl bg-card2/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-mute">
              ✍️ Notas e destaques são <strong>privados por padrão</strong> — você escolhe compartilhá-los individualmente ou com um clube.
            </p>
          </div>
        </Card>

        {/* Preferências */}
        <Card className="p-6">
          <p className="smallcaps mb-4">preferências</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-ink">Tema</p>
              <p className="text-[12.5px] text-mute">{theme === 'dark' ? 'Biblioteca noturna' : 'Luz do dia'}</p>
            </div>
            <Button variant="outline" onClick={toggle}>{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />} Alternar</Button>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-line pt-5">
            <div>
              <p className="text-[14px] font-medium text-ink">Meus dados</p>
              <p className="text-[12.5px] text-mute">Baixe uma cópia da sua biblioteca e notas.</p>
            </div>
            <Button variant="outline" onClick={async () => {
              if (!user) return;
              const data = await Promise.all([backend.listBooks(user.id), backend.listNotes(user.id), backend.listHighlights(user.id)]);
              const blob = new Blob([JSON.stringify({ books: data[0], notes: data[1], highlights: data[2] }, null, 2)], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'atheneu-dados.json';
              a.click();
              toast('Exportação pronta.', 'info');
            }}>
              <Download size={15} /> Exportar
            </Button>
          </div>
          {isDemo && (
            <p className="mt-4 rounded-xl border border-gold/30 bg-gold/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-gold">
              Modo demonstração: os dados ficam apenas neste navegador. Conecte o Supabase (.env) para sincronização real.
            </p>
          )}
        </Card>

        <Card className="flex items-center justify-between p-6">
          <div>
            <p className="text-[14px] font-medium text-ink">Sessão</p>
            <p className="text-[12.5px] text-mute">{user?.email}</p>
          </div>
          <Button variant="danger" onClick={async () => { await signOut(); nav('/'); }}><LogOut size={15} /> Sair</Button>
        </Card>

        {/* Uso da IA (§38) */}
        <Card className="p-6 md:col-span-2">
          <p className="smallcaps mb-4 flex items-center gap-1.5"><Sparkles size={13} /> uso da IA</p>
          {aiAvailable() ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="flex items-end justify-between">
                  <p className="font-display text-[26px] leading-none text-ink">
                    {aiUsage?.today ?? '…'} <span className="text-[16px] text-mute">/ {AI_CONFIG.dailyLimit} consultas hoje</span>
                  </p>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-line/60">
                  <div className="h-full rounded-full bg-gradient-to-r from-pine to-gold transition-[width] duration-700"
                    style={{ width: `${Math.min(100, ((aiUsage?.today || 0) / AI_CONFIG.dailyLimit) * 100)}%` }} />
                </div>
                <p className="mt-2 text-[12px] text-faint">Próxima renovação: amanhã, à meia-noite.</p>
              </div>
              <div className="space-y-2 text-[13px] leading-relaxed text-mute">
                <p>🌐 Uso global hoje: <strong className="text-ink">{aiUsage?.global ?? '…'}</strong> requisição(ões).</p>
                <p>💾 Para preservar a cota gratuita, algumas respostas são armazenadas em cache e devolvidas sem nova consulta.</p>
                <p>⏱️ Limite de frequência: 1 consulta a cada {AI_CONFIG.rateLimitSeconds}s. A IA só é chamada por ação explícita sua.</p>
              </div>
            </div>
          ) : (
            <p className="text-[13.5px] leading-relaxed text-mute">
              A síntese com IA (Gemini) ainda não foi configurada. A pesquisa local da biblioteca continua gratuita e ilimitada.
              Configure <code className="rounded bg-card2 px-1.5 py-0.5 text-[12px]">VITE_GEMINI_API_KEY</code> ou um proxy
              <code className="rounded bg-card2 px-1.5 py-0.5 text-[12px]"> VITE_AI_ENDPOINT</code> para ativar.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
