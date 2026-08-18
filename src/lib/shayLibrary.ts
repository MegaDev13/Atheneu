// Série Investigação Crítica + capas da estante da Shay.
import type { Book, Chapter } from './types';
import rawChapters from './investigacaoChapters.json';

export const asset = (p: string) => {
  const base = (import.meta.env.BASE_URL as string | undefined) || './';
  const b = base.endsWith('/') ? base : base + '/';
  return b + p.replace(/^\/+/, '');
};

/** UUID determinístico (Postgres) a partir do id estável do catálogo. */
export function catalogUuid(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hex = (n: number, w: number) => (n >>> 0).toString(16).padStart(w, '0');
  let acc = '';
  let x = h >>> 0;
  while (acc.length < 32) {
    x = Math.imul(x ^ (x >>> 16), 2246822507) >>> 0;
    acc += hex(x, 8);
  }
  return `${acc.slice(0, 8)}-${acc.slice(8, 12)}-4${acc.slice(13, 16)}-a${acc.slice(17, 20)}-${acc.slice(20, 32)}`;
}

const KNOWN_SLUGS = [
  'b-crime', 'b-casmurro', 'b-meditacoes', 'b-sisifo', 'b-liberdade', 'b-riqueza',
  'b-filo-1', 'b-filo-2',
  'b-inv-01', 'b-inv-02', 'b-inv-03', 'b-inv-04', 'b-inv-05', 'b-inv-06', 'b-inv-07', 'b-inv-08',
];

export function slugFromCatalogUuid(id: string): string | null {
  if (KNOWN_SLUGS.includes(id)) return id;
  for (const s of KNOWN_SLUGS) if (catalogUuid(s) === id) return s;
  return null;
}

export const SHAY_ID = 'u-shay';
export const SHAY_EMAIL = 'shay@atheneu.app';
export const SHAY_NAME = 'Shay';

export function shayInvestigationBooks(now: number, DAY: number): Book[] {
  const mk = (
    id: string, title: string, author: string, genre: string, description: string,
    cover: string, file: string, pages: number, ago: number,
  ): Book => ({
    id, title, author, genre, description, cover: asset(cover), format: 'pdf', status: 'want',
    pages, rating: 0, addedAt: now - ago * DAY, lastAccess: now - ago * DAY,
    fileKey: 'public:' + file, fileSize: 0,
  });
  return [
    mk('b-inv-01', 'Raízes e mapa das ideias', 'Investigação Crítica — Atheneu', 'História',
      'Primeiro volume: raízes intelectuais anteriores ao marxismo, sem projetar o vocabulário do século XX sobre Platão, More ou Müntzer.',
      'covers/inv-01-raizes.jpg', 'library/investigacao-01-raizes-e-mapa-das-ideias.pdf', 72, 2),
    mk('b-inv-02', 'A fábrica e o século XIX', 'Investigação Crítica — Atheneu', 'História',
      'Revolução Industrial, proletariado e o nascimento do socialismo moderno — sem assumir de antemão a narrativa socialista nem a liberal.',
      'covers/inv-02-industria.jpg', 'library/investigacao-02-revolucao-industrial-e-socialismo.pdf', 64, 3),
    mk('b-inv-03', 'O que Marx e Engels escreveram', 'Investigação Crítica — Atheneu', 'Filosofia',
      'Leitura direta do Manifesto, de O capital e da Crítica do programa de Gotha. Distingue o escrito das políticas de Lênin, Stálin e Mao.',
      'covers/inv-03-marx.jpg', 'library/investigacao-03-marx-e-engels.pdf', 68, 4),
    mk('b-inv-04', 'Capitalismo: estruturas, defesas e críticas', 'Investigação Crítica — Atheneu', 'Economia',
      'Smith, Hayek, Schumpeter e Friedman ao lado do dossiê de desigualdade, crises e clima — cada lado com evidência e contra-argumento.',
      'covers/inv-04-capitalismo.jpg', 'library/investigacao-04-capitalismo-defesas-e-criticas.pdf', 70, 5),
    mk('b-inv-05', 'Correntes socialistas e a Revolução Russa', 'Investigação Crítica — Atheneu', 'História',
      'Marx, Bakunin, Kropotkin, Bernstein e Lênin. A Rússia de 1905 a 1924 sob narrativas bolchevique, menchevique, anarquista e liberal.',
      'covers/inv-05-russia.jpg', 'library/investigacao-05-correntes-e-revolucao-russa.pdf', 66, 6),
    mk('b-inv-06', 'Stálin, a URSS e o bloco europeu', 'Investigação Crítica — Atheneu', 'História',
      'Coletivização, Holodomor, planos, Gulag, Guerra e o bloco — com intervalos de estimativa, não com um único número sagrado.',
      'covers/inv-06-urss.jpg', 'library/investigacao-06-stalin-urss-e-o-bloco.pdf', 68, 7),
    mk('b-inv-07', 'China, Cuba e as outras experiências', 'Investigação Crítica — Atheneu', 'História',
      'Mao, Deng e a pergunta: a China de hoje é comunista, socialista, capitalista de Estado ou um híbrido? Cuba, Vietnã e Coreia do Norte à parte.',
      'covers/inv-07-china.jpg', 'library/investigacao-07-china-cuba-e-outras-experiencias.pdf', 62, 8),
    mk('b-inv-08', 'Comparações, contradições e o que a evidência sustenta', 'Investigação Crítica — Atheneu', 'Economia',
      'Cálculo econômico, propaganda dos dois lados, números lado a lado e uma síntese sem veredito teológico.',
      'covers/inv-08-sintese.jpg', 'library/investigacao-08-comparacoes-contradicões-e-sintese.pdf', 74, 9),
  ];
}

