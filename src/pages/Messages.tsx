// MENSAGENS — comunicação privada. Reutiliza ChatPanel (não duplica).
// Suporta ?c=<conversationId> (link direto p/ conversa, ex.: do e-mail/notificação).
import { useSearchParams } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import ChatPanel from '../features/social/ChatPanel';

export default function Messages() {
  const [params, setParams] = useSearchParams();
  const c = params.get('c');
  return (
    <div className="mx-auto w-[min(1000px,94%)] py-6 md:py-8">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare size={20} className="text-wine" />
        <h1 className="font-display text-[28px] text-ink">Mensagens</h1>
      </div>
      <ChatPanel activeDm={null} initialConversation={c} onConsumedDm={() => setParams({})} />
    </div>
  );
}
