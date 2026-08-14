// Renderer seguro de um subconjunto de markdown (§15/§28).
// NUNCA injeta HTML arbitrário: escapa tudo e só aplica formatação controlada.
import React from 'react';

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// sanitiza entrada do usuário: remove tags/JS, limita tamanho
export function sanitizeText(s: string, max = 20000): string {
  return String(s || '')
    .replace(/<\s*(script|iframe|object|embed|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .slice(0, max);
}

// parse inline: **negrito**, *itálico*, `código`, [link](url) — sobre texto já escapado
function inline(esc: string, key: number): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^\s)]+)\))/g;
  let last = 0; let m: RegExpExecArray | null; let k = 0;
  while ((m = re.exec(esc))) {
    if (m.index > last) nodes.push(esc.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) nodes.push(<strong key={`${key}-${k++}`}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) nodes.push(<code key={`${key}-${k++}`} className="rounded bg-card2 px-1">{t.slice(1, -1)}</code>);
    else if (t.startsWith('*')) nodes.push(<em key={`${key}-${k++}`}>{t.slice(1, -1)}</em>);
    else {
      const lm = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(t);
      if (lm) nodes.push(<a key={`${key}-${k++}`} href={lm[2]} target="_blank" rel="noopener noreferrer" className="text-wine underline">{lm[1]}</a>);
    }
    last = m.index + t.length;
  }
  if (last < esc.length) nodes.push(esc.slice(last));
  return nodes;
}

// blocos: # título, > citação, - lista, --- separador, linha normal
export function RichText({ text }: { text: string }) {
  const lines = escapeHtml(text).split(/\n/);
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = (key: string) => {
    if (list.length) { out.push(<ul key={key} className="my-2 list-disc pl-5">{list.map((li, i) => <li key={i}>{inline(li, i)}</li>)}</ul>); list = []; }
  };
  lines.forEach((ln, i) => {
    const l = ln.trimEnd();
    if (/^\s*[-•]\s+/.test(l)) { list.push(l.replace(/^\s*[-•]\s+/, '')); return; }
    flush(`ul${i}`);
    if (/^---+\s*$/.test(l)) out.push(<hr key={i} className="my-3 border-line" />);
    else if (/^###\s+/.test(l)) out.push(<h4 key={i} className="mt-3 font-display text-[15px] font-semibold text-ink">{inline(l.replace(/^###\s+/, ''), i)}</h4>);
    else if (/^##\s+/.test(l)) out.push(<h3 key={i} className="mt-3 font-display text-[17px] font-semibold text-ink">{inline(l.replace(/^##\s+/, ''), i)}</h3>);
    else if (/^#\s+/.test(l)) out.push(<h2 key={i} className="mt-3 font-display text-[19px] font-semibold text-ink">{inline(l.replace(/^#\s+/, ''), i)}</h2>);
    else if (/^>\s?/.test(l)) out.push(<blockquote key={i} className="my-2 border-l-2 border-gold pl-3 italic text-mute">{inline(l.replace(/^>\s?/, ''), i)}</blockquote>);
    else if (l.trim() === '') out.push(<div key={i} className="h-2" />);
    else out.push(<p key={i} className="my-1 leading-relaxed">{inline(l, i)}</p>);
  });
  flush('end');
  return <div className="text-[14px] text-ink">{out}</div>;
}

// destaca @menções e #tags como tokens visuais (somente leitura)
export function highlightMentions(text: string): React.ReactNode[] {
  const esc = escapeHtml(text);
  const parts = esc.split(/(@[a-z0-9_]{2,}|#[\p{L}\p{N}_]+)/gu);
  return parts.map((p, i) =>
    /^[@#]/.test(p) ? <span key={i} className="font-semibold text-wine">{p}</span> : <React.Fragment key={i}>{p}</React.Fragment>
  );
}
