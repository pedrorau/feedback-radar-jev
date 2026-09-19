import type { APIRoute } from 'astro';

// ─────────────────────────────────────────────────────────────
//  PROXY hacia un LLM tradicional (OpenAI o Anthropic)
//
//  Recibe el MISMO body que /api/jev ({ state, questions }) y le
//  pide al LLM las mismas decisiones, pero en JSON por prompt.
//  Sirve para comparar velocidad (ms) contra Jev en la misma tarea.
//
//  Config en .env:
//    LLM_PROVIDER=openai | anthropic
//    LLM_API_KEY=...
//    LLM_MODEL=...   (ej. gpt-4o-mini  |  claude-3-5-sonnet-latest)
// ─────────────────────────────────────────────────────────────

const PROVIDER = (import.meta.env.LLM_PROVIDER || 'openai').toLowerCase();
const KEY = import.meta.env.LLM_API_KEY;
const MODEL = import.meta.env.LLM_MODEL || 'gpt-4o-mini';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

// Construye un prompt legible a partir del mismo objeto `questions`.
function buildPrompt(state: unknown, questions: Record<string, any>) {
  const lines: string[] = [];
  for (const [id, q] of Object.entries(questions)) {
    if (q.type === 'choice') {
      lines.push(`- "${id}": choose exactly one of [${Object.keys(q.criteria).join(', ')}]. ${q.instructions}`);
    } else if (q.type === 'score') {
      const levels = (q.criteria as string[]).map((c, i) => `${i}=${c}`).join('; ');
      lines.push(`- "${id}": an integer from 0 to ${q.criteria.length - 1} (${levels}). ${q.instructions}`);
    } else {
      lines.push(`- "${id}": true or false. ${q.instructions}`);
    }
  }
  const system =
    'You are a strict classifier. Answer each question about the state. ' +
    'Respond with ONLY a JSON object mapping each question id to its value ' +
    '(option string for choice, integer for score, boolean for noul). No prose, no code fences.';
  const user =
    `State:\n${JSON.stringify(state)}\n\nQuestions:\n${lines.join('\n')}\n\nReturn only the JSON object.`;
  return { system, user };
}

function parseJson(text: string) {
  // Limpia posibles ```json ... ``` que algunos modelos agregan.
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(cleaned); } catch { return { _raw: text }; }
}

export const POST: APIRoute = async ({ request }) => {
  if (!KEY) {
    return json({ error: 'Falta LLM_API_KEY en .env (para la comparativa con un LLM).' }, 500);
  }

  let payload: any;
  try { payload = await request.json(); } catch { return json({ error: 'Body inválido.' }, 400); }

  const { state, questions } = payload;
  if (!state || !questions) return json({ error: 'Faltan state o questions.' }, 400);

  const { system, user } = buildPrompt(state, questions);
  const t0 = Date.now();

  try {
    let content = '';

    if (PROVIDER === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      });
      const data = await res.json();
      if (!res.ok) return json({ error: 'Error del LLM (Anthropic)', detail: data }, res.status);
      content = data?.content?.[0]?.text ?? '';
    } else {
      // OpenAI (default)
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          response_format: { type: 'json_object' },
        }),
      });
      const data = await res.json();
      if (!res.ok) return json({ error: 'Error del LLM (OpenAI)', detail: data }, res.status);
      content = data?.choices?.[0]?.message?.content ?? '';
    }

    const ms_server = Date.now() - t0;
    return json({ provider: PROVIDER, model: MODEL, ms_server, answers: parseJson(content) });
  } catch (e) {
    return json({ error: 'No se pudo contactar al LLM.', detail: String(e) }, 502);
  }
};
