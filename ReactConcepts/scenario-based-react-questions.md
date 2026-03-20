# Scenario-Based React Questions (with detailed answers)

This document covers common production scenarios: performance, auth, i18n, uploads, SEO, hooks pitfalls, bundling, routing, motion, and API traffic control.

---

## 1. Infinite scrolling (e.g. LinkedIn-style feed)

### What “efficient” means here

You want **smooth scrolling**, **bounded memory**, and **predictable network** usage—not thousands of DOM nodes and not duplicate or skipped pages.

### Implementation approach

1. **Cursor-based pagination from the API**  
   Prefer `?cursor=` or `after_id=` over offset pagination for large feeds (offsets get slow and inconsistent when rows shift). Each response returns the next cursor.

2. **Detect “near bottom” with `IntersectionObserver`**  
   Attach an observer to a **sentinel element** at the end of the list. When it enters the viewport, fetch the next page. This is cheaper and more reliable than scroll-position math during frequent relayouts.

3. **Virtualize long lists**  
   For feeds that can grow to hundreds or thousands of items, use **windowing** (`react-window`, `react-virtuoso`, TanStack Virtual). Only render rows in (or near) the viewport. Infinite scroll + virtualization is the standard combo for heavy UIs.

4. **Dedupe and stable keys**  
   When merging pages, dedupe by id. Use stable keys (`item.id`) so React reconciles correctly when items reorder.

5. **Loading and error states**  
   Show a small skeleton or spinner at the bottom; avoid blocking the whole page. Retry failed “next page” fetches without losing already-loaded items.

6. **Data fetching layer**  
   Libraries like **TanStack Query** (`useInfiniteQuery`) handle **caching, deduping, race conditions**, and “fetch next page” state so you don’t reinvent it.

### Why this works

- **Observer-based** loading avoids tight scroll handlers.  
- **Virtualization** keeps DOM size bounded.  
- **Cursor pagination** scales with data size and avoids offset pitfalls.

---

## 2. Auto-logout after 30 minutes of inactivity

### Requirements to clarify

- **Inactivity** = no user input (mouse, keyboard, touch), or optionally no **API activity**.  
- **30 minutes** should reset on meaningful activity.  
- Logout should clear **tokens**, **client state**, and optionally call a **revoke** endpoint.

### Implementation approach

1. **Central `IdleSessionProvider` (or auth module)**  
   One place owns the timer so you don’t duplicate listeners in every route.

2. **Reset a single deadline**  
   On mount: set `deadline = now + 30m`.  
   On activity: clear timeout/interval and reschedule. Debounce high-frequency events (e.g. `mousemove`) so you don’t schedule thousands of timeouts per second—e.g. reset at most once every 1–5 seconds while firing on `keydown`, `click`, `touchstart`, and optionally `visibilitychange` (resume when tab visible).

3. **Use `setTimeout` for the session ceiling**  
   When the timer fires: call `logout()`, redirect to login, clear storage.

4. **Tab coordination (optional)**  
   Use `BroadcastChannel` or `localStorage` `storage` events so one tab logging out signs others out (if that’s a product requirement).

5. **Align with token lifetime**  
   If access tokens expire before 30 minutes, handle **refresh** separately; idle logout is a UX/security policy layered on top of token validity.

6. **Background tabs**  
   Browsers throttle timers; that’s acceptable for “idle” but you may also logout on `document.visibilityState === 'hidden'` for a long time if policy requires—product decision.

### Why this works

A **single debounced reset** keeps behavior predictable and cheap. Centralizing logout avoids inconsistent state across the app.

---

## 3. Internationalization (i18n)

### Goals

- Translate UI strings, **pluralization**, **dates**, **numbers**, and **RTL** where needed.  
- Load only the locales you need (**lazy-loaded** language bundles).

### Common stack: `i18next` + `react-i18next`

1. **Resource files per locale**  
   JSON or PO-like catalogs: `en/common.json`, `es/common.json`, etc. Namespace by feature (`auth`, `checkout`) to split bundles.

2. **`useTranslation` hook**  
   `t('key', { name })` for interpolation; use ICU-style plural rules supported by your backend/plugins.

3. **Lazy loading**  
   `i18next-http-backend` or dynamic `import()` so Spanish users don’t download Japanese strings.

4. **Locale routing (optional)**  
   Prefix routes: `/en/dashboard`, `/fr/dashboard` using your router; store preference in cookie/profile.

5. **SSR/SSG (if applicable)**  
   For Next.js, set locale on the request and render translated HTML so first paint matches the user’s language (and helps SEO for multilingual sites).

