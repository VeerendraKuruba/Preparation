# Q10. Global shell / homepage (millions of users)

**Prompt variants:** **Homepage + header**; experiments; mostly read-heavy.

[← Question index](./README.md)

**Deep dive:** [Scalable homepage](../scalable-homepage/homepage-millions-users.md)

---

### One-line mental model

**Edge-deliver a small shell**; personalize in **async islands**; never let secondary calls block **first meaningful paint**.

---

### Clarify scope in the interview

Before drawing anything, ask these to narrow the design space:

- **Personalization depth:** anonymous vs logged-in vs highly personalized (recommendations)? Cohort-level or per-user HTML?
- **Traffic shape:** peak QPS? Black Friday / product launch spikes? Global or single-region?
- **Experiments:** A/B tests on layout? Feature flags at CDN edge or client-side?
- **Compliance:** GDPR cookie consent banner? CCPA? Must block personalization until consent?
- **SSR requirement:** SEO for product pages? Or marketing homepage where static HTML is fine?
- **i18n:** how many locales? Right-to-left? Locale in URL path or subdomain?

---

### Goals & requirements

**Functional**
- Homepage loads for anonymous and logged-in users globally.
- Personalized modules (recommendations, "continue watching", ads) visible after first paint.
- A/B experiment variants served without layout shift.
- Cookie/consent banner shown on first visit for regulated markets.

**Non-functional**
- LCP < 1.0 s for logged-out users on a mid-range device on 4G (p75, measured by RUM).
- CDN cache hit rate > 95% for the HTML shell.
- Origin can be taken offline briefly without homepage going down (CDN serves stale).
- Full page graceful degradation: personalization failure never breaks the shell.

---

### High-level frontend architecture

```
 Browser                CDN Edge               Origin
 ─────────────          ─────────────          ─────────────────────────
                        ┌───────────┐
 request ────────────►  │ Edge node │
                        │           │  cache HIT → return HTML immediately
                        │  Evaluate │
                        │  A/B flag │  cache MISS ──────────────────────►  SSR service
                        │  Locale   │                                        │
                        └───────────┘  ◄──────────────────────────────────  HTML response
        ◄──── shell.html (gzipped) ──  (cache, set Surrogate-Key)
              inline critical CSS
              async JS chunks

 Browser parses HTML:
 ┌─────────────────────────────────────────────────────────────┐
 │  <header>  — static, no JS needed                           │
 │  <hero>    — static HTML + CSS, hydrated for carousel ctrl  │
 │  <slot id="for-you">  loading skeleton                      │  ← Island A
 │  <slot id="trending"> loading skeleton                      │  ← Island B
 │  <slot id="ads">      loading skeleton                      │  ← Island C (isolated)
 └─────────────────────────────────────────────────────────────┘
         │                     │                    │
         ▼                     ▼                    ▼
   /api/personalized      /api/trending        /api/ads
   (logged-in fetch)      (cached, public)     (isolated iframe or
    with timeout 800ms     short TTL)            async script)
         │
         ▼
   Merge into DOM
   no CLS (skeleton
   holds layout)
```

**Key principle:** The CDN returns one of ~N small HTML variants (locale + device class + experiment bucket). It never caches per-user HTML. User-specific content is fetched by the client after first paint.

---

### What the client does (core mechanics)

#### 1. Edge caching strategy

The shell HTML is edge-cached with a composite cache key. Per-user HTML is never cached at the CDN because that would require one cache entry per user, defeating the purpose.

```
# Surrogate-Key / Cache-Tag on the HTML response (Fastly / CloudFront)
Cache-Control: public, max-age=60, stale-while-revalidate=3600
Surrogate-Key: homepage locale:en-US device:desktop exp:hero-v2

# On content publish or experiment change, purge by tag:
# PURGE tag=homepage
# PURGE tag=exp:hero-v2
```

Cache key dimensions (kept minimal to maximize hit rate):
- **Locale** — `en-US`, `de-DE`, `ja-JP` (from URL path `/de/` or `Accept-Language` normalized at edge)
- **Device class** — `desktop` vs `mobile` (coarse UA sniff at edge — not full UA string which is high cardinality)
- **Experiment bucket** — edge assigns a stable bucket (0–9) via cookie or hashed visitor ID; HTML has the variant baked in

