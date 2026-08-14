import { hashIp, putLog } from "../_lib/log.js";

// Contact form logging endpoint. Every submission is logged to KV here so
// nothing is ever lost, visible in the admin dashboard regardless of email
// outcome. Actual email delivery happens client-side directly to Web3Forms
// (see js/main.js) — Web3Forms' free plan only accepts submissions
// originating from the browser, not server-to-server calls from here.

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const requestLog = new Map(); // ip -> array of request timestamps

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  if (requestLog.size > 5000) requestLog.clear();
  return timestamps.length > RATE_LIMIT_MAX;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clean(value, maxLen) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (isRateLimited(ip)) {
    return jsonResponse({ error: "Too many submissions. Please try again in a minute." }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request." }, 400);
  }

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const subject = clean(body.subject, 200);
  const message = clean(body.message, 5000);

  if (!name || !email || !subject || !message) {
    return jsonResponse({ error: "All fields are required." }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return jsonResponse({ error: "Please enter a valid email address." }, 400);
  }

  if (env.ANALYTICS) {
    await putLog(env.ANALYTICS, "contact_form", {
      name,
      email,
      subject,
      message,
      timestamp: new Date().toISOString(),
      visitorHash: await hashIp(ip),
      userAgent: request.headers.get("User-Agent") || null,
    });
  }

  return jsonResponse({ ok: true });
}

export async function onRequestGet() {
  return jsonResponse({ error: "Use POST." }, 405);
}
