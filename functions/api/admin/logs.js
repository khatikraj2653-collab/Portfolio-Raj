function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Reads log entries straight off kv.list()'s metadata — no per-entry kv.get()
// fan-out — since that used to blow past Cloudflare's subrequest limit once
// log volume grew (each admin request could trigger hundreds of KV gets).
async function fetchRecent(kv, prefix, limit) {
  const list = await kv.list({ prefix: `${prefix}:`, limit: 1000 });
  const recentKeys = list.keys.slice(-limit).reverse(); // newest first
  return recentKeys.map((k) => k.metadata).filter(Boolean);
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
    return jsonResponse({ visits: [], chats: [] });
  }

  const [visits, chats] = await Promise.all([
    fetchRecent(env.ANALYTICS, "visit", 200),
    fetchRecent(env.ANALYTICS, "chat", 200),
  ]);

  const OTHER_APPS = ["semibot", "goldbot", "silverbot", "hallucinationdetector", "retailresearch"];
  const apps = {};
  await Promise.all(
    OTHER_APPS.map(async (app) => {
      const [appVisits, appSearches, appChats] = await Promise.all([
        fetchRecent(env.ANALYTICS, `${app}:visit`, 200),
        fetchRecent(env.ANALYTICS, `${app}:search`, 200),
        fetchRecent(env.ANALYTICS, `${app}:chat`, 200),
      ]);
      if (appVisits.length || appSearches.length || appChats.length) {
        apps[app] = { visits: appVisits, searches: appSearches, chats: appChats };
      }
    })
  );

  return jsonResponse({ visits, chats, apps });
}
