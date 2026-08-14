# 📖 Tutorial completo — do zero ao Atheneu no ar

Guia passo a passo, na ordem certa. Cada parte é independente: você pode parar
em qualquer uma e continuar depois. Tempo total estimado: **~40 minutos** até o
site no ar (sem contar os Workers).

```
Parte 1 · Preparar o computador (Node + Git)
Parte 2 · Baixar o projeto
Parte 3 · Criar o Supabase (banco de dados + login)
Parte 4 · Rodar no seu computador
Parte 5 · Publicar no GitHub Pages (site no ar)
Parte 6 · Worker Windows — gerar audiobooks (Kokoro)
Parte 7 · Worker Android (opcional)
Parte 8 · Ativar a IA (Gemini)
Parte 9 · Usar no dia a dia
```

---

## Parte 1 · Preparar o computador

Você precisa de duas ferramentas gratuitas:

**1. Node.js** (motor que roda o projeto)
1. Acesse https://nodejs.org
2. Baixe a versão **LTS** (recomendada) e instale com “Avançar” até o fim.
3. Teste: abra o terminal (Windows: menu Iniciar → digite `cmd`) e digite:
   ```
   node --version
   ```
   Se aparecer um número (ex.: `v20.x.x`), está certo. ✅

**2. Git** (envia o projeto para o GitHub)
1. Acesse https://git-scm.com e instale com as opções padrão.
2. Teste no terminal: `git --version`

**3. Contas gratuitas** (crie se ainda não tiver):
- GitHub → https://github.com (para hospedar o site)
- Supabase → https://supabase.com (para o banco de dados e login)

---

## Parte 2 · Baixar o projeto

1. Crie uma pasta para o projeto, ex.: `Documentos\atheneu`.
2. Copie todos os arquivos deste projeto para dentro dela, mantendo as pastas
   (`src`, `workers`, `supabase`, `docs`, `.github`, etc.).
3. Abra o terminal **dentro da pasta** e instale as dependências:
   ```
   npm install
   ```
   ⏳ Aguarde terminar (1–3 minutos). Se der erro de rede, tente de novo.

> 💡 Se o projeto está num repositório Git, use:
> `git clone ENDEREÇO-DO-REPO` e depois `npm install`.

---

## Parte 3 · Criar o Supabase

### 3.1 Criar o projeto
1. Entre em https://supabase.com → **Sign in** (use a conta GitHub).
2. Clique em **New project**.
3. Preencha:
   - **Name:** `atheneu`
   - **Database Password:** crie uma senha forte e **anote** (não vamos usá-la no site, mas o Supabase exige).
   - **Region:** escolha *South America (São Paulo)*.
4. Clique **Create new project** e aguarde ~2 minutos.

### 3.2 Instalar o banco de dados (migrations)
São 4 arquivos SQL que criam as tabelas. Faça **um por vez, nesta ordem**:

1. No menu lateral do Supabase: **SQL Editor** (ícone de banco) → **New query**.
2. Abra o arquivo `supabase/migrations/0001_core_schema.sql` num editor de texto
   (Bloco de Notas serve), copie **tudo** e cole no SQL Editor.
3. Clique **Run** (▶ canto inferior direito). Deve aparecer **Success**.
4. Repita para:
   - `0002_social_schema.sql` → **Run**
   - `0003_storage_rls.sql` → **Run**
   - `0004_tts_queue_ai.sql` → **Run**

✅ Se aparecer *Success* nos quatro, seu banco está pronto.

### 3.3 Ativar o login por e-mail
1. Menu **Authentication** → aba **Providers** → **Email**.
2. Deixe **habilitado**.
3. (Opcional) Desligue **Confirm email** se quiser entrar na hora, sem
   confirmar por e-mail. Para começar, **desligar é mais fácil**.
4. Clique **Save**.

### 3.4 Pegar as duas chaves do projeto
1. Menu **Settings** (⚙) → **API**.
2. Copie:
   - **Project URL** → algo como `https://xxxx.supabase.co`
   - **anon public** key (a chave pública longa)

> ⚠️ **Nunca** copie a `service_role` key para lugar nenhum deste projeto.
> Ela dá acesso total e não é necessária em nenhum passo deste tutorial.

---

