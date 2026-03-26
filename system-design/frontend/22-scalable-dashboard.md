# 22. Design a Scalable Dashboard

> **Scope:** B2B dashboards — RBAC-filtered widgets, virtual tables, BFF aggregation, real-time row updates. For time-series / metrics dashboards (live charts, downsampling, snapshot+delta), see [Q11 — Real-time Dashboard](./q11-real-time-dashboard.md).

## Clarifying Questions

Before diving into architecture, ask these to bound the problem:

1. **Widget count and ownership** — 10 widgets owned by one team, or 50+ widgets across 8 product teams? This determines whether micro-frontends are worth the ops overhead.
2. **RBAC granularity** — Is access control at the dashboard level ("can you see this page?") or at the individual widget level ("finance users see revenue widget, support users see ticket widget")?
3. **Real-time data** — Which widgets need live updates (charts, counters)? What latency tolerance? Sub-second requires WebSocket; 10-second intervals are fine with polling.
4. **Data sources** — Do all widgets pull from one API, or do they fan out to separate microservices? This drives the BFF decision.
5. **Mobile / responsive** — Same widget set or different layout entirely on mobile?
6. **Tenancy** — Multi-tenant SaaS where each customer configures their own widget layout, or a fixed internal dashboard?

Assume for this answer: ~20 widgets, multi-team ownership, per-widget RBAC from a server manifest, mix of real-time and polling data, single-page app shell with module federation or dynamic imports.

---

## Architecture Diagram

```
Browser
┌─────────────────────────────────────────────────────────────┐
│  Shell App                                                  │
│  ┌──────────────┐    ┌────────────────────────────────────┐ │
│  │  Auth / Nav  │    │  Layout Grid (CSS Grid / Mosaic)   │ │
│  └──────────────┘    └────────────────────────────────────┘ │
│                                                             │
│  Widget Registry (manifest from server, filtered by RBAC)  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [RevenueWidget] [TicketWidget] [UsageWidget] ...    │  │
│  │   dynamic import()  dynamic import()  lazy()         │  │
│  └──────────────────────────────────────────────────────┘  │
│          │                   │                   │          │
│   ErrorBoundary       ErrorBoundary        ErrorBoundary    │
│          │                   │                   │          │
│   React Query         React Query          React Query      │
│   (own cache key)     (own cache key)      (own cache key)  │
└──────────┬────────────────────┬────────────────────┬────────┘
           │                    │                    │
           ▼                    ▼                    ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │  BFF Layer  │     │  BFF Layer  │     │ Direct API  │
    │  /dashboard │     │  /tickets   │     │ /usage-svc  │
    │  (merges    │     │             │     │             │
    │  3 sources) │     │             │     │             │
    └──────┬──────┘     └──────┬──────┘     └─────────────┘
           │                   │
     ┌─────▼──────┐    ┌───────▼──────┐
     │ Revenue DB │    │ Ticket DB    │
     │ Billing API│    │              │
     │ FX Rates   │    │              │
     └────────────┘    └──────────────┘
```

---

## Core Mechanics

### 1. Widget Isolation via Dynamic Import + Error Boundary

Each widget is loaded independently. A crash in the RevenueWidget does not take down the TicketWidget or the shell. This is the single most important correctness property.

```tsx
// WidgetSlot.tsx — generic slot that loads any widget by name
import { Suspense, lazy, Component, ReactNode } from 'react';

class WidgetErrorBoundary extends Component<
  { name: string; children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // report to your RUM / error tracking
    reportWidgetError({ widgetName: this.props.name, error, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="widget-error">
          <p>{this.props.name} failed to load.</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Widget registry — maps widget id to its lazy-loaded component
const WIDGET_REGISTRY: Record<string, React.LazyExoticComponent<any>> = {
  revenue:   lazy(() => import('./widgets/RevenueWidget')),
  tickets:   lazy(() => import('./widgets/TicketWidget')),
  usage:     lazy(() => import('./widgets/UsageWidget')),
  // module-federation remote: lazy(() => import('teamB/SalesWidget'))
};

interface WidgetSlotProps {
  widgetId: string;
  config: Record<string, unknown>;
  aboveFold: boolean;
}

export function WidgetSlot({ widgetId, config, aboveFold }: WidgetSlotProps) {
  const WidgetComponent = WIDGET_REGISTRY[widgetId];
  if (!WidgetComponent) return null;

  return (
    <WidgetErrorBoundary name={widgetId}>
      <Suspense fallback={<WidgetSkeleton />}>
        <WidgetComponent config={config} aboveFold={aboveFold} />
      </Suspense>
    </WidgetErrorBoundary>
  );
}
```

