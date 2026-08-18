// Catálogo oficial da Shay: PDFs + capas + áudios publicados no Pages.
import type { Book, Chapter } from './types';
import {
  CLASSIC_COVERS, CLASSIC_PDF, asset, catalogUuid,
  filosofiaAntigaBooks, shayInvestigationBooks, shayInvestigationChapters,
} from './shayLibrary';
import { SEED_TEXTS } from './seedContent';

const DAY = 86400000;

export function catalogBooks(): Book[] {
  const now = Date.now();
  const classics: Book[] = (['crime', 'casmurro', 'meditacoes', 'sisifo', 'liberdade', 'riqueza'] as const).map((id, i) => {
    const meta: Record<string, [string, string, string, string, number]> = {
      crime: ['Crime e Castigo', 'Fiódor Dostoiévski', 'Literatura', 'Raskólnikov e o tribunal da consciência.', 520],
      casmurro: ['Dom Casmurro', 'Machado de Assis', 'Literatura', 'Capitu e os olhos de ressaca.', 256],
      meditacoes: ['Meditações', 'Marco Aurélio', 'Filosofia', 'Anotações privadas do imperador.', 240],
      sisifo: ['O Mito de Sísifo', 'Albert Camus', 'Filosofia', 'É preciso imaginar Sísifo feliz.', 144],
      liberdade: ['Sobre a Liberdade', 'John Stuart Mill', 'Política', 'O indivíduo é soberano sobre si mesmo.', 208],
      riqueza: ['A Riqueza das Nações', 'Adam Smith', 'Economia', 'Divisão do trabalho e a mão invisível.', 840],
    };
    const [title, author, genre, description, pages] = meta[id];
    const key = `b-${id}`;
    return {
      id: catalogUuid(key), title, author, genre, description,
      cover: CLASSIC_COVERS[key], format: 'pdf', status: i < 3 ? 'reading' : 'want',
      pages, rating: 0, addedAt: now - (10 + i) * DAY, lastAccess: now - i * DAY,
      fileKey: 'public:' + CLASSIC_PDF[key], fileSize: 0,
    };
  });
  const remap = (b: Book): Book => ({ ...b, id: catalogUuid(b.id) });
  return [...classics, ...filosofiaAntigaBooks(now, DAY).map(remap), ...shayInvestigationBooks(now, DAY).map(remap)];
}

export function catalogChapters(): Chapter[] {
  const chs: Chapter[] = [];
  for (const [key, data] of Object.entries(SEED_TEXTS)) {
    const bookId = catalogUuid(`b-${key}`);
    data.chapters.forEach((c, i) =>
      chs.push({ id: catalogUuid(`c-${key}-${i}`), bookId, index: i, title: c.title, text: c.text })
    );
  }
  for (const c of shayInvestigationChapters()) {
    chs.push({ ...c, id: catalogUuid(c.id), bookId: catalogUuid(c.bookId) });
  }
  chs.push({
    id: catalogUuid('c-filo-1-0'), bookId: catalogUuid('b-filo-1'), index: 0, title: 'Sobre esta compilação',
    text: 'Compilação Filosofia Antiga I — Pré-Socráticos, Sócrates e Platão. O PDF completo está no leitor.',
  });
  chs.push({
    id: catalogUuid('c-filo-2-0'), bookId: catalogUuid('b-filo-2'), index: 0, title: 'Sobre esta compilação',
    text: 'Filosofia Antiga II — Aristóteles, Helenismo e Roma. O PDF completo está no leitor.',
  });
  return chs;
}

export function publicFileUrl(fileKey: string | null): string | null {
  if (!fileKey) return null;
  if (fileKey.startsWith('http://') || fileKey.startsWith('https://')) return fileKey;
  if (fileKey.startsWith('public:')) return asset(fileKey.slice('public:'.length));
  if (fileKey.startsWith('./') || fileKey.startsWith('/')) return fileKey;
  return null;
}
