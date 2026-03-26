# 36. State management at scale

## Clarify in the interview

Client-only vs **server state**? Real-time? Offline? How many teams ship features into the same app?

## Principles

1. **Separate concerns** — Treat **server state** (REST/GraphQL, caching, invalidation) differently from **UI/ephemeral state** (panels, drafts, wizards). Libraries like TanStack Query / SWR own fetches + cache keys; avoid copying that into a global Redux store.
2. **Colocate when possible** — Local `useState` / context for feature-local UI. Reach for **global** only for true cross-cutting reads (auth snapshot, theme, feature flags) or when many distant trees must stay in sync.
3. **Bounded contexts** — Per-domain slices or stores (or module-scoped patterns) so one team’s product area doesn’t entangle everyone’s reducers/selectors.
4. **Avoid a single giant atom** — Prefer **normalized entity maps** for relational data (users by id, posts by id) over deeply nested mirrors of API payloads.
5. **Subscriptions at scale** — Fine-grained subscriptions (atoms, selectors, external stores with `useSyncExternalStore`) beat rerendering the tree on any change.

## Failure modes

- **Prop-drilling** hell vs **over-contextualization** (mega context value churn).  
- **Duplicated server cache** in Redux + React Query → stale bugs. Pick one source of truth per resource.

## Sound bite

“**Server state in a cache layer with keys and invalidation; UI state local or feature-scoped; global store only for truly shared snapshots.**”
