# Atheneu — Sua biblioteca. Sua leitura. Seu conhecimento.

> 🚀 **Primeira vez aqui?** Siga o **[`TUTORIAL.md`](TUTORIAL.md)** — um passo a passo
> completo (do zero ao site no ar + Workers + IA) em linguagem simples.

Uma biblioteca digital pessoal que acompanha a evolução da sua leitura e do seu conhecimento:
leia, escute audiobooks, anote, destaque, conecte ideias entre livros, acompanhe metas e
participe de um clube de leitura — tudo em uma experiência que mistura **biblioteca clássica e
tecnologia moderna**.

> Frontend 100% estático (GitHub Pages) · Backend no Supabase (Auth + Postgres + RLS + Storage + Realtime).

---

## ✨ O que está implementado

### MVP funcional
| Área | Status |
|---|---|
| Landing page conceitual (hero, Leia, Escute, Entenda, Conecte, Acompanhe) | ✅ |
| Registro / login / recuperação de senha (Supabase Auth + validação em tempo real) | ✅ |
| Onboarding (interesses, meta, frequência, formato, velocidade de áudio) | ✅ |
| Dashboard (continuar lendo, continuar escutando, meta, atividade, insight, presença social) | ✅ |
| Biblioteca com visualizações **grid, lista e estante 3D**, filtros, ordenação e busca | ✅ |
| Upload de livros **EPUB, PDF, TXT e DOCX** com extração automática de título/autor/capítulos | ✅ |
| Leitor próprio (fontes, espaçamento, temas claro/sépia/escuro, índice, busca, tela cheia) | ✅ |
| Seleção de texto → **destaques em 4 cores, notas, copiar, perguntar à IA** | ✅ |
| Progresso persistido (capítulo + posição + página) | ✅ |
| Notas com tags, busca e marcação para revisão | ✅ |
| Sessões de leitura com resumo (tempo, páginas, ritmo) | ✅ |
| Estatísticas “Minha jornada” (páginas, horas, sequência, gêneros, autores, evolução) | ✅ |
| Metas anuais/mensais com cálculo de ritmo (“1 livro a cada X dias”) | ✅ |
| Player de audiobook (play/pause, ±15s, velocidades 0,75×–2×, capítulos, retomada) | ✅ |
| “Pergunte à sua biblioteca” (motor local + contrato para endpoint de IA) | ✅ |
| Mapa de conceitos interativo (gêneros + tags das suas notas) | ✅ |
| Sistema de revisão (perguntas geradas das notas marcadas) | ✅ |
| Clube: feed social, seguir leitores, presença nos livros, discussões com **proteção de spoilers** | ✅ |
| Perfil, privacidade granular, tema claro/escuro (“biblioteca noturna”), exportar dados | ✅ |
| PWA (manifest + service worker), responsividade com bottom nav mobile | ✅ |
| Deploy GitHub Pages (workflow Actions + SPA routing) | ✅ |

### Extensão TTS distribuído + IA Gemini (implementada)
| Área | Status |
|---|---|
| Fila de TTS no Supabase (`tts_jobs`, claim atômico, heartbeat, jobs órfãos) | ✅ |
| Registro de Workers (`workers`) + página **Meus dispositivos** (renomear/desativar/revogar) | ✅ |
| **Windows Worker** (Node: autentica, busca fila, sintetiza, envia, retoma, retry com backoff) | ✅ |
| **Android Worker** (Kotlin: Foreground Service, pausa/cancela, bateria/Wi-Fi, retomada) | ✅ scaffold + lógica |
| Camada `TTSProvider` com **Kokoro** (principal) e **Piper** (fallback) | ✅ |
| Processamento por capítulo/segmento com retomada granular | ✅ |
| Upload com validação, duração, tamanho e **hash sha256** | ✅ |
| Player com disponibilidade por capítulo (✅🔄⏳) — ouve capítulos prontos enquanto o resto gera | ✅ |
| Sincronização texto↔áudio (`audio_segments`) com destaque do trecho em reprodução | ✅ |
| Preferências de TTS (engine, voz, velocidade, idioma, qualidade) | ✅ |
| **IA Gemini** com cache, limite diário, rate limit, contexto mínimo e ação explícita | ✅ |
| Painel **Uso da IA** no perfil (consultas hoje, uso global, cache) | ✅ |
| Modo demo: worker simulado processa jobs na hora para explorar toda a UI | ✅ |

### Arquitetura preparada (contratos prontos para ativar)
- **IA via proxy seguro**: `VITE_AI_ENDPOINT` aponta para qualquer serviço (ex.: Supabase Edge Function) — a chave Gemini fica no servidor. Alternativa: `VITE_GEMINI_API_KEY` no cliente (limitações documentadas em `docs/GEMINI_AI.md`).
- **Kokoro no Android via sherpa-onnx**: ponto de integração marcado em `workers/android/.../TtsEngine.kt`.
- **Realtime**: tabelas de `messages`, `notifications` e `conversations` prontas; basta adicioná-las à publication `supabase_realtime` (comentário na migration 0003).
- **Pesquisa semântica**: o schema suporta vetores (adicione `pgvector` na migration futura; a busca atual é textual e instantânea).

