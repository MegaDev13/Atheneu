// Chat entre usuários cadastrados (DM) — estilo WhatsApp/Discord:
// clicar em 💬 abre DIRETO a conversa com todo o histórico; mensagens persistidas.
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
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
  const inputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    if (!user) return;
    const cs = await backend.listConversations(user.id);
    setConvs(cs);
    return cs;
  }

  useEffect(() => { refresh(); }, [user?.id]);

  // Abrir DM solicitado pelo diretório de leitores (💬)
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

  // Carrega histórico + realtime da conversa ativa
  useEffect(() => {
    if (!active || !user) return;
    backend.listMessages(user.id, active).then((m) => { setMsgs(m); });
    const unsub = backend.onChatMessage(active, (m) => {
      setMsgs((xs) => (xs.some((x) => x.id === m.id) ? xs : [...xs, m]));
    });
    return unsub;
  }, [active, user?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs, active]);
  useEffect(() => { if (active) inputRef.current?.focus(); }, [active]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !active || !text.trim()) return;
    const t = text.trim();
    setText('');
    const m = await backend.sendMessage(user.id, active, t);
    setMsgs((xs) => (xs.some((x) => x.id === m.id) ? xs : [...xs, m]));
    refresh();
    endRef.current?.scrollIntoView({ block: 'end' });
  }

  const activeConv = convs.find((c) => c.id === active);

  return (
    <div className="card grid h-[560px] overflow-hidden md:grid-cols-[280px_1fr]">
      {/* Lista de conversas (some no mobile quando uma conversa está aberta) */}
      <div className={`${active ? 'hidden md:block' : 'block'} max-h-full overflow-y-auto border-b border-line p-3 md:border-b-0 md:border-r`}>
        <p className="smallcaps mb-2 flex items-center gap-1.5 px-1"><MessageSquare size={12} /> conversas</p>
        {convs.length === 0 && (
          <p className="px-1 py-6 text-center text-[12.5px] text-mute">
            Nenhuma conversa ainda.<br />Toque em 💬 no diretório de leitores para começar.
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

      {/* Thread */}
      <div className={`${active ? 'flex' : 'hidden md:flex'} max-h-full flex-col`}>
        {activeConv ? (
          <>
            <div className="flex items-center gap-2 border-b border-line px-3 py-2.5 md:px-4">
              <button onClick={() => setActive(null)} aria-label="Voltar às conversas" className="rounded-lg p-1.5 text-mute hover:bg-card2 md:hidden"><ArrowLeft size={16} /></button>
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-[#f7f0e2]" style={{ background: activeConv.otherUserColor || '#6e1f2b' }}>
                {(activeConv.otherUserName || '?')[0]}
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-ink">{activeConv.otherUserName}</p>
                <p className="text-[11px] text-faint">{activeConv.otherUserOnline ? '🟢 online agora' : '⚪ offline'}</p>
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3 md:p-4">
              {msgs.length === 0 && <p className="py-8 text-center text-[12.5px] text-mute">Diga olá 👋 — o histórico fica salvo.</p>}
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.userId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed ${m.userId === user?.id ? 'bg-wine text-[#f7f0e2]' : 'bg-card2 text-ink'}`}>
                    {m.text}
                    <span className={`mt-0.5 block text-right text-[10px] ${m.userId === user?.id ? 'text-[#f7f0e2]/60' : 'text-faint'}`}>{relTime(m.at)}</span>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="flex gap-2 border-t border-line p-2.5 md:p-3">
              <input
                ref={inputRef}
                value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Mensagem…"
                aria-label="Mensagem"
                className="h-11 flex-1 rounded-xl border border-line bg-card2/50 px-3.5 text-[14px] text-ink placeholder:text-faint focus:border-gold focus:outline-none"
              />
              <button type="submit" disabled={!text.trim()} aria-label="Enviar mensagem"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-wine text-[#f7f0e2] disabled:opacity-40">
                <Send size={16} />
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