6. **Accessibility**  
   Set `<html lang="...">` and document direction `dir="rtl"` when switching languages.

### Why this works

Separating **copy from components** lets translators work in parallel and keeps bundles lean when locales load on demand.

---

## 4. Uploading large files (100MB+) without timeouts

### Problem

A single long `POST` through a reverse proxy or gateway often hits **request timeouts** or **memory limits**. The fix is **chunked or resumable** uploads negotiated with the server.

### Implementation patterns

1. **Direct-to-object storage (preferred at scale)**  
   Backend returns **presigned URLs** (S3/GCS). Client uploads **multipart** parts in parallel with part size (e.g. 5–25MB) and completes multipart on the server. The app server doesn’t stream the whole file through its process.

2. **Chunked upload to your API**  
   Split the file in the browser (`File.slice`). Upload chunks with metadata: `uploadId`, `partNumber`, checksum optional. Server assembles or stores parts and marks complete when all received. Support **resume** by tracking which parts uploaded.

3. **Progress UI**  
   Use `XMLHttpRequest` upload progress or `fetch` + streams where supported; show per-file progress and cancel via `AbortController`.

4. **Concurrency control**  
   Limit parallel chunk uploads (e.g. 3–6) to avoid saturating bandwidth or tripping rate limits.

5. **Checksums / integrity**  
   Optional ETag per part or final hash to detect corruption.

### Why this works

Smaller requests stay under **proxy timeouts**, retries target **only failed parts**, and direct-to-storage avoids overloading your API tier.

---

## 5. SEO: Google not indexing a React SPA well

### Why SPAs struggle

Crawlers may see an empty shell if content is **client-only**; social/OG tags may be missing; URLs might not map to **distinct HTML documents** with canonical metadata.

### Solutions (pick by need)

1. **SSR or SSG (strongest default)**  
   **Next.js**, **Remix**, or **React SSR** serves **HTML with content** for each URL. Search and preview cards improve dramatically.

2. **Prerendering**  
   For mostly-static marketing pages, prerender (Next.js SSG, or a prerender service) to HTML at build time.

3. **Meta and structured data**  
   Unique `<title>`, `description`, Open Graph/Twitter tags per route; JSON-LD where relevant.

4. **Clean URLs and sitemaps**  
   Avoid hash-only routing for public content (`example.com/#/page`). Provide `sitemap.xml` and `robots.txt`.

5. **`react-helmet-async`** (SPA-only mitigation)  
   Helps with head tags in the client but **does not replace** SSR for competitive SEO—Google can run JS, but you still want fast, full first paint and consistent indexing.

6. **Measure in Search Console**  
   Use **URL Inspection** and **rendered HTML** to verify what Googlebot sees.

### Why this works

SEO hinges on **unique, crawlable HTML per URL** and **clear signals** (metadata, internal links, sitemaps)—SSR/SSG aligns the technical stack with that.

---

## 6. Stale closures inside `useEffect`

### What goes wrong

Effects capture values from the render when the effect was scheduled. If dependencies are wrong—or you read state that updates asynchronously—you can log/act on **old** `state`/`props`.

### Fixes

1. **Correct dependency array**  
   List every value from the component scope that the effect reads. ESLint `react-hooks/exhaustive-deps` catches many mistakes.

2. **Functional state updates**  
   When new state depends on previous state:  
   `setCount(c => c + 1)` avoids needing the latest `count` in a closure.

3. **`useRef` for latest value**  
   Keep `latest.current = value` in render; the effect reads `latest.current` without re-running on every change—or run the effect when needed but always read through the ref for fire-and-forget handlers **when intentional**.

4. **Extract stable logic**  
   Move subscription handlers to functions that use functional updates or refs, so you don’t close over stale props.

5. **Event listeners**  
   If registering `window` listeners in an effect, either include dependencies or use a pattern with refs to always call the latest handler without re-binding constantly (balance: ref pattern vs re-binding on dep change).

### Why this works

React state updates are **asynchronous**; closures are **snapshots**. Functional updates and refs align “read latest” semantics with how React schedules renders.

---

## 7. Reducing bundle size and improving load time

### Diagnose first

- Run **Webpack Bundle Analyzer** or **rollup-plugin-visualizer** (Vite) to see what’s heavy.

### Primary techniques

1. **Route-based code splitting**  
   `React.lazy` + `Suspense` or framework-level splitting (Next.js automatic). Users download only the route they open.

2. **Dynamic imports for heavy optional features**  
   Charts, editors, maps—load when user navigates to them.

