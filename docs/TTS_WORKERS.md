# Workers TTS — arquitetura e guia de instalação

## Arquitetura (§1)

```
WEBSITE (GitHub Pages) → SUPABASE (fila tts_jobs) → WORKER (Android/Windows)
   → TTS local (Kokoro/Piper) → arquivos de áudio → SUPABASE STORAGE
   → WEBSITE / PLAYER
```

- O **frontend nunca processa TTS** — ele apenas cria jobs, acompanha e reproduz.
- O **Worker** é um app instalado num dispositivo seu: autentica com a sua conta,
  busca jobs, sintetiza localmente, envia o áudio e registra progresso.
- **Zero custo por geração**: Kokoro/Piper rodam 100% offline no seu hardware.

## Conceitos

| Conceito | Onde | Detalhe |
|---|---|---|
| Fila | tabela `tts_jobs` | estados: queued → claimed → processing → completed (+ paused/failed/cancelled) |
| Claim atômico (§12) | função `claim_next_tts_job` | `FOR UPDATE SKIP LOCKED`: dois Workers nunca pegam o mesmo job |
| Anti-monopólio (§46) | mesma função | 1 job ativo por usuário por vez; prioridades 0/1/2 |
| Heartbeat (§11) | função `heartbeat_worker` | `last_seen` a cada 30s |
| Job órfão (§11) | função `release_stale_tts_jobs` | após 300s sem heartbeat o job volta à fila (nunca é perdido de imediato) |
| Granularidade (§13–14) | `tts_job_chapters.segments_done` | retomada a partir do segmento confirmado seguinte |
| Integridade (§48) | `file_hash`, `file_size` | sha256 + validação antes de marcar `done` |
| Estrutura (§16) | bucket `audio` | `{user_id}/{book_id}/chapter-NNN.mp3` · RLS por pasta do dono |
| Sincronização (§18) | `audio_segments` | `[text_start,text_end] ↔ [audio_start,audio_end]` por segmento |

## Windows / Linux / macOS Worker

### 1. Requisitos
- Node 18+
- Um engine local:
  - **Kokoro (recomendado):** `pip install kokoro-onnx` e baixe os modelos
    `kokoro-v1.0.onnx` + `voices-v1.0.bin` (HuggingFace: hexgrad/Kokoro-82M)
    para uma pasta `modelos/`.
  - **Piper (fallback):** binário em github.com/rhasspy/piper + voz
    `pt_BR-faber-medium.onnx`.
- `ffmpeg` (opcional — converte WAV→MP3; sem ele o Worker envia WAV).

### 2. Configuração
```bash
cp workers/windows/worker.config.example.json workers/windows/worker.config.json
# edite: supabaseUrl, supabaseAnonKey, caminhos dos modelos, voz
```

### 3. Executar
```bash
npm run worker:build
npm run worker -- --login     # primeira vez: pede e-mail e senha da conta
npm run worker                # nas próximas
```

O terminal mostra o painel do Worker (§8): conexão, usuário, engine, fila e
progresso por capítulo. Ocioso, ele apenas consulta a fila a cada 10s — consumo mínimo.

### Segurança (§42)
O Worker usa **somente a anon key + o seu login** (JWT). Nunca distribua a
service role key; ela é exclusiva de serviços administrativos seus.

## Android Worker

Veja `workers/android/README.md`. Resumo:

1. Abra `workers/android` no Android Studio e instale no aparelho (API 26+).
2. Entre com a mesma conta do site.
3. O **Foreground Service** assume a fila com notificação de progresso e
   ações Pausar/Continuar/Cancelar; respeita “somente Wi-Fi”, “somente no
   carregador” e bateria mínima (padrão 30%).
4. Engine padrão: TTS do sistema (funciona em celular antigo). Kokoro via
   sherpa-onnx é o ponto de integração em `TtsEngine.kt`.

## Ciclo de vida de um capítulo (§15)

```
segmentos → síntese (com retry 5s/15s/45s) → concatenação WAV
→ (mp3 via ffmpeg) → validar tamanho → sha256 → upload no bucket audio
→ registrar tts_job_chapters (seconds, hash, size) → gravar audio_segments
→ limpar temporários (§49)
```
