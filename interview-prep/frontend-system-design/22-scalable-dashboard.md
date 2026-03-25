# 22. Design a scalable dashboard

## Clarify

Widgets per tenant? Real-time? **RBAC** per tile? Mobile?

## Architecture sketch

- **Shell**: auth, nav, feature-flag gate, layout grid (design-system).
- **Widgets** as **independently loaded** modules (dynamic `import`, module federation if multi-team).
- **Data**: each widget owns query + cache key; **BFF** aggregates if needed to avoid N+1 from browser.
- **State**: server state (React Query/SWR), URL for shareable filters, minimal global client state.
- **Performance**: virtualization in tables, skeletons, stale-while-revalidate, request dedupe.

## Scale / ops

CDN for static, API rate limits, per-widget error isolation (**error boundaries**), RUM on LCP/TBT for heavy charts.

## Trade-off

Centralized orchestration vs independent deploys — micro-frontends add ops cost.
