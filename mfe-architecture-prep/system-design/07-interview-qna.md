# 07 — Interview Q&A (broad knowledge)

30+ questions ranging from intermediate to staff-level, grounded in this app.
Each has a *short* answer (the elevator version) and a *long* answer (what
you'd say in a follow-up).

Use this to drill yourself. Cover the answer, ask the question, force
yourself to say it out loud.

---

## A. Architecture & Design

### Q1. Walk me through the architecture of `the-app` in 2 minutes.

**Short:** Micro-frontend plugin for the host SaaS application. ~40 widgets, each
versioned and mounted by the host shell with a `sandbox` prop that provides
identity, environment, AuthZ, logging. Data fetched directly from ~13 GraphQL
endpoints with cookie auth.

**Long:** Open with the platform (AppFabric), the boundary (widget-level
MFE), the contract (sandbox), the data flow (services → restClient →
GraphqlClient → endpoints), the state model (per-widget Redux/zustand, no
cross-widget shared state), and end with one tradeoff you'd revisit
(consolidate page bootstrap behind a BFF).

---

### Q2. Why micro-frontends instead of a monolith?

**Short:** Conway's law — multiple teams ship UI into the same the host app page; we
need independent deploys.

**Long:** A monolith means coordinated deploys, shared release trains, and a
bug in one team's code blocks everyone. MFE gives versioned, independently
deployable units. The cost is bundle duplication, type-safety gaps at the
boundary, and platform investment (AppFabric). For an org of 6+ teams
shipping into one product, the deploy-independence benefit dominates.

---

### Q3. What's in the sandbox and why is it the most important design decision?

**Short:** It's the host/plugin contract. Without it, every widget would
re-implement env detection, auth, AuthZ, logging, feature flags.

**Long:** Detail the surface — `appContext`, `extensions.qbo`, `authorization`,
`logger`, `widgets`, `featureFlags`, `pluginConfig`. Note it's per-mount,
which gives multi-tenancy safety. Note it's versioned. The pattern means the
host can change *implementations* (swap AuthZ provider) without changing the
contract — every widget keeps working. That's a big win at organizational
scale.

---

### Q4. How do widgets communicate with each other?

**Short:** Props (parent→child via `sandbox.widgets.getWidget`), URL
parameters, or shared backend state. **No** JS-level event bus.

**Long:** Explain the deliberate isolation. A JS-level bus would tightly
couple widgets — one team's API change breaks others silently. Going through
the backend means the source of truth is consistent and the contract is
the GraphQL schema, which is versioned. The cost: you can't push real-time
updates between widgets without a refetch — which is fine for most flows
but suboptimal for collaborative editing.

---

### Q5. What's the right way to share state across widgets?

**Short:** A sandbox extension if it's truly cross-cutting; otherwise refetch
from backend.

**Long:** Sandbox extensions live above the widget layer, are versioned, and
let the host expose a singleton service to all widgets. Good candidates: the
hierarchy of companies (every widget needs it), the AuthZ decision cache.
Anything else: backend is the source of truth, refetch on demand.

---

## B. Data & APIs

### Q6. Why does this app talk to 13 GraphQL endpoints? What would you change?

**Short:** Each domain team owns its own service + schema. I'd consolidate
page-bootstrap behind a BFF.

**Long:** Walk through the domain ownership model — Identity, COA, ETS,
etc., each with its own team and schema. Pros: strong ownership, independent
schema evolution. Cons: client orchestrates fan-out, no cross-service
consistency, AuthZ re-validated everywhere. The right architectural answer
is **federation** (Apollo Federation gateway) or **per-page BFF** (orchestrator-style
orchestrator). Adopt incrementally: new flows use BFF; legacy direct calls
left alone until they need a change.

---

### Q7. The default is `noRetry: true`. Defend or attack it.

**Short:** Defensible for writes (idempotency unknown), wrong for reads.

**Long:** Mutations on financial data must not retry blindly — you might
double-create. So `noRetry: true` as a default is *safe*. But most service
calls in `IdentityService` are idempotent reads where retry-with-backoff is
strictly better. Right design: split into `getQueryClient` (retries) and
`getMutationClient` (no retries unless idempotency-keyed). The current
single-knob approach forces every caller to opt in, and most don't.

---

### Q8. How would you add caching to this app?

**Short:** Wire up Apollo (or React Query) per endpoint, with tenant-scoped
cache keys and `cache-and-network` policy.

**Long:** Apollo provider exists but is a no-op today. Wire it up with: (a)
one `ApolloClient` instance per endpoint type since they're different schemas;
(b) cache keys keyed off `(typename, id, tenantId)` to prevent leaks; (c)
`fetchPolicy: 'cache-and-network'` for stale-while-revalidate; (d) explicit
`refetchQueries` or `cache.evict` after mutations. For invalidation across
mutations that span endpoints, add a domain-event bus (sandbox extension)
so widgets can listen for `entity.updated` and evict.

---

### Q9. How do you handle multi-tenant cache safety?

**Short:** Every cache key includes `tenantId` (companyId). Audit every cache
write.

**Long:** Tenant ID in the key is non-negotiable. Defense in depth: (a) a
cache wrapper that requires tenantId as a parameter; (b) a unit test for
each consumer that verifies cache miss across tenants; (c) when the user
switches company, evict all entries scoped to the old tenant rather than
relying on the new tenant being absent.

---

### Q10. What's an idempotency key and where would you use one here?

**Short:** A client-generated UUID that lets the server dedupe retried
non-idempotent writes.

**Long:** Allocation save mutations are non-idempotent — saving twice
double-creates. Pattern: client generates UUID, sends as `Idempotency-Key`
header. Server stores result keyed by UUID for ~24h. A retried request with
the same key returns the cached response, no second execution. Stripe's API
is the canonical reference. Without this, the FE must avoid retries, which
is what the current `noRetry: true` does — at the cost of resilience to
transient errors.

---

### Q11. Walk me through what happens on a network error during an Allocation save.

**Short:** With current code, `noRetry: true` → user-visible error → user
clicks "save" again → potential double-create.

**Long:** Trace the path: `getGQLClient` → `GraphqlClient.query` → fetch →
network error → promise rejects → caller's `.catch` → error logged via
`sandbox.logger.error` → UI surfaces toast. Then explain the gap: no
idempotency key, so user retry is unsafe at the protocol level. Today the
backend may dedupe based on transaction ID, but that's an implicit contract.
The fix: explicit idempotency keys.

---

### Q12. How do you paginate large lists in this app?

**Short:** Cursor-based — `pagination: { first: N }` in GraphQL queries.

**Long:** Cursor-based (Relay-style) with `first/after`. Mention `first:
2000` in `IdentityService` is large — fine for a one-shot fetch but should
be paged if list grows. Tradeoffs: cursor-based is stable under inserts,
offset-based is simpler but drifts. For UX, infinite-scroll with
virtualization handles large datasets.

---

## C. Auth & Security

### Q13. Walk me through authentication.

**Short:** User logs into the host app → cookie set on `*.example.com` → plugin uses
`credentials: 'include'` → backend reads cookie. The plugin never holds
tokens.

**Long:** Detail the trust chain (host shell, cookie flags, browser_auth
config). Note the security wins: HttpOnly cookie can't be stolen via XSS,
no client-side token refresh logic, single auth flow company-wide.
Tradeoffs: cookie auth is CSRF-prone — mitigated by SameSite cookies + the
implicit CORS preflight from the apiKey header.

---

### Q14. How does authorization work?

**Short:** PEP/PDP split. Widget asks `sandbox.authorization.isAuthorized`,
host calls the central AuthZ service.

**Long:** ABAC-style — policies consider user, tenant, resource, action.
Client-side check is for UX (greying buttons); server-side check on every
mutation is for security. Two PEP/PDP risks: (a) silent failure of AuthZ
service degrades to "deny" — that's fail-closed which is correct, but the UX
should distinguish "denied" from "couldn't verify, retry"; (b) caching AuthZ
decisions is dangerous because policies can change — short TTL + invalidate
on user-context changes.

---

### Q15. What's CSRF and how do we defend against it?

**Short:** Trick a logged-in user's browser into making a request. Defend
with SameSite cookies + CORS + custom headers + CSRF tokens for
high-sensitivity actions.

**Long:** With cookie auth + `credentials: 'include'`, any page that gets the
user to submit a form to your API can act as them. SameSite=Strict cookies
block this for top-level navigation. Custom headers (`X-CSRF-Token` or even
`Content-Type: application/json` for fetches) trigger CORS preflight, which
external sites can't satisfy without allowlist. Best practice for finance
APIs: all of the above.

---

### Q16. What's XSS, and where is it most likely in this app?

**Short:** Script injection. Most likely in places that bypass React's
default escaping — `dangerouslySetInnerHTML`, third-party widgets.

**Long:** React escapes interpolated content by default. The danger zones:
(a) any `dangerouslySetInnerHTML`; (b) markdown/rich-text rendering; (c)
third-party widgets loaded via `sandbox.widgets.getWidget` — they run in our
auth context. CSP header is a good defense in depth. The `@sbg/htmlescaper`
in deps suggests we sanitize somewhere; audit those callsites.

---

### Q17. How is multi-tenancy enforced?

**Short:** Every request carries tenant ID; every cache key is tenant-scoped;
every log includes tenant; backend re-validates tenant access on every read
and write.

**Long:** Layered defense. Client always sends `companyId`. Cache wrappers
require tenant ID. Logger includes `region` (and ideally tenantId). Backend
*never trusts* the client-supplied tenant alone — it joins to the user's
allowed tenants and rejects mismatches (IDOR defense). The accountant case
adds firm context — AuthZ policies must accept "firm acting for client" as
a principal.

---

### Q18. What goes wrong if a developer forgets to include companyId in a cache key?

**Short:** Tenant data leaks across users. Critical security incident.

**Long:** Walk through the scenario: user A in company X opens entity 7,
client caches it under key `entity:7`. User B in company Y opens entity 7
(different entity, same id) — sees user A's data. Detection: every cache
write must go through a wrapper that requires tenant ID. Test: a unit test
for each cache that mutates tenant between requests and asserts cache miss.

---

## D. Performance & Scale

### Q19. Allocation page bootstrap fans out to 10 endpoints. How do you make it fast?

**Short:** Parallelize, BFF for fan-out, skeleton UI, defer non-critical
sections.

**Long:** TTI is bounded by the slowest call. Three changes: (a) BFF that
fans out server-side and returns one payload — turns 10 round trips into 1;
(b) skeleton placeholders so the page paints before data; (c) split critical
vs non-critical — render the table immediately, render suggestions when
their slow endpoint returns. Measure with `interactionUtils` — track P50/P95
of named flows, alert on regressions.

---

### Q20. How would you reduce JS bundle size?

**Short:** Tree-shake (named imports), code-split routes/modals, dedupe
shared deps with the host, audit with bundle analyzer.

**Long:** First, run `webpack-bundle-analyzer` to find the heavy deps.
Common offenders: full lodash, full icon set, multiple date libraries.
Switch to `lodash-es` with named imports (already done here), use icon
tree-shaking, pick one date library. Then code-split: each modal/route
should be a chunk. For MFE specifically: confirm React is host-shared, not
re-bundled per plugin — pinned `react@17.0.2` in `package.json` aligns with
host expectations.

---

### Q21. The host serves the plugin from a CDN. How does cache invalidation work for new versions?

**Short:** Content-hashed filenames; the manifest `widget.yaml` references
the version; old versions remain cached but unused.

**Long:** Standard immutable-asset pattern. Plugin bundle URLs include a
content hash. When you ship a new version, the URL changes — old browsers
keep using the old cached version until the host's manifest updates.
Versioned manifests give atomic cutovers. The catch with MFE: if widget A
ships v2 but widget B's manifest still references v1, both versions load
simultaneously. Manage with semver discipline + a manifest deploy step.

---

### Q22. What's a perf budget and how do you enforce it?

**Short:** A pre-committed limit (e.g. JS < 200KB, LCP < 2.5s) enforced in CI.

**Long:** Two layers: (a) bundle-size budget — fail CI if a PR adds > N KB
to a chunk; (b) runtime budget — Lighthouse CI on a deployed preview, fail
if LCP/INP regress. The repo has `yarn test:lighthouse` which is the
runtime gate. Per-widget budgets matter in MFE because aggregate page perf
depends on every widget meeting its share.

---

### Q23. How does this app handle large hierarchies (firm with 1000 companies)?

**Short:** Cursor pagination + virtualization on the list; lazy-load
sub-trees.

**Long:** Loading 1000 companies as a flat tree and rendering all DOM nodes
is two problems: data and rendering. Data: paginate the API; lazy-load
children when a node is expanded. Rendering: virtualize so only visible
nodes are in DOM. The risk for finance UIs: searching/filtering across the
full tree must work — use server-side search rather than client-side filter
when the tree is big.

---

### Q24. How do you measure where time is going on a slow page?

**Short:** Performance API in the browser; the `interactionUtils` helpers in
this repo emit named timings to backend logging.

**Long:** Three layers: (a) Chrome DevTools Performance tab to see render +
script time; (b) `performance.mark`/`measure` in code to time named regions;
(c) RUM (real-user monitoring) — sample real users, aggregate P50/P95/P99
to dashboards. The repo has `@app-foundations/mmreadiness-perf-framewrk`
which is the company's RUM pipeline. Wire any flow you care about through
`startInteraction/completeInteraction`.

---

## E. Reliability & Operations

### Q25. One backend endpoint goes down. What does the user see?

**Short:** Today: a section breaks; depending on error handling, possibly
the whole page. Better: per-section error boundary with degraded state.

**Long:** Walk through the failure modes: each service call has a
`try/catch`, but error handling is per-callsite. Some show toasts; some log
and return null; some throw. To make it consistent: every section is its
own error boundary; each shows a "couldn't load X" panel; user can retry
just that section. Add a circuit breaker so when an endpoint is failing for
N seconds, we don't hammer it — show degraded UI immediately.

---

### Q26. Cookie expires mid-session. What happens?

**Short:** Backend returns 401; without auto-refresh, the user sees a
generic error and must reload to re-auth.

**Long:** The plugin doesn't manage tokens, so it can't refresh. The host
shell should intercept 401s globally and redirect to re-auth. Verify that
cascade: simulate cookie expiry, see if the host catches it. If not, add a
401-listener at the rest client layer that signals the host (or the user)
to re-authenticate. Critical for long-running sessions in finance.

---

### Q27. How do you trace a single user request end-to-end?

**Short:** `trace_id` (Intuit trace ID) generated per request, propagated
through every backend hop, logged at each stop.

**Long:** `generateIntuitTid: true` in the rest client config attaches a
trace ID to every request. The backend services log with the same ID.
Aggregating logs in Splunk by `trace_id` gives the full flow. For
multi-call flows, the page-level "interaction ID" provides a parent span;
each call within is a child. That's a distributed-tracing 101 model — even
without OpenTelemetry, the trace ID alone unlocks debugging.

---

### Q28. What's your runbook when prod alerts fire on "Allocation save P95 > 5s"?

**Short:** (1) Check dashboards for which endpoint regressed. (2) Check
recent deploys. (3) Check tenant skew. (4) Mitigate (rollback or feature
flag). (5) Postmortem.

**Long:** Open the named-interaction dashboard, find the slow component
(network call vs render), then drill: per-region, per-tenant, per-version.
Most regressions correlate with a recent deploy — bisect deploys. If
tenant-skewed, possibly a hot tenant; consider per-tenant rate limit. If
endpoint-skewed, escalate to that team. Mitigation depends on cause: roll
back the plugin, kill the feature flag, ask backend team to roll back. Then
postmortem with a 5-whys and an action item to prevent recurrence.

---

## F. People / Senior-level

### Q29. You inherit this codebase. What's the first thing you'd ship?

**Short:** Wire up the Apollo cache properly. Highest-leverage win for perf,
consistency, and reliability.

**Long:** It's a small surface area (one file plus replacing direct
`getGQLClient` calls with `useQuery` hooks), unlocks dedupe + retries +
SWR semantics, and pays back across every flow. Compared to the alternatives
(refactor stores, consolidate endpoints into BFF, replace state machine),
it's the most ROI for the effort. Sequence: prove it on one flow first
(maybe the Hub), measure improvement, then expand.