3. **Tree-shaking friendly imports**  
   Import specific modules (`import { debounce } from 'lodash-es'`) or use **lodash-es**/modern alternatives; avoid default-importing whole icon libraries—use per-icon imports or SVG sprites.

4. **Dependencies audit**  
   Replace large libs with smaller ones; remove unused packages.

5. **Production build**  
   Minification, compression (**Brotli/gzip** on CDN), **HTTP/2 or HTTP/3**.

6. **Images and fonts**  
   Optimize assets; subset fonts; lazy-load offscreen media.

7. **Server/edge caching**  
   Long `cache-control` for hashed static assets.

### Why this works

**Less JavaScript on the network path** plus **better caching** usually beats micro-optimizations inside components for first load.

---

## 8. Admin-only routes with React Router

### Model

- **Authentication**: user is logged in.  
- **Authorization**: user has role `admin` (or permissions).

### Implementation (React Router v6+)

1. **Protected route wrapper**  
   A component reads auth context; if not logged in, `<Navigate to="/login" replace state={{ from: location }} />`.

2. **Role guard**  
   If logged in but not admin, `<Navigate to="/403" />` or a dedicated “not allowed” page.

3. **Central route config**  
   Attach metadata: `{ path: '/admin', roles: ['admin'] }` and use one guard to check.

4. **Data routers (v6.4+)**  
   `createBrowserRouter` with **route `loader`s** can **redirect before render** and avoid flicker; still keep role checks on the **server** for APIs.

5. **Never trust the client alone**  
   UI gating is UX; **APIs must enforce** the same rules.

### Why this works

Layered checks (route guard + server) give **correct security** while the router gives **predictable navigation**.

---

## 9. Smooth page transitions and animations

### Options (often combined)

1. **Framer Motion**  
   `AnimatePresence` with `mode="wait"` for exit/enter between routes; wrap route `Outlet` or keyed `location.pathname` so transitions run on navigation.

2. **View Transitions API** (modern browsers)  
   Opt-in with `document.startViewTransition(() => navigate(...))` for simple cross-fades; progressively enhance.

3. **CSS transitions on layout**  
   Shared layout shells (persistent nav/sidebars) with CSS on internal content avoids animating the entire page root unnecessarily.

4. **Skeletons and suspense boundaries**  
   “Smooth” also means **perceived performance**—show structured placeholders during lazy chunk load.

5. **Accessibility**  
   Respect `prefers-reduced-motion`—disable or simplify motion.

### Why this works

You need **exit animation support** (AnimatePresence or View Transitions) plus **stable layout** so motion feels intentional, not janky.

---

## 10. Throttling / controlling request frequency (rate limits)

### Clarify the goal

- **Throttle**: at most once per interval (smooth sampling).  
- **Debounce**: wait until activity pauses (search boxes).  
- **Queue / limit concurrency**: cap in-flight requests globally.

### Client-side patterns

1. **Debounce user-driven searches**  
   200–400ms typical; cancel stale requests with `AbortController`.

2. **Throttle scroll/resize handlers**  
   Or read `requestAnimationFrame` for visual work.

3. **Central API client**  
   Wrap `fetch`/axios with:

   - **Exponential backoff + jitter** on `429` / `Retry-After`  
   - **Token bucket** or max N concurrent calls for burst control

4. **TanStack Query**  
   `staleTime`, `retry`, `refetchOnWindowFocus` tuning reduces duplicate calls; batch where APIs support it.

5. **Server collaboration**  
   If limits are strict, add **bulk endpoints** or **GraphQL** to replace chatty many-request patterns.

### Why this works

Rate limits are often **token-based** or **per IP**; combining **fewer calls**, **smarter caching**, and **polite retries** fixes most client-induced limit pain without lying to the API.

---

## Quick reference table

| Topic            | Key tools / ideas                                      |
|-----------------|---------------------------------------------------------|
| Infinite scroll | IntersectionObserver + cursor API + virtualization    |
| Idle logout     | Debounced activity listeners + central timeout          |
| i18n            | react-i18next, lazy locales, `lang`/`dir`               |
| Large upload    | Multipart / presigned URLs, resume, chunk concurrency    |
| SEO             | SSR/SSG, meta/OG, sitemap, Search Console               |
| Stale closure   | Deps, functional updates, refs                          |
| Bundle size     | Lazy routes, analyze bundle, tree-shake imports         |
| Admin routes    | Guard components + server enforcement                   |
| Transitions      | Framer Motion / View Transitions + reduced motion       |
| Rate limits      | Debounce, backoff, query caching, batching                |
