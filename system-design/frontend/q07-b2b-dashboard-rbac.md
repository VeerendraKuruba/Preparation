# Q7. B2B dashboard (tables, RBAC)

**Prompt variants:** **Stripe-style** dashboard; permissions by role.

 [← Question index](./README.md)

**Also:** [Micro frontends](../micro-frontends.md)

---

### One-line mental model

The UI is **permission-aware but not permission-authoritative**: the server decides; the client **codesplits** by route and **virtualizes** dense tables without shipping the whole product in one bundle.

### Clarify scope in the interview

Row actions? Export CSV? Audit logs? Multi-tenant?

### Goals & requirements

- **Functional:** nav, key tables, detail drawers, critical flows.
- **Non-functional:** **RBAC** correctness (no silent hide of forbidden actions without checks), table scale.

### High-level frontend architecture

Auth bootstrap → **feature/route manifest** from server → lazy routes → **BFF/GraphQL** with coalesced reads → virtualized table.

### What the client does (core mechanics)

1. **Hide vs disable** with clear patterns; still verify server on mutation.
2. Virtualize rows/columns sanity; pinned columns optional.
3. Save **column prefs** locally + server profile.
4. Wizard **drafts** recoverable.

### Trade-offs

| Choice upside | Trade-off |
|---------------|-----------|
| Micro-frontends | Duplication vs isolation—see [micro-frontends.md](../micro-frontends.md) |
| One giant SPA | Simpler shared state, worse build isolation |

### Failure modes & degradation

Stale summaries with **refresh**; don’t blank entire home if one widget fails.

### Accessibility checklist

Table **semantics** or grid roles done right; skip links; alert errors in **aria-live** thoughtfully.

### Minute summary (closing)

“We treat **RBAC as server-owned**, **codesplit** the shell, **virtualize** heavy grids, and **compose** dashboards from fault-isolated widgets.”

---

## For a ~60 minute round

### Suggested time boxes

| Block | Minutes | Focus |
|-------|--------:|--------|
| Clarify + requirements | 8–12 | Roles, tenants, audit, exports, compliance |
| High-level architecture | 12–18 | Auth bootstrap, route manifest, BFF, widget model |
| Deep dive 1 | 12–18 | **RBAC UX** (+ server enforcement story) |
| Deep dive 2 | 12–18 | **Virtualized data grid** or **MFE boundaries** |
| Trade-offs, failure, metrics | 8–12 | Partial dashboard load, observability |

### What to draw (whiteboard)

- **Bootstrap:** `GET /me` + **capabilities** / `GET /ui-manifest` → unlock routes.
- **Shell:** nav + outlet; lazy **chunks** per route.
- **Table:** virtual window + column defs + server sort/pagination contract.

### Deep dives — pick 2

**A. RBAC** — **Hide vs disable** patterns; **never** rely on UI alone—mutations return `403`; “upgrade” CTAs vs dead ends; multi-tenant **org switch** and stale cache invalidation.

**B. Data grid** — Server-driven **cursor** pagination vs offset; sort/filter debouncing; **URL** for shareable filtered views (common in B2B); column virtualization vs horizontal scroll.

**C. Micro-frontends** — Shell vs remotes; **module federation** sketch; shared `design-system` version skew; IAM cookies / subdomains (brief). Deep reference: [micro-frontends.md](../micro-frontends.md).

**D. Forms & wizards** — Draft autosave; step validation; **idempotent** submits; accidental navigation guard (`beforeunload` sparingly).

### Common follow-ups

- **“CSV export 100k rows?”** — Don’t load all in DOM; async **job** + download link; progress UI (mostly backend—define contract).
- **“Real-time balances?”** — Poll vs WS; stale badge + refresh; optimistic **dangerous**—prefer server numbers for money.
- **“Impersonation / support?”** — Banner + audit; read-only modes; session flags from server.

### What you’d measure

- **Security-adjacent:** `403` rate, client error rate on forbidden actions (should be low if UI honest).
- **Perf:** grid scroll smoothness, time-to-interactive on heaviest route.
- **Adoption:** feature discoverability by role (product metric).

