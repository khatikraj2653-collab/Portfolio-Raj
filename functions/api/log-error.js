// POST /api/log-error
// Called by each of the 5 Streamlit apps whenever a data fetcher or
// chat path fails, so the unified AI Studio hub can show a single
// aggregated view of what's broken across the whole studio.
//
// Expected body:
//   {
//     "app":     "semibot" | "goldbot" | "silverbot" | "hallucinationdetector" | "retailresearch",
//     "source":  "USD Index" | "P/E Ratio" | "chatbot" | ...,
//     "type":    "rate_limit" | "data_unavailable" | "exception" | "timeout" | ...,
//     "message": "..."   (short, no stack traces)
//   }
// Auth: require header X-App-Token matching env.APP_LOG_TOKEN
//       (or allow unauthenticated writes if APP_LOG_TOKEN is unset,
//        for local dev — we always set it in production).
// Row is stored in KV with key: err:<app>:<ISO-timestamp>-<rand>
// and TTL of 7 days so the dashboard doesn't bloat forever.

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, X-App-Token",
    },
  });
}

const ALLOWED_APPS = new Set([
  "semibot", "goldbot", "silverbot", "hallucinationdetector", "retailresearch",
]);

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-App-Token",
    },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.ANALYTICS) {
    return jsonResponse({ error: "No KV binding." }, 500);
  }

  // Optional auth — if APP_LOG_TOKEN is set, require it
  if (env.APP_LOG_TOKEN) {
    const tok = request.headers.get("X-App-Token") || "";
    if (tok !== env.APP_LOG_TOKEN) {
      return jsonResponse({ error: "Unauthorized." }, 401);
    }
  }

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: "Invalid JSON." }, 400); }

  const app = String(body?.app || "").toLowerCase().trim();
  if (!ALLOWED_APPS.has(app)) {
    return jsonResponse({ error: `Unknown app: ${app}` }, 400);
  }

  const now = new Date();
  const rand = Math.random().toString(36).slice(2, 8);
  const key = `err:${app}:${now.toISOString()}-${rand}`;

  const row = {
    app,
    source: String(body?.source || "").slice(0, 100),
    type: String(body?.type || "unknown").slice(0, 50),
    message: String(body?.message || "").slice(0, 400),
    timestamp: now.toISOString(),
  };

  await env.ANALYTICS.put(key, JSON.stringify(row), {
    metadata: row,
    expirationTtl: 60 * 60 * 24 * 7, // 7 days
  });

  return jsonResponse({ ok: true, key });
}
