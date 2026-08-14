import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Download, LogOut, Moon, Shield, Sparkles, Sun } from 'lucide-react';
import { backend, isDemo } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { Button, Card, Field, Input, Select } from '../components/ui';
import { computeStats } from '../lib/stats';
import { aiAvailable, AI_CONFIG, getUserGeminiKey, setUserGeminiKey, usingUserKey } from '../features/ai/config';
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
  const [tab, setTab] = useState<'perfil' | 'preferencias' | 'privacidade' | 'conta'>('perfil');
  const TABS: Array<[typeof tab, string]> = [
    ['perfil', 'Meu perfil'], ['preferencias', 'Preferências'], ['privacidade', 'Privacidade'], ['conta', 'Conta & IA'],
  ];

  return (
    <div className="mx-auto w-[min(900px,94%)] py-6 md:py-8">
      <p className="smallcaps">conta</p>
      <h1 className="mb-4 font-display text-[30px] text-ink">Meu perfil</h1>

      {/* Abas */}
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-line p-1" role="tablist" aria-label="Seções do perfil">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] font-medium ${tab === k ? 'bg-wine text-[#f7f0e2]' : 'text-mute hover:text-ink'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'perfil' && (
        <div className="grid gap-4 md:grid-cols-2">
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
                <div className="flex justify-end"><Button onClick={save} loading={saving}>Salvar alterações</Button></div>
              </div>
            </div>
          </Card>
          <SocialEditor />
        </div>
      )}

      {tab === 'preferencias' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <p className="smallcaps mb-4">sua biblioteca em números</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[{ n: stats?.reading ?? 0, l: 'lendo agora' }, { n: stats?.finished ?? 0, l: 'concluídos' }, { n: stats?.want ?? 0, l: 'quero ler' }].map((x) => (
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
                  <div className="h-2 rounded-full bg-line/50"><div className="h-full rounded-full bg-gradient-to-r from-wine to-gold" style={{ width: `${(g.value / maxGenre) * 100}%` }} /></div>
                  <p className="mt-1 text-[12.5px] text-ink">{g.name}</p>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-6">
            <p className="smallcaps mb-4">preferências</p>
            <div className="flex items-center justify-between">
              <div><p className="text-[14px] font-medium text-ink">Tema</p><p className="text-[12.5px] text-mute">{theme === 'dark' ? 'Biblioteca noturna' : 'Luz do dia'}</p></div>
              <Button variant="outline" onClick={toggle}>{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />} Alternar</Button>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-line pt-5">
              <div><p className="text-[14px] font-medium text-ink">Meus dados</p><p className="text-[12.5px] text-mute">Baixe uma cópia da sua biblioteca e notas.</p></div>
              <Button variant="outline" onClick={async () => {
                if (!user) return;
                const data = await Promise.all([backend.listBooks(user.id), backend.listNotes(user.id), backend.listHighlights(user.id)]);
                const blob = new Blob([JSON.stringify({ books: data[0], notes: data[1], highlights: data[2] }, null, 2)], { type: 'application/json' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'atheneu-dados.json'; a.click();
                toast('Exportação pronta.', 'info');
              }}><Download size={15} /> Exportar</Button>
            </div>
            {isDemo && <p className="mt-4 rounded-xl border border-gold/30 bg-gold/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-gold">Modo demonstração: os dados ficam apenas neste navegador.</p>}
          </Card>
        </div>
      )}

      {tab === 'privacidade' && (
        <div className="grid gap-4 md:grid-cols-2">
          <PrivacyPanel />
        </div>
      )}

      {tab === 'conta' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="flex items-center justify-between p-6">
            <div><p className="text-[14px] font-medium text-ink">Sessão</p><p className="text-[12.5px] text-mute">{user?.email}</p></div>
            <Button variant="danger" onClick={async () => { await signOut(); nav('/'); }}><LogOut size={15} /> Sair</Button>
          </Card>
          <GeminiKeyEditor />
          <Card className="p-6 md:col-span-2">
            <p className="smallcaps mb-4 flex items-center gap-1.5"><Sparkles size={13} /> uso da IA</p>
            {aiAvailable() ? (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="font-display text-[26px] leading-none text-ink">{aiUsage?.today ?? '…'} <span className="text-[16px] text-mute">/ {AI_CONFIG.dailyLimit} consultas hoje</span></p>
                  <div className="mt-3 h-2 w-full rounded-full bg-line/60"><div className="h-full rounded-full bg-gradient-to-r from-pine to-gold" style={{ width: `${Math.min(100, ((aiUsage?.today || 0) / AI_CONFIG.dailyLimit) * 100)}%` }} /></div>
                </div>
                <div className="space-y-2 text-[13px] leading-relaxed text-mute">
                  <p>🌐 Uso global hoje: <strong className="text-ink">{aiUsage?.global ?? '…'}</strong> requisição(ões).</p>
                  <p>💾 Respostas em cache são devolvidas sem nova consulta.</p>
                </div>
              </div>
            ) : (
              <p className="text-[13.5px] leading-relaxed text-mute">IA (Gemini) não configurada. A pesquisa local continua gratuita.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

const FIELD_LABELS: Array<[string, string]> = [
  ['about', 'Sobre mim'], ['location', 'Localização'], ['website', 'Website'], ['bio', 'Biografia'],
  ['books', 'Livros favoritos'], ['authors', 'Autores favoritos'], ['music', 'Música favorita'],
  ['interests', 'Interesses'], ['activity', 'Atividade'], ['discussions', 'Discussões'],
  ['followers', 'Seguidores'], ['following', 'Seguindo'],
];
const VIS_OPTS: Array<[string, string]> = [['public', 'Público'], ['followers', 'Seguidores'], ['mutual', 'Seguidores mútuos'], ['private', 'Privado']];

// Painel de privacidade (visibilidade por campo + perfil + mensagens + notificações + preview)
function PrivacyPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [priv, setPriv] = useState<any>(null);
  const [nprefs, setNprefs] = useState<any>(null);
  const [previewAs, setPreviewAs] = useState<'public' | 'follower' | 'mutual' | 'self'>('public');
  const [preview, setPreview] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    backend.getPrivacy(user.id).then(setPriv);
    backend.getNotifyPrefs(user.id).then(setNprefs);
  }, [user?.id]);
  useEffect(() => { if (user) backend.previewProfile(user.id, previewAs).then(setPreview); }, [previewAs, user?.id]);

  if (!priv || !nprefs) return null;
  const setField = (f: string, v: string) => setPriv({ ...priv, fields: { ...priv.fields, [f]: v } });

  async function save() {
    if (!user) return;
    setSaving(true);
    await backend.updatePrivacy(user.id, priv);
    await backend.setNotifyPrefs(user.id, nprefs);
    setSaving(false);
    toast('Privacidade e notificações salvas.');
  }

  const chan = (key: string, label: string) => (
    <div className="rounded-xl border border-line p-3">
      <p className="mb-2 text-[13px] font-medium text-ink">{label}</p>
      <div className="flex gap-4">
        {(['site', 'email'] as const).map((ch) => (
          <label key={ch} className="flex items-center gap-2 text-[12.5px] text-mute">
            <input type="checkbox" checked={nprefs[key]?.[ch] !== false} onChange={(e) => setNprefs({ ...nprefs, [key]: { ...nprefs[key], [ch]: e.target.checked } })} />
            {ch === 'site' ? 'No site' : 'E-mail'}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <Card className="p-6 md:col-span-2">
      <p className="smallcaps mb-4">privacidade · o que as pessoas podem ver</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-[13px] text-mute">Quem pode ver meu perfil?</span>
          <select value={priv.profile} onChange={(e) => setPriv({ ...priv, profile: e.target.value })} className="h-10 w-full rounded-xl border border-line bg-card2/50 px-3 text-[14px] text-ink focus:border-gold focus:outline-none">
            <option value="all">Todos</option><option value="registered">Usuários cadastrados</option>
            <option value="followers">Somente seguidores</option><option value="none">Ninguém além de mim</option>
          </select></label>
        <label className="block"><span className="mb-1 block text-[13px] text-mute">Quem pode me enviar mensagens?</span>
          <select value={priv.messages} onChange={(e) => setPriv({ ...priv, messages: e.target.value })} className="h-10 w-full rounded-xl border border-line bg-card2/50 px-3 text-[14px] text-ink focus:border-gold focus:outline-none">
            <option value="all">Todos</option><option value="following">Só pessoas que sigo</option>
            <option value="followers">Só seguidores</option><option value="mutual">Só seguidores mútuos</option><option value="none">Ninguém</option>
          </select></label>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {FIELD_LABELS.map(([f, l]) => (
          <label key={f} className="flex items-center justify-between gap-2 rounded-xl border border-line p-2.5">
            <span className="text-[13px] text-ink">{l}</span>
            <select value={priv.fields?.[f] || 'public'} onChange={(e) => setField(f, e.target.value)} className="h-8 rounded-lg border border-line bg-card2/50 px-2 text-[12px] text-ink focus:outline-none">
              {VIS_OPTS.map(([v, vl]) => <option key={v} value={v}>{vl}</option>)}
            </select>
          </label>
        ))}
      </div>

      <p className="smallcaps mb-2 mt-6">notificações (canais independentes)</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {chan('message', 'Mensagens')}{chan('follow', 'Novos seguidores')}{chan('reply', 'Respostas')}
        {chan('mention', 'Menções')}{chan('activity', 'Atividade')}
      </div>

      <p className="smallcaps mb-2 mt-6">visualizar meu perfil como</p>
      <div className="mb-3 flex gap-1 rounded-xl border border-line p-1 w-fit">
        {([['public', 'Pública'], ['follower', 'Seguidor'], ['mutual', 'Mútuo'], ['self', 'Privada']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setPreviewAs(k)} className={`rounded-lg px-3 py-1.5 text-[12.5px] ${previewAs === k ? 'bg-wine text-[#f7f0e2]' : 'text-mute'}`}>{l}</button>
        ))}
      </div>
      {preview && (
        <div className="rounded-xl border border-line bg-card2/40 p-4 text-[13px] text-mute">
          <p className="font-medium text-ink">{preview.name} {preview.username && <span className="text-wine">@{preview.username}</span>}</p>
          <p>{preview.about ? `Sobre: ${preview.about}` : 'Sobre: (oculto)'}</p>
          <p>Livros: {preview.books?.length ? preview.books.map((b: any) => b.title).join(', ') : '(oculto)'} · Música: {preview.music?.length ? 'visível' : '(oculta)'} · Localização: {preview.location || '(oculta)'}</p>
        </div>
      )}

      <div className="mt-5 flex justify-end"><Button onClick={save} loading={saving}>Salvar privacidade</Button></div>
    </Card>
  );
}

// ─── Chave do Google AI Studio do próprio usuário ───
function GeminiKeyEditor() {
  const { toast } = useToast();
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => { setKey(getUserGeminiKey()); setSaved(Boolean(getUserGeminiKey())); }, []);

  async function test() {
    if (!key.trim()) { toast('Cole uma chave para testar.', 'info'); return; }
    setTesting(true);
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'x-goog-api-key': key.trim() } });
      if (res.ok) toast('✅ Chave válida! Sua conta do Google AI Studio está conectada.');
      else toast(`Chave inválida (HTTP ${res.status}). Verifique no Google AI Studio.`, 'error');
    } catch {
      toast('Não foi possível verificar a chave (rede).', 'error');
    } finally { setTesting(false); }
  }

  return (
    <Card className="p-6 md:col-span-2">
      <p className="smallcaps mb-2 flex items-center gap-1.5"><Sparkles size={13} /> sua chave do Google AI Studio</p>
      <p className="mb-3 text-[12.5px] leading-relaxed text-mute">
        Cole aqui a sua chave gratuita do <a className="text-wine underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>.
        Ela fica salva <strong>somente neste navegador</strong> e passa a gerenciar a IA da sua conta
        (a IA usa primeiro a sua chave; sem ela, usa a do sistema).
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input type="password" value={key} onChange={(e) => { setKey(e.target.value); setSaved(false); }} placeholder="AIza… (sua chave do Google AI Studio)" autoComplete="off" />
        <div className="flex gap-2">
          <Button variant="outline" onClick={test} loading={testing}>Testar</Button>
          <Button onClick={() => { setUserGeminiKey(key); setSaved(true); toast(key.trim() ? 'Chave salva — a IA agora usa a sua conta.' : 'Chave removida.', 'info'); }}>Salvar</Button>
        </div>
      </div>
      <p className="mt-2 text-[11.5px] text-faint">
        {saved && key.trim() ? '🟢 Usando a SUA chave do Google AI Studio.' : usingUserKey() ? '🟢 Usando a sua chave salva.' : '⚪ Sem chave própria — usando a chave do sistema (se configurada).'}
      </p>
    </Card>
  );
}

