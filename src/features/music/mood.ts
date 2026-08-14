// Detecção de atmosfera/atmosfera narrativa (local, sem IA) — usada por padrão
// pra MINIMIZAR chamadas à IA (§23). A IA (Gemini) só entra se o usuário ativar.
export type Mood = 'calm' | 'tense' | 'action' | 'romance' | 'melancholy' | 'terror' | 'humor';

export const MOOD_LABEL: Record<Mood, string> = {
  calm: 'contemplativa', tense: 'tensão', action: 'ação', romance: 'romance',
  melancholy: 'melancolia', terror: 'sombria', humor: 'leve/humor',
};

// ordem p/ continuidade musical (transições suaves entre vizinhos) (§16/17)
export const MOOD_AXIS: Mood[] = ['calm', 'romance', 'melancholy', 'tense', 'terror', 'action'];

const LEX: Record<Mood, string[]> = {
  calm: ['silêncio', 'silencio', 'calma', 'contempl', 'reflet', 'reflex', 'pensava', 'sereno', 'tranquil', 'respir', 'contemplação', 'medit', 'quiet', 'calm', 'peace', 'contemplat'],
  tense: ['tensão', 'tensao', 'ansied', 'inqui', 'pressent', 'suspeit', 'nervos', 'apreens', 'tens', 'anxiet', 'nervous', 'suspense', 'presságio'],
  action: ['correu', 'correr', 'lut', 'combate', 'batalh', 'grit', 'golpe', 'fug', 'perseg', 'ação', 'acao', 'violên', 'violence', 'fight', 'ran', 'battle', 'sudden'],
  romance: ['amor', 'amava', 'paix', 'beij', 'abraç', 'abraco', 'carinho', 'coração', 'coracao', 'desej', 'ternur', 'love', 'kiss', 'heart', 'apaixon'],
  melancholy: ['trist', 'saudade', 'lágrim', 'lagrim', 'perda', 'luto', 'sombrio', 'melancol', 'chor', 'solidão', 'solidao', 'grief', 'sorrow', 'sad', 'mourn'],
  terror: ['medo', 'terror', 'horror', 'pesadel', 'assombr', 'fantasm', 'morte', 'cadáv', 'cadav', 'escuridão', 'escuridao', 'trevas', 'fear', 'horror', 'dread', 'haunt'],
  humor: ['rir', 'riu', 'riso', 'graça', 'graca', 'piada', 'cômico', 'comico', 'brinc', 'zomb', 'laugh', 'joke', 'funny', 'humor'],
};

export function detectMood(text: string): { mood: Mood; score: number; intensity: number } {
  const t = (text || '').toLowerCase();
  let best: Mood = 'calm'; let bestN = 0;
  for (const m of Object.keys(LEX) as Mood[]) {
    let n = 0;
    for (const w of LEX[m]) if (t.includes(w)) n++;
    if (n > bestN) { bestN = n; best = m; }
  }
  // intensidade: exclamações + frases curtas + densidade
  const excl = (t.match(/!/g) || []).length;
  const intensity = Math.min(1, bestN / 6 + excl * 0.1);
  return { mood: bestN > 0 ? best : 'calm', score: bestN, intensity };
}

// atmosfera dominante de um bloco de páginas (§7)
export function analyzeBlock(texts: string[]): { mood: Mood; confidence: number } {
  const tally = new Map<Mood, number>();
  for (const t of texts) {
    const { mood, score } = detectMood(t);
    tally.set(mood, (tally.get(mood) || 0) + score + 0.5);
  }
  let best: Mood = 'calm'; let bestV = 0; let total = 0;
  tally.forEach((v, m) => { total += v; if (v > bestV) { bestV = v; best = m; } });
  return { mood: best, confidence: total > 0 ? bestV / total : 0 };
}

// distância na "linha" de continuidade musical (p/ evitar trocas abruptas) (§16/17)
export function moodDistance(a: Mood, b: Mood): number {
  const ia = MOOD_AXIS.indexOf(a); const ib = MOOD_AXIS.indexOf(b);
  return Math.abs(ia - ib);
}

// consulta de trilha p/ um mood (query p/ Spotify / procedural)
export const MOOD_QUERY: Record<Mood, string> = {
  calm: 'ambient piano calm instrumental', tense: 'dark ambient tension cinematic',
  action: 'cinematic orchestral action epic', romance: 'romantic instrumental piano',
  melancholy: 'melancholic ambient piano sad', terror: 'dark eerie ambient horror',
  humor: 'light playful instrumental',
};