## Parte 4 · Rodar no seu computador

1. Na pasta do projeto, crie o arquivo `.env` (com o ponto no início) com este
   conteúdo — substituindo pelas suas chaves da Parte 3:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ....sua-chave-anon
   ```
   *Windows: se o Bloco de Notas não deixar salvar como `.env`, salve como
   `env.txt` e renomeie, ou rode no terminal:*
   ```
   copy .env.example .env
   notepad .env
   ```
2. Rode:
   ```
   npm run dev
   ```
3. O terminal mostrará algo como `Local: http://localhost:5173/`.
   Abra esse endereço no navegador. 🎉

**Teste rápido:**
1. Clique em **Criar conta** → preencha nome, e-mail e senha → **Criar minha conta**.
2. Faça o onboarding (interesses, meta…).
3. Você entra no dashboard com a biblioteca de exemplo. Explore!

> 💡 Sem o `.env`, o site funciona em **modo demonstração** (dados só no
> navegador) — bom para testar o visual sem Supabase.

---

## Parte 5 · Publicar no GitHub Pages

### 5.1 Criar o repositório
1. No GitHub: botão **+** (canto superior direito) → **New repository**.
2. Nome: `atheneu` (ou o que quiser). Pode ser público. **Create repository**.

### 5.2 Enviar o projeto
No terminal, dentro da pasta do projeto:
```
git init
git add .
git commit -m "Atheneu: primeira versão"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/atheneu.git
git push -u origin main
```
(troque `SEU-USUARIO` pelo seu nome de usuário do GitHub; ele pedirá login)

### 5.3 Configurar as chaves com segurança
No repositório GitHub:
1. **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. Crie dois secrets (um por vez):
   - Nome: `VITE_SUPABASE_URL` → Valor: sua Project URL
   - Nome: `VITE_SUPABASE_ANON_KEY` → Valor: sua chave anon
3. (Mais tarde) `VITE_GEMINI_API_KEY` ou `VITE_AI_ENDPOINT` para a IA.

> ✅ Assim as chaves ficam protegidas no GitHub e nunca aparecem no código.

### 5.4 Ativar o Pages
1. Ainda em **Settings** → página **Pages** (menu esquerdo).
2. Em **Build and deployment → Source**, escolha **GitHub Actions**.
3. Pronto! O push que você fez já disparou o deploy automático.
4. Veja o andamento em **Actions** (aba do repositório). Quando ficar verde ✅,
   seu site está no ar em:
   ```
   https://SEU-USUARIO.github.io/atheneu/
   ```

### 5.5 Ajustar o redirecionamento de login (importante!)
Para o login/recuperação de senha redirecionar de volta ao seu site:
1. No Supabase: **Authentication** → **URL Configuration**.
2. **Site URL:** `https://SEU-USUARIO.github.io/atheneu/`
3. Em **Redirect URLs**, adicione a mesma URL. **Save**.

> 💡 Se quiser publicar na raiz (`seu-usuario.github.io` sem `/atheneu/`),
> mude `pathSegmentsToKeep` de `1` para `0` no arquivo `public/404.html`.

---

## Parte 6 · Worker Windows — gerar audiobooks 🎧

O Worker transforma seu PC na "usina" de áudio: pega trabalhos da fila e gera
os capítulos com Kokoro, **localmente e de graça**.

> ⚠️ **Leia antes de tudo:** o pacote `kokoro-onnx` **NÃO instala nenhum comando**
> (não existe executável `kokoro-onnx` — é só uma biblioteca Python). Se você já
> viu o erro *"'kokoro-onnx' não é reconhecido como comando"*, esse é o motivo.
> Por isso o Atheneu traz a ponte pronta: `workers/shared/kokoro_synth.py`,
> que o Worker (e você, nos testes) chama com o Python.

### 6.1 Instalar a biblioteca

