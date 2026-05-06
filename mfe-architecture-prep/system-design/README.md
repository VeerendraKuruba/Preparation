# System Design — `the-app`

A self-contained study pack: how this app is designed, *and* the broader
system-design knowledge you should carry into an interview round.

Every concept is anchored to a real piece of code in this repo, so you're not
memorizing abstractions — you're learning a system you actually work on.

---

## How to use this folder

Read in order. Each file builds on the previous.

| # | File | What you'll learn |
|---|------|-------------------|
| 0 | **README.md** (this file) | Index + learning roadmap |
| 1 | [01-fundamentals.md](01-fundamentals.md) | Core system-design vocabulary — load, latency, throughput, CAP, etc. |
| 2 | [02-application-design.md](02-application-design.md) | Full system-design write-up of `the-app`: requirements → architecture → data flow → tradeoffs |
| 3 | [03-frontend-architecture.md](03-frontend-architecture.md) | Frontend-specific design: micro-frontends, BFFs, bundle splitting, hydration, state |
| 4 | [04-data-and-apis.md](04-data-and-apis.md) | Backend communication: GraphQL vs REST, multi-endpoint orchestration, caching, idempotency |
| 5 | [05-scalability-and-perf.md](05-scalability-and-perf.md) | Scaling, latency budgets, perf optimization, observability |
| 6 | [06-security-and-auth.md](06-security-and-auth.md) | AuthN/AuthZ, multi-tenancy, CSRF/XSS, data residency |
| 7 | [07-interview-qna.md](07-interview-qna.md) | 30+ Q&A grounded in this app, ranging from junior to staff level |
| 8 | [08-learning-roadmap.md](08-learning-roadmap.md) | What to study, in what order, with resources |
| 9 | [09-opex-tools-and-observability.md](09-opex-tools-and-observability.md) | OpEx, CI/CD, logging (Splunk), RUM, Lighthouse, alerting, incident response — using the actual tools this repo wires up |

---

## TL;DR — What this app is, in one paragraph

`the-app` is a **micro-frontend plugin** for the host SaaS application,
hosted by the company's **AppFabric** shell. It exposes ~40 widgets (Allocation,
Hub, Hierarchy, Dashboard, Migration, etc.) that mount independently inside
the host. Each widget receives a **`sandbox`** object from the host that
provides identity, environment, permissions, logging, feature flags, and
inter-widget loading. Data is fetched directly from ~13 backend GraphQL
endpoints using session cookies for auth (`credentials: 'include'`) and a
plugin API key for identification. State is widget-local (a hand-rolled
Redux + `zustand`); cross-widget communication happens via props, URL, or
backend round-trips.

---

## What "system design" means for a frontend like this

Most system-design content focuses on backends (load balancers, sharded
DBs, message queues). For a senior frontend role — *especially* on a
micro-frontend platform like this one — interviewers want to know:

1. **Composition.** How do you compose a UI built by N teams without
   coordinating deploys?
2. **State boundaries.** What's local, what's shared, who owns the cache?
3. **Network strategy.** How many calls, in what order, with what fallback?
4. **Auth/AuthZ propagation.** Who validates, where, and what's the trust
   chain?
5. **Failure modes.** Endpoint X is down — does the page degrade or crash?
6. **Performance budget.** TTI, LCP, INP — what's your strategy when one
   widget regresses the whole page?
7. **Observability.** When a user reports a bug, what do you have?

Each file in this pack maps to one of these concerns.

---

## Quick reference: where things live in the repo

| Concept | File |
|---|---|
| Widget manifests | `src/js/widgets/*/widget.yaml` |
| Widget entry points | `src/js/widgets/*/index.jsx` |
| Sandbox helpers | [src/js/utils/common/sandboxUtil.ts](../../../multi-entity-ui/src/js/utils/common/sandboxUtil.ts) |
| GraphQL client factory | [src/restClient.ts](../../../multi-entity-ui/src/restClient.ts) |
| Endpoint URLs | [src/js/utils/common/common.ts](../../../multi-entity-ui/src/js/utils/common/common.ts) |
| Service layer | [src/js/services/](../../../multi-entity-ui/src/js/services/) |
| Per-widget store | [src/js/allocation/store/](../../../multi-entity-ui/src/js/allocation/store/) |
| AuthZ helpers | [src/js/services/AuthzDecisionService.ts](../../../multi-entity-ui/src/js/services/AuthzDecisionService.ts) |
| Logger | [src/js/utils/common/loggerUtil.ts](../../../multi-entity-ui/src/js/utils/common/loggerUtil.ts) |