This gives at most `locales × 2 × experiment_variants` HTML variants. For 30 locales, 2 devices, 5 experiment buckets: 300 cached objects — very manageable.

```js
// Edge function (Cloudflare Worker / Lambda@Edge pseudocode)
export async function handleRequest(request) {
  const locale  = detectLocale(request);           // from URL path
  const device  = coarseDevice(request.headers.get('user-agent')); // desktop|mobile
  const bucket  = getOrAssignBucket(request);      // stable cookie 0-9
  const variant = flagConfig[bucket]?.hero ?? 'control';

  const cacheKey = `homepage:${locale}:${device}:${variant}`;
  const cached   = await CACHE.get(cacheKey);
  if (cached) return new Response(cached, { headers: cacheHeaders(60, 3600) });

  const html = await fetchFromOriginSSR({ locale, device, variant });
  await CACHE.put(cacheKey, html, { expirationTtl: 3600 });
  return new Response(html, { headers: cacheHeaders(60, 3600) });
}
```

#### 2. Islands architecture — only interactive parts hydrate

The HTML shell is sent fully rendered (good for LCP, SEO). JavaScript only loads for components that need interactivity. Static sections ship zero JS.

```html
<!-- Inline critical CSS (no render blocking external stylesheet) -->
<style>/* critical above-fold rules inlined by build tool */</style>

<!-- Hero: static HTML, tiny hydration script only for carousel controls -->
<section id="hero" data-island="hero-carousel">
  <img src="/hero.webp" fetchpriority="high" alt="..."> <!-- LCP candidate -->
</section>
<script type="module">
  // Only loads after browser is idle — doesn't block LCP
  if (document.querySelector('[data-island="hero-carousel"]')) {
    import('/js/islands/hero-carousel.js').then(m => m.hydrate());
  }
</script>

<!-- Personalized slot: skeleton holds space, JS fills it async -->
<section id="for-you" style="min-height:320px" aria-label="Recommended for you">
  <div class="skeleton-grid" aria-hidden="true"><!-- 6 placeholder cards --></div>
</section>

<!-- Ads: fully isolated — failure here cannot throw on the page -->
<aside id="ads-slot">
  <iframe src="/ads/frame" loading="lazy" sandbox="allow-scripts allow-same-origin"
          title="Sponsored content"></iframe>
</aside>
```

```js
// islands/personalization.js — loaded async, off critical path
async function loadPersonalization() {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 800); // 800ms hard budget

  try {
    const res = await fetch('/api/personalized?surface=homepage', {
      signal: controller.signal,
      credentials: 'include',
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { modules } = await res.json();

    // Fill skeleton slots — skeletons already hold correct dimensions, no CLS
    renderForYou(modules.forYou);
    renderContinueWatching(modules.continueWatching);

  } catch (err) {
    clearTimeout(timeout);
    // Fallback: replace skeleton with editorial default content (not empty)
    renderEditorialFallback('#for-you');
    logMetric('personalization_failure', { reason: err.name });
  }
}

// Don't block first paint — run after browser is idle
if ('requestIdleCallback' in window) {
  requestIdleCallback(loadPersonalization, { timeout: 2000 });
} else {
  setTimeout(loadPersonalization, 100);
}
```

#### 3. A/B testing at the edge

Experiment variant is assigned at edge (before HTML is returned), so the variant is **baked into the HTML**. This avoids client-side flicker (the classic CLS problem with client-assigned A/B buckets that swap content after paint).

```
User first visit:
  1. Edge reads experiment cookie — not found
  2. Edge hashes (visitorId or random) → bucket = 3
  3. Edge sets cookie: Set-Cookie: exp_bucket=3; Max-Age=2592000; SameSite=Lax
  4. Edge selects HTML variant for bucket=3 (e.g., hero-v2)
  5. Caches under key homepage:en-US:desktop:hero-v2

User subsequent visits:
  1. Edge reads exp_bucket=3 from cookie
  2. Returns cached hero-v2 variant — cache HIT, no origin call
```

