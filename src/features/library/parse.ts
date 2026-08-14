// Extração de texto e metadados dos formatos suportados (§11).
// O arquivo original permanece intacto no storage; aqui geramos o texto processado.

import { pagesForWords } from '../../lib/utils';

export interface ParsedBook {
  title?: string;
  author?: string;
  chapters: { title: string; text: string }[];
  pagesEstimate: number;
  format: 'txt' | 'epub' | 'pdf' | 'docx';
}

// Divide texto corrido em capítulos por heurística.
export function splitChapters(text: string, fallbackTitle: string): { title: string; text: string }[] {
  const lines = text.split(/\r?\n/);
  const chapterRe = /^\s*(cap[íi]tulo|chapter|parte|livro|liv\.?|cap\.?|se[çc][ãa]o|[ivxlcdm]{2,8})[\s.:–—-]*\d*/i;
  const chapters: { title: string; text: string }[] = [];
  let current: { title: string; text: string } | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (chapterRe.test(line) && line.length < 80) {
      if (current) chapters.push(current);
      current = { title: line.replace(/^[–—•*]+/, '').trim(), text: '' };
    } else if (current) {
      current.text += line + '\n\n';
    } else {
      if (!current && chapters.length === 0) current = { title: fallbackTitle, text: '' };
      if (current) current.text += line + '\n\n';
    }
  }
  if (current) chapters.push(current);

  const withText = chapters.filter((c) => c.text.trim().length > 120);
  if (withText.length === 0) {
    // Sem estrutura de capítulos: divide por blocos de ~2.200 palavras.
    const words = text.split(/\s+/);
    const out: { title: string; text: string }[] = [];
    const size = 2200;
    for (let i = 0; i < words.length; i += size) {
      out.push({ title: `Parte ${out.length + 1}`, text: words.slice(i, i + size).join(' ') });
    }
    return out.length ? out : [{ title: fallbackTitle, text }];
  }
  return withText;
}

export async function parseFile(file: File): Promise<ParsedBook> {
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  if (ext === 'txt') {
    const text = await file.text();
    const chapters = splitChapters(text, file.name.replace(/\.txt$/i, ''));
    const words = text.split(/\s+/).length;
    return { chapters, pagesEstimate: pagesForWords(words), format: 'txt' };
  }

  if (ext === 'epub') {
    const ePub = (await import('epubjs')).default;
    const buf = await file.arrayBuffer();
    const book = ePub(buf as any);
    await book.ready;
    const meta = await book.loaded.metadata;
    const chapters: { title: string; text: string }[] = [];
    const spine = (book.spine as any)?.spineItems || [];
    for (const item of spine) {
      try {
        await item.load(book.load.bind(book));
        const doc: Document = item.document || item.contents?.document;
        if (!doc?.body) continue;
        const text = (doc.body.textContent || '').replace(/\s{3,}/g, '\n\n').trim();
        if (text.length < 60) continue;
        let title = '';
        try {
          const h = doc.querySelector('h1,h2,h3,title');
          title = (h?.textContent || '').trim();
        } catch {}
        chapters.push({ title: title || `Seção ${chapters.length + 1}`, text });
      } catch (e) {
        console.warn('Capítulo de EPUB ignorado:', e);
      }
    }
    if (chapters.length === 0) throw new Error('Não foi possível extrair o texto deste EPUB.');
    const words = chapters.reduce((a, c) => a + c.text.split(/\s+/).length, 0);
    return { title: meta?.title, author: meta?.creator, chapters, pagesEstimate: pagesForWords(words), format: 'epub' };
  }

  if (ext === 'docx') {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const doc = await zip.file('word/document.xml')?.async('string');
    if (!doc) throw new Error('Arquivo DOCX inválido.');
    const text = doc
      .replace(/<w:p [^>]*>|<w:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (!text) throw new Error('Este DOCX parece não conter texto.');
    const chapters = splitChapters(text, file.name.replace(/\.docx$/i, ''));
    return { chapters, pagesEstimate: pagesForWords(text.split(/\s+/).length), format: 'docx' };
  }

  if (ext === 'pdf') {
    // O PDF será exibido como é (PDF.js). Aqui só contamos as páginas reais;
    // a extração do texto roda em segundo plano depois do upload (extractPdfToChapters).
    const { countPdfPages } = await import('./pdf');
    const pages = await countPdfPages(await file.arrayBuffer());
    return { chapters: [], pagesEstimate: pages, format: 'pdf' };
  }

  throw new Error('Formato não suportado. Use EPUB, PDF, TXT ou DOCX.');
}

// Redimensiona capa enviada para um dataURL leve.
export function fileToCoverDataUrl(file: File, max = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('Imagem inválida.'));
    img.src = url;
  });
}
