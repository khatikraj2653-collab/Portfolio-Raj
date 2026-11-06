// GET /api/studio-status
// Returns an aggregated view of all 5 apps' health:
//   - last 24h error rows per app
//   - last successful ping per app (from the cron probe)
//   - computed status: green / yellow / red
// Password-gated with ADMIN_PASSWORD (same as /admin).

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const APPS = [
  { key: "semibot",               label: "SemiBot",                url: "https://semibot-raj.streamlit.app/" },
  { key: "goldbot",               label: "GoldBot",                url: "https://goldbot-raj.streamlit.app/" },
  { key: "silverbot",             label: "SilverBot",              url: "https://silverbot-raj.streamlit.app/" },
  { key: "hallucinationdetector", label: "Hallucination Detector", url: "https://hallucinationdetecto.streamlit.app/" },
  { key: "retailresearch",        label: "Retail Research",        url: "https://retailresearch-raj.streamlit.app/" },
];

const PAGE_SIZE = 1000;
const MAX_PAGES = 6; // enough for ~6000 rows per prefix

async function listPrefix(kv, prefix) {
  const all = [];
  let cursor;
  for (let i = 0; i < MAX_PAGES; i++) {
    const list = await kv.list({ prefix, limit: PAGE_SIZE, cursor });
    all.push(...list.keys);
    if (list.list_complete || !list.cursor) break;
    cursor = list.cursor;
  }
  return all;
}

function healthFromCounts(errors24h, lastProbe) {
  // Simple heuristic — tune later
  if (lastProbe && lastProbe.status === "down") return "red";
  if (errors24h >= 10) return "red";
  if (errors24h >= 1) return "yellow";
  return "green";
}

export async function onRequestGet({ request, env }) {
  if (!env.ADMIN_PASSWORD) return jsonResponse({ error: "Admin not configured." }, 500);
  if ((request.headers.get("X-Admin-Password") || "") !== env.ADMIN_PASSWORD) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }
  if (!env.ANALYTICS) return jsonResponse({ error: "No KV." }, 500);

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const cutoff24h = now - DAY;
  const cutoff14d = now - 14 * DAY;
  const results = {};

  for (const app of APPS) {
    const errorRows = await listPrefix(env.ANALYTICS, `err:${app.key}:`);

    // Errors in last 24h, with hourly buckets for the sparkline.
    const errors24h = [];
    const hourlyBuckets = new Array(24).fill(0);
    for (const k of errorRows) {
      const ts = k.metadata?.timestamp ? Date.parse(k.metadata.timestamp) : 0;
      if (ts > cutoff24h) {
        errors24h.push(k.metadata);
        const hoursAgo = Math.floor((now - ts) / (60 * 60 * 1000));
        if (hoursAgo >= 0 && hoursAgo < 24) {
          hourlyBuckets[23 - hoursAgo]++; // bucket[0]=24h ago, bucket[23]=latest hour
        }
      }
    }

    // Probes over last 14d — pass through so the UI can bucket by day.
    const probeRows = await listPrefix(env.ANALYTICS, `probe:${app.key}:`);
    const probes14d = probeRows
      .map((k) => k.metadata)
      .filter((m) => m && Date.parse(m.timestamp) > cutoff14d)
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    const latestProbe = probes14d.length ? probes14d[probes14d.length - 1] : null;

    // Avg probe latency over 14d (only for successful probes).
    const upProbes = probes14d.filter((p) => p.status === "up" && typeof p.latency_ms === "number");
    const avgLatency = upProbes.length
      ? Math.round(upProbes.reduce((s, p) => s + p.latency_ms, 0) / upProbes.length)
      : null;

    results[app.key] = {
      label: app.label,
      url: app.url,
      errors_24h: errors24h.length,
      errors_total: errorRows.length,
      errors_24h_hourly: hourlyBuckets,
      recent_errors: errors24h.slice(-50).reverse().map((e, i) => ({ ...e, _id: i })),
      last_probe: latestProbe,
      avg_latency_ms: avgLatency,
      probes_14d: probes14d,
      status: healthFromCounts(errors24h.length, latestProbe),
    };
  }

  return jsonResponse({
    generated_at: new Date().toISOString(),
    apps: results,
  });
}
