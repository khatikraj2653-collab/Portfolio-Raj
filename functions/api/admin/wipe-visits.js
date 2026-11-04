// POST /api/admin/wipe-visits
// Deletes a batch of visit:* keys (and <app>:visit:* for the apps)
// so historical bot-inflated counts can be cleared out. The frontend
// calls this in a loop until { done: true } comes back. Password-gated.
//
// Only touches visit entries. Chats, searches, and anything else stay.

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const PREFIXES = [
  "visit:",
  "semibot:visit:",
  "goldbot:visit:",
  "silverbot:visit:",
  "hallucinationdetector:visit:",
  "retailresearch:visit:",
];

const BATCH = 40; // keys deleted per call — stays under Pages Functions subrequest caps

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) {
    return jsonResponse({ error: "Admin is not configured." }, 500);
  }
  if ((request.headers.get("X-Admin-Password") || "") !== env.ADMIN_PASSWORD) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }
  if (!env.ANALYTICS) {
    return jsonResponse({ error: "No analytics KV bound." }, 500);
  }

  let deleted = 0;

  for (const prefix of PREFIXES) {
    if (deleted >= BATCH) break;
    const list = await env.ANALYTICS.list({ prefix, limit: BATCH - deleted });
    if (!list.keys.length) continue;
    await Promise.all(list.keys.map((k) => env.ANALYTICS.delete(k.name)));
    deleted += list.keys.length;
  }

  // Report whether any visit keys still remain across all prefixes.
  let hasMore = false;
  for (const prefix of PREFIXES) {
    const peek = await env.ANALYTICS.list({ prefix, limit: 1 });
    if (peek.keys.length) { hasMore = true; break; }
  }

  return jsonResponse({ deleted, done: !hasMore });
}
