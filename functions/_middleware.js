import { hashIp, putLog } from "./_lib/log.js";

// Only log real page navigations — skip static assets and API routes so
// one visitor loading the site doesn't create a dozen noisy log entries.
function isPageRequest(pathname) {
  if (pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/admin")) return false;
  if (/\.[a-z0-9]+$/i.test(pathname)) return false; // has a file extension
  return true;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const response = await next();

  try {
    const url = new URL(request.url);
    if (request.method === "GET" && isPageRequest(url.pathname) && env.ANALYTICS) {
      const cf = request.cf || {};
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      await putLog(env.ANALYTICS, "visit", {
        path: url.pathname,
        timestamp: new Date().toISOString(),
        country: cf.country || null,
        city: cf.city || null,
        region: cf.region || null,
        referrer: request.headers.get("Referer") || null,
        userAgent: request.headers.get("User-Agent") || null,
        visitorHash: await hashIp(ip),
      });
    }
  } catch (err) {
    console.error("Visit logging failed:", err);
  }

  return response;
}
