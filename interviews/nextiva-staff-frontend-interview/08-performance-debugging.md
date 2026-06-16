# Performance, Debugging & Scalability — Nextiva Staff FE Q&A

---

## Q1: Core Web Vitals — what they measure

| Metric | Measures | Good threshold |
|--------|----------|----------------|
| **LCP** | Largest Contentful Paint — loading | ≤ 2.5s |
| **INP** | Interaction to Next Paint — responsiveness | ≤ 200ms |
| **CLS** | Cumulative Layout Shift — visual stability | ≤ 0.1 |

**Staff approach:** Set performance budgets per route; track in RUM (Datadog, Sentry, web-vitals).

---

## Q2: Diagnose a slow React page — your process

1. **Reproduce** — which route, which device/network?
2. **Lighthouse / Web Vitals** — identify LCP element, long tasks
3. **React DevTools Profiler** — which components re-render excessively?
4. **Network tab** — waterfall, large payloads, missing cache headers
5. **Bundle analyzer** — `rollup-plugin-visualizer` / `webpack-bundle-analyzer`
6. **Fix → measure → ship** — document before/after metrics

---

## Q3: Common LCP fixes

- Preload hero image / critical font (`<link rel="preload">`)
- SSR or static shell for above-the-fold content
- Reduce JS blocking parse — code split below-fold routes
- CDN + proper cache headers for static assets
- Avoid lazy-loading LCP image (`loading="eager"` + `fetchpriority="high"`)

---

## Q4: INP / interaction latency fixes

- Break up long tasks (`scheduler.yield()`, `startTransition`)
- Debounce expensive handlers
- Web Worker for heavy computation (search indexing)
- Virtualize long lists
- Avoid layout thrashing — batch DOM reads/writes

```javascript
// Layout thrashing anti-pattern
els.forEach(el => {
  const h = el.offsetHeight; // read
  el.style.height = h + 10 + 'px'; // write — forces reflow each iteration
});

// Fix: batch reads, then writes
const heights = els.map(el => el.offsetHeight);
els.forEach((el, i) => { el.style.height = heights[i] + 10 + 'px'; });
```

---

## Q5: CLS fixes

- Explicit `width`/`height` on images and embeds
- Reserve space for dynamic content (skeleton loaders)
- Don't inject content above existing content
- `font-display: optional` or preload fonts to avoid FOIT/FOUT shift

---

## Q6: Code splitting strategies

```typescript
// Route-level
const AdminPortal = lazy(() => import('./AdminPortal'));

// Component-level (heavy chart lib)
const AnalyticsChart = lazy(() => import('./AnalyticsChart'));

<Suspense fallback={<ChartSkeleton />}>
  <AnalyticsChart data={data} />
</Suspense>
```

**Staff decision:** Split at route boundaries first; component-level only for proven heavy deps.

---

## Q7: Memoization — when it helps

**Helps when:**
- Child is expensive to render AND receives stable props
- Computation is genuinely costly (large array transform)
- Referential equality matters (context value, memo deps)

**Hurts when:**
- Cheap components — memo overhead > render cost
- Props always new references — memo is useless
- Premature `useCallback` everywhere — readability cost

**Rule:** Profile first; memo second.

---

## Q8: Virtualization

```typescript
// @tanstack/react-virtual — 10,000 rows, ~20 DOM nodes
const rowVirtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => containerRef.current,
  estimateSize: () => 48,
  overscan: 10,
});
```

**When required:** Message lists, call logs, contact directories, data tables.

---

## Q9: Network performance

- **HTTP/2** multiplexing — many small assets OK on one connection
- **Compression** — Brotli for text assets
- **Caching** — `Cache-Control` for static; `stale-while-revalidate` for API
- **Pagination** — cursor-based for real-time feeds (stable under inserts)
- **GraphQL** — beware over-fetching; prefer field selection discipline
- **Prefetch** — on hover/focus for likely navigation

---

## Q10: Memory leak debugging

**Chrome DevTools workflow:**
1. Heap snapshot before action
2. Perform action (navigate away and back)
3. Heap snapshot after — compare detached nodes
4. Look for retained event listeners, closures, timers

**React-specific:**
- Missing `useEffect` cleanup
- Subscriptions outside React (global event bus) without unsubscribe

---

## Q11: Scalability — frontend at product scale

| Challenge | Strategy |
|-----------|----------|
| Large codebase | Monorepo + module boundaries + lint rules |
| Many teams | Design system + RFC process |
| Frequent deploys | Feature flags + canary |
| Real-time at scale | Virtualization + event batching + worker offload |
| i18n | Lazy-load locale bundles; ICU message format |
| Multi-tenant white-label | CSS variables / theme tokens per tenant |

---

## Q12: Production debugging story template (STAR)

> "Agents reported inbox lag after a release. I checked RUM — INP spiked on message send. Profiler showed full list re-render on each keystroke. Root cause: message state lived in parent context. Fix: colocated input state + virtualized list + `startTransition` for filter. INP dropped from 450ms to 80ms; zero regressions in 2 weeks of monitoring."

---

## Q13: Service Worker / PWA (optional depth)

- Cache static assets (app shell)
- **Don't cache WebSocket or real-time API** blindly
- Background sync for offline message queue
- Trade-off: cache invalidation complexity

---

## Q14: Performance monitoring in CI

```bash
# Lighthouse CI in pipeline
lhci autorun --config=lighthouserc.json

# Bundle size gate
bundlesize --config .bundlesize.json
```

**Budget example:** Main chunk < 200KB gzip; route chunks < 50KB gzip.
