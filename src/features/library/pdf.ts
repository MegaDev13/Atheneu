// ─── PDF: exibição fiel + extração de texto em segundo plano ─────────────
// O PDF é exibido como é (renderização PDF.js) enquanto o texto é extraído
// página a página para habilitar busca, notas, estatísticas e audiobook.
// A contagem de páginas é sempre a do PDF completo.

import * as pdfjs from 'pdfjs-dist';
import PdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { backend } from '../../services/api';
import { uid } from '../../lib/utils';
import type { Chapter } from '../../lib/types';

let workerReady = false;
function ensureWorker() {
  if (!workerReady) {
    pdfjs.GlobalWorkerOptions.workerSrc = PdfWorkerUrl;
    workerReady = true;
  }
}

export async function openPdf(data: ArrayBuffer) {
  ensureWorker();
  return pdfjs.getDocument({ data: data.slice(0) }).promise;
}

// Número real de páginas do PDF (usado como book.pages).
export async function countPdfPages(data: ArrayBuffer): Promise<number> {
  const doc = await openPdf(data);
  const n = doc.numPages;
  await doc.destroy();
  return n;
}

// Texto de uma página, na mesma forma usada pela camada de texto do visualizador
// (itens concatenados por espaço) — mantém offsets de destaque consistentes.
async function pageText(doc: any, pageNo: number): Promise<string> {
  const page = await doc.getPage(pageNo);
  const content = await page.getTextContent();
  return (content.items as any[]).map((i) => i.str || '').join(' ').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Extrai todo o texto do PDF em segundo plano e grava um "capítulo" por página.
 * Retorna o total de páginas extraídas. Feito em lotes para PDFs grandes.
 */
export async function extractPdfToChapters(
  userId: string,
  bookId: string,
  data: ArrayBuffer,
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  const doc = await openPdf(data);
  const total = doc.numPages;
  const BATCH = 12;

  for (let start = 1; start <= total; start += BATCH) {
    const end = Math.min(total, start + BATCH - 1);
    const chapters: Chapter[] = [];
    for (let p = start; p <= end; p++) {
      const text = await pageText(doc, p);
      chapters.push({ id: uid(), bookId, index: p - 1, title: `Página ${p}`, text });
    }
    await backend.saveChapters(chapters);
    onProgress?.(end, total);
    // respiro para não travar a UI em PDFs grandes
    await new Promise((r) => setTimeout(r, 0));
  }

  await doc.destroy();
  return total;
}
