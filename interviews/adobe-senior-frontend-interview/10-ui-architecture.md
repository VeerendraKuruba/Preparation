# UI Architecture — Adobe Senior Frontend (Round 2)

> Adobe R2 explicitly lists **UI architecture** as a focus. This separates senior from mid-level: not "can you build a component" but "can you design how 50 components in 5 teams compose into Adobe Express without tearing each other apart". Expect architecture-tradeoff questions, not coding-only.

---

## 1. Component Architecture — Smart vs Presentational vs Compound

**Q: Walk me through how you'd structure a complex `<DataTable>` component used across Adobe Experience Cloud.**

**Answer — Compound Component pattern:**

```tsx
<DataTable data={rows}>
  <DataTable.Toolbar>
    <DataTable.Search />
    <DataTable.Filters />
  </DataTable.Toolbar>
  <DataTable.Header>
    <DataTable.Column id="name" sortable>Name</DataTable.Column>
    <DataTable.Column id="size">Size</DataTable.Column>
  </DataTable.Header>
  <DataTable.Body>
    {(row) => <DataTable.Row data={row} />}
  </DataTable.Body>
  <DataTable.Pagination />
</DataTable>
```

**Why compound over a 40-prop monolith:**
- Each subcomponent reads context from the parent — no prop drilling.
- Consumers compose what they need; missing pieces don't take props they ignore.
- Slot-based — Adobe Analytics can add custom toolbar, Adobe Sign can omit pagination.

**Implementation backbone:**
```tsx
const TableCtx = createContext<TableState | null>(null);

function DataTable({ data, children }) {
  const state = useTableState({ data });
  return <TableCtx.Provider value={state}>{children}</TableCtx.Provider>;
}
DataTable.Search = function Search() {
  const { setQuery } = useContext(TableCtx)!;
  return <input onChange={(e) => setQuery(e.target.value)} />;
};
```

