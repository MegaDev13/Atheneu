# Atheneu Worker — Android 📱

Transforma qualquer celular Android (inclusive antigos) em um Worker TTS:
autentica no Supabase, busca trabalhos da fila, gera áudio **localmente** e
envia para o Storage — com Foreground Service, pausa/retomada e controle de bateria.

## Como compilar

1. Abra `workers/android` no **Android Studio** (Hedgehog ou superior).
2. Sincronize o Gradle e rode em um dispositivo (API 26+).
3. Na tela inicial, entre com a **mesma conta do site** e toque em **Iniciar Worker**.

> O repositório não inclui o Gradle Wrapper binário. Se necessário:
> `gradle wrapper --gradle-version 8.7` dentro desta pasta.

## Engines de TTS

| Engine | Situação |
|---|---|
| **Sistema (TextToSpeech)** | Já funciona: usa o motor instalado no aparelho e `synthesizeToFile` (WAV). Ideal para celulares antigos. |
| **Kokoro (sherpa-onnx)** | Ponto de integração em `TtsEngine.kt`: adicione a dependência `com.k2fsa.sherpa:onnx` e os modelos `.onnx` em `assets/`. Vozes recomendadas: `pf_dora`, `pm_alex`. |
| **Piper** | Também disponível via sherpa-onnx (mesma integração). |

Sem Kokoro, o Worker usa o engine do sistema automaticamente (fallback — §4 da especificação).

## Comportamento

- **Foreground Service** com notificação: `🎧 Processando audiobook · Livro · Capítulo X/N · %`
  e ações **Pausar / Continuar / Cancelar** (cancelar preserva o estado — §6).
- **Bateria/Rede (§7)**: nas configurações do app,
  “somente no carregador”, “somente Wi-Fi” e “bateria mínima” (padrão 30%).
- **Retomada (§14)**: o progresso por segmento fica no Supabase; se o app for
  morto, ele continua do segmento confirmado seguinte.
- **Limpeza (§49)**: arquivos temporários são removidos após o upload confirmado.

## Permissões

`INTERNET`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC`, `POST_NOTIFICATIONS`.
Nenhuma credencial administrativa é usada — apenas o JWT do usuário (§42).
