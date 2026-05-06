# 03 — Frontend Architecture Deep Dive

The system-design topics that are **specific to frontends** at scale. This is
where senior FE interviews differentiate from backend interviews.

---

## 1. Micro-frontends — the patterns

There are four common ways to do MFE. Know all of them; know which this app
uses and why.

| Pattern | How | Pros | Cons |
|---|---|---|---|
| **iframes** | Each team's app loaded in an iframe | Strongest isolation | Hard to share styles/auth, sized awkwardly |
| **Build-time composition** | Single repo, multiple "apps" via webpack | Simple, type-safe | Coupled deploys |
| **Module Federation** (Webpack 5) | Runtime import of remote bundles | Shared deps, no iframe | Webpack-only, cache-busting tricky |
| **Manifest-driven runtime** | Each widget registered + loaded by ID | Versioning, deploy independence, sandbox API | Needs platform investment (e.g. AppFabric) |

**This app: manifest-driven runtime.** Every widget has a
[widget.yaml](../../../multi-entity-ui/src/js/widgets/multi-entity-allocation/widget.yaml) and is
loaded via `sandbox.widgets.getWidget(id)`.

**The big design questions for any MFE:**
1. **Routing:** who owns the URL?
2. **Shared deps:** how to avoid 5 copies of React?
3. **Communication:** how do siblings talk?
4. **Styling:** how to avoid CSS leaks?
5. **Auth:** who validates the user?

**This app's answers:**
1. Host owns routing; widgets receive `routeInfo` as a prop.
2. The host shell dedupes — but only if versions match. This repo pins
   `react@17.0.2` exactly to align with the shell.
3. Communication is via **props (parent→child)**, **URL**, or
   **backend round-trips** — not via a JS-level bus.
4. `styled-components` (CSS-in-JS) — no global CSS leak.
5. Host owns auth; widgets read `sandbox.extensions.host-app.context`.

---

## 2. Bundling & code-splitting

A widget is a separate bundle. Within a widget, you still want code-split:

- **Route-level:** the Allocation modal vs the Allocation page can split.
- **Component-level:** heavy components (charts, rich-text editors) lazy-load.
- **Feature-flag-gated:** code behind a flag should not ship to users
  without the flag.

