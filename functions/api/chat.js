import { buildSystemPrompt } from "../_lib/knowledge.js";
import { getLivePageText } from "../_lib/livePage.js";
import { hashIp, putLog } from "../_lib/log.js";

const MAX_MESSAGE_LEN = 800;
const MAX_HISTORY_TURNS = 6; // 6 messages = 3 user/assistant pairs
const MODEL = "gpt-4o-mini";
const MAX_OUTPUT_TOKENS = 400;

// Per-IP sliding window limit. Lives in the isolate's memory, so it only
// throttles requests handled by the same warm isolate — not a durable
// global limit (that would need a Cloudflare KV/Durable Object binding).
// Still a meaningful guard against a single client hammering the endpoint.
const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_MS = 60_000;
const requestLog = new Map(); // ip -> array of request timestamps

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  timestamps.push(now);
  requestLog.set(ip, timestamps);

  // Periodically prevent unbounded growth from many distinct IPs.
  if (requestLog.size > 5000) requestLog.clear();

  return timestamps.length > RATE_LIMIT_MAX;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, MAX_MESSAGE_LEN),
    }));
}

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const cf = request.cf || {};
  if (isRateLimited(ip)) {
    return jsonResponse(
      { error: "Too many messages sent too quickly. Please wait a moment and try again." },
      429
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return jsonResponse({ error: "Message is required." }, 400);
  }
  if (message.length > MAX_MESSAGE_LEN) {
    return jsonResponse(
      { error: `Message is too long (max ${MAX_MESSAGE_LEN} characters).` },
      400
    );
  }

  if (!env.OPENAI_API_KEY) {
    return jsonResponse(
      { error: "Chat is not configured yet. Please email khatikraj2653@gmail.com." },
      500
    );
  }

  const history = sanitizeHistory(body?.history);

  const origin = new URL(request.url).origin;
  const livePageText = await getLivePageText(origin);

  const messages = [
    { role: "system", content: buildSystemPrompt(livePageText) },
    ...history,
    { role: "user", content: message },
  ];

  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        max_tokens: MAX_OUTPUT_TOKENS,
        messages,
      }),
    });
  } catch (err) {
    console.error("OpenAI fetch failed:", err);
    return jsonResponse(
      { error: "Couldn't reach the assistant right now. Please try again shortly." },
      502
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    console.error("OpenAI API error:", upstream.status, detail);
    return jsonResponse(
      { error: "The assistant hit an error. Please try again shortly." },
      502
    );
  }

  const data = await upstream.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    return jsonResponse(
      { error: "No response generated. Please try again." },
      502
    );
  }

  if (env.ANALYTICS) {
    await putLog(env.ANALYTICS, "chat", {
      question: message,
      reply,
      timestamp: new Date().toISOString(),
      country: cf.country || null,
      city: cf.city || null,
      visitorHash: await hashIp(ip),
    });
  }

  return jsonResponse({ reply });
}

export async function onRequestGet() {
  return jsonResponse({ error: "Use POST." }, 405);
}