### Princípio de resiliência (§53)
O sistema permanece 100% funcional **sem nenhum Worker online e sem Gemini**:
biblioteca, leitura, progresso, notas, busca e clube não dependem deles.
TTS e IA são recursos adicionais — nunca dependências críticas.

### Modo demonstração
Sem `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, o app roda em **modo demo**: todos os dados
ficam no `localStorage`, com uma biblioteca de exemplo (Dostoiévski, Machado, Marco Aurélio…),
sessões, notas e vida social simuladas — para você explorar o produto inteiro antes de criar o backend.

---

## 🧱 Stack

- **React 18 + TypeScript + Vite** (SPA estática)
- **Tailwind CSS** (design system próprio: tokens claros/escuros, tipografia editorial)
- **Framer Motion** (page transitions, microinterações; respeita `prefers-reduced-motion`)
- **Recharts** (gráficos da jornada)
- **epub.js + jszip** (leitura de EPUB) · PDF servido em visualizador embutido
- **@supabase/supabase-js** (Auth, Postgres, Storage, Realtime)
- **GitHub Actions → GitHub Pages**

---

## 🚀 Instalação e execução local

```bash
npm install
cp .env.example .env        # preencha com as chaves do SEU projeto Supabase (opcional)
npm run dev
```

Sem o `.env` preenchido, o app inicia em modo demonstração.

### Build de produção

```bash
npm run build
npm run preview
```

### Worker TTS (Windows/Linux/macOS)

```bash
cp workers/windows/worker.config.example.json workers/windows/worker.config.json
# preencha supabaseUrl/supabaseAnonKey e caminhos dos modelos Kokoro/Piper
npm run worker:build
npm run worker -- --login   # primeira vez
npm run worker
```

Guia completo (instalação do Kokoro/Piper, bateria, retomada, segurança):
**`docs/TTS_WORKERS.md`** · Android: **`workers/android/README.md`** ·
Gemini/IA: **`docs/GEMINI_AI.md`**

### Testes

```bash
npm run smoke    # 45 verificações: seed, auth, TTS (fila/claim/retomada/upload), IA (cache/limites/hash) e segurança
```

---

## 🗄️ Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Execute as migrations **em ordem**, no SQL Editor (ou via CLI `supabase db push`):
   - `supabase/migrations/0001_core_schema.sql` — tabelas principais, triggers e RLS
   - `supabase/migrations/0002_social_schema.sql` — follows, discussões, chat, clubes, views de feed/perfil público
   - `supabase/migrations/0003_storage_rls.sql` — buckets e políticas de storage
   - `supabase/migrations/0004_tts_queue_ai.sql` — workers, fila de TTS, segmentos de áudio, cache/log de IA + funções de claim/heartbeat
3. Em **Authentication → Providers**, habilite **Email** (confirmação opcional; o fluxo trata os dois casos).
4. Em **Authentication → URL Configuration**, defina `Site URL` como a URL do seu GitHub Pages
   (ex.: `https://usuario.github.io/repositorio/`). Para recuperação de senha, adicione essa URL às *Redirect URLs*.
5. Copie `URL` e `anon key` (**Settings → API**) para o `.env`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
# IA (opcional): proxy seguro OU chave Gemini no cliente — docs/GEMINI_AI.md
VITE_AI_ENDPOINT=
VITE_GEMINI_API_KEY=
```

> ⚠️ **Segurança**: use apenas a chave pública (`anon`) no frontend. Nunca versione `.env`,
> nunca exponha a `service_role key` (ela existe apenas em workers/Edge Functions).

### RLS — regra fundamental
Cada política garante: **cada usuário só acessa os próprios dados** (`auth.uid() = user_id`),
inclusive em tabelas filhas (capítulos, áudio) via checagem no livro pai. A camada social
respeita `privacy` do perfil, bloqueios e exposição voluntária de notas/destaques — tudo no banco,
não apenas na interface (§31, §53, §81).

### Rodando migrations via CLI (alternativa)

```bash
npm i -D supabase
supabase login
supabase link --project-ref <ref-do-projeto>
supabase db push
```

---

## 🌐 Deploy no GitHub Pages

1. Crie um repositório e faça push deste projeto (branch `main`).
2. Em **Settings → Secrets and variables → Actions**, crie (opcional):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_AI_ENDPOINT`.
3. Em **Settings → Pages → Source**, escolha **GitHub Actions**.
4. Pronto: cada push em `main` roda `.github/workflows/deploy.yml` (build + deploy).

**SPA routing**: o par `public/404.html` + script em `index.html` redireciona rotas profundas
(técnica *spa-github-pages*). Se publicar na raiz (`usuario.github.io`), ajuste
`pathSegmentsToKeep` para `0` em `public/404.html`. O `base: './'` do Vite mantém assets relativos
a qualquer subdiretório.

---

## 📁 Estrutura do projeto