```
pip install kokoro-onnx soundfile
python workers\shared\kokoro_synth.py --check
```
Se aparecer `kokoro_onnx=0.x.x`, a instalação está OK. ✅
(Se `python` não existir, instale em https://python.org marcando *"Add python.exe to PATH"*.)

### 6.2 Baixar os modelos certos (formato ONNX)

Os modelos **oficiais em ONNX** ficam no GitHub do projeto (não no HuggingFace):

1. Abra https://github.com/thewh1teagle/kokoro-onnx/releases
2. No release **`model-files-v1.0`**, baixe:
   - `kokoro-v1.0.onnx` (~310 MB)
   - `voices-v1.0.bin` (~27 MB)
3. Guarde os dois numa pasta, ex.: `C:\atheneu-modelos\`

> ❌ Cuidado: o arquivo `kokoro-v1_0.pth` do HuggingFace (hexgrad) é o modelo
> **PyTorch** — ele NÃO funciona com o kokoro-onnx. Use só `.onnx` + `.bin`.

### 6.3 Testar a síntese (a ponte do Atheneu)

```
python workers\shared\kokoro_synth.py ^
  --model C:\atheneu-modelos\kokoro-v1.0.onnx ^
  --voices C:\atheneu-modelos\voices-v1.0.bin ^
  --voice pf_dora --lang pt-br --speed 1.0 ^
  --text "Olá, esta é a voz do Atheneu." --output teste.wav
```
Se gerar o `teste.wav` com voz, está tudo certo. ✅
(Vozes pt-BR começam com `pf_`/`pm_`, ex.: `pf_dora`, `pm_alex`.)

### 6.4 (Opcional) MP3 em vez de WAV

Instale o ffmpeg (https://ffmpeg.org/download.html) e adicione ao PATH.
Sem ele o Worker funciona igual, enviando WAV (arquivos maiores).

### 6.5 Configurar o Worker

Copie o exemplo e edite com os SEUS caminhos/chaves:
```
copy workers\windows\worker.config.example.json workers\windows\worker.config.json
notepad workers\windows\worker.config.json
```
O formato atual **não tem `cmd`** — o Worker detecta o Python sozinho:
```json
"engines": {
  "kokoro": {
    "model": "C:\\atheneu-modelos\\kokoro-v1.0.onnx",
    "voices": "C:\\atheneu-modelos\\voices-v1.0.bin",
    "voice": "pf_dora",
    "lang": "pt-br"
  }
}
```
(lembre das barras duplas `\\` no JSON)

### 6.6 Ligar o Worker

```
npm run worker:build
npm run worker -- --login
```
1. Ele pede **e-mail e senha da mesma conta do site** (nunca outra coisa).
2. O painel aparece no terminal: 🟢 Conectado, engine Kokoro, fila.
3. Deixe essa janela aberta. Nas próximas vezes: `npm run worker`.

### 6.7 Testar uma geração

1. No site → **Biblioteca** → abra um livro → **Ouvir**.
2. Escolha a prioridade e clique **🎧 Gerar audiobook**.
3. No terminal do Worker você verá o progresso por capítulo.
4. Na página **Ouvir**, os capítulos vão virando ✅ — e você já pode ouvir os
   prontos enquanto o resto é gerado.

> 📱 Ver seus dispositivos: no site, menu **Dispositivos** (dá para renomear,
> pausar ou revogar o Worker por lá).

## Parte 7 · Worker Android (opcional) 📱

Transforma um celular (inclusive antigo) em Worker.

1. Instale o **Android Studio**: https://developer.android.com/studio
2. Abra o Android Studio → **Open** → selecione a pasta `workers/android`.
3. Aguarde a sincronização do Gradle (primeira vez demora).
4. Conecte um celular com **depuração USB** ativada (ou use um emulador).
5. Clique **Run ▶**.
6. No app: cole a URL e a chave anon do Supabase, entre com sua conta e toque
   em **Iniciar Worker**.

O app roda como serviço em primeiro plano com notificação de progresso e
respeita “somente Wi-Fi” / “somente no carregador” / bateria mínima.
Por padrão usa o motor de voz do próprio celular; Kokoro via sherpa-onnx é o
próximo passo (instruções em `workers/android/README.md`).

---

## Parte 8 · Ativar a IA (Gemini) 🧠

A busca local já funciona sempre. Para as respostas inteligentes:

**Opção simples (chave no navegador):**
1. Crie a chave em https://aistudio.google.com/apikey (conta Google, grátis).
2. Adicione o secret no GitHub: `VITE_GEMINI_API_KEY` = sua chave
   (repositório → Settings → Secrets → Actions).
3. O próximo push publica com a IA ativa.

**Opção recomendada (chave protegida):**
- Crie uma Edge Function no Supabase que guarda a chave Gemini e expõe um
  endpoint; configure `VITE_AI_ENDPOINT` com a URL dela. Detalhes em
  `docs/GEMINI_AI.md`.

**Como usar sem gastar à toa (já vem configurado):**
- A IA só responde quando você clica em **“✨ Sintetizar com IA”** — nunca sozinha.
- Perguntas repetidas voltam do **cache** (0 consultas).
- Limite: **10 consultas/dia** e 1 a cada 5s.
- Para mudar os limites: variáveis `VITE_AI_DAILY_LIMIT`, etc. (veja `.env.example`).
- Acompanhe em **Perfil → Uso da IA**.

---

## Parte 9 · Usar no dia a dia 📚

| Quero… | Faço assim |
|---|---|
| Adicionar um livro | Biblioteca → **Adicionar** → arraste EPUB/PDF/TXT/DOCX |
| Ler | Clique no livro → **Ler** (ajuste fonte/tema no botão **Aa**) |
| Destacar/anotar | Selecione o texto → escolha a cor ou “Nota” |
| Ouvir | **Ouvir** → selecione o livro → **Gerar audiobook** (se ainda não gerou) |
| Ver progresso dos amigos | **Clube** (feed, discussões com proteção de spoiler) |
| Perguntar algo | **Conhecimento → Perguntar** → escreva → (opcional) Sintetizar com IA |
| Acompanhar metas | **Minha jornada** e **Minha jornada → Metas** |
| Gerenciar Workers | **Dispositivos** |
| Privacidade | **Perfil → Privacidade** |

---

## 🔧 Solução de problemas comuns

| Problema | Solução |
|---|---|
| `npm install` dá erro | Feche antivírus/VPN e rode de novo; confira `node --version` ≥ 18 |
| Site abre mas login não funciona | Confira as chaves no `.env` e se rodou as 4 migrations |
| “Confirme seu e-mail” ao entrar | Authentication → Email → desligue *Confirm email* (ou confirme pelo e-mail) |
| GitHub Pages mostra 404 | Aguarde o Actions ficar verde; confira Pages → Source = **GitHub Actions** |
| Site publicado, mas rota dá erro ao atualizar | Confira que o push usou o workflow (`.github/workflows/deploy.yml`) e o `public/404.html` está no projeto |
| Worker não conecta | URL/anon no `worker.config.json` corretas? `npm run worker -- --login` de novo |
| Worker conecta mas não gera | Instale o Kokoro (6.1) e teste o comando de exemplo; veja a mensagem de erro no painel |
| `'kokoro-onnx' não é reconhecido` | Normal: o pacote não instala comando (§6). Use a ponte: `python workers\shared\kokoro_synth.py --check` |
| Geração parada na fila | Nenhum Worker online — abra o Worker do PC/celular (aba **Dispositivos** mostra quem está online) |
| Áudio não toca no site | Capítulo ainda não está ✅? Espere concluir. Já ✅? Recarregue a página |
| IA diz “indisponível” | Sem chave configurada, limite diário atingido ou Gemini fora do ar — a busca local continua funcionando |
| Limite do Gemini estourou | Ajuste `VITE_AI_DAILY_LIMIT` ou espere o dia seguinte; o cache reduz o consumo |

---

## ✅ Checklist final

- [ ] Node e Git instalados
- [ ] Projeto Supabase criado
- [ ] 4 migrations executadas com *Success*
- [ ] Login por e-mail ativado
- [ ] `.env` preenchido → site roda em `localhost:5173`
- [ ] Repositório GitHub criado e publicado com Pages (GitHub Actions)
- [ ] Secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` configurados
- [ ] Site URL e Redirect URLs apontando para o endereço do Pages
- [ ] Kokoro instalado e testado
- [ ] Worker logado e processando (`npm run worker`)
- [ ] Primeiro audiobook gerado e tocando 🎧
- [ ] (Opcional) Gemini ativado
- [ ] (Opcional) Worker Android rodando

Pronto — sua biblioteca está no ar, seus dispositivos geram audiobooks de graça
e a IA responde só quando você pede. Boa leitura! 📖
