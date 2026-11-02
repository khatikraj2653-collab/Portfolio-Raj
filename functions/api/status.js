// Public, read-only uptime status for the live demos, backed by UptimeRobot.
// Needs a Cloudflare Pages secret UPTIMEROBOT_API_KEY set to a *read-only*
// UptimeRobot API key. Without it the endpoint reports configured:false and
// the site simply shows no status dots.

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=120",
    },
  });
}

// UptimeRobot v2 monitor status codes: 2 = up, 8 = seems down, 9 = down.
function toState(status) {
  if (status === 2) return "up";
  if (status === 8 || status === 9) return "down";
  return "unknown";
}

export async function onRequestGet({ env }) {
  const apiKey = env.UPTIMEROBOT_API_KEY;
  if (!apiKey) return jsonResponse({ configured: false, monitors: {} });

  try {
    const res = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ api_key: apiKey, format: "json" }),
    });
    const data = await res.json();
    if (data.stat !== "ok") return jsonResponse({ configured: true, monitors: {} });

    const monitors = {};
    for (const m of data.monitors || []) {
      try {
        monitors[new URL(m.url).hostname] = toState(m.status);
      } catch {
        // Monitor URL isn't a parseable URL (e.g. a ping/port monitor) — skip it.
      }
    }
    return jsonResponse({ configured: true, monitors });
  } catch (err) {
    console.error("status fetch failed:", err);
    return jsonResponse({ configured: true, monitors: {} });
  }
}