With Module Federation (multi-team scenario), the registry entry becomes `lazy(() => import('teamB/SalesWidget'))` where `teamB` is a remote defined in webpack config. Each team deploys their widget independently.

---

### 2. BFF Pattern — One Aggregated Call vs N Fan-Out Calls

Without a BFF, a dashboard with 10 widgets that each hit a different microservice results in 10 parallel browser requests, each with its own auth header, CORS overhead, and cold-start cost. The BFF (Backend for Frontend) is a thin server-side aggregation layer — often a Node.js service — that makes the N calls server-side (low latency on private network) and returns one merged payload.

```typescript
// bff/routes/dashboard.ts — example BFF aggregation
import { Router } from 'express';
import { fetchRevenue, fetchTickets, fetchUsage } from '../services';

const router = Router();

// Single endpoint the dashboard calls on load
router.get('/dashboard/summary', async (req, res) => {
  const userId = req.user.id;
  const roles  = req.user.roles;

  // Fire all permitted service calls in parallel
  const [revenue, tickets, usage] = await Promise.allSettled([
    roles.includes('finance') ? fetchRevenue(userId) : Promise.resolve(null),
    fetchTickets(userId),
    fetchUsage(userId),
  ]);

  res.json({
    revenue: revenue.status === 'fulfilled' ? revenue.value : null,
    tickets: tickets.status === 'fulfilled' ? tickets.value : null,
    usage:   usage.status === 'fulfilled'   ? usage.value   : null,
    // partial failures are surfaced, not thrown — shell decides how to render
  });
});
```

Key detail: use `Promise.allSettled`, not `Promise.all`. If the revenue service is down, the rest of the dashboard still loads. The client receives `null` for that widget and renders a degraded state rather than a full failure.

---

### 3. Per-Widget React Query with Independent Refetch Intervals

Once the initial summary loads from the BFF, each widget manages its own live-data subscriptions using React Query. This gives each widget the autonomy to define its own freshness requirement.

```tsx
// widgets/RevenueWidget.tsx
import { useQuery } from '@tanstack/react-query';

export function RevenueWidget({ config }: { config: { currency: string } }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['widget', 'revenue', config.currency],
    queryFn: () => fetch(`/api/revenue?currency=${config.currency}`).then(r => r.json()),
    staleTime: 30_000,         // treat data as fresh for 30s
    refetchInterval: 60_000,  // poll every 60s in background
    // stale-while-revalidate: returns cached data immediately, fetches in background
  });

  if (isLoading) return <WidgetSkeleton rows={4} />;
  if (isError)   return <WidgetError message="Revenue data unavailable" />;

  return <RevenueChart data={data} currency={config.currency} />;
}

// widgets/LiveCounterWidget.tsx — needs sub-second updates
export function LiveCounterWidget() {
  const { data } = useQuery({
    queryKey: ['widget', 'live-counter'],
    queryFn: () => fetch('/api/counter').then(r => r.json()),
    refetchInterval: 5_000,   // every 5s — different from RevenueWidget
    refetchIntervalInBackground: false, // pause when tab not focused
  });

  return <Counter value={data?.count ?? 0} />;
}
```

The critical insight is that `queryKey` isolation means each widget's cache, loading state, and error state are completely independent. One widget fetching slowly does not block another from rendering.

---

### 4. RBAC — Server-Driven Widget Manifest

The server returns a manifest of widgets the current user is allowed to see, filtered by role. The client never decides what to show based on a role string it received — the server makes that decision and returns only the allowed widget IDs.

```typescript
// Server: returns manifest filtered by user's roles
// GET /api/dashboard/manifest
{
  "layout": "2-col",
  "widgets": [
    { "id": "revenue",  "position": { "col": 1, "row": 1, "span": 2 }, "config": { "currency": "USD" } },
    { "id": "tickets",  "position": { "col": 1, "row": 2, "span": 1 }, "config": {} },
    { "id": "usage",    "position": { "col": 2, "row": 2, "span": 1 }, "config": { "days": 30 } }
  ]
}
// A support agent would receive tickets + usage, but NOT revenue
```

