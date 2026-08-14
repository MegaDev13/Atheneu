# IA da biblioteca — Google Gemini (uso econômico)

A IA é um **recurso adicional, não uma dependência** (§53): tudo funciona sem ela.

## Regra de ouro (§21)

> Nunca chamar o Gemini para algo que pode ser resolvido localmente.

| Sem Gemini (grátis, offline) | Com Gemini (explícito) |
|---|---|
| buscar palavra/título/autor | perguntas conceituais |
| progresso, estatísticas, ordenações | comparação de ideias entre livros |
| localizar capítulos/notas | explicações e sínteses |
| verificar existência de nota | análise de temas |

## Pipeline (§28)

```
Pergunta → pesquisa local → contexto mínimo → cache? → limite diário?
→ rate limit? → Gemini → log (ai_requests) + cache (ai_cache) → resposta
```

- **Ação explícita (§25):** a IA só é chamada quando o usuário clica em
  “Sintetizar com IA”. Abrir um livro nunca dispara consulta.
- **Contexto mínimo (§27/§34):** apenas os trechos relevantes encontrados na
  busca local, deduplicados e truncados em `AI_MAX_CONTEXT` caracteres.
- **Respostas objetivas (§35):** o prompt pede respostas curtas por padrão.
- **Fallback (§32):** erro/quota/indisponibilidade → mensagem amigável; a
  pesquisa local continua funcionando.

## Configuração centralizada (§39)

Tudo em `src/features/ai/config.ts`, sobrescrevível por env:

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_AI_DAILY_LIMIT` | 10 | consultas/usuário/dia (§29) |
| `VITE_AI_RATE_LIMIT_SECONDS` | 5 | mínimo entre consultas (§30) |
| `VITE_AI_CACHE_DURATION_DAYS` | 30 | validade do cache (§22) |
| `VITE_AI_MAX_CONTEXT` | 6000 | caracteres de contexto (§34) |
| `VITE_AI_MAX_OUTPUT` | 512 | tokens de saída (§35) |
| `VITE_AI_MODEL` | `gemini-2.0-flash` | modelo usado |

> §41 · Não codificamos quotas do Gemini como verdades permanentes: consulte a
> documentação oficial (ai.google.dev/gemini-api/docs/rate-limits) e ajuste os
> valores acima sem mudar lógica nenhuma.

## Cache (§22–23)

A pergunta é normalizada (minúsculas, sem acentos, espaços colapsados,
pontuação final removida — sem alterar significado) e hasheada com SHA-256
junto da operação. `"O que é niilismo?"` e `"o que é niilismo?"` produzem o
mesmo hash → a segunda responde do cache, **zero chamadas**.

Operações com política própria (§36): `answer_library_question`,
`summarize_chapter`, `explain_concept`, `compare_books`,
`generate_review_question`, `extract_concepts`.

## Chave da API (§40)

O site é estático (GitHub Pages), então existem duas opções:

1. **Recomendada — proxy próprio (`VITE_AI_ENDPOINT`):** um endpoint seu
   (ex.: Supabase Edge Function) guarda a chave Gemini no servidor e repassa as
   chamadas. Nenhuma chave no bundle.
2. **Chave no cliente (`VITE_GEMINI_API_KEY`):** funciona, mas a chave fica
   visível no bundle público — **limitação conhecida**. Mitigações embutidas:
   limite diário por usuário, rate limit, cache e uso apenas por clique
   explícito. Use uma chave com quotas restritas no Google AI Studio.

A chave nunca vai para o git: apenas `.env` local (não versionado) ou secrets
do GitHub Actions no momento do build.

## Painéis

- **Perfil → “Uso da IA”:** consultas hoje X/limite, uso global, aviso de cache (§38).
- **Conhecimento → Perguntar:** contador “IA hoje: X/limite” sob o campo.
- Histórico completo em `ai_requests`; respostas em `ai_cache`.

## Como ativar

```env
# opção A — proxy seguro (recomendado)
VITE_AI_ENDPOINT=https://SEU-PROJETO.supabase.co/functions/v1/ai-ask
# opção B — chave no cliente (limitações acima)
VITE_GEMINI_API_KEY=...
```
