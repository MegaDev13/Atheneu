// Motor local de respostas sobre a biblioteca (§19).
// Quando VITE_AI_ENDPOINT estiver configurado, a aplicação consulta o endpoint
// (contrato: POST { question, context } → { answer }). Caso contrário, usa este
// motor baseado em busca e associações entre livros, notas e destaques —
// sempre com os dados do próprio usuário, nunca de terceiros.

import { aiEndpoint } from '../../lib/supabase';
import { keywords, norm } from '../../lib/utils';
import type { Book, Highlight, Note } from '../../lib/types';

export interface AiContext {
  books: Book[];
  notes: Note[];
  highlights: Highlight[];
}

export interface AiAnswer {
  text: string;
  refs: { kind: 'book' | 'note' | 'highlight'; title: string; excerpt?: string }[];
}

export async function askLibrary(question: string, ctx: AiContext): Promise<AiAnswer> {
  // Caminho remoto (opcional)
  if (aiEndpoint) {
    try {
      const res = await fetch(aiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          context: {
            books: ctx.books.map((b) => ({ title: b.title, author: b.author, genre: b.genre, status: b.status, description: b.description })),
            notes: ctx.notes.map((n) => ({ text: n.text, tags: n.tags, excerpt: n.excerpt })),
            highlights: ctx.highlights.map((h) => ({ text: h.text })),
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.answer) return { text: String(data.answer), refs: [] };
      }
    } catch (e) {
      console.warn('Endpoint de IA indisponível; usando motor local.', e);
    }
  }

  // Motor local
  const kws = keywords(question);
  if (kws.length === 0) {
    return { text: 'Posso buscar nos seus livros, notas e destaques. Tente perguntar, por exemplo: “quais livros falam sobre liberdade?”', refs: [] };
  }

  const match = (s: string) => {
    const ns = norm(s);
    return kws.filter((k) => ns.includes(k)).length;
  };

  const bookHits = ctx.books
    .map((b) => ({ b, score: match(`${b.title} ${b.author} ${b.genre} ${b.description}`) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const noteHits = ctx.notes
    .map((n) => ({ n, score: match(`${n.text} ${n.excerpt || ''} ${n.tags.join(' ')}`) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const hlHits = ctx.highlights
    .map((h) => ({ h, score: match(h.text) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (bookHits.length === 0 && noteHits.length === 0 && hlHits.length === 0) {
    return {
      text: `Procurei por ${kws.map((k) => `“${k}”`).join(', ')} nos seus livros, notas e destaques, mas não encontrei referências. À medida que você anota e destaca, essa busca fica mais rica.`,
      refs: [],
    };
  }

  let text = 'Na sua biblioteca, encontrei estas referências:\n\n';
  if (bookHits.length > 0) {
    text += 'Livros: ' + bookHits.map((x) => `“${x.b.title}” (${x.b.author}${x.b.genre ? ` · ${x.b.genre}` : ''})`).join('; ') + '.\n';
  }
  if (noteHits.length > 0) {
    text += '\nSuas anotações:\n' + noteHits.map((x) => `• ${x.n.text}`).join('\n') + '\n';
  }
  if (hlHits.length > 0) {
    text += '\nTrechos que você destacou:\n' + hlHits.map((x) => `• “${x.h.text.length > 140 ? x.h.text.slice(0, 140) + '…' : x.h.text}”`).join('\n');
  }

  // Dois autores distintos? Sugestão de conexão.
  const authors = [...new Set(bookHits.map((x) => x.b.author))];
  if (authors.length >= 2) {
    text += `\n\nUma conexão possível: ${authors.slice(0, 2).join(' e ')} aparecem juntos nesta busca — vale cruzar suas notas sobre eles no mapa de conceitos.`;
  }

  return {
    text,
    refs: [
      ...bookHits.map((x) => ({ kind: 'book' as const, title: x.b.title })),
      ...noteHits.map((x) => ({ kind: 'note' as const, title: x.n.text.slice(0, 60) })),
    ],
  };
}
