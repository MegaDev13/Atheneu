// Narração com a API Gemini (áudio nativo).
// Usa a mesma chave já configurada no perfil / VITE_GEMINI_API_KEY.
// Documentação: https://ai.google.dev/gemini-api/docs/speech-generation

import { effectiveGeminiKey, AI_CONFIG } from './config';

export const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
export const GEMINI_TTS_VOICES = [
  { id: 'Kore', label: 'Kore — firme, narradora' },
  { id: 'Aoede', label: 'Aoede — cálida' },
  { id: 'Leda', label: 'Leda — clara' },
  { id: 'Zephyr', label: 'Zephyr — suave' },
  { id: 'Puck', label: 'Puck — viva' },
  { id: 'Charon', label: 'Charon — grave' },
  { id: 'Fenrir', label: 'Fenrir — profunda' },
  { id: 'Orus', label: 'Orus — sóbria' },
] as const;

export function geminiTtsAvailable(): boolean {
  return Boolean(effectiveGeminiKey());
}

/** Divide o texto em blocos que a API de fala aceita com folga. */
export function chunkForSpeech(text: string, max = 2800): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= max) return [clean];
  const parts: string[] = [];
  let rest = clean;
  while (rest.length > max) {
    let cut = rest.lastIndexOf('. ', max);
    if (cut < max * 0.5) cut = rest.lastIndexOf(' ', max);
    if (cut < 40) cut = max;
    parts.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

function pcmToWav(pcm: Uint8Array, sampleRate = 24000, channels = 1, bits = 16): Blob {
  const block = channels * (bits / 8);
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const write = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  write(0, 'RIFF');
  v.setUint32(4, 36 + pcm.length, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * block, true);
  v.setUint16(32, block, true);
  v.setUint16(34, bits, true);
  write(36, 'data');
  v.setUint32(40, pcm.length, true);
  return new Blob([header, pcm], { type: 'audio/wav' });
}

async function synthesizeChunk(text: string, voice: string): Promise<Uint8Array> {
  const key = effectiveGeminiKey();
  if (!key) throw new Error('Chave Gemini ausente.');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`;
  const prompt = `Leia em português brasileiro, com dicção de audiolivro: clara, pausada e fiel ao texto, sem comentários.\n\n${text}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || 'Kore' } } },
        temperature: 0.2,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini TTS HTTP ${res.status}: ${body.slice(0, 240)}`);
  }
  const data = await res.json();
  const b64: string =
    data?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data)?.inlineData?.data || '';
  if (!b64) throw new Error('Gemini TTS retornou áudio vazio.');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function synthesizeChapterGemini(
  text: string,
  opts?: { voice?: string; onChunk?: (i: number, n: number) => void },
): Promise<Blob> {
  const voice = opts?.voice || 'Kore';
  const chunks = chunkForSpeech(text);
  if (chunks.length === 0) throw new Error('Capítulo sem texto para narrar.');
  const pcms: Uint8Array[] = [];
  for (let i = 0; i < chunks.length; i++) {
    opts?.onChunk?.(i + 1, chunks.length);
    pcms.push(await synthesizeChunk(chunks[i], voice));
  }
  const total = pcms.reduce((n, a) => n + a.length, 0);
  const joined = new Uint8Array(total);
  let o = 0;
  for (const p of pcms) {
    joined.set(p, o);
    o += p.length;
  }
  return pcmToWav(joined);
}

export const geminiTtsModelLabel = () => `${GEMINI_TTS_MODEL} · ${AI_CONFIG.model}`;