```tsx
// Shell.tsx — renders whatever manifest says, no client-side role checks
function Dashboard() {
  const { data: manifest } = useQuery({
    queryKey: ['dashboard', 'manifest'],
    queryFn: () => fetch('/api/dashboard/manifest').then(r => r.json()),
    staleTime: Infinity, // layout rarely changes; refetch on window focus
  });

  if (!manifest) return <DashboardSkeleton />;

  return (
    <GridLayout layout={manifest.layout}>
      {manifest.widgets.map((widget, index) => (
        <GridItem key={widget.id} position={widget.position}>
          <WidgetSlot
            widgetId={widget.id}
            config={widget.config}
            aboveFold={index < 4} // first 4 widgets are above the fold
          />
        </GridItem>
      ))}
    </GridLayout>
  );
}
```

This pattern also enables A/B testing and feature flags — the server can return different manifests to different user cohorts without any client-side changes.

---

### 5. Performance — Skeletons, Priority Fetch, Deferred Below-Fold

Above-fold widgets get their data fetch triggered immediately. Below-fold widgets defer their fetch until they enter the viewport using IntersectionObserver.

```tsx
// hooks/useWidgetVisibility.ts
import { useEffect, useRef, useState } from 'react';

export function useWidgetVisibility(aboveFold: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(aboveFold); // above-fold starts visible

  useEffect(() => {
    if (aboveFold) return; // no observer needed
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { rootMargin: '200px' } // start fetching 200px before visible
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [aboveFold]);

  return { ref, isVisible };
}

// WidgetSlot.tsx — deferred fetch for below-fold widgets
function WidgetSlot({ widgetId, config, aboveFold }: WidgetSlotProps) {
  const { ref, isVisible } = useWidgetVisibility(aboveFold);

  return (
    <div ref={ref}>
      {isVisible ? (
        <WidgetErrorBoundary name={widgetId}>
          <Suspense fallback={<WidgetSkeleton />}>
            <WidgetComponent config={config} />
          </Suspense>
        </WidgetErrorBoundary>
      ) : (
        <WidgetSkeleton /> // placeholder holds layout space, no fetch yet
      )}
    </div>
  );
}
```

**Skeleton loaders** are preferred over spinners for dashboards because they communicate the shape of the content that's coming. The grid layout should be fixed by the manifest before data arrives so there's zero layout shift (CLS = 0).

---

## Trade-off Analysis

### MFE (Module Federation) vs Monolith

| Dimension | MFE | Monolith |
|---|---|---|
| Team autonomy | Each team deploys independently | Coordinated releases required |
| Bundle size | Shared vendor chunks via federation | Single optimized bundle |
| Ops complexity | Multiple build pipelines, version negotiation | Simple CI |
| Startup latency | Extra network round-trips for remote loading | Single chunk download |
| Fault isolation | One team's bad deploy only breaks their widget | One bad commit blocks everyone |

**Recommendation**: Start monolithic. Extract to MFE only when team count or deploy frequency makes coordination genuinely painful. The error boundary pattern works regardless — it's not an MFE-specific technique.

### BFF vs Direct Microservice Calls

| Dimension | BFF | Direct calls |
|---|---|---|
| Request count | 1 aggregated call | N parallel calls |
| Auth surface | One token, one service validates | Token sent to N services |
| Caching | BFF can cache + serve stale | Each call cold |
| Coupling | Dashboard team owns BFF | Dashboard team depends on N teams' APIs |
| Failure isolation | BFF returns partial data gracefully | One slow service blocks all |

**Recommendation**: Use a BFF for the initial page load ("summary" call). Let individual widgets make their own calls for live/frequent updates. Do not put WebSocket subscriptions through the BFF.

### Server-Driven Layout vs Client-Driven Layout

Server-driven (manifest from API) allows role-based, experiment-based, and tenant-based customization without client deploys. Client-driven (hardcoded grid) is simpler but requires a deploy for any layout change. For a multi-tenant SaaS dashboard, server-driven is worth the added complexity. For an internal admin tool, hardcoded layout is usually fine.

---

## Closing Statement

A scalable dashboard is not a technology problem — it's a decomposition problem. The goal is to ensure that each widget is independently loadable, independently cacheable, independently renderable, and independently failable. Error boundaries and dynamic imports give you fault isolation. A BFF gives you load efficiency. React Query with per-widget cache keys gives you independent freshness control. And a server-driven manifest gives you RBAC, A/B testing, and tenant customization without client-side complexity. I would start with the simplest version of each of these — a monolith with lazy imports, a single BFF endpoint, and a static manifest — and introduce MFE and dynamic manifests only when the team size or product requirements genuinely require it.
