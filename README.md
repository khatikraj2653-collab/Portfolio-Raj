# Portfolio-Raj

Personal portfolio site for Raj Khatik — MSc Applied AI candidate, University of Warwick (WMG) — showcasing his agentic AI / GenAI projects (SemiBot, GoldBot, SilverBot, Hallucination Detector, HITL Email Agent, Retail Research Assistant), published research, dissertation, and a chat assistant grounded in the site's own content.

**Live site:** https://portfolio-raj.pages.dev

## Stack

- Vanilla HTML / CSS / JS — no framework (`index.html`, `css/style.css`, `js/main.js`, `js/chat.js`)
- [Cloudflare Pages](https://pages.cloudflare.com/) — static hosting
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/) — serverless backend (`functions/`)
- [Cloudflare KV](https://developers.cloudflare.com/kv/) — shared analytics/log store (binding `ANALYTICS`, see `wrangler.toml`)

## Architecture

- `index.html` / `admin.html` — the public single-page site and a private, password-gated analytics dashboard (not linked publicly)
- `functions/_middleware.js` — logs every real page view (GET requests, skipping `/api/*`, `/admin`, and static assets) to KV as a `visit` record
- `functions/api/chat.js` — the "Ask AI" endpoint: builds a system prompt from `functions/_lib/knowledge.js` (a curated knowledge doc) plus `functions/_lib/livePage.js` (a live scrape of `index.html` as a fallback source of truth), calls OpenAI, and logs the exchange to KV
- `functions/api/contact.js` — logs contact form submissions to KV; actual email delivery happens client-side to Web3Forms
- `functions/api/log.js` — a public logging endpoint, authenticated with a shared `X-Log-Secret` header, that the five external Streamlit apps (SemiBot, GoldBot, SilverBot, Hallucination Detector, Retail Research Assistant) POST visit/search/chat events to server-to-server, so everything lands in one shared analytics store
- `functions/api/admin/logs.js` — reads logs back out of KV for `admin.html`, authenticated via an `X-Admin-Password` header
- `functions/_lib/log.js` — shared helpers (`hashIp`, `putLog`) used by every endpoint above to write consistent, IP-hashed records into KV with a 180-day TTL

```mermaid
flowchart TD
    Visitor["Visitor browser"]
    Site["Static site (Cloudflare Pages)\nindex.html / admin.html"]
    Middleware["functions/_middleware.js\n(logs page visits)"]
    Chat["functions/api/chat.js\n(Ask AI)"]
    Contact["functions/api/contact.js\n(contact form)"]
    LogAPI["functions/api/log.js\n(X-Log-Secret header)"]
    AdminAPI["functions/api/admin/logs.js\n(X-Admin-Password header)"]
    LibLog["functions/_lib/log.js\n(hashIp, putLog)"]
    KV[("Cloudflare KV\nANALYTICS namespace")]
    Admin["admin.html dashboard"]

    SemiBot["SemiBot (Streamlit)"]
    GoldBot["GoldBot (Streamlit)"]
    SilverBot["SilverBot (Streamlit)"]
    HalluDet["Hallucination Detector (Streamlit)"]
    RetailRA["Retail Research Assistant (Streamlit)"]

    Visitor --> Site
    Site --> Middleware
    Site --> Chat
    Site --> Contact
    Middleware --> LibLog
    Chat --> LibLog
    Contact --> LibLog
    LibLog --> KV

    SemiBot -->|POST /api/log| LogAPI
    GoldBot -->|POST /api/log| LogAPI
    SilverBot -->|POST /api/log| LogAPI
    HalluDet -->|POST /api/log| LogAPI
    RetailRA -->|POST /api/log| LogAPI
    LogAPI --> LibLog

    Admin -->|GET /api/admin/logs| AdminAPI
    AdminAPI --> KV
    AdminAPI --> Admin
```

## Deploy

`npm run deploy` runs `wrangler pages deploy .` to publish to Cloudflare Pages.

There is **no** GitHub-to-Cloudflare webhook configured — pushing to `main` does **not** deploy the live site. Deploys must be triggered explicitly by running `npm run deploy` (which also regenerates `last-updated.json` via the `predeploy` script beforehand).