export function shayInvestigationChapters(): Chapter[] {
  return (rawChapters as { bookId: string; index: number; title: string; text: string }[]).map((c) => ({
    id: `c-inv-${c.bookId}-${c.index}`,
    bookId: c.bookId,
    index: c.index,
    title: c.title,
    text: c.text,
  }));
}

/** Faixas do texto integral (PDF), em ordem. Cada entrada é um capítulo. */
export const FULL_AUDIO: Record<string, string[]> = {
  'b-inv-01:0': [asset('audio/full/b-inv-01-c00-p00.mp3'), asset('audio/full/b-inv-01-c00-p01.mp3')],
  'b-inv-01:1': [asset('audio/full/b-inv-01-c01-p00.mp3'), asset('audio/full/b-inv-01-c01-p01.mp3')],
  'b-inv-01:2': [asset('audio/full/b-inv-01-c02-p00.mp3'), asset('audio/full/b-inv-01-c02-p01.mp3')],
  'b-inv-01:3': [asset('audio/full/b-inv-01-c03-p00.mp3')],
  'b-inv-01:4': [asset('audio/full/b-inv-01-c04-p00.mp3'), asset('audio/full/b-inv-01-c04-p01.mp3')],
  'b-inv-01:5': [asset('audio/full/b-inv-01-c05-p00.mp3')],
};

export function publicAudioPlaylist(bookId: string, chapterIdx: number): string[] {
  const slug = slugFromCatalogUuid(bookId) || bookId;
  const full = FULL_AUDIO[`${slug}:${chapterIdx}`];
  if (full?.length) return full;
  const one = PUBLIC_AUDIO[`${slug}:${chapterIdx}`] || PUBLIC_AUDIO[slug];
  return one ? [one] : [];
}