**Senior signal:** Mention **headless components** (Adobe's React Aria, Radix, TanStack Table). Behavior in hooks, zero styles — consumers bring their own design system. This is exactly how React Aria is built.

---

## 2. State Management — Local, Lifted, Global, Server

**Q: Where does state live in a large React app?**

Four tiers, decide by **scope** and **owner**:

| Tier | Lives in | Examples |
|------|----------|----------|
| Local | `useState` / `useReducer` | Form field value, "is dropdown open" |
| Lifted | Nearest common parent | Shared between two siblings |
| Global app state | Redux / Zustand / Context | User profile, theme, feature flags |
| Server state | TanStack Query / RTK Query / SWR | API data, with caching and revalidation |

**The mistake:** putting server data in Redux and writing your own loading/error/cache logic. **Server state has its own lifecycle** (stale, fetching, retrying, invalidating) — let a server-state library handle it.

**Adobe-specific:** Spectrum uses **React Stately** for component state hooks (`useToggleState`, `useSelectState`, etc.). These return a state object you wire into React Aria behavior hooks. Same separation: state ↔ behavior ↔ presentation.

---

## 3. Render Performance — When React Renders Too Much

**Q: A list of 5,000 rows rerenders on every keystroke in an unrelated search box. Why? Fix?**

**Why:**
- Search input lives in a parent component.
- Parent's `setState` rerenders every child by default.
- React's reconciliation walks the whole tree; even if shallow-equal, it still calls each function component.

**Fix layers (apply in order — don't jump to `memo` first):**

1. **Move state down.** Push the search input + its state into its own component. Parent doesn't re-render.
2. **Split the tree.** Render list in a sibling, not a child of the search.
3. **`React.memo` the row.** Wrap `Row` with `memo` so it only rerenders when its props change.
4. **Stable callbacks.** `useCallback` for handlers passed to memoized children. Otherwise prop identity changes every render and `memo` does nothing.
5. **Virtualization.** 5,000 DOM nodes is wasteful even without rerenders. Use `react-window` or `react-virtuoso` to render only the visible ~30.

```tsx
const Row = memo(function Row({ item, onClick }) { ... });

function List({ items }) {
  const onClick = useCallback((id) => doThing(id), []);
  return <FixedSizeList itemCount={items.length} itemSize={48} height={600} width="100%">
    {({ index, style }) => <Row item={items[index]} onClick={onClick} style={style} />}
  </FixedSizeList>;
}
```

---

## 4. Code Splitting & Bundle Architecture

**Q: Adobe Express has 50+ features. How do you keep the initial bundle under 300KB gzipped?**

**Three axes:**

1. **Route-based** — `React.lazy` + `Suspense` on each route. Initial bundle only contains the landing page.
2. **Feature-based** — heavy features (video editor, AI generation) split into their own chunks, loaded on user intent.
3. **Vendor-based** — split `node_modules` into long-cache vendor chunks; app code rebuilds without invalidating vendors.

```tsx
const VideoEditor = React.lazy(() => import('./features/VideoEditor'));

<Suspense fallback={<Spinner />}>
  <VideoEditor />
</Suspense>
```

**Adobe-specific senior moves:**
- **Module Federation** — Adobe is a poster-child user. Different teams ship independently-versioned remote modules consumed by the host shell at runtime. Express loads "AI text-to-image" from a remote built by another team.
- **Tree-shaking discipline** — only export what's needed; `import { Button } from '@spectrum/react'` must not pull in the entire library.
- **Lazy hydration** — for SSR pages, defer hydrating below-the-fold components until they enter the viewport.

---

## 5. Micro-frontend Architecture

**Q: When would you split a frontend into micro-frontends, and when is it overkill?**

**Use when:**
- Multiple independent teams own non-overlapping product areas.
- Independent deploy cycles required (Team A ships hourly, Team B monthly).
- Mixed tech stacks (React + legacy Angular section).

**Don't use when:**
- Single team / single deploy cadence — pure overhead.
- Tight design coupling (every page shares 80% UI) — duplication explodes.

**Integration techniques:**
| Approach | Boundary | Pros | Cons |
|----------|----------|------|------|
| Build-time integration | npm packages | Single bundle, fast | Deploys coupled |
| Server-side composition (Edge SSR) | HTML fragments | Fast first paint | Complex infra |
| Run-time via iframes | Browser sandbox | Strong isolation | Slow, communication overhead |
| **Module Federation (Webpack 5+)** | Remote chunks | Independent deploy, shared deps | Version skew risk |
| Web Components | DOM | Framework-agnostic | Limited interop |

**Adobe context:** Experience Cloud is the canonical example — Analytics, Target, AEM, Commerce all under one shell, each owned by separate orgs, each shipping independently.

---

## 6. Design System Architecture

**Q: How would you design a design system used by 50 product teams?**

**Layered architecture:**

```
┌──────────────────────────────────────────┐
│  Layer 4: Product components             │
│  (DataDashboard, AssetGrid — per team)   │
├──────────────────────────────────────────┤
│  Layer 3: Patterns                       │
│  (Form, Modal, NavigationBar)            │
├──────────────────────────────────────────┤
│  Layer 2: Primitives                     │
│  (Button, Input, Checkbox)               │
├──────────────────────────────────────────┤
│  Layer 1: Tokens                         │
│  (color-blue-500, space-200, font-body)  │
└──────────────────────────────────────────┘
```

**Tokens** are JSON, not CSS. Build step generates CSS variables, iOS Swift constants, Android XML — single source for all platforms. This is exactly what **Spectrum Tokens** does at Adobe.

**Component contract:**
- **Behavior** (React Aria hooks) — owned by DS team, reused by everyone.
- **Style** (Spectrum theme) — owned by DS team.
- **Composition** — product teams compose primitives into their own patterns.

**Versioning:** Semantic versioning on the DS package. Major bumps require a migration codemod published alongside. Breaking changes ship behind feature flags so product teams adopt at their own pace.

---

## 7. Data Fetching Architecture

**Q: How do you architect data fetching for an editor where many panels show different slices of the same document?**

**Patterns ranked:**

1. **Single source, derived selectors** (Redux + reselect, Zustand selectors): one fetch loads the doc, panels read computed slices. Avoids N requests; reactivity is automatic.
2. **Normalized cache** (Apollo, RTK Query, TanStack Query with select): server response normalized by id. Asset shows up once, referenced from many panels.
3. **Suspense + lazy resources** (React 19+): each panel suspends on its own resource; parent renders a single fallback or each panel its own.

```tsx
// TanStack Query with selectors — read only what each panel needs
const useDocAssetCount = (id: string) =>
  useQuery({
    queryKey: ['doc', id],
    queryFn: () => fetchDoc(id),
    select: (doc) => doc.assets.length, // panel only rerenders if count changes
  });
```

**Senior insight:** Prefetch on hover for likely-next navigation. `onMouseEnter` queues the fetch before the click — sub-100ms perceived nav.

---

## 8. Error Boundaries & Resilience

**Q: One panel in Adobe Express crashes. The whole canvas goes white. Architecturally — what went wrong?**

**The mistake:** single error boundary at the app root. Any throw bubbles up and remounts the world.

**Fix — boundary granularity:**

```tsx
<AppShell>
  <ErrorBoundary fallback={<TopBarFallback />}>
    <TopBar />
  </ErrorBoundary>
  <ErrorBoundary fallback={<CanvasFallback />}>
    <Canvas />  {/* most critical — own boundary */}
  </ErrorBoundary>
  <ErrorBoundary fallback={<PanelFallback />}>
    <PropertyPanel />  {/* if this crashes, canvas survives */}
  </ErrorBoundary>
</AppShell>
```

**Pair with:**
- **Reset key** — `<ErrorBoundary resetKeys={[routeId]}>` re-attempts on navigation.
- **Telemetry** — `componentDidCatch` reports to Sentry / Adobe's internal observability.
- **Async errors** — error boundaries don't catch errors in event handlers or promises. Wrap async logic in try/catch and call `useErrorBoundary().showBoundary(err)`.

---

## 9. Rendering Strategies — CSR vs SSR vs SSG vs ISR

**Q: Adobe Express landing page vs the editor itself — different rendering strategies. Why?**

| Strategy | When | Adobe example |
|----------|------|---------------|
| **CSR** (client-side) | App-like, requires auth, deep interactivity | The editor itself |
| **SSR** (server-side) | SEO-critical, personalized | Marketing pages with logged-in user data |
| **SSG** (static) | Public, content-driven | Help docs, blog, template gallery |
| **ISR** (incremental) | SSG with frequent content updates | Template detail pages — rebuilt on demand |
| **RSC** (React Server Components) | Mix server + client, no hydration cost | Future state — Adobe is experimenting |

**Hybrid is normal:** SSG shell + CSR for the authenticated editor + ISR for content pages. Next.js / Remix make this composable per route.

---

## 10. Real-time Collaboration Architecture

**Q: Design real-time collaborative editing for Adobe Express (Figma-like).**

**Two camps:**

| | OT (Operational Transform) | CRDT (Conflict-free Replicated Data Type) |
|---|---|---|
| How | Server transforms concurrent ops into a consistent order | Ops commute regardless of order |
| Used by | Google Docs | Figma, Linear, Adobe Express (newer) |
| Server | Required (authority) | Optional (peer-to-peer possible) |
| Complexity | Server logic per op type | Client library handles merging |
| Offline | Hard | Native — merge on reconnect |

**Architecture sketch:**
```
Client A ─┐
          ├─→ WebSocket (or WebRTC) ─→ Server (CRDT log persistence)
Client B ─┘                              │
                                         └─→ Pub/sub fan-out to all clients
```

**Components:**
- **Transport:** WebSocket for low latency; WebRTC for peer mesh on small docs.
- **Awareness:** Cursors, selection, presence — broadcast separately from doc ops (no need to persist).
- **Persistence:** Op log appended; snapshots periodically to bound replay cost.
- **Conflict resolution:** CRDT (e.g. Yjs) — built-in.

**Senior signal:** Mention **Yjs / Automerge** by name. Bring up tradeoffs: CRDT payloads can balloon (each op has metadata) — periodic GC and snapshotting matter.

---

## 11. Architectural Patterns — MVC, MVVM, Flux

**Q: React/Redux is which pattern?**

**Flux** (unidirectional data flow):
```
Action → Dispatcher → Store → View → Action
```
Redux is a Flux implementation with a single store and pure reducers.

**MVVM** (used in Knockout, old-school WPF; Vue is MVVM-ish):
- View binds to ViewModel via two-way bindings; ViewModel manipulates Model.

**MVC** (Backbone era):
- Controller mediates between Model and View; multiple cycles, easy to tangle.

**Why Flux/Redux won for large apps:** unidirectional flow makes state changes traceable. Time-travel debugging, Redux DevTools — only possible because every state change is an explicit action.

**Where Redux is overkill:** small apps. Use `useReducer` + Context, or Zustand (Flux principles, far less boilerplate).

---

## 12. Testing Architecture

**Q: How do you structure tests for a UI component library at Adobe scale?**

**The pyramid (inverted at component-library level):**

```
       /\
      /  \   E2E (Playwright) — full user flows, few
     /----\
    /      \  Integration (RTL) — component + its hooks
   /--------\
  /          \  Unit (Jest) — pure utils, reducers, hooks
 /────────────\
                Visual regression (Chromatic) — every story
                A11y (axe-core) — every story
                Cross-browser (BrowserStack) — every release
```

**For Spectrum-class libraries:**
- **Storybook** per component → drives docs, visual regression, a11y test, devtest playground in one.
- **Every story** auto-runs through `axe-core` — accessibility regressions fail the build.
- **Behavior tests** with React Testing Library — query by `role`, never by `data-testid` (forces semantic markup).

---

## What Adobe Cares About (Round 2 UI Architecture Signal)

When asked any "how would you design ___?" question, structure your answer:

1. **Boundaries** — what's a component, what's a service, what's a package.
2. **Ownership** — who can change what without breaking whom.
3. **Tradeoffs** — name the alternative you rejected and why.
4. **Failure modes** — what breaks at scale (10× users, 100× docs, offline, slow network).
5. **Migration story** — how a team adopts your design incrementally.

Mid-level answers "what". Senior answers "what, with what alternatives rejected, and how it fails".
