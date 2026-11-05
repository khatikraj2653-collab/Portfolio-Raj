// POST /api/_cron/digest
// Called by GitHub Actions at 07:00 UK time daily.
// Aggregates last 24h errors + probe results and emails a digest via Resend.
// Auth: X-Cron-Token header must match env.CRON_TOKEN.

const APPS = [
  { key: "semibot",               label: "SemiBot" },
  { key: "goldbot",               label: "GoldBot" },
  { key: "silverbot",             label: "SilverBot" },
  { key: "hallucinationdetector", label: "Hallucination Detector" },
  { key: "retailresearch",        label: "Retail Research" },
];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function listPrefix(kv, prefix) {
  const all = [];
  let cursor;
  for (let i = 0; i < 10; i++) {
    const list = await kv.list({ prefix, limit: 1000, cursor });
    all.push(...list.keys);
    if (list.list_complete || !list.cursor) break;
    cursor = list.cursor;
  }
  return all;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

async function buildDigestHtml(env) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const perApp = {};

  for (const app of APPS) {
    const errorRows = (await listPrefix(env.ANALYTICS, `err:${app.key}:`))
      .filter(k => k.metadata?.timestamp && Date.parse(k.metadata.timestamp) > cutoff)
      .map(k => k.metadata);
    const probeRows = (await listPrefix(env.ANALYTICS, `probe:${app.key}:`))
      .filter(k => k.metadata?.timestamp && Date.parse(k.metadata.timestamp) > cutoff)
      .map(k => k.metadata);
    const upCount = probeRows.filter(p => p.status === "up").length;
    const downCount = probeRows.filter(p => p.status === "down").length;
    perApp[app.key] = { app, errors: errorRows, upCount, downCount };
  }

  const totalErrors = Object.values(perApp).reduce((s, a) => s + a.errors.length, 0);
  const healthy = Object.values(perApp).filter(a => a.errors.length === 0 && a.downCount === 0).length;
  const degraded = Object.values(perApp).filter(a => a.errors.length > 0 || a.downCount > 0).length;

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  let bodyRows = "";
  for (const key of Object.keys(perApp)) {
    const d = perApp[key];
    const badge = (d.errors.length === 0 && d.downCount === 0) ? "🟢" : "🟡";
    const errsHtml = d.errors.length
      ? d.errors.slice(-10).map(e =>
          `<li style="margin:4px 0;color:#444;"><code style="color:#a55">${escapeHtml(e.source)}</code> — ${escapeHtml(e.type)}: ${escapeHtml(e.message)}</li>`
        ).join("")
      : '<li style="color:#4a7a4a;list-style:none;">✓ No errors</li>';
    bodyRows += `
      <div style="margin:18px 0;padding:14px 16px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;">
        <h3 style="margin:0 0 8px;font-size:15px;color:#1f2937;">${badge} ${escapeHtml(d.app.label)}</h3>
        <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">
          ${d.errors.length} error${d.errors.length === 1 ? "" : "s"} · ${d.upCount} up probe${d.upCount === 1 ? "" : "s"} · ${d.downCount} down probe${d.downCount === 1 ? "" : "s"}
        </div>
        <ul style="margin:0;padding-left:16px;font-size:12.5px;">${errsHtml}</ul>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,system-ui,sans-serif;max-width:640px;margin:20px auto;padding:20px;background:#f9fafb;color:#111;">
  <h1 style="font-size:20px;margin:0 0 6px;">🤖 Raj AI Studio — Daily Report</h1>
  <div style="color:#6b7280;font-size:13px;margin-bottom:20px;">${today}</div>

  <div style="display:flex;gap:16px;margin-bottom:18px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;">
    <div><strong style="font-size:22px;color:#059669">${healthy}</strong><div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Healthy</div></div>
    <div><strong style="font-size:22px;color:#d97706">${degraded}</strong><div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Degraded</div></div>
    <div><strong style="font-size:22px;color:#374151">${totalErrors}</strong><div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Errors 24h</div></div>
  </div>

  ${bodyRows}

  <div style="margin-top:28px;font-size:12px;color:#6b7280;">
    Full dashboard: <a href="https://portfolio-raj.pages.dev/studio.html">portfolio-raj.pages.dev/studio</a><br>
    Admin dashboard: <a href="https://portfolio-raj.pages.dev/admin.html">portfolio-raj.pages.dev/admin</a>
  </div>
</body>
</html>`;
}

export async function onRequestPost({ request, env }) {
  if (!env.CRON_TOKEN || (request.headers.get("X-Cron-Token") || "") !== env.CRON_TOKEN) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }
  if (!env.ANALYTICS) return jsonResponse({ error: "No KV." }, 500);
  if (!env.RESEND_API_KEY) return jsonResponse({ error: "RESEND_API_KEY not set." }, 500);

  const to = env.DIGEST_TO_EMAIL || "khatikraj2653@gmail.com";
  const html = await buildDigestHtml(env);

  const subject = `🤖 Raj AI Studio — Daily Report, ${new Date().toLocaleDateString("en-GB")}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "AI Studio Monitor <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return jsonResponse({ error: "Resend failed", status: res.status, detail }, 502);
  }

  const data = await res.json();
  return jsonResponse({ sent: true, to, resend_id: data.id });
}
