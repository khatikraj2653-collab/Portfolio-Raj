import { hashIp, putLog } from "../_lib/log.js";

// Contact form submission handler. Every submission is logged to KV
// regardless of email outcome, so nothing is ever lost even if the email
// provider is down or misconfigured. Actual delivery to the owner's inbox
// goes through Web3Forms (free, no custom domain required — unlike
// Cloudflare's native Email Routing, which needs a Cloudflare-managed
// domain with MX records, not available on the free *.pages.dev subdomain).

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

  let emailed = false;
  if (env.WEB3FORMS_KEY) {
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: env.WEB3FORMS_KEY,
          subject: `[Portfolio] ${subject}`,
          from_name: name,
          replyto: email,
          message: `From: ${name} <${email}>\n\n${message}`,
        }),
      });
      const data = await res.json();
      emailed = !!data.success;
      if (!emailed) console.error("Web3Forms rejected submission:", data);
    } catch (err) {
      console.error("Web3Forms send failed:", err);
    }
  }

  return jsonResponse({ ok: true, emailed });
}

export async function onRequestGet() {
  return jsonResponse({ error: "Use POST." }, 405);
}
