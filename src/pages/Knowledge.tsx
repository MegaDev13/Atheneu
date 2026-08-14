import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Send, Sparkles, Repeat, RotateCw, Database } from 'lucide-react';
import { backend } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, Skeleton } from '../components/ui';
import { askLibrary } from '../features/ai/localEngine';
import type { AiContext } from '../features/ai/localEngine';
import { askAI, selectContext, shouldUseAI } from '../features/ai/pipeline';
import { aiAvailable, AI_CONFIG } from '../features/ai/config';
import type { Book, Highlight, Note } from '../lib/types';

const SUGGESTIONS = [
  'Quais livros falam sobre liberdade?',
  'O que minhas notas dizem sobre estoicismo?',
  'Onde anotei algo sobre o absurdo?',
  'Quais autores tratam de moral?',
];

export default function Knowledge() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('t') || 'perguntar';
  const initialQ = params.get('q') || '';

  return (
    <div className="mx-auto w-[min(1100px,94%)] py-6 md:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="smallcaps">conhecimento</p>
          <h1 className="font-display text-[30px] text-ink">Conhecimento</h1>
        </div>
        <nav className="flex gap-1 rounded-xl border border-line p-1" aria-label="Seções de conhecimento">
          {[['perguntar', 'Perguntar'], ['mapa', 'Mapa de conceitos'], ['revisao', 'Revisão']].map(([v, l]) => (
            <button key={v}
              onClick={() => setParams(v === 'perguntar' ? {} : { t: v }, { replace: true })}
              className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${tab === v ? 'bg-wine text-[#f7f0e2]' : 'text-mute hover:text-ink'}`}>
              {l}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'mapa' ? <ConceptMap /> : tab === 'revisao' ? <Review /> : <Ask initialQ={initialQ} />}
    </div>
  );
}

// ─── Pergunte à sua biblioteca ───
interface Msg {
  role: 'user' | 'ai';
  text: string;
  badge?: string;      // ex.: "resposta local", "cache", "Gemini"
  aiOffer?: { question: string; context: string }; // botão explícito de IA (§25)
}

function Ask({ initialQ }: { initialQ: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState(initialQ);
  const [thinking, setThinking] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [usage, setUsage] = useState<{ today: number; global: number } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const askedRef = useRef(false);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, thinking]);

  function refreshUsage() {
    if (!user) return;
    Promise.all([backend.aiCountToday(user.id), backend.aiGlobalToday()])
      .then(([today, global]) => setUsage({ today, global }))
      .catch(() => {});
  }
  useEffect(() => { refreshUsage(); }, [user?.id]);

  async function ask(q: string) {
    if (!q.trim() || !user) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setThinking(true);
    try {
      const [books, notes, highlights] = await Promise.all([
        backend.listBooks(user.id),
        backend.listNotes(user.id),
        backend.listHighlights(user.id),
      ]);
      const ctx: AiContext = { books, notes, highlights };
      // 1) resposta local: gratuita, instantânea e offline (§21, §37)
      const a = await askLibrary(q, ctx);
      // 2) IA apenas quando faz sentido e sempre por ação explícita (§25, §26)
      const offer = aiAvailable() && shouldUseAI(q, ctx)
        ? { question: q, context: selectContext(q, ctx) }
        : undefined;
      setMessages((m) => [...m, { role: 'ai', text: a.text, badge: 'busca local · gratuita', aiOffer: offer }]);
    } catch {
      setMessages((m) => [...m, { role: 'ai', text: 'Não consegui consultar sua biblioteca agora. Tente novamente.' }]);
    } finally {
      setThinking(false);
    }
  }

  // §25 · Gemini somente por clique explícito — nunca automaticamente.
  async function synthesize(msg: Msg) {
    if (!user || !msg.aiOffer || aiBusy) return;
    setAiBusy(true);
    setMessages((m) => [...m, {
      role: 'ai',
      text: 'Consultando a IA com o contexto mínimo necessário…',
      badge: 'processando',
    }]);
    const res = await askAI({
      userId: user.id,
      question: msg.aiOffer.question,
      operation: 'answer_library_question',
      context: msg.aiOffer.context,
    });
    setMessages((m) => {
      const xs = m.slice(0, -1);
      return [...xs, {
        role: 'ai',
        text: res.text,
        badge:
          res.status === 'cache' ? 'resposta em cache · 0 consultas' :
          res.status === 'ok' ? `via ${res.model || 'Gemini'} · ${res.tokens || 0} tokens` :
          res.status === 'limit' ? 'limite diário' :
          res.status === 'rate' ? 'aguarde alguns segundos' : 'indisponível',
      }];
    });
    refreshUsage();
    setAiBusy(false);
  }

  useEffect(() => {
    if (initialQ && !askedRef.current) {
      askedRef.current = true;
      ask(initialQ);
    }
  }, [initialQ]);

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="flex h-[62vh] flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-wine-light text-wine"><Brain size={22} /></div>
              <p className="font-display text-xl text-ink">Pergunte à sua biblioteca</p>
              <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-mute">
                A IA responde usando apenas os seus livros, notas e destaques — nada de outros usuários.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => ask(s)} className="rounded-full border border-line px-3.5 py-1.5 text-[12.5px] text-mute transition-colors hover:border-gold/50 hover:text-ink">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                  m.role === 'user' ? 'ml-auto bg-wine text-[#f7f0e2]' : 'card text-ink'
                }`}>
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.badge && (
                  <p className={`mt-2 flex items-center gap-1 text-[11px] ${m.role === 'user' ? 'text-[#f7f0e2]/70' : 'text-faint'}`}>
                    <Database size={10} /> {m.badge}
                  </p>
                )}
                {m.aiOffer && (
                  <button
                    onClick={() => synthesize(m)}
                    disabled={aiBusy}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3.5 py-1.5 text-[12.5px] font-medium text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"
                  >
                    <Sparkles size={13} /> Sintetizar com IA (Gemini)
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {thinking && (
            <div className="card inline-flex items-center gap-2 px-4 py-3 text-[13px] text-mute">
              <Sparkles size={14} className="animate-pulse text-gold" /> pesquisando sua biblioteca localmente…
            </div>
          )}
          <div ref={endRef} />
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); ask(input); }}
          className="border-t border-line p-3"
        >
          <div className="flex gap-2">
            <input
              value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Ex.: quais livros falam sobre niilismo?"
              className="h-11 flex-1 rounded-xl border border-line bg-card2/50 px-3.5 text-[14px] text-ink placeholder:text-faint focus:border-gold focus:outline-none"
              aria-label="Sua pergunta"
            />
            <Button type="submit" disabled={!input.trim() || thinking} aria-label="Enviar pergunta"><Send size={16} /></Button>
          </div>
          <p className="mt-2 flex items-center justify-between text-[11px] text-faint">
            <span>A busca local é gratuita; a IA só é chamada quando você pede.</span>
            {usage && aiAvailable() && (
              <span className="tabular-nums">IA hoje: {usage.today}/{AI_CONFIG.dailyLimit}</span>
            )}
          </p>
        </form>
      </Card>
      <p className="mt-3 text-center text-[11.5px] text-faint">
        {aiAvailable()
          ? 'Perguntas repetidas usam cache — sem custo extra. Contexto mínimo é enviado à IA.'
          : 'Configure VITE_GEMINI_API_KEY (ou um proxy VITE_AI_ENDPOINT) para ativar a síntese com IA.'}
      </p>
    </div>
  );
}

