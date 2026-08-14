#!/usr/bin/env python3
"""
Atheneu · Síntese Kokoro (wrapper universal)

O pacote `kokoro-onnx` é uma BIBLIOTECA Python — ele não instala nenhum
comando/executável. Este script é a ponte que o Atheneu Worker usa para
gerar áudio, e funciona igual em Windows, Linux e macOS:

    python kokoro_synth.py --model kokoro-v1.0.onnx --voices voices-v1.0.bin \
        --voice pf_dora --lang pt-br --speed 1.0 --output saida.wav
        (o texto vem pela entrada padrão, ou use --text)

Saída: arquivo WAV (24 kHz, mono, float32) no caminho --output.
"""

import argparse
import sys


def main() -> int:
    ap = argparse.ArgumentParser(description="Síntese de voz local com Kokoro (Atheneu Worker)")
    ap.add_argument("--model", required=False, help="caminho do kokoro-v1.0.onnx")
    ap.add_argument("--voices", required=False, help="caminho do voices-v1.0.bin")
    ap.add_argument("--voice", default="pf_dora", help="voz (ex.: pf_dora, pm_alex)")
    ap.add_argument("--lang", default="pt-br", help="idioma (ex.: pt-br, en-us)")
    ap.add_argument("--speed", type=float, default=1.0, help="velocidade (0.5–2.0)")
    ap.add_argument("--text", help="texto (se omitido, lê da entrada padrão)")
    ap.add_argument("--output", help="arquivo WAV de saída")
    ap.add_argument("--check", action="store_true", help="só verifica a instalação e mostra a versão")
    args = ap.parse_args()

    if args.check:
        try:
            import importlib.metadata as md
            ver = md.version("kokoro-onnx")
        except Exception:
            ver = "?"
        print(f"kokoro_onnx={ver}")
        return 0

    text = args.text if args.text is not None else sys.stdin.read()
    text = text.strip()
    if not text:
        print("kokoro_synth: texto vazio", file=sys.stderr)
        return 2

    try:
        from kokoro_onnx import Kokoro
    except ImportError as e:
        print(
            "kokoro_synth: kokoro-onnx não está instalado neste Python.\n"
            "Instale com: pip install kokoro-onnx soundfile\n"
            f"Detalhe: {e}",
            file=sys.stderr,
        )
        return 3

    try:
        import soundfile as sf
    except ImportError:
        print("kokoro_synth: instale também o soundfile: pip install soundfile", file=sys.stderr)
        return 3

    try:
        kokoro = Kokoro(args.model, args.voices)
        samples, sample_rate = kokoro.create(
            text,
            voice=args.voice,
            speed=max(0.5, min(2.0, args.speed)),
            lang=args.lang,
        )
        sf.write(args.output, samples, sample_rate)
    except Exception as e:  # mensagem clara para o Worker registrar no job
        print(f"kokoro_synth: falha na síntese: {e}", file=sys.stderr)
        return 1

    print(f"kokoro_synth: ok ({len(samples) / sample_rate:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
