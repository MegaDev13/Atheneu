// ─── AIProvider: Gemini (§20) ─────────────────────────────────────────────
// A arquitetura permite trocar de modelo/provedor sem alterar o restante do
// sistema: basta implementar `AIProvider` e registrar em `getAIProvider`.

import { AI_CONFIG, AI_PROXY_ENDPOINT, effectiveGeminiKey } from './config';

export interface AIProvider {
  name: string;
  generate(prompt: string, opts?: { maxOutputTokens?: number }): Promise<{ text: string; tokensEstimated: number }>;
}

export class GeminiProvider implements AIProvider {
  name = AI_CONFIG.model;

  async generate(prompt: string, opts?: { maxOutputTokens?: number }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.model}:generateContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': effectiveGeminiKey(),
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: opts?.maxOutputTokens ?? AI_CONFIG.maxOutputTokens,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 200)}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
    if (!text) throw new Error('Gemini retornou resposta vazia.');
    const usage = data?.usageMetadata;
    const tokensEstimated = usage?.totalTokenCount || Math.ceil((prompt.length + text.length) / 4);
    return { text, tokensEstimated };
  }
}

// Provedor via intermediário próprio (recomendado em produção — §40):
// a chave Gemini fica no servidor; o frontend só conversa com o proxy.
export class ProxyProvider implements AIProvider {
  name = 'proxy';

  async generate(prompt: string) {
    const res = await fetch(AI_PROXY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: AI_CONFIG.model }),
    });
    if (!res.ok) throw new Error(`Proxy de IA HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.answer && !data?.text) throw new Error('Proxy de IA retornou resposta vazia.');
    const text = String(data.answer ?? data.text);
    return { text, tokensEstimated: data.tokens ?? Math.ceil((prompt.length + text.length) / 4) };
  }
}

export function getAIProvider(): AIProvider {
  return AI_PROXY_ENDPOINT ? new ProxyProvider() : new GeminiProvider();
}

// Prompt padrão objetivo (§35): nunca pedir texto longo sem necessidade.
export function buildPrompt(system: string, context: string, question: string): string {
  return [
    system,
    'Responda em português, de forma clara e objetiva, utilizando somente o contexto fornecido.',
    'Se o contexto não contiver a resposta, diga isso honestamente.',
    '',
    'CONTEXTO DA BIBLIOTECA DO USUÁRIO:',
    context,
    '',
    'PERGUNTA:',
    question,
  ].join('\n');
}
