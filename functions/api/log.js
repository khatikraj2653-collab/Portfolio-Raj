import { hashIp, putLog } from "../_lib/log.js";

// Public logging endpoint for the other tools (SemiBot, GoldBot, SilverBot,
// Hallucination Detector) to report visits/searches/questions into the same
// KV store used by the portfolio site, so everything shows up in one
// admin dashboard. Called server-to-server from each tool's Python
// backend — never from a visitor's browser — so no CORS is needed.

const ALLOWED_APPS = ["semibot", "goldbot", "silverbot", "hallucinationdetector", "retailresearch"];
const ALLOWED_TYPES = ["visit", "search", "chat"];
const MAX_FIELD_LEN = 2000;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clean(value) {
  if (typeof value !== "string") return null;
  return value.slice(0, MAX_FIELD_LEN);
}

export async function onRequestPost({ request, env }) {
  if (!env.LOG_SECRET || request.headers.get("X-Log-Secret") !== env.LOG_SECRET) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  if (!env.ANALYTICS) {
    return jsonResponse({ error: "Analytics not configured." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const app = ALLOWED_APPS.includes(body?.app) ? body.app : null;
  const type = ALLOWED_TYPES.includes(body?.type) ? body.type : null;
  if (!app || !type) {
    return jsonResponse({ error: "Invalid or missing app/type." }, 400);
  }

  const visitorIp = clean(body.visitorIp);
  const userAgent = clean(body.userAgent);
  const referrer = clean(body.referrer);

  await putLog(env.ANALYTICS, `${app}:${type}`, {
    app,
    type,
    detail: clean(body.detail),
    question: clean(body.question),
    reply: clean(body.reply),
    timestamp: new Date().toISOString(),
    visitorHash: visitorIp ? await hashIp(visitorIp) : null,
    userAgent,
    referrer,
  });

  return jsonResponse({ ok: true });
}

export async function onRequestGet() {
  return jsonResponse({ error: "Use POST." }, 405);
}
