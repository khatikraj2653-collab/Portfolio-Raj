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

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const results = {};

  for (const app of APPS) {
    const errorRows = await listPrefix(env.ANALYTICS, `err:${app.key}:`);
    const recent = errorRows.filter((k) => {
      const ts = k.metadata?.timestamp ? Date.parse(k.metadata.timestamp) : 0;
      return ts > cutoff;
    });

    // Latest probe (if any)
    const probeRows = await listPrefix(env.ANALYTICS, `probe:${app.key}:`);
    const latestProbe = probeRows.length ? probeRows[probeRows.length - 1].metadata : null;

    results[app.key] = {
      label: app.label,
      url: app.url,
      errors_24h: recent.length,
      errors_total: errorRows.length,
      recent_errors: recent.slice(-20).reverse().map((k) => k.metadata),
      last_probe: latestProbe,
      status: healthFromCounts(recent.length, latestProbe),
    };
  }

  return jsonResponse({
    generated_at: new Date().toISOString(),
    apps: results,
  });
}