// ─── Mapa de conceitos ───
function ConceptMap() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([backend.listBooks(user.id), backend.listNotes(user.id), backend.listHighlights(user.id)])
      .then(([b, n, h]) => { setBooks(b); setNotes(n); setHighlights(h); })
      .finally(() => setLoading(false));
  }, [user?.id]);

  // Nós: gêneros dos livros + tags das notas (co-ocorrência gera arestas)
  const { nodes, edges } = useMemo(() => {
    const conceptBooks = new Map<string, Set<string>>();
    const add = (concept: string, bookId: string | null) => {
      const k = concept.toLowerCase();
      if (!conceptBooks.has(k)) conceptBooks.set(k, new Set());
      if (bookId) conceptBooks.get(k)!.add(bookId);
    };
    books.forEach((b) => add(b.genre, b.id));
    notes.forEach((n) => { n.tags.forEach((t) => add(t, n.bookId)); });

    const names = [...conceptBooks.keys()];
    const pos = new Map<string, { x: number; y: number }>();
    names.forEach((n, i) => {
      const angle = (i / Math.max(1, names.length)) * Math.PI * 2;
      const r = 110 + (i % 3) * 36;
      pos.set(n, { x: 260 + Math.cos(angle) * r, y: 170 + Math.sin(angle) * r * 0.72 });
    });

    const edgeSet = new Set<string>();
    notes.forEach((n) => {
      const tags = [...n.tags.map((t) => t.toLowerCase())];
      const book = books.find((b) => b.id === n.bookId);
      if (book) tags.push(book.genre.toLowerCase());
      for (let i = 0; i < tags.length; i++)
        for (let j = i + 1; j < tags.length; j++)
          edgeSet.add([tags[i], tags[j]].sort().join('||'));
    });

    return {
      nodes: names.map((n) => ({ name: n, books: [...(conceptBooks.get(n) || [])], big: (conceptBooks.get(n) || new Set()).size >= 2 })),
      edges: [...edgeSet].map((e) => e.split('||')),
    };
  }, [books, notes]);

  const sel = nodes.find((n) => n.name === selected);

  if (loading) return <Skeleton className="h-96" />;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card className="noise relative min-h-[420px] overflow-hidden">
        <svg viewBox="0 0 520 340" className="h-full w-full" role="img" aria-label="Mapa de conceitos da sua biblioteca">
          {edges.map(([a, b]) => {
            const pa = nodes.find((n) => n.name === a);
            const pb = nodes.find((n) => n.name === b);
            if (!pa || !pb) return null;
            const A = pos2(a, nodes), B = pos2(b, nodes);
            return <line key={a + b} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="var(--line)" strokeWidth="1.2" />;
          })}
          {nodes.map((n, i) => {
            const p = pos2(n.name, nodes);
            const active = selected === n.name;
            return (
              <motion.g key={n.name}
                initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                onClick={() => setSelected(active ? null : n.name)}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={p.x} cy={p.y} r={n.big ? 30 : 21}
                  fill={active ? 'var(--wine)' : 'var(--wine-light)'}
                  stroke="var(--wine)" strokeOpacity={active ? 1 : 0.45} strokeWidth="1.4" />
                <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize={n.big ? 10 : 8.5}
                  fill={active ? '#f7f0e2' : 'var(--ink)'} fontFamily="Inter, sans-serif" letterSpacing="1.2">
                  {n.name.toUpperCase().slice(0, 14)}
                </text>
              </motion.g>
            );
          })}
        </svg>
        {nodes.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-mute">
            Adicione livros e notas com tags para desenhar seu mapa.
          </p>
        )}
      </Card>

      <Card className="p-5">
        {sel ? (
          <>
            <p className="smallcaps mb-1">conceito</p>
            <h3 className="font-display text-xl capitalize text-ink">{sel.name}</h3>
            <p className="mt-1 text-[12.5px] text-faint">{sel.books.length} livro(s) relacionado(s) · {notes.filter((n) => n.tags.map((t) => t.toLowerCase()).includes(sel.name)).length} anotação(ões)</p>
            <div className="mt-4 space-y-2">
              {sel.books.map((id) => {
                const b = books.find((x) => x.id === id);
                if (!b) return null;
                return (
                  <div key={id} className="rounded-xl bg-card2/60 px-3 py-2">
                    <p className="text-[13.5px] font-medium text-ink">{b.title}</p>
                    <p className="text-[11.5px] text-faint">{b.author}</p>
                  </div>
                );
              })}
              {notes.filter((n) => n.tags.map((t) => t.toLowerCase()).includes(sel.name)).slice(0, 3).map((n) => (
                <div key={n.id} className="rounded-xl border border-line px-3 py-2">
                  <p className="text-[13px] leading-relaxed text-mute">{n.text}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="py-10 text-center text-sm leading-relaxed text-mute">
            Toque em um conceito para ver livros, notas e ocorrências relacionadas.
          </p>
        )}
      </Card>
    </div>
  );
}

function pos2(name: string, nodes: { name: string }[]): { x: number; y: number } {
  const i = nodes.findIndex((n) => n.name === name);
  const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2;
  const r = 110 + (i % 3) * 36;
  return { x: 260 + Math.cos(angle) * r, y: 170 + Math.sin(angle) * r * 0.72 };
}

// ─── Revisão ───
function Review() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [revealed, setRevealed] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([backend.listNotes(user.id), backend.listBooks(user.id)]).then(([n, b]) => {
      setNotes(n.filter((x) => x.review));
      setBooks(b);
    });
  }, [user?.id]);

  if (notes.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Repeat size={30} className="mx-auto mb-3 text-gold" />
        <p className="font-display text-xl text-ink">Nada marcado para revisar.</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-mute">
          Nas suas notas, toque no ícone de repetição para marcar algo como “importante para revisar depois”.
          O Atheneu transformará essas notas em perguntas para você.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {notes.map((n) => {
        const book = books.find((b) => b.id === n.bookId);
        const open = revealed === n.id;
        const concept = n.tags[0] || 'este trecho';
        return (
          <Card key={n.id} className="p-5">
            <p className="smallcaps mb-2 flex items-center gap-1.5"><RotateCw size={12} /> revisão</p>
            <p className="font-display text-[17px] leading-snug text-ink">
              O que você entendeu sobre {concept}?
            </p>
            <AnimatePresence>
              {open ? (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-4 space-y-2.5">
                    {n.excerpt && <p className="rounded-xl bg-card2/60 p-3 font-reader text-[13.5px] italic text-mute">“{n.excerpt}”</p>}
                    <p className="text-[14px] leading-relaxed text-ink">{n.text}</p>
                    {book && <p className="text-[12px] text-faint">{book.title} · {book.author}</p>}
                  </div>
                </motion.div>
              ) : (
                <p className="mt-3 text-[13px] text-faint">Tente lembrar antes de revelar — é assim que a memória se fortalece.</p>
              )}
            </AnimatePresence>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setRevealed(open ? null : n.id)}>
              {open ? 'Ocultar' : 'Revelar resposta'}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
