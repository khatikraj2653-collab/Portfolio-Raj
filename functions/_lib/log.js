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

export async function putLog(kv, prefix, record) {
  if (!kv) return;
  const key = `${prefix}:${nowKeyPart()}:${Math.random().toString(36).slice(2, 8)}`;
  try {
    await kv.put(key, JSON.stringify(record), {
      expirationTtl: 60 * 60 * 24 * 180, // 180 days
    });
  } catch (err) {
    console.error("KV log write failed:", err);
  }
}
