// POST /api/_cron/probe
// Called by GitHub Actions at 06:00 UK time daily.
// Pings each of the 5 Streamlit apps and records up/down in KV.
// Auth: X-Cron-Token header must match env.CRON_TOKEN.

const APPS = [
  { key: "semibot",               url: "https://semibot-raj.streamlit.app/" },
  { key: "goldbot",               url: "https://goldbot-raj.streamlit.app/" },
  { key: "silverbot",             url: "https://silverbot-raj.streamlit.app/" },
  { key: "hallucinationdetector", url: "https://hallucinationdetecto.streamlit.app/" },
  { key: "retailresearch",        url: "https://retailresearch-raj.streamlit.app/" },
];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.CRON_TOKEN || (request.headers.get("X-Cron-Token") || "") !== env.CRON_TOKEN) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }
  if (!env.ANALYTICS) return jsonResponse({ error: "No KV." }, 500);

  const results = [];
  for (const app of APPS) {
    const start = Date.now();
    let result;
    try {
      // Don't follow redirects — Streamlit Community Cloud's SSO flow
      // can send us into an auth redirect loop that both exhausts
      // Cloudflare Worker's 50-subrequest limit AND wrongly reports
      // an up app as "down". A 2xx OR a 3xx is "up".
      const res = await fetch(app.url, {
        cf: { cacheTtl: 0 },
        redirect: "manual",
      });
      const isHealthy = (res.status >= 200 && res.status < 400);
      result = {
        app: app.key,
        status: isHealthy ? "up" : "down",
        http: res.status,
        latency_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      result = {
        app: app.key,
        status: "down",
        http: 0,
        error: String(err && err.message || err).slice(0, 200),
        timestamp: new Date().toISOString(),
      };
    }
    const key = `probe:${app.key}:${result.timestamp}`;
    await env.ANALYTICS.put(key, JSON.stringify(result), {
      metadata: result,
      expirationTtl: 60 * 60 * 24 * 14, // 14 days
    });
    results.push(result);
  }

  return jsonResponse({ probed: results.length, results });
}
