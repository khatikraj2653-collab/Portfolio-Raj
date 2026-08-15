// Fetches the live index.html and reduces it to plain text, so the chatbot
// has a fallback source of truth that can never drift from what's actually
// on the page — unlike the hand-maintained KNOWLEDGE_DOC in knowledge.js.
//
// Cached in-memory per warm isolate for CACHE_TTL_MS so a burst of chat
// requests doesn't each trigger a fresh fetch + parse.

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cache = { text: null, fetchedAt: 0 };

function stripHtmlToText(html) {
  return html
    // drop non-content elements entirely, including their contents
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ")
    // block-level tags become a newline boundary so text doesn't run together
    .replace(/<\/(p|div|section|article|li|h[1-6]|br|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    // strip all remaining tags
    .replace(/<[^>]+>/g, " ")
    // decode the handful of entities that actually show up in this page
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // collapse whitespace
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .replace(/ *\n */g, "\n")
    .trim();
}

/**
 * Returns the live page's text content, or null if it couldn't be fetched
 * (network error, non-200, etc). Callers must treat null as "no live
 * context available" and fall back to the static KNOWLEDGE_DOC only —
 * never fabricate a substitute.
 */
export async function getLivePageText(origin) {
  const now = Date.now();
  if (cache.text && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.text;
  }

  try {
    const res = await fetch(`${origin}/`, {
      cf: { cacheTtl: 60, cacheEverything: true },
    });
    if (!res.ok) return cache.text; // serve stale cache over nothing, if we have it
    const html = await res.text();
    const text = stripHtmlToText(html);
    cache = { text, fetchedAt: now };
    return text;
  } catch (err) {
    console.error("getLivePageText fetch failed:", err);
    return cache.text; // stale-if-error
  }
}