---

### Q30. What's the worst design decision in this codebase and how would you fix it?

**Short:** No server-state library — every component refetches, no dedupe,
no cache. Fix: Apollo or React Query.

**Long:** Pick a real one. Be honest. Don't say "everything's fine" — that's
a junior answer. Better: "We've grown into the architecture. The cache
gap was reasonable at MVP; today it costs us perf and consistency. The fix
is mostly mechanical — wrap GraphQL calls in `useQuery`, evict on mutation.
Estimated effort: 2 engineers, 1 month. Risk: subtle cache-invalidation
bugs; mitigated by per-flow rollout behind feature flag."

---

### Q31. How would you onboard a new engineer to this codebase?

**Short:** Trace one flow (Allocation page open) end-to-end. Pair on a real
ticket their second week.

**Long:** Day 1: read `widget.yaml`, `BaseWidget`, sandbox. Day 2-3: trace
Allocation from index.jsx → AllocationWrapper → store → service → restClient
→ endpoint. Week 2: ship a real change — a small bug fix. The MFE
boundaries take time to internalize; pairing accelerates that.

---

### Q32. What's one thing you'd change about how this team works (not the code)?

**Short:** Architecture decision records (ADRs) so design choices are
discoverable.

**Long:** Codebases this size accumulate decisions ("why GraphQL?" "why
hand-rolled Redux?" "why no Apollo cache?") that no one remembers. ADRs in
the repo (one MD file per decision, dated, with context + alternatives +
chosen path) make tribal knowledge searchable. Costs minutes per decision;
saves weeks of onboarding pain.

---

## How to use this in an interview

- **Start with the short answer.** Land it in one breath.
- **Then volunteer the long answer** without being prompted — that's what
  separates senior from staff.
- **Always end with a tradeoff or a thing you'd change.** Senior engineers
  don't say "this is great"; they say "here's what I'd revisit."
- **Use this app as your concrete example** even when the question is
  abstract. "Yes, BFFs are great in general; in our app specifically, the orchestrator
  is partially that, and here's where we still have direct fan-out."
