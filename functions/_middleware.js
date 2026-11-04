import { hashIp, putLog } from "./_lib/log.js";

// Only log real page navigations — skip static assets and API routes so
// one visitor loading the site doesn't create a dozen noisy log entries.
function isPageRequest(pathname) {
  if (pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/admin")) return false;
  if (/\.[a-z0-9]+$/i.test(pathname)) return false; // has a file extension
  return true;
}

// Match known bots, crawlers, monitors, and previewers so their traffic
// does not drown out real visitors. Case-insensitive.
const BOT_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|uptimerobot|pingdom|statuscake|gptbot|google-inspectiontool|claude-?web|anthropic|openai|duckduckgo|yandex|baiduspider|semrush|ahrefs|mj12|dotbot|petalbot|chatgpt|perplexity|headlesschrome|lighthouse|pagespeed|dataforseo|fetch|curl|wget|python-requests|httpclient|axios|java\//i;

function isBot(ua) {
  if (!ua) return true; // no UA = almost always a bot / script
  return BOT_PATTERN.test(ua);
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const response = await next();

  try {
    const url = new URL(request.url);
    const ua = request.headers.get("User-Agent") || "";
    if (
      request.method === "GET" &&
      isPageRequest(url.pathname) &&
      !isBot(ua) &&
      env.ANALYTICS
    ) {
      const cf = request.cf || {};
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      await putLog(env.ANALYTICS, "visit", {
        path: url.pathname,
        timestamp: new Date().toISOString(),
        country: cf.country || null,
        city: cf.city || null,
        region: cf.region || null,
        referrer: request.headers.get("Referer") || null,
        userAgent: ua,
        visitorHash: await hashIp(ip),
      });
    }
  } catch (err) {
    console.error("Visit logging failed:", err);
  }

  return response;
}
