// Som de virar página — 100% sintetizado via WebAudio (gerado em código,
// portanto sem direitos autorais de terceiros; licença: mesmo licença do projeto).
// Toca apenas quando a página EFETIVAMENTE vira (nunca durante o arraste).

let ctx: AudioContext | null = null;

function ac(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function playPageFlip(volume: number) {
  if (volume <= 0) return;
  try {
    const c = ac();
    const dur = 0.22;
    const t0 = c.currentTime;

    // rajada de ruído filtrado = "fricção" do papel
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2) * (0.4 + 0.6 * Math.sin(t * Math.PI));
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(1800, t0);
    filt.frequency.exponentialRampToValueAtTime(5200, t0 + dur * 0.6);
    filt.Q.value = 0.9;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5 * volume, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt).connect(g).connect(c.destination);
    src.start(t0);

    // "tap" suave do papel assentando
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t0 + dur * 0.75);
    osc.frequency.exponentialRampToValueAtTime(120, t0 + dur + 0.08);
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.0001, t0 + dur * 0.75);
    g2.gain.exponentialRampToValueAtTime(0.18 * volume, t0 + dur * 0.8);
    g2.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.1);
    osc.connect(g2).connect(c.destination);
    osc.start(t0 + dur * 0.75);
    osc.stop(t0 + dur + 0.12);
  } catch {
    /* áudio indisponível: silêncio */
  }
}
