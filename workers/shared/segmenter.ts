// Divisão de capítulos em segmentos (§13): retomada granular e mapa de
// sincronização texto↔áudio precisos. Frases são agrupadas até ~420 caracteres.

export interface Segment {
  index: number;
  start: number; // índice no texto do capítulo
  end: number;
  text: string;
}

const MAX_LEN = 420;
const MIN_LEN = 120;

export function segmentChapter(text: string): Segment[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.!?…])\s+/);
  const out: Segment[] = [];
  let cursor = 0;       // posição no texto limpo
  let acc = '';
  let accStart = 0;

  const flush = () => {
    if (acc.trim().length > 0) {
      out.push({ index: out.length, start: accStart, end: accStart + acc.length, text: acc.trim() });
    }
    acc = '';
  };

  for (const s of sentences) {
    const pos = clean.indexOf(s, cursor);
    cursor = pos + s.length;
    if (acc.length === 0) accStart = pos;
    if (acc.length + s.length + 1 > MAX_LEN && acc.length >= MIN_LEN) {
      flush();
      accStart = pos;
    }
    acc += (acc ? ' ' : '') + s;
  }
  flush();

  // Capítulo sem estrutura: divide por blocos de palavras.
  if (out.length === 0 && clean.length > 0) {
    const words = clean.split(' ');
    const size = 70;
    for (let i = 0; i < words.length; i += size) {
      const chunk = words.slice(i, i + size).join(' ');
      const start = clean.indexOf(chunk);
      out.push({ index: out.length, start, end: start + chunk.length, text: chunk });
    }
  }
  return out;
}