// ─── Editor de perfil social (identidade + preferências literárias) ───
function SocialEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sp, setSp] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) backend.getPublicProfile(user.id, user.id).then((p) => setSp({
      username: p?.username || '', about: p?.about || '', location: p?.location || '', website: p?.website || '', pronouns: p?.pronouns || '',
      genres: (p?.genres || []).join(', '), authors: (p?.authors || []).join(', '), interests: (p?.interests || []).join(', '),
      cover: p?.cover || '',
    }));
  }, [user?.id]);

  if (!sp) return null;
  const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

  async function save() {
    if (!user) return;
    setBusy(true);
    await backend.updateSocial(user.id, {
      username: sp.username, about: sp.about, location: sp.location, website: sp.website, pronouns: sp.pronouns,
      genres: list(sp.genres), authors: list(sp.authors), interests: list(sp.interests), cover: sp.cover,
    });
    setBusy(false);
    toast('Perfil social salvo.');
  }

  const inp = (k: string, label: string, ph: string, area = false) => (
    <label className="block"><span className="mb-1 block text-[13px] text-mute">{label}</span>
      {area
        ? <textarea value={sp[k]} onChange={(e) => setSp({ ...sp, [k]: e.target.value })} rows={3} placeholder={ph} className="w-full rounded-xl border border-line bg-card2/50 p-3 text-[14px] text-ink focus:border-gold focus:outline-none" />
        : <Input value={sp[k]} onChange={(e) => setSp({ ...sp, [k]: e.target.value })} placeholder={ph} />}
    </label>
  );

  return (
    <Card className="p-6 md:col-span-2">
      <p className="smallcaps mb-4">perfil social & preferências literárias</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {inp('username', 'Username (@)', 'thiago')}
        {inp('pronouns', 'Pronomes (opcional)', 'ele/dele')}
        {inp('location', 'Localização (opcional)', 'Brasil')}
        {inp('website', 'Website (opcional)', 'https://…')}
        <div className="sm:col-span-2">{inp('about', 'Sobre mim', 'Escreva livremente sobre você…', true)}</div>
        {inp('genres', 'Gêneros favoritos (vírgula)', 'Filosofia, Literatura')}
        {inp('authors', 'Autores favoritos (vírgula)', 'Dostoiévski, Machado')}
        {inp('interests', 'Interesses / temas (vírgula)', 'filosofia, história antiga')}
        <label className="block"><span className="mb-1 block text-[13px] text-mute">Imagem de capa (URL ou upload)</span>
          <input type="file" accept="image/*" className="block w-full text-[12px] text-mute" onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            const r = new FileReader(); r.onload = () => setSp({ ...sp, cover: String(r.result) }); r.readAsDataURL(f);
          }} />
        </label>
      </div>
      <div className="mt-4 flex justify-end"><Button onClick={save} loading={busy}>Salvar perfil social</Button></div>
    </Card>
  );
}