The `prefetchWidgets` helper
([sandboxUtil.ts:58](../../../multi-entity-ui/src/js/utils/common/sandboxUtil.ts#L58)) is the
**MFE equivalent** of `<link rel="prefetch">` — it warms a sibling's bundle
before the user navigates.

**Interview-ready insight:** "MFEs solve deploy independence but cost bundle
duplication. The mitigation is shared-deps (Module Federation) or strict
version-pinning + the host deduping (AppFabric). I check our `package.json`
for any version mismatches with the shell — those silently double the
bundle."

---

## 3. Rendering strategies

| Strategy | When to use |
|---|---|
| **CSR** (Client-side render) | Highly interactive, post-login (this app) |
| **SSR** (Server-side render) | SEO, faster TTFB |
| **SSG** (Static site gen) | Marketing pages, docs |
| **ISR** (Incremental SSG) | Mostly-static with periodic updates |
| **Streaming SSR** | Best of SSR + perceived speed |
| **Islands / partial hydration** | Mostly-static with interactive bits |

This app is CSR — it's behind login, no SEO need, and the company's host already
does the initial shell render.

---

## 4. State management — pick the right scope

```
┌──────────────────────────────────────────────────────────┐
│ Server state                                             │
│   - Lives on the server, cached client-side              │
│   - React Query / SWR / Apollo cache                     │
│   - Concerns: refetch, invalidation, optimistic updates  │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ Global UI state                                          │
│   - Cross-component, in one widget (modal open?)         │
│   - zustand / Redux / Context                            │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ Local component state                                    │
│   - useState / useReducer                                │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ URL state                                                │
│   - Things that should survive refresh / share          │
│   - Filter params, current tab, modal-open flags        │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ Form state                                               │
│   - React Hook Form / Formik                             │
└──────────────────────────────────────────────────────────┘
```

**Rule of thumb:**
- **Default to local.** Lift only when needed.
- **Server state belongs in a server-state library** (React Query/Apollo).
  Don't put server data in Redux — you'll reinvent caching badly.
- **URL state is free persistence.** Use it for shareable views.

**This app's gap:** no server-state library is wired up, so server data lives
in the per-widget Redux store. That's why every component refetches — the
"cache" is the reducer slice, manually maintained.

---

## 5. Performance budgets

A **budget** is a pre-committed limit. Examples:
- JS < 200KB gzipped per route
- LCP < 2.5s
- INP < 200ms
- TTI < 3s on a 4G connection

Budgets are enforced in CI. The repo has Lighthouse
(`yarn test:lighthouse`) — that's the budget gate.

**The hard part:** a budget is a **page** budget, but in MFE each widget
contributes. You need:
- **Per-widget budget** + page-level aggregate.
- **A regressions monitor** — a widget that grew 50KB shouldn't slip through.

---

## 6. Core Web Vitals — what they mean

| Metric | What | Threshold (good) |
|---|---|---|
| **LCP** | Largest Contentful Paint — when main content visible | < 2.5s |
| **INP** | Interaction to Next Paint — input responsiveness | < 200ms |
| **CLS** | Cumulative Layout Shift — visual stability | < 0.1 |
| **TTFB** | Time to First Byte | < 0.8s |
| **TBT** | Total Blocking Time (lab-only proxy for INP) | < 200ms |

For an MFE app, **CLS is a real risk:** widgets load asynchronously and
push content around. Mitigation: reserve space (skeleton loaders with fixed
dimensions) before the widget mounts.

---

## 7. Frontend caching layers, in detail

```
┌─────────────────────────────────────────────────────────┐
│ Memory cache (Apollo / React Query / your own)          │
│   - Process lifetime; lost on refresh                   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Service Worker / IndexedDB                              │
│   - Survives refresh; supports offline                  │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Browser HTTP cache                                      │
│   - Governed by Cache-Control / ETag                    │
│   - GraphQL POSTs uncacheable by default                │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ CDN edge cache                                          │
│   - For static assets (JS bundles)                      │
└─────────────────────────────────────────────────────────┘
```

**stale-while-revalidate (SWR pattern):** return cached value instantly,
revalidate in the background, update UI when fresh data arrives. This is
the gold standard for read-heavy SPAs.

**Cache invalidation strategies:**
- TTL — simplest
- Tag-based — invalidate everything tagged "company:X" on a write
- Subscription — server pushes invalidations

**For multi-tenant: tenant-scoped keys are non-negotiable.**

---

## 8. Error handling at scale

Three layers, in order of precedence:

1. **Component-level try/catch** for local recovery (retry button).
2. **React Error Boundary** to prevent one component crashing the whole
   widget. This repo uses
   [allocation/components/error-boundary](../../../multi-entity-ui/src/js/allocation/components/error-boundary/).
3. **Global error handler** in the host shell (caught uncaught exceptions,
   reports to logging).

**Don't swallow errors.** A `.catch(() => null)` on a fetch is a future bug
report you'll never know happened. At minimum, log it via `sandbox.logger`.

---

## 9. Accessibility (a11y) as system design

This is often skipped in interviews but counts for senior roles:
- Keyboard navigation through MFE widget boundaries — focus management on
  widget mount/unmount.
- ARIA live regions for async updates.
- Reduced motion preference for animations.
- Screen-reader-friendly error messages.

**MFE-specific issue:** a focus-trapped modal in widget A doesn't know about
focus changes inside widget B. The host needs to coordinate.

---

## 10. Internationalization

The app uses `react-intl` and `@internal-platform/ui-intl`. Things to know:

- Strings live in `src/nls/` and are loaded per locale.
- Plurals, dates, currencies — use `<FormattedNumber>`, not string
  concatenation.
- RTL support if you have Arabic/Hebrew users.
- Region affects more than language: number formats, date order, currency
  symbol placement, address fields.

The `region` field in the logger
([loggerUtil.ts](../../../multi-entity-ui/src/js/utils/common/loggerUtil.ts)) flows into log
routing — not just UI.

---

## 11. Feature flags

Used here via `sandbox.featureFlags.isFeatureEnabled(id)`.

**Design considerations:**
- **Evaluation** — server-side (truth) vs client-side (flicker risk).
- **Targeting** — by user, tenant, region, % rollout.
- **Caching** — flag values change; how stale is acceptable?
- **Cleanup** — flags become tech debt; have an expiration policy.

---

## 12. Plug-in / extension points (the meta level)

This app is itself a plugin — but it also accepts plugins via
`dependencies.widgets`. Three things to design when you accept plugins:

1. **Versioning** — semver, with breaking-change policy.
2. **Sandbox** — what can the plugin do, what can't it?
3. **Failure isolation** — plugin crashes shouldn't kill the host.

The same lessons apply at every level (host accepts MEU, MEU accepts
uservoice).

---

## 13. Testing pyramid for an MFE

```
              ┌──────────────────┐
              │  E2E (Playwright)│   slow, few, full-stack
              ├──────────────────┤
              │ Integration tests│   widget mounted in fake shell
              ├──────────────────┤
              │  Component tests │   single component, mocked sandbox
              ├──────────────────┤
              │    Unit tests    │   reducers, services, utils
              └──────────────────┘
```

The **MFE-specific layer** is **contract tests:** verify your widget runs
under the host's sandbox spec. If the host updates its sandbox API and you
were depending on a removed method, contract tests catch it before
production.

---

## 14. Things to be able to draw on a whiteboard

- The host/plugin/sandbox contract diagram (Section 6 of `02-`).
- Widget loading sequence: host → manifest → bundle → BaseWidget → React
  tree.
- A request's path: component → service → GraphQL client → endpoint →
  cookie/apiKey → response.
- The state-scope hierarchy (Section 4 above).
- Error boundary nesting: page → widget → component.

---

## 15. Common interview "gotchas"

- "Why micro-frontends?" — Conway's law. Deploy independence. Don't say
  "modularity" — that's just code organization.
- "How would you do this with Module Federation instead?" — same shape,
  different mechanism. the plugin platform provides more (sandbox, registry,
  versioning).
- "What happens if React versions disagree?" — multiple Reacts in one page
  break hooks. Hard to dedupe across MFEs unless host coordinates.
- "How do widgets communicate?" — props, URL, or backend. **Not** a JS-level
  event bus by default (and explain why: tight coupling).
