function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Pages through kv.list() counting every key under `prefix:`, and keeps the
// most recent `limit` entries' metadata for the detail view. Stops after
// MAX_PAGES to stay well under Cloudflare's subrequest cap — if we hit the
// cap the total is suffixed with "+" in the UI so you know it's a floor.
const PAGE_SIZE = 1000;
const MAX_PAGES = 20; // up to 20 000 keys counted per prefix

async function fetchSummary(kv, prefix, limit) {
  let total = 0;
  let allKeys = [];
  let cursor = undefined;
  let pages = 0;
  let truncated = false;

  while (pages < MAX_PAGES) {
    const list = await kv.list({ prefix: `${prefix}:`, limit: PAGE_SIZE, cursor });
    total += list.keys.length;
    allKeys = allKeys.concat(list.keys);
    pages++;
    if (list.list_complete || !list.cursor) break;
    cursor = list.cursor;
    if (pages >= MAX_PAGES && !list.list_complete) truncated = true;
  }

  const recent = allKeys.slice(-limit).reverse().map((k) => k.metadata).filter(Boolean);
  return { items: recent, total, truncated };
}

export async function onRequestGet({ request, env }) {
  if (!env.ADMIN_PASSWORD) {
    return jsonResponse({ error: "Admin dashboard is not configured." }, 500);
  }

  const providedPassword = request.headers.get("X-Admin-Password") || "";
  if (providedPassword !== env.ADMIN_PASSWORD) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  if (!env.ANALYTICS) {
    return jsonResponse({ visits: { items: [], total: 0 }, chats: { items: [], total: 0 }, apps: {} });
  }

  const [visits, chats] = await Promise.all([
    fetchSummary(env.ANALYTICS, "visit", 200),
    fetchSummary(env.ANALYTICS, "chat", 200),
  ]);

  const OTHER_APPS = ["semibot", "goldbot", "silverbot", "hallucinationdetector", "retailresearch"];
  const apps = {};
  await Promise.all(
    OTHER_APPS.map(async (app) => {
      const [appVisits, appSearches, appChats] = await Promise.all([
        fetchSummary(env.ANALYTICS, `${app}:visit`, 200),
        fetchSummary(env.ANALYTICS, `${app}:search`, 200),
        fetchSummary(env.ANALYTICS, `${app}:chat`, 200),
      ]);
      if (appVisits.total || appSearches.total || appChats.total) {
        apps[app] = { visits: appVisits, searches: appSearches, chats: appChats };
      }
    })
  );

  return jsonResponse({ visits, chats, apps });
}
