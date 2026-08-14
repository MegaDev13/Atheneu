// ─── TTSProvider: camada abstrata de engines (§3) ────────────────────────
// Implementações atuais: KokoroProvider (principal) e PiperProvider (fallback).
// Futuras (OpenAI, ElevenLabs, Google) podem ser adicionadas sem tocar no resto
// do sistema: basta implementar TTSProvider e registrar em detectEngine.
//
// IMPORTANTE: o pacote `kokoro-onnx` NÃO instala executável/CLI — ele é uma
// biblioteca Python. Por isso o KokoroProvider invoca o wrapper
// `workers/shared/kokoro_synth.py` com o interpretador Python detectado.

import { spawnSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface SynthOptions {
  voice: string;
  speed: number;
  outFile: string; // saída WAV
  lang?: string;
}

export interface TTSProvider {
  name: 'kokoro' | 'piper' | string;
  version: string;
  detect(): boolean;
  listVoices(): string[];
  synthesize(text: string, opts: SynthOptions): Promise<void>;
}

export interface EngineConfig {
  cmd?: string;    // avançado: CLI externo que substitui o wrapper (ex.: piper)
  python?: string; // executável python (padrão: python3/python/py)
  script?: string; // caminho do kokoro_synth.py (padrão: detecção automática)
  model?: string;
  voices?: string;
  voice?: string;
  lang?: string;
}

function run(cmd: string, args: string[], input?: string): { code: number; stderr: string; stdout: string } {
  const r = spawnSync(cmd, args, { input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status ?? -1, stderr: (r.stderr || '') + (r.error ? String(r.error) : ''), stdout: r.stdout || '' };
}

function findPython(explicit?: string): string | null {
  const candidates = [explicit, 'python3', 'python', 'py'].filter(Boolean) as string[];
  for (const c of candidates) {
    const r = run(c, ['-c', 'import sys; print(sys.version_info[0])']);
    if (r.code === 0) return c;
  }
  return null;
}

function findScript(explicit?: string): string | null {
  const candidates = [
    explicit,
    path.join(__dirname, '..', '..', 'shared', 'kokoro_synth.py'), // de workers/<x>/dist
    path.join(__dirname, '..', 'shared', 'kokoro_synth.py'),       // de workers/<x>
    path.join(__dirname, 'kokoro_synth.py'),
    path.join(process.cwd(), 'workers', 'shared', 'kokoro_synth.py'),
  ].filter(Boolean) as string[];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

// ─── Kokoro (§4) ─────────────────────────────────────────────────────────
// Sintetiza via wrapper Python (`kokoro_synth.py`), que usa a biblioteca
// kokoro-onnx. Roda 100% local, em qualquer SO.
export class KokoroProvider implements TTSProvider {
  name = 'kokoro' as const;
  version = '';
  private cfg: EngineConfig;
  private python: string | null = null;
  private script: string | null = null;

  constructor(cfg: EngineConfig = {}) {
    this.cfg = cfg;
  }

  detect(): boolean {
    if (this.cfg.cmd) {
      // modo avançado: CLI externo que fala a interface do wrapper
      const probe = run(this.cfg.cmd, ['--check']);
      if (probe.code === 0) {
        this.version = (probe.stdout.match(/kokoro_onnx=([\w.\-]+)/) || [])[1] || 'cli';
        return true;
      }
      return false;
    }
    this.python = findPython(this.cfg.python);
    this.script = findScript(this.cfg.script);
    if (!this.python || !this.script) return false;
    const probe = run(this.python, [this.script, '--check']);
    if (probe.code !== 0) return false;
    this.version = (probe.stdout.match(/kokoro_onnx=([\w.\-]+)/) || [])[1] || 'local';
    return true;
  }

  listVoices(): string[] {
    // Vozes do Kokoro v1.0 (p = pt-BR)
    return ['pf_dora', 'pm_alex', 'pf_felipe', 'pm_ricardo', 'af_bella', 'af_sarah', 'am_adam', 'bf_emma', 'bm_george'];
  }

  synthesize(text: string, opts: SynthOptions): Promise<void> {
    const exe = this.cfg.cmd || this.python!;
    const args = this.cfg.cmd ? [] : [this.script!];
    if (this.cfg.model) args.push('--model', this.cfg.model);
    if (this.cfg.voices) args.push('--voices', this.cfg.voices);
    args.push('--voice', opts.voice || this.cfg.voice || 'pf_dora');
    args.push('--lang', this.cfg.lang || 'pt-br');
    args.push('--speed', String(Math.min(2, Math.max(0.5, opts.speed))));
    args.push('--output', opts.outFile);
    args.push('--text', text);
    return new Promise((resolve, reject) => {
      const p = spawn(exe, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let err = '';
      p.stderr.on('data', (d) => (err += d));
      p.on('close', (code) =>
        code === 0 && fs.existsSync(opts.outFile)
          ? resolve()
          : reject(new Error(`Kokoro falhou (${code}): ${err.slice(0, 400)}`))
      );
      p.on('error', reject);
    });
  }
}

// ─── Piper (fallback — §4) ───────────────────────────────────────────────
// Usa o binário `piper` (github.com/rhasspy/piper): texto via stdin, WAV na saída.
export class PiperProvider implements TTSProvider {
  name = 'piper' as const;
  version = '';
  private cfg: Required<Pick<EngineConfig, 'cmd'>> & EngineConfig;

  constructor(cfg: EngineConfig = {}) {
    this.cfg = { cmd: 'piper', ...cfg };
  }

  detect(): boolean {
    const probe = run(this.cfg.cmd!, ['--help']);
    if (probe.code === 0 || /usage|model/i.test(probe.stderr)) {
      this.version = 'piper (local)';
      return true;
    }
    return false;
  }

  listVoices(): string[] {
    return this.cfg.model ? [this.cfg.model.split('/').pop() || 'default'] : ['default'];
  }

  synthesize(text: string, opts: SynthOptions): Promise<void> {
    const args = ['--output_file', opts.outFile];
    if (this.cfg.model) args.push('--model', this.cfg.model);
    args.push('--length-scale', String(1 / Math.min(2, Math.max(0.5, opts.speed))));
    return new Promise((resolve, reject) => {
      const p = spawn(this.cfg.cmd!, args, { stdio: ['pipe', 'ignore', 'pipe'] });
      let err = '';
      p.stderr.on('data', (d) => (err += d));
      p.stdin.write(text);
      p.stdin.end();
      p.on('close', (code) =>
        code === 0 && fs.existsSync(opts.outFile) ? resolve() : reject(new Error(`Piper falhou (${code}): ${err.slice(0, 300)}`))
      );
      p.on('error', reject);
    });
  }
}

// ─── Detecção com fallback (§4) ──────────────────────────────────────────
export function detectEngine(engines: { kokoro?: EngineConfig; piper?: EngineConfig } = {}): TTSProvider | null {
  const kokoro = new KokoroProvider(engines.kokoro);
  if (kokoro.detect()) return kokoro;
  const piper = new PiperProvider(engines.piper);
  if (piper.detect()) return piper;
  return null;
}
