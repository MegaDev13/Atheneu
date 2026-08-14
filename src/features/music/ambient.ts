// Trilha sonora procedural (WebAudio) — gera ambiente por atmosfera sem Spotify,
// com transição suave (crossfade) entre moods (§16/17). Sem direitos autorais.
import type { Mood } from './mood';

interface MoodParams { freqs: number[]; bpm: number; filter: number; noise: number; minor: boolean; }
const P: Record<Mood, MoodParams> = {
  calm:       { freqs: [220, 330, 440], bpm: 50, filter: 900, noise: 0.02, minor: false },
  romance:    { freqs: [261, 392, 523], bpm: 60, filter: 1200, noise: 0.015, minor: false },
  melancholy: { freqs: [220, 261, 330], bpm: 46, filter: 800, noise: 0.02, minor: true },
  tense:      { freqs: [196, 233, 294], bpm: 84, filter: 700, noise: 0.05, minor: true },
  terror:     { freqs: [174, 207, 261], bpm: 70, filter: 500, noise: 0.08, minor: true },
  action:     { freqs: [261, 311, 392], bpm: 120, filter: 1600, noise: 0.06, minor: false },
  humor:      { freqs: [294, 370, 440], bpm: 100, filter: 1800, noise: 0.02, minor: false },
};

export class AmbientPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private oscs: Array<OscillatorNode | AudioBufferSourceNode> = [];
  private current: Mood | null = null;
  volume = 0.5;
  playing = false;

  private ensure() {
    if (!this.ctx) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      const c: AudioContext = new AC();
      const m = c.createGain();
      m.gain.value = 0;
      m.connect(c.destination);
      this.ctx = c;
      this.master = m;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  private teardown() {
    for (const o of this.oscs) { try { o.stop(); } catch {} }
    this.oscs = [];
    for (const n of this.nodes) { try { (n as any).disconnect(); } catch {} }
    this.nodes = [];
  }

  play(mood: Mood) { this.setMood(mood, true); }

  setMood(mood: Mood, force = false) {
    this.ensure();
    if (this.current === mood && !force) return;
    this.current = mood;
    this.playing = true;
    const p = P[mood];
    // crossfade: abaixa o master e reconstrói
    const ctx = this.ctx!;
    this.master!.gain.cancelScheduledValues(ctx.currentTime);
    this.master!.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    setTimeout(() => {
      this.teardown();
      this.build(mood);
      this.master!.gain.setTargetAtTime(this.volume * 0.4, ctx.currentTime, 0.6);
    }, 350);
  }

  private build(mood: Mood) {
    const ctx = this.ctx!; const p = P[mood];
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = p.filter;
    filt.connect(this.master!);
    this.nodes.push(filt);
    p.freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = p.minor ? f * 0.94 : f;
      const g = ctx.createGain(); g.gain.value = 0.16 / (i + 1);
      // LFO lento p/ movimento
      const lfo = ctx.createOscillator(); lfo.frequency.value = p.bpm / 60 / 4 + i * 0.03;
      const lg = ctx.createGain(); lg.gain.value = 0.05 / (i + 1);
      lfo.connect(lg); lg.connect(g.gain); lfo.start();
      o.connect(g); g.connect(filt); o.start();
      this.oscs.push(o, lfo); this.nodes.push(g, lg);
    });
    // ruído suave (ar/vento) p/ textura
    if (p.noise > 0) {
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const ng = ctx.createGain(); ng.gain.value = p.noise;
      const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = p.filter * 0.6;
      src.connect(nf); nf.connect(ng); ng.connect(this.master!);
      src.start(); this.oscs.push(src); this.nodes.push(ng, nf);
    }
  }

  setVolume(v: number) { this.volume = v; if (this.master && this.ctx && this.playing) this.master.gain.setTargetAtTime(v * 0.4, this.ctx.currentTime, 0.2); }

  stop() {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    setTimeout(() => this.teardown(), 300);
    this.playing = false; this.current = null;
  }
}

export const ambient = new AmbientPlayer();
