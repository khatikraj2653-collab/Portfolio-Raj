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
//
// SAFETY: Workers KV free tier has a 1,000-delete/day cap. We track how
// many deletes this handler has issued today in a `meta:wipe-counter:<UTC-date>`
// KV row and refuse to delete more than DAILY_DELETE_BUDGET per UTC day,
// so a bulk wipe can never silently exhaust the account's whole KV quota
// (which would also block other apps on the same account).

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
const DAILY_DELETE_BUDGET = 800; // < Cloudflare's 1,000 free-tier delete cap
                                  // so we never exhaust the account quota.

function todayKey() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `meta:wipe-counter:${y}-${m}-${day}`;
}

async function readTodayCount(kv) {
  try {
    const raw = await kv.get(todayKey());
    const n = parseInt(raw || "0", 10);
    return Number.isFinite(n) ? n : 0;
  } catch { return 0; }
}

async function bumpTodayCount(kv, delta) {
  try {
    const current = await readTodayCount(kv);
    // Counter row is low-traffic; it expires automatically ~2 days later so
    // KV never fills up with stale meta rows.
    await kv.put(todayKey(), String(current + delta), { expirationTtl: 60 * 60 * 48 });
  } catch { /* best-effort */ }
}

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

    const already = await readTodayCount(env.ANALYTICS);
    if (already >= DAILY_DELETE_BUDGET) {
      return jsonResponse({
        deleted: 0,
        done: true,
        quota_hit: true,
        message: `Daily wipe budget reached (${already}/${DAILY_DELETE_BUDGET} deletes today). ` +
                 `Resumes at the next UTC midnight to protect the account's KV quota.`,
      });
    }

    // Shrink this call's batch if we're near the daily cap
    const remainingBudget = DAILY_DELETE_BUDGET - already;
    const thisBatch = Math.min(BATCH, remainingBudget);

    for (const prefix of PREFIXES) {
      const list = await env.ANALYTICS.list({ prefix, limit: thisBatch });
      if (list.keys.length === 0) continue;
      await Promise.all(list.keys.map((k) => env.ANALYTICS.delete(k.name)));
      await bumpTodayCount(env.ANALYTICS, list.keys.length);
      return jsonResponse({
        deleted: list.keys.length,
        done: false,
        budget_remaining: remainingBudget - list.keys.length,
      });
    }

    return jsonResponse({ deleted: 0, done: true });
  } catch (err) {
    return jsonResponse({ error: String(err && err.message || err) }, 500);
  }
}
