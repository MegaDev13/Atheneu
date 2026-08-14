// Chat entre usuários cadastrados (DM) — Supabase Realtime no modo real,
// polling leve + resposta simulada no modo demo.
import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { backend } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { relTime } from '../../lib/utils';
import type { ChatMessage, Conversation } from '../../lib/types';

export default function ChatPanel({ activeDm, onConsumedDm }: { activeDm: string | null; onConsumedDm: () => void }) {
  const { user } = useAuth();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    if (!user) return;
    const cs = await backend.listConversations(user.id);
    setConvs(cs);
    return cs;
  }

  useEffect(() => { refresh(); }, [user?.id]);

  // DM solicitado a partir do diretório de usuários
  useEffect(() => {
    if (!activeDm || !user) return;
    (async () => {
      const cs = await backend.openDm(user.id, activeDm);
      setConvs(cs);
      const c = cs.find((x) => x.otherUserId === activeDm);
      if (c) setActive(c.id);
      onConsumedDm();
    })();
  }, [activeDm, user?.id]);

  useEffect(() => {
    if (!active || !user) return;
    backend.listMessages(user.id, active).then(setMsgs);
    const unsub = backend.onChatMessage(active, (m) => {
      setMsgs((xs) => (xs.some((x) => x.id === m.id) ? xs : [...xs, m]));
    });
    return unsub;
  }, [active, user?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !active || !text.trim()) return;
    const t = text.trim();
    setText('');
    const m = await backend.sendMessage(user.id, active, t);
    setMsgs((xs) => (xs.some((x) => x.id === m.id) ? xs : [...xs, m]));
    refresh();
  }

  const activeConv = convs.find((c) => c.id === active);

  return (
    <div className="grid min-h-[420px] gap-3 md:grid-cols-[280px_1fr]">
      {/* conversas */}
      <div className="card max-h-[560px] overflow-y-auto p-3">
        <p className="smallcaps mb-2 flex items-center gap-1.5 px-1"><MessageSquare size={12} /> conversas</p>
        {convs.length === 0 && (
          <p className="px-1 py-6 text-center text-[12.5px] text-mute">
            Nenhuma conversa ainda.<br />Clique em 💬 no diretório de leitores para começar.
          </p>
        )}
        {convs.map((c) => (
          <button key={c.id} onClick={() => setActive(c.id)}
            className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${active === c.id ? 'bg-wine-light' : 'hover:bg-card2/60'}`}>
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-[#f7f0e2]" style={{ background: c.otherUserColor || '#6e1f2b' }}>
              {(c.otherUserName || '?')[0]}
              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${c.otherUserOnline ? 'bg-pine' : 'bg-faint'}`} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink">{c.otherUserName}</span>
              <span className="block truncate text-[11.5px] text-faint">{c.lastMessage || 'começar conversa…'}</span>
            </span>
            {c.lastAt && <span className="text-[10px] text-faint">{relTime(c.lastAt)}</span>}
          </button>
        ))}
      </div>

      {/* thread */}
      <div className="card flex max-h-[560px] flex-col">
        {activeConv ? (
          <>
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-[#f7f0e2]" style={{ background: activeConv.otherUserColor || '#6e1f2b' }}>
                {(activeConv.otherUserName || '?')[0]}
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-ink">{activeConv.otherUserName}</p>
                <p className="text-[11px] text-faint">{activeConv.otherUserOnline ? '🟢 online agora' : '⚪ offline'}</p>
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {msgs.length === 0 && <p className="py-8 text-center text-[12.5px] text-mute">Diga olá 👋</p>}
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.userId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed ${m.userId === user?.id ? 'bg-wine text-[#f7f0e2]' : 'bg-card2 text-ink'}`}>
                    {m.text}
                    <span className={`mt-0.5 block text-right text-[10px] ${m.userId === user?.id ? 'text-[#f7f0e2]/60' : 'text-faint'}`}>{relTime(m.at)}</span>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
              <input
                value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Escreva sua mensagem…"
                aria-label="Mensagem"
                className="h-10 flex-1 rounded-xl border border-line bg-card2/50 px-3.5 text-[13.5px] text-ink placeholder:text-faint focus:border-gold focus:outline-none"
              />
              <button type="submit" disabled={!text.trim()} aria-label="Enviar mensagem"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-wine text-[#f7f0e2] disabled:opacity-40">
                <Send size={15} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-[13px] text-mute">
            Selecione uma conversa ao lado<br />ou comece uma nova pelo diretório de leitores.
          </div>
        )}
      </div>
    </div>
  );
}
