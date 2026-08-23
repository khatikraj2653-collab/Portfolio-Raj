// Shared helpers for writing lightweight analytics/chat logs to KV.
// No raw IPs are ever stored — only a short, non-reversible hash, used
// purely to tell apart distinct visitors, not to identify anyone.

export async function hashIp(ip) {
  const data = new TextEncoder().encode(ip + "portfolio-raj-salt");
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

export function nowKeyPart() {
  return new Date().toISOString();
}

function truncate(value, maxLen) {
  return typeof value === "string" && value.length > maxLen ? value.slice(0, maxLen) : value;
}

// A trimmed copy of the record, small enough to fit in KV list-entry metadata
// (1024 byte limit) so the admin dashboard can read it straight off kv.list()
// without an extra kv.get() per entry — that fan-out was what triggered
// Cloudflare's per-request subrequest limit once log volume grew.
function summarize(record) {
  return {
    ...record,
    detail: truncate(record.detail, 200),
    question: truncate(record.question, 200),
    reply: truncate(record.reply, 200),
    userAgent: truncate(record.userAgent, 100),
    referrer: truncate(record.referrer, 150),
  };
}

export async function putLog(kv, prefix, record) {
  if (!kv) return;
  const key = `${prefix}:${nowKeyPart()}:${Math.random().toString(36).slice(2, 8)}`;
  try {
    await kv.put(key, JSON.stringify(record), {
      expirationTtl: 60 * 60 * 24 * 180, // 180 days
      metadata: summarize(record),
    });
  } catch (err) {
    console.error("KV log write failed:", err);
  }
}
