// POST /api/admin/wipe-visits
// Deletes a batch of visit:* keys (and <app>:visit:* keys) so historical
// bot-inflated counts can be cleared out. The frontend calls this in a
// loop until { done: true } comes back. Password-gated.
//
// Only touches visit entries. Chats, searches, and anything else stay.
//
// Cloudflare Pages Functions cap each invocation at 50 subrequests.
// This handler processes ONE non-empty prefix per call (<=6 list peeks +
// up to BATCH deletes = <=36 subrequests), well under the limit.

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

const BATCH = 20; // keys deleted per call (keeps subrequests well under 50)

export async function onRequestPost({ request, env }) {
  try {
    if (!env.ADMIN_PASSWORD) {
      return jsonResponse({ error: "Admin is not configured." }, 500);
    }
    if ((request.headers.get("X-Admin-Password") || "") !== env.ADMIN_PASSWORD) {
      return jsonResponse({ error: "Unauthorized." }, 401);
    }
    if (!env.ANALYTICS) {
      return jsonResponse({ error: "No analytics KV bound." }, 500);
    }

    for (const prefix of PREFIXES) {
      const list = await env.ANALYTICS.list({ prefix, limit: BATCH });
      if (list.keys.length === 0) continue;
      await Promise.all(list.keys.map((k) => env.ANALYTICS.delete(k.name)));
      return jsonResponse({ deleted: list.keys.length, done: false });
    }

    return jsonResponse({ deleted: 0, done: true });
  } catch (err) {
    return jsonResponse({ error: String(err && err.message || err) }, 500);
  }
}