/** Áudio por capítulo; se faltar, o player usa o trilho do livro inteiro. */
export const PUBLIC_AUDIO: Record<string, string> = {
  'b-crime': asset('audio/crime-e-castigo.mp3'),
  'b-casmurro': asset('audio/dom-casmurro.mp3'),
  'b-meditacoes': asset('audio/meditacoes.mp3'),
  'b-sisifo': asset('audio/mito-de-sisifo.mp3'),
  'b-liberdade': asset('audio/sobre-a-liberdade.mp3'),
  'b-riqueza': asset('audio/riqueza-das-nacoes.mp3'),
  'b-filo-1': asset('audio/filosofia-antiga-1.mp3'),
  'b-filo-2': asset('audio/filosofia-antiga-2.mp3'),
  'b-inv-01': asset('audio/inv-01-cap01.mp3'),
  'b-inv-01:0': asset('audio/inv-01-cap01.mp3'),
  'b-inv-01:1': asset('audio/inv-01-cap02.mp3'),
  'b-inv-02': asset('audio/inv-02.mp3'),
  'b-inv-03': asset('audio/inv-03-marx.mp3'),
  'b-inv-03:3': asset('audio/inv-03-marx.mp3'),
  'b-inv-04': asset('audio/inv-04-a-07.mp3'),
  'b-inv-05': asset('audio/inv-04-a-07.mp3'),
  'b-inv-06': asset('audio/inv-04-a-07.mp3'),
  'b-inv-07': asset('audio/inv-04-a-07.mp3'),
  'b-inv-08': asset('audio/inv-08-sintese.mp3'),
  'b-inv-08:4': asset('audio/inv-08-sintese.mp3'),
};

export function publicAudioFor(bookId: string, chapterIdx: number): string | null {
  const slug = slugFromCatalogUuid(bookId) || bookId;
  const full = FULL_AUDIO[`${slug}:${chapterIdx}`];
  if (full?.length) return full[0];
  return PUBLIC_AUDIO[`${slug}:${chapterIdx}`] || PUBLIC_AUDIO[slug] || null;
}

export const CLASSIC_PDF: Record<string, string> = {
  'b-crime': 'library/crime-e-castigo.pdf',
  'b-casmurro': 'library/dom-casmurro.pdf',
  'b-meditacoes': 'library/meditacoes.pdf',
  'b-sisifo': 'library/o-mito-de-sisifo.pdf',
  'b-liberdade': 'library/sobre-a-liberdade.pdf',
  'b-riqueza': 'library/a-riqueza-das-nacoes.pdf',
};

export const CLASSIC_COVERS: Record<string, string> = {
  'b-crime': asset('covers/crime-e-castigo.jpg'),
  'b-casmurro': asset('covers/dom-casmurro.jpg'),
  'b-meditacoes': asset('covers/meditacoes.jpg'),
  'b-sisifo': asset('covers/mito-de-sisifo.jpg'),
  'b-liberdade': asset('covers/sobre-a-liberdade.jpg'),
  'b-riqueza': asset('covers/riqueza-das-nacoes.jpg'),
};

export function filosofiaAntigaBooks(now: number, DAY: number): Book[] {
  return [
    {
      id: 'b-filo-1', title: 'Filosofia Antiga I — Pré-Socráticos, Sócrates e Platão', author: 'Compilação',
      genre: 'Filosofia',
      description: 'Compilação das obras e fragmentos dos pré-socráticos, diálogos de Platão e textos socráticos.',
      cover: asset('covers/filosofia-antiga-1.jpg'), format: 'pdf', status: 'reading', pages: 1851, rating: 0,
      addedAt: now - 20 * DAY, lastAccess: now - 3 * DAY,
      fileKey: 'public:library/filosofia-antiga-1-pre-socraticos-platao.pdf', fileSize: 0,
    },
    {
      id: 'b-filo-2', title: 'Filosofia Antiga II — Aristóteles, Helenismo e Roma', author: 'Compilação',
      genre: 'Filosofia',
      description: 'Aristóteles, escolas helenísticas e o pensamento romano — continuação da compilação de Filosofia Antiga.',
      cover: asset('covers/filosofia-antiga-2.jpg'), format: 'pdf', status: 'want', pages: 900, rating: 0,
      addedAt: now - 18 * DAY, lastAccess: now - 7 * DAY,
      fileKey: 'public:library/filosofia-antiga-2-aristoteles-helenismo-roma.pdf', fileSize: 0,
    },
  ];
}
