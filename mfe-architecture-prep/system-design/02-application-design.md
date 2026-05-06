# 02 — System Design Write-up: `the-app`

This is the kind of write-up you'd produce for a design review or use as a
reference answer in an interview. It walks through the design *as if you were
building it from scratch*, so you can defend every decision.

---

## 1. Problem statement

Build the **multi-entity** experience inside the host SaaS application: lets a single
user manage many companies (think: a parent corp with 12 subsidiaries, or an
accountant managing 200 clients). Core capabilities:

- View hierarchy of related companies.
- Allocate revenue/expense from a parent to its subsidiaries.
- Switch between companies without re-logging in.
- Migrate older "single-entity" accounts to multi-entity.
- Embed dashboards and reports across entities.

Constraints:
- Must run *inside* the host SaaS application (we don't own the page chrome).
- Multiple teams ship widgets; deploy independence is a hard requirement.
- Multi-tenant, multi-region, must comply with data residency rules.
- Finance data — correctness > availability for writes.

---

## 2. Functional requirements

| # | Requirement |
|---|---|
| F1 | Show a list/tree of all companies a user can access |
| F2 | Allow user to allocate a transaction (or a recurring "dynamic allocation") across child companies |
| F3 | Show a multi-entity dashboard composed of widgets from multiple teams |
| F4 | Switch active company without losing the user's session |
| F5 | Migrate single-entity → multi-entity setup |
| F6 | Embed third-party widgets (feedback, help) |
| F7 | Show different UIs to firm/accountant users vs end-customers |

---

## 3. Non-functional requirements

| # | Requirement | Target |
|---|---|---|
| NF1 | Page TTI | < 3s on a P50 connection |
| NF2 | Availability | 99.9% per page (composite) |
| NF3 | Independent deploy | Any widget deployable without coordinating with others |
| NF4 | Multi-region data residency | US/EU/AU users' data stays in region |
| NF5 | Auth | SSO via existing the host SaaS application session |
| NF6 | AuthZ | Per-resource, centrally evaluated, fail-closed |
| NF7 | Observability | Every user flow has trace ID, structured logs, perf metrics |
| NF8 | A/B testability | New versions of a widget can be rolled out to %s of users |

---

## 4. High-level architecture

```
                       ┌────────────────────────────────────────────┐
                       │  USER  (browser, logged into the host SaaS application)   │
                       └──────────────────────┬─────────────────────┘
                                              │
                                              ▼
                       ┌────────────────────────────────────────────┐
                       │  CDN / Edge                                │
                       │  Serves the host SaaS application shell + plugin bundles  │
                       └──────────────────────┬─────────────────────┘
                                              │
                                              ▼
                       ┌────────────────────────────────────────────┐
                       │  HOST SHELL  (AppFabric / host-shell-core)  │
                       │  - Owns routing, layout, session cookie    │
                       │  - Provides `sandbox` to every widget      │
                       │  - Loads widgets by ID from a registry     │
                       └─────┬───────────────────┬──────────────────┘
                             │                   │
                  ┌──────────▼──────┐ ┌──────────▼─────────────┐
                  │ the-app │ │ uservoice-ui (3rd      │
                  │  (THIS REPO)    │ │   party plugin)        │
                  │   ┌─────────┐   │ │                        │
                  │   │   Hub   │   │ └────────────────────────┘
                  │   ├─────────┤   │
                  │   │ Alloc.  │   │ Each widget:
                  │   ├─────────┤   │  - Has its own bundle
                  │   │Hierarchy│   │  - Has its own state
                  │   └─────────┘   │  - Talks to backends directly
                  └─────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │ HTTPS, cookie + apiKey      │
              ▼                             ▼
   ┌────────────────────┐      ┌─────────────────────────┐
   │ Identity Service   │      │ the multi-entity orchestrator (BFF) (Multi-Entity      │
   │ identity.api...    │      │  Orchestrator)          │
   └────────────────────┘      └─────────────────────────┘
   ┌────────────────────┐      ┌─────────────────────────┐
   │ Account Manager    │      │ COA (Chart of Accounts) │
   └────────────────────┘      └─────────────────────────┘
   ┌────────────────────┐      ┌─────────────────────────┐
   │ Bookkeeping the journal-entry service   │      │ ETS (Spend mgmt)        │
   └────────────────────┘      └─────────────────────────┘
                       …~13 GraphQL endpoints total…
                       (each owned by a different team)
```

---

## 5. Why micro-frontends?

The *forcing function* is **Conway's law**: ~6 teams ship UI into the same
the host SaaS application page. If they shared a build, deploys would have to be
coordinated, and a bug in one team's code blocks everyone.

Alternatives considered:

| Option | Why rejected |
|---|---|
| Monolith SPA | Coupled deploys, no team isolation |
| iframes per team | Layout/UX inconsistencies, communication is hard, can't share design system efficiently |
| Module Federation | Newer; this org committed to the plugin platform earlier; the plugin platform solves widget composition + sandbox + auth in one platform |
| Server-rendered fragments | Doesn't fit a SPA experience like QBO; complicates per-tenant personalization |

So: **plugin-platform plugins** = micro-frontends with:
- Versioned widget IDs.
- Sandbox API for cross-cutting concerns.
- Host-managed bundle loading and caching.

---

## 6. The `sandbox` — designing a host/plugin contract

The sandbox is the **most important system-design decision**. Without it,
each widget would re-implement: env detection, user info, auth, AuthZ,
logging, feature flags, inter-widget loading. With it, all of those are a
*stable contract* the host owns.

```
              ┌───────────────────────────────┐
              │  Host owns sandbox lifecycle: │
              │  - creates sandbox per widget │
              │  - injects user/env/perms     │
              │  - tears down on unmount      │
              └──────────────┬────────────────┘
                             │ passed as prop
                             ▼
              ┌───────────────────────────────┐
              │  Widget reads sandbox:        │
              │  - never mutates it           │
              │  - receives versioned API     │
              └───────────────────────────────┘
```

**Why this pattern is great:**
- The host can change the *implementation* of, say, AuthZ without changing
  the contract. All widgets keep working.
- Testing widgets is just "construct a fake sandbox."
- Multi-tenant safety: the sandbox is per-widget-mount, so two widgets viewing
  two companies in two tabs each get the right context.

**Why it's tricky:**
- Versioning the contract. Adding a method is fine; renaming/removing is a
  breaking change for every widget. See `extensions.getExtension(id, {version:
  '1.0.0'})` — same pattern applied recursively.
- Async surface area. `sandbox.widgets.getWidget` is a Promise. Widgets that
  forget to handle the rejected case crash.

---

## 7. Data architecture

### 7.1 Why so many endpoints?

`the-app` calls 13+ different GraphQL endpoints because each
**domain** at <Company> owns its own service:
- Identity owns users + companies
- COA owns chart of accounts
- ETS owns expenses
- Bookkeeping owns journal entries
- the multi-entity orchestrator (BFF) is a multi-entity-specific orchestrator

This is **domain-driven design at the org level**. Each team owns a service
*and* its schema. The cost: clients orchestrate multiple round-trips.

### 7.2 BFF vs direct calls

A **Backend-For-Frontend** (BFF) sits between the FE and N microservices,
fans out internally, returns one response. Pros:
- One round-trip from the browser.
- BFF can cache, dedupe, transform.
- Auth happens once at the BFF boundary.

This app **partially** uses BFF — `<MultiEntityOrchestrator>` and `<BIZ_ORCHESTRATOR>` are
orchestrator-style endpoints. But many calls still go direct to Identity,
Account, COA, etc. The pragmatic reason: those teams' GraphQL APIs predate
the orchestrator, and migrating every read to the orchestrator is cost. So
the design is "use BFF for new flows, direct calls for legacy."

### 7.3 Caching strategy

The repo has *no normalized cache* today. The Apollo provider exists but is
a no-op (see [GQLProvider.tsx](../../../multi-entity-ui/src/js/providers/GQLProvider.tsx)). So
each component fetches independently.

The right design — and what an interviewer wants you to articulate:

```
┌──────────────────────────────────────────────────────┐
│ React component                                      │
└──────────────────┬───────────────────────────────────┘
                   │ useQuery(...)
                   ▼
┌──────────────────────────────────────────────────────┐
│ Apollo cache  (per-tenant, in-memory)                │
│ - normalize by __typename + id                       │
│ - dedupe in-flight requests                          │
│ - return cached → revalidate in background           │
└──────────────────┬───────────────────────────────────┘
                   │ miss / stale
                   ▼
┌──────────────────────────────────────────────────────┐
│ Apollo HTTP link → endpoint                          │
└──────────────────────────────────────────────────────┘
```

**Cache key must include `companyId`** — otherwise a context switch leaks
data. **And** invalidation on mutation must be explicit (`refetchQueries`
or `cache.evict`).

---

## 8. Authentication & Authorization

### 8.1 AuthN — "who are you?"

```
┌──────────────────────────────────────────────────────────┐
│ User → quickbooks.example.com → IDP login                 │
│       Browser receives session cookie (Secure, HttpOnly, │
│       SameSite=Lax/Strict, scoped to *.example.com)       │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│ All FE→BE calls use credentials: 'include'               │
│ Cookie auto-attached (browser_auth)                      │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│ Each backend validates cookie via Identity service       │
└──────────────────────────────────────────────────────────┘
```

The plugin **never** holds tokens. This is the safest design for FE — no
local storage of secrets, no refresh-token logic, no leak surface.

### 8.2 AuthZ — "what can you do?"

```
┌────────────┐     1. isAuthorized({resource, action})
│   Widget   │ ────────────────────────────────────────►
└────────────┘                                          │
                                                        ▼
                                          ┌──────────────────────────┐
                                          │ sandbox.authorization    │
                                          │ (Policy Enforcement Pt)  │
                                          └────────────┬─────────────┘
                                                       │ HTTPS
                                                       ▼
                                          ┌──────────────────────────┐
                                          │ the central AuthZ Service     │
                                          │ (Policy Decision Point)  │
                                          │ - reads policies         │
                                          │ - evaluates context      │
                                          │ - returns permit/deny    │
                                          └──────────────────────────┘
```

This is a textbook **PEP/PDP** split. The widget never decides; it asks.

**Important:** the *backend* services must also check AuthZ on writes. The
client check is for UX only. Otherwise a malicious user bypasses the UI
gate and calls the mutation directly.

### 8.3 Multi-tenancy & impersonation

An accountant acting for a client is a delicate case. The code carries both
identities:
- `userId` (the human accountant)
- `companyId` (the company being viewed)
- `principalAccountId` = firm ID (the firm the accountant works for)

Audit logs **must include all three** to be reconstructable. AuthZ policies
must authorize the firm (not just the user) for the action.

---

## 9. Observability

```
Widget code
   │
   │  sandbox.logger.info(msg, {fields, region})
   │  startInteraction(id) / completeInteraction(id)
   │  generateIntuitTid (per request)
   ▼
Host's logger pipeline (region-pinned)
   │
   ▼
Splunk / Datadog / SignalFx style stores
   │
   ▼
Dashboards & alerts (e.g. "P95 alloc save > 2s")
```

**Three useful interaction patterns the repo uses:**
- `startInteraction(sandbox, id, ctx)` — begin a user-flow timer.
- `completeInteractionWithSuccess(sandbox, id, ctx)` — emit success.
- `completeInteraction(sandbox, id, ctx)` — emit failure.

This is how you tell ops "save-allocation P95 went from 800ms to 2400ms."

---

## 10. Failure modes & mitigations

| Failure | Today | Better |
|---|---|---|
| One of 13 endpoints down | Whole page errors | Per-section degradation; show what we have |
| AuthZ service slow | One retry, then deny | Return "couldn't verify, retry" UX |
| Network blip on a read | `noRetry: true` → hard error | Auto-retry on idempotent reads with jitter |
| Mutation succeeds but client doesn't get response | User retries → duplicate write | Idempotency key on mutations |
| Cookie expires mid-session | 401, user confused | Host should redirect to re-auth; verify cascade |
| One widget's bundle fails to load | Page broken | Error boundary at widget root; show fallback |
| Tenant A's cache leaks to Tenant B | Critical security bug | Cache key MUST include `companyId` |

A senior interview answer: **"For each external dependency, I list its
failure modes and the user-visible behavior. Then I decide which we accept
and which need explicit mitigation. The default of `noRetry: true` is safe
for writes but wrong for reads — I'd split those concerns."**

---

## 11. What I'd build differently if starting today

1. **Single BFF** for `the-app` page bootstrap. Reduce 10 calls to
   1. Backend orchestrates the rest.
2. **Apollo (or urql/react-query) wired up properly** with per-tenant cache
   keys.
3. **State machine for Allocation modes** (XState) — finance code with
   illegal-state risks should not use ad-hoc reducers.
4. **Sandbox extensions** for hierarchy + permission cache — eliminate
   redundant fetches across widgets.
5. **Domain event bus** on the sandbox so widgets can react to
   "entity.updated", "allocation.saved" without coupling.
6. **Contract tests for `widget.yaml` dependencies** — versioned third-party
   widget references should be tested in CI.

---

## 12. Drill yourself

If you can answer these without notes, you understand the design:

1. Why micro-frontends and not Module Federation here?
2. What's in the sandbox and why does it exist?
3. How does the user authenticate? Where do tokens live?
4. What does "shared state across widgets" look like?
5. Why are there 13 GraphQL endpoints? What would you change?
6. What's the cache key hazard? (tenant ID inclusion)
7. How does an accountant impersonating a firm's client get authorized?
8. How would you handle a partial outage of 1/13 endpoints?
9. What's the retry default and is it right? (split reads vs writes)
10. Where do logs go and what's the trace ID story?

If any feel shaky, re-read [01-fundamentals.md](01-fundamentals.md) and the
relevant deep-dive file.
