// Utilitários de áudio: concatenação de WAV, duração e hash de integridade (§48).
import * as fs from 'fs';
import { createHash } from 'crypto';

export interface WavInfo {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  dataOffset: number;
  dataSize: number;
}

export function parseWav(buf: Buffer): WavInfo | null {
  if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return null;
  let off = 12;
  let fmt: any = null;
  let dataOffset = -1;
  let dataSize = 0;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') {
      fmt = {
        channels: buf.readUInt16LE(off + 10),
        sampleRate: buf.readUInt32LE(off + 12),
        bitsPerSample: buf.readUInt16LE(off + 22),
      };
    } else if (id === 'data') {
      dataOffset = off + 8;
      dataSize = size;
      break;
    }
    off += 8 + size + (size % 2);
  }
  if (!fmt || dataOffset < 0) return null;
  return { ...fmt, dataOffset, dataSize };
}

export function wavSeconds(buf: Buffer): number {
  const info = parseWav(buf);
  if (!info) return 0;
  const bytesPerSec = (info.sampleRate * info.channels * info.bitsPerSample) / 8;
  return bytesPerSec > 0 ? info.dataSize / bytesPerSec : 0;
}

// Concatena vários WAV compatíveis em um único WAV.
export function concatWav(files: string[], outFile: string): void {
  const chunks: Buffer[] = [];
  let fmtChunk: Buffer | null = null;
  let totalData = 0;

  for (const f of files) {
    const buf = fs.readFileSync(f);
    const info = parseWav(buf);
    if (!info) throw new Error(`WAV inválido: ${f}`);
    // Copia apenas o chunk 'fmt ' (assume-se fmt como primeiro chunk —
    // padrão nos WAVs gerados por Kokoro/Piper/sistema).
    if (!fmtChunk) {
      const fmtSize = buf.readUInt32LE(16);
      fmtChunk = buf.subarray(12, 20 + fmtSize);
    }
    chunks.push(buf.subarray(info.dataOffset, info.dataOffset + info.dataSize));
    totalData += info.dataSize;
  }
  if (!fmtChunk) throw new Error('Nenhum segmento de áudio gerado.');

  const header = Buffer.alloc(12);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + totalData, 4);
  header.write('WAVE', 8);
  const dataHeader = Buffer.alloc(8);
  dataHeader.write('data', 0);
  dataHeader.writeUInt32LE(totalData, 4);
  fs.writeFileSync(outFile, Buffer.concat([header, fmtChunk, dataHeader, ...chunks]));
}

export function sha256File(path: string): string {
  return createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}
