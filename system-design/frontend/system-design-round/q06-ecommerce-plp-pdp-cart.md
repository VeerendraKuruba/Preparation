# Q6. E-commerce: PLP → PDP → cart

**Prompt variants:** **Amazon**-style listing, product page, cart.

 [← Question index](./README.md)

---

### One-line mental model

**URL is product state** for SEO and shareability; the client **streams** above-the-fold first, **virtualizes** long grids, and treats **cart as reconciled** optimistic actions with idempotent server semantics.

### Clarify scope in the interview

Guest checkout? International pricing? **SEO** must-win pages?

### Goals & requirements

- **Functional:** filters, sort, PDP gallery, reviews, add to cart.
- **Non-functional:** SEO, fast **LCP** on PDP, resilient cart.

### High-level frontend architecture

**SSR/ISR/edge** for PLP/PDP where SEO matters → hydrate → **client caches** for repeat navigations → cart service with **server truth**.

### What the client does (core mechanics)

1. **Query params** encode filters; canonical URLs.
2. PLP: virtualized grid; filter drawer state ↔ URL.
3. PDP: one **hero** image prioritized; reviews lazy tab.
4. Cart: optimistic line item; **merge** on 409/inventory errors with clear UX.

### Trade-offs

| Choice upside | Trade-off |
|---------------|-----------|
| Heavy SSR | TTFB vs edge cache complexity |
| Client-only filters | Bad shareable links, weak SEO |

### Failure modes & degradation

PLP without facets if facet service down (degraded default); PDP **buy box** errors surfaced inline.

### Accessibility checklist

Sort/filter announced; gallery keyboard; focus management on “added to cart.”

### Minute summary (closing)

“We make **routes and query params the contract** for SEO, **virtualize** listings, **prioritize PDP media**, and design **cart** around idempotent server reconciliation.”

---

## For a ~60 minute round

### Suggested time boxes

| Block | Minutes | Focus |
|-------|--------:|--------|
| Clarify + requirements | 8–12 | Guest vs account, locales, SEO must-haves, inventory rules |
| High-level architecture | 12–18 | PLP/PDP rendering strategy, URL design, cart service boundary |
| Deep dive 1 | 12–18 | **SEO + URL/filter state** or **PLP virtualization** |
| Deep dive 2 | 12–18 | **Cart idempotency & conflict UX** or **PDP media / LCP** |
| Trade-offs, failure, metrics | 8–12 | Degraded faceted nav, observability |

### What to draw (whiteboard)

- **PLP:** `/search?query=&facet=color:red&sort=` ↔ client state.
- **PDP:** hero image → gallery → buy box → lazy tabs (reviews).
- **Cart:** optimistic `POST` → server line ids → **reconcile** on 409.
- **CDN/edge** box if you use ISR/edge HTML.

### Deep dives — pick 2

**A. SEO & routing** — SSR/ISR vs CSR; **canonical** URLs for filtered views; duplicate content pitfalls; structured data (mention briefly); bot vs human strategy.

**B. PLP performance** — Virtualized grid; facet API failures → degraded facets; skeleton vs empty; image lazy and aspect ratio for CLS.

**C. PDP media** — Single LCP candidate; `srcset`/`sizes`; carousel a11y; zoom/lightbox trade-offs.

**D. Cart correctness** — **Idempotent** add with key; merge server cart on load; concurrency (two tabs); inventory **`409`** → inline fix; guest → login merge.

### Common follow-ups

- **“Wishlist?”** — Separate surface; same isolation patterns; auth required.
- **“AB tests on PLP?”** — Don’t destroy SEO; cohort at edge; stable assignments; flash of wrong variant (FOOC) mitigation.
- **“International pricing?”** — Locale in URL or cookie—consistency with CDN cache keys; client displays formatted strings from server.

### What you’d measure

- **Perf:** LCP on PDP, PLP interaction (INP), CLS on image grids.
- **Biz:** add-to-cart rate, checkout funnel drop, facet usage.
- **Reliability:** cart API errors, reconciliation conflicts per session.