```
src/
├── components/        # AppShell, BookCover, ui (design system)
├── contexts/          # Auth, Theme, Toast, SessionProvider (sessões de leitura)
├── features/
│   ├── ai/            # config central · GeminiProvider · pipeline econômico · motor local
│   └── library/       # parsing EPUB/PDF/TXT/DOCX
├── lib/               # tipos, utilitários, estatísticas, seed do modo demo
├── pages/             # Landing, Auth, Onboarding, Dashboard, Library, Reader,
│                      # Notes, Journey, Goals, Audiobooks, Devices, Knowledge,
│                      # Clube, Profile
├── services/          # Backend interface + LocalBackend (demo) + SupabaseBackend
└── main.tsx
workers/
├── shared/            # TTSProvider (Kokoro/Piper), segmentação, áudio (wav/hash)
├── windows/           # Worker Node (Windows/Linux/macOS) — npm run worker
└── android/           # Worker Kotlin (Foreground Service) — Android Studio
supabase/migrations/   # 0001 core · 0002 social · 0003 storage · 0004 tts+ia
docs/                  # TTS_WORKERS.md · GEMINI_AI.md · SUPABASE_SETUP.md
.github/workflows/     # deploy.yml (GitHub Pages)
```

A troca demo ⇄ Supabase acontece em `src/services/api.ts` — o restante do app
fala apenas com a interface `Backend`.

---

## 🗺️ Roadmap

| Fase | Conteúdo | Status |
|---|---|---|
| 1 | Arquitetura + Supabase + autenticação | ✅ |
| 2 | Design system + landing + registro/login | ✅ |
| 3 | Dashboard + biblioteca | ✅ |
| 4 | Upload + leitor + progresso | ✅ |
| 5 | Notas + destaques + sessões | ✅ |
| 6 | Estatísticas + metas | ✅ |
| 7 | Arquitetura de audiobook (player + schema) | ✅ (worker de TTS pendente) |
| 8 | IA + pesquisa semântica | 🟡 motor local pronto · endpoint/`pgvector` pendentes |
| 9 | Mapa de conceitos + revisão | ✅ base pronta · enriquecimento por IA pendente |
| 10 | Polimento + performance + acessibilidade + PWA | ✅ contínuo |
| Social 1 | Perfis, privacidade, follows, feed, notificações | ✅ |
| Social 2 | Comentários, discussões livro/capítulo, reações, trechos | ✅ base · compartilhamento de trechos pendente |
| Social 3 | Chat privado/livro/capítulo, Realtime, presença | 🟡 schema pronto · ativação pendente |
| Social 4 | Clubes, livro do mês, leitura coletiva | 🟡 schema pronto · UI pendente |
| Social 5 | Recomendações sociais, descoberta avançada | ⏳ |
| TTS 1 | Fila Supabase (workers, tts_jobs, capítulos, metadata) | ✅ |
| TTS 2 | Windows Worker | ✅ |
| TTS 3 | Android Worker | ✅ scaffold + serviço/protocolo · build no Android Studio |
| TTS 4 | Kokoro (+ Piper fallback) | ✅ via CLI local · sherpa-onnx Android é ponto de integração |
| TTS 5 | Fila + retomada granular | ✅ |
| TTS 6 | Upload + player por capítulo | ✅ |
| TTS 7 | Sincronização texto/áudio | ✅ segmentos + destaque em reprodução |
| IA 8 | Gemini (provider, proxy, contexto mínimo) | ✅ |
| IA 9 | Cache + rate limit + limite diário | ✅ |
| IA 10 | Painéis de uso e refinamento | ✅ |

---

## 🏗️ Arquitetura da extensão

```
┌──────────────────── WEBSITE (GitHub Pages) ────────────────────┐
│ Biblioteca · Leitor · Audiobook · Clube · Conhecimento · IA    │
└──────────────────────────────┬─────────────────────────────────┘
                               ▼
                     ┌──────────────────┐
                     │     SUPABASE     │
                     │ Auth · Postgres  │
                     │ Storage · RLS    │
                     │ TTS Queue · AI$  │
                     └────────┬─────────┘
                    ┌─────────┴─────────┐
                    ▼                   ▼
              📱 Android           💻 Windows
                Worker               Worker
                    └────────┬─────────┘
                             ▼
                    Kokoro / Piper (local)
                             ▼
                      AUDIOBOOK (mp3/wav)
```

```
GEMINI → somente quando necessário → cache? → limite diário → rate limit → resposta
```

- **Zero custo de TTS**: síntese 100% local nos seus dispositivos.
- **Gemini econômico**: cache por hash normalizado, 10 consultas/dia (config.),
  1 a cada 5s, contexto mínimo e apenas por clique explícito.

## 🧭 Princípios

- **Segurança primeiro**: RLS em todas as tabelas; nada de secrets no frontend; notas privadas por padrão.
- **Erros amigáveis**: detalhes técnicos vão para o console; o usuário vê mensagens humanas (§35).
- **Acessibilidade**: foco visível, ARIA, labels, contraste, `prefers-reduced-motion` (§38).
- **Performance**: code splitting por rota, lazy loading, dados sob demanda (§37).
- **Retenção saudável**: sem mecanismos artificiais de vício — a pessoa fica porque há algo
  interessante acontecendo dentro da biblioteca dela (§85).
