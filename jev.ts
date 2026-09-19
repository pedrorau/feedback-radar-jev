import type { APIRoute } from 'astro';

// ─────────────────────────────────────────────────────────────
//  PROXY hacia la API de TypeSafe (jev-latest)
//
//  Esto corre en el SERVIDOR (no en el navegador), así que:
//   1. Lee la API key del .env — el navegador nunca la ve.
//   2. Al ser el mismo origen que la página, no hay CORS.
//
//  Es un pass-through: recibe el body que arma el frontend
//  ({ state, model, questions }) y solo le agrega el header de auth.
//  Así puedes cambiar el esquema en el frontend sin tocar esto.
// ─────────────────────────────────────────────────────────────

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const KEY = import.meta.env.TS_API_KEY;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  if (!KEY) {
    return json(
      { error: 'Falta TS_API_KEY. Copia .env.example a .env, pega tu key y reinicia el servidor.' },
      500,
    );
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return json({ error: 'Body inválido.' }, 400);
  }

  try {
    const res = await fetch(TYPESAFE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    // Reenviamos tal cual el status y el JSON de TypeSafe.
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return json(
      { error: 'No se pudo contactar a la API de TypeSafe.', detail: String(e) },
      502,
    );
  }
};
