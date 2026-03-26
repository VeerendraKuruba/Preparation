# Scalability Architecture (Frontend)

How frontends stay maintainable and safe as teams and traffic grow. This section covers the architectural decisions that matter at scale: choosing the right state management strategy, structuring large codebases for team autonomy, enforcing permissions on the client, building component systems that last, and handling API failures without breaking the user experience.

---

## Index

| # | Topic | When it matters | File |
|---|---|---|---|
| 36 | State management at scale | Multiple features sharing state, or state logic becoming hard to trace | [36-state-management-at-scale.md](./36-state-management-at-scale.md) |
| 37 | Structuring large React codebases | More than 2–3 teams working in the same repo, or feature coupling becoming painful | [37-structuring-large-react-codebases.md](./37-structuring-large-react-codebases.md) |
| 38 | Permissions and RBAC on the client | Different user roles see different UI, or accidental feature exposure is a risk | [38-permissions-rbac-frontend.md](./38-permissions-rbac-frontend.md) |
| 39 | Reusable component systems | Building a shared design system or cross-team component library | [39-reusable-component-systems.md](./39-reusable-component-systems.md) |
| 40 | Handling API failures gracefully | Flaky APIs, partial failures, or cascading errors degrading the whole page | [40-api-failures-gracefully.md](./40-api-failures-gracefully.md) |

---

## Decision guide — which file to read for your scenario

**"Our Redux store has grown unmanageable — actions fire from everywhere, selectors are duplicated, and adding a feature requires touching five files."**
Read [36 — State management at scale](./36-state-management-at-scale.md). Covers when to use global state vs server state (React Query/SWR) vs local state, Zustand as a lighter alternative, and how to slice state by feature domain.

**"We have 10+ engineers in the same repo and PRs are constantly conflicting. Features depend on each other in ways nobody planned."**
Read [37 — Structuring large React codebases](./37-structuring-large-react-codebases.md). Covers feature-folder structure, barrel exports, module boundaries, and when to consider micro-frontends.

**"We need to show/hide entire sections of the UI based on user role (admin, viewer, billing-only). We don't want to just hide buttons — we need the route to be inaccessible too."**
Read [38 — Permissions and RBAC on the client](./38-permissions-rbac-frontend.md). Covers token-encoded permissions, a `usePermission` hook pattern, protected routes, and why client-side RBAC is a UX concern only — server must always re-authorise.

**"Our design team wants a consistent component library, but every team builds their own Button/Modal/Table. There's no single source of truth."**
Read [39 — Reusable component systems](./39-reusable-component-systems.md). Covers the compound component pattern, design token integration, versioning strategy, and publishing via npm or a monorepo.

**"A single failing API call is showing a blank page or crashing the whole app. We want partial degradation, not total failure."**
Read [40 — Handling API failures gracefully](./40-api-failures-gracefully.md). Covers React Error Boundaries, retry with exponential backoff, stale-while-revalidate, skeleton states, and the circuit-breaker pattern at the component level.

---

**Also see:** [Frontend system design index](../README.md) · [Performance engineering](../performance-engineering/README.md) · [Prep repository](../../../README.md)