For layout experiments that change the skeleton shape, the skeleton in HTML must match the variant — otherwise the personalization fill causes CLS.

#### 4. i18n routing

```
/          → redirect to /en-US/ (geo-detected at edge, or browser Accept-Language)
/en-US/    → English (US)
/de/       → German
/ja/       → Japanese (right-to-left shimmed separately)

Edge sets:  html[lang="de"] dir="ltr"
            Vary: Accept-Language only used for redirect, not for cache key of leaf pages
```

Translations are embedded in the HTML (for above-fold strings) and loaded lazily as a JSON bundle for below-fold and interactive strings.

---

### Trade-offs

| Choice | Upside | Trade-off / When to switch |
|--------|--------|---------------------------|
| **CDN cohort cache** (current) | 95%+ hit rate; origin barely touched | Personalization is coarse (editorial default for anonymous); fine-grained recs require client fetch |
| **Per-user SSR HTML** | Fully personalized on first byte | Cannot cache at CDN — origin must handle full QPS; 10× cost; only viable with extreme personalization value |
| **Full CSR (SPA)** | Simple deployment | LCP limited by JS parse + API round-trip; bad SEO; worse on low-end devices |
| **Edge personalization** (ML at edge) | Recs on first byte, cached per cohort | Edge compute is expensive; model updates need edge redeployment; limited model size |
| **Client-side A/B** | Easy to change without deploy | CLS flicker if variant affects layout; requires anti-flicker snippet (adds blocking JS) |
| **Edge A/B** (current) | Zero flicker, no blocking JS | Experiment changes require cache purge; stickiness depends on cookie |
| **Islands hydration** (current) | Minimal JS for shell; fast TTI | More complex build setup (need explicit island boundaries); harder with full-page React apps |
| **Full page React hydration** | Simpler mental model | Hydrates everything including static nav — wasted CPU on mobile |

**Edge personalization vs origin personalization** is the key tension: edge is fast but limited (no user history, no ML), origin is powerful but expensive and slow. The sweet spot is: edge delivers a fast shell, client fetches user-specific JSON after first paint using a well-cached API endpoint (Redis + DB read, sub-100ms).

---

### Failure modes & degradation

```
Normal:           CDN hit → HTML → client fetches personalized JSON → full page

CDN miss:         CDN miss → SSR origin → HTML (slower, but works)

Origin down:      CDN serves stale (stale-while-revalidate or stale-on-error)
                  Browser gets slightly old HTML — acceptable for homepage

Personalization   fetch('/api/personalized') times out after 800ms
API down:         → show editorial fallback content (curated, not personalized)
                  → log metric for SLO tracking

Widget/module     Each island is isolated in its own try/catch
throws JS error:  → ErrorBoundary catches, renders "content unavailable" placeholder
                  → Other islands continue rendering normally

Ads script        Ads loaded in sandboxed iframe — JS error in ad cannot
throws:           propagate to parent page

Feature flag      If flag service unavailable, use last known good value
service down:     cached locally (localStorage) for up to 24 hours
                  → ship safe default behavior, not broken behavior
```

**Kill switches:** Each module on the homepage has a feature flag. During an incident, flipping the flag to `off` removes that module from the page within 60 seconds (CDN TTL + edge flag refresh). No deploy needed.

---

### Accessibility checklist

- **Hero auto-rotate:** must have visible pause/play control; respects `prefers-reduced-motion: reduce` (stops auto-advance entirely or reduces to manual-only).
- **Skeleton placeholders:** use `aria-hidden="true"` so screen readers skip them; announce when real content arrives via `aria-live="polite"` on the container.
- **Focus management:** personalisation fill must not move focus; if a module appears after idle, it should not steal focus from wherever the user is.
- **Color contrast:** skeleton shimmer animation must not create epilepsy risk — use `@media (prefers-reduced-motion)` to show static placeholder instead.
- **i18n:** `lang` attribute set on `<html>` to correct locale; RTL layouts use `dir="rtl"` and logical CSS properties.

---

