# feedback-radar-jev
# Feedback Radar · Jev (TypeSafe AI)

Una demo web de un **System One Model** (Jev, de [TypeSafe AI](https://typesafe.ai)).
Pegas un comentario de usuario y salen **decisiones tipadas con confianza** — sentimiento,
categoría, urgencia y severidad — todas en un solo request, en milisegundos.

A diferencia de un LLM, Jev no genera texto: devuelve valores estructurados que tu
código puede consumir directo. Esta demo muestra eso y la lógica de **actuar solo
(AUTO) vs. escalar a un humano (REVISAR)** según un umbral de confianza que mueves en vivo.

## Cómo correrlo

Necesitas **Node 18+**.

```bash
# 1. Clona e instala
git clone <este-repo>
cd feedback-radar-jev
npm install

# 2. Pon tu propia API key
cp .env.example .env
#   abre .env y reemplaza ts_tu_key_aqui por tu key real
#   (consíguela gratis en https://console.typesafe.ai → API Keys)

# 3. Levanta el servidor
npm run dev
```

Abre http://localhost:4321 y dale a **Analizar**.

## ¿Por qué necesita un servidor y no es solo un HTML?

Dos razones, y las resuelve la misma pieza:

1. **CORS.** El navegador bloquea las llamadas directas del cliente a la API de TypeSafe.
2. **La API key es un secreto** y no puede vivir en el navegador.

Por eso la llamada pasa por una pequeña **API route** (`src/pages/api/jev.ts`) que corre
en el servidor: lee la key del `.env`, se la agrega a la petición y reenvía a TypeSafe.
El navegador solo habla con `/api/jev` (mismo origen → sin CORS), y nunca ve la key.

```
navegador → /api/jev (servidor, mismo origen) → api.typesafe.ai
```

## Estructura

```
src/
  pages/
    index.astro      → la UI del radar (el esquema de preguntas vive aquí)
    api/
      jev.ts         → el proxy: inyecta la API key, evita CORS
astro.config.mjs     → modo servidor + adapter de Node
.env.example         → plantilla de la key (copia a .env)
```

## Personalizarlo

- **Cambiar las preguntas:** edita el objeto `QUESTIONS` en `src/pages/index.astro`.
  Puedes mezclar libremente los tres tipos:
  - `choice` — elige una opción de una lista (clasificar, rutear).
  - `score` — ubica en una escala de niveles que tú defines.
  - `noul` — pregunta sí/no; devuelve la probabilidad de "sí" (no trae `confidence`
    aparte, por eso la certeza se calcula como distancia de 0.5).
- El proxy es un pass-through, así que no necesitas tocarlo al cambiar el esquema.

## Nota sobre publicarlo

Este repo está pensado para **correr local, cada quien con su propia key**.
Si algún día lo publicas con **tu** key en un backend, recuerda que quedaría como un
proxy abierto: ponle rate limiting y un tope de gasto en TypeSafe, o mejor deja que
cada visitante use su propia key.

---

Hecho para explorar Jev. No afiliado oficialmente a TypeSafe AI.