### Minute summary (closing)

"The design is centered on one constraint: the HTML shell must be deliverable from the CDN edge without touching the origin for the vast majority of requests. We achieve this by caching a small set of HTML variants keyed on locale, device class, and experiment bucket — never per user. JavaScript is minimal on the critical path; the shell is mostly static HTML with inline critical CSS. Interactive sections are islands that hydrate lazily. Personalization is a separate async fetch that runs after first paint, inside a hard timeout with an editorial fallback if it fails. A/B tests are assigned at the edge and baked into the HTML to avoid CLS flicker. We measure success with RUM: LCP under one second at p75 for logged-out users, CDN hit rate above 95%, and personalization latency tracked as its own SLO separate from shell delivery."

---

## For a ~60 minute round

### Suggested time boxes

| Block | Minutes | Focus |
|-------|--------:|--------|
| Clarify + requirements | 8–12 | Anonymous vs logged-in, geo, experiments, compliance (cookies), peak traffic |
| High-level architecture | 12–18 | Edge HTML, islands, origin services, cache keys |
| Deep dive 1 | 12–18 | **CDN caching** (`stale-while-revalidate`, cohorts, Surrogate-Key purge) |
| Deep dive 2 | 12–18 | **Personalization isolation** or **feature flags at edge** |
| Trade-offs, failure, metrics | 8–12 | Kill switches, RUM SLOs |

### What to draw (whiteboard)

- **CDN** box serving `shell.html` with TTL annotation; Surrogate-Key purge arrow on deploy.
- **HTML structure:** static header, hero island, "For You" skeleton slot, Ads iframe.
- **Client flow:** parse HTML → idle callback → fetch personalized JSON → fill skeleton.
- **A/B:** edge assigns bucket via cookie → baked into HTML → no client flicker.
- **Failure branch:** personalization fetch timeout → editorial default, no empty state.

### Deep dives — pick 2

**A. Caching** — Cache key dimensions; `stale-while-revalidate` semantics; Surrogate-Key/Cache-Tag purge on deploy vs on content change; TTL tuning; CDN hit rate target and how to measure it.

**B. Critical path budget** — Minimal JS for shell (< 50 KB compressed); inline critical CSS (< 14 KB); `fetchpriority="high"` on LCP image; preconnect to personalization API domain; third-party scripts deferred until after consent.

**C. Resilience** — Timeouts per upstream call; `ErrorBoundary` per island; kill switch flags; stale-on-error at CDN (serve last good HTML if origin returns 5xx); bulkhead: one team's module 500 does not affect the route.

**D. Observability** — RUM Vitals (LCP/INP/CLS) segmented by locale, device, experiment variant; synthetic homepage check every 30 s from each edge region; CDN hit ratio dashboard; incident playbook for origin overload (shed load → CDN only mode).

### Common follow-ups

- **"Per-user HTML?"** — Too expensive to cache; 10× origin load; prefer edge cohorts (coarse personalization baked in) + client fetch for fine-grained recs.
- **"A/B layout change?"** — Skeleton dimensions must match the variant or CLS occurs; for skeleton-shape changes, assign variant before first paint (edge cookie); for safe changes (text, color), client-side flag is fine.
- **"Worldwide with latency SLO?"** — Multi-region SSR origins behind anycast DNS; CDN with regional PoPs within 20ms of 99% of users; static fallback page uploaded to every edge region for catastrophic origin failure.
- **"GDPR consent blocks personalization?"** — Serve anonymous shell unconditionally; consent banner is part of the shell HTML; on consent, fire personalization fetch; no personal data in CDN cache keys.

### What you'd measure

- **LCP/INP/CLS** on homepage by device class, locale, and experiment variant — RUM from real users.
- **Personalization fetch:** p50/p95 latency, timeout rate, fallback rate — tracked as independent SLO.
- **CDN hit rate:** target > 95%; alert if drops below 85% (indicates cache key problem or purge storm).
- **Origin RPS during peak:** should be < 5% of total homepage requests (CDN absorbs the rest).
- **Business:** engagement with personalized modules vs editorial fallback; click-through-rate by experiment variant.
