# Q7. B2B Dashboard (Tables, RBAC)

**Prompt variants:** Stripe-style dashboard; permissions by role.

[← Question index](./README.md)

**Also:** [Micro frontends](../micro-frontends.md)

---

### One-line mental model

The UI is **permission-aware but not permission-authoritative**: the server decides; the client codesplits by route and virtualizes dense tables without shipping the whole product in one bundle.

### Clarify scope in the interview

- How many distinct roles? Is it flat (admin/member/viewer) or hierarchical/attribute-based?
- Multi-tenant: does org-switching happen in the same session?
- Table scale: how many rows per page? Export to CSV? Real-time data?
- Audit logs: read-only views or interactive filtering?
- Compliance: PII masking, field-level encryption display?

### Goals & requirements

**Functional:**
- Role-aware navigation (routes, actions, fields visible per role)
- Dense data tables with sort, filter, pagination, column customization
- Detail drawers / side panels without full page navigation
- Critical flows: create/edit/delete entities guarded by permissions
- Wizard forms with recoverable drafts

**Non-functional:**
- RBAC correctness — forbidden actions must never succeed even if the client renders them
- Table performance: 10k+ rows with smooth scroll (virtualization)
- Shareability: filtered/sorted table state lives in URL
- Cold start TTI < 2s on the heaviest route

---

### High-level frontend architecture

```
  Browser
  ┌──────────────────────────────────────────────────────────────┐
  │  Auth Bootstrap                                              │
  │  ┌─────────────────────────────────────────────────────┐    │
  │  │  GET /me  →  { userId, orgId, role, permissions[] } │    │
  │  │  GET /ui-manifest  →  { routes[], features{} }      │    │
  │  └──────────────┬──────────────────────────────────────┘    │
  │                 │ resolved capabilities                      │
  │  ┌──────────────▼──────────────────────────────────────┐    │
  │  │  App Shell  (always loaded, ~30 kB)                 │    │
  │  │  ┌──────────┐  ┌───────────────────────────────┐   │    │
  │  │  │  Nav     │  │  Route Outlet                 │   │    │
  │  │  │ (gated)  │  │  (lazy chunk per route)       │   │    │
  │  │  └──────────┘  └───────────────────────────────┘   │    │
  │  └──────────────┬──────────────────────────────────────┘    │
  │                 │                                            │
  │  ┌──────────────▼──────────────────────────────────────┐    │
  │  │  BFF / GraphQL Layer                                │    │
  │  │  Coalesces REST micro-services; field-level auth    │    │
  │  └──────────────┬──────────────────────────────────────┘    │
  │                 │                                            │
  │  ┌──────────────▼──────────────────────────────────────┐    │
  │  │  Virtualized Data Grid                              │    │
  │  │  Virtual window  ←→  Column defs  ←→  Server page  │    │
  │  └─────────────────────────────────────────────────────┘    │
  └──────────────────────────────────────────────────────────────┘

  Server side
  ┌──────────┐   ┌──────────────┐   ┌──────────────────────┐
  │  Auth /  │   │  BFF         │   │  Micro-services       │
  │  IAM     │──▶│  (GraphQL or │──▶│  Payments, Users,     │
  │  service │   │   REST agg.) │   │  Invoices, ...        │
  └──────────┘   └──────────────┘   └──────────────────────┘
```

**Bootstrap sequence (step by step):**

1. App shell loads (~30 kB, no feature chunks yet).
2. `GET /me` returns `{ userId, orgId, role: "admin", permissions: ["invoice.read", "invoice.write", "user.read"] }`.
3. `GET /ui-manifest` returns a route map — which routes this user can even see. Server signs this; client does not fabricate it.
4. React Router (or equivalent) builds a dynamic route tree from the manifest; any route not in the manifest 404s immediately client-side with no chunk download.
5. User navigates → lazy chunk downloads for that route only.
6. Each page component calls `usePermission()` to conditionally render actions.

---

### What the client does (core mechanics)

#### 1. Auth bootstrap and permission hook

```typescript
// types
interface Me {
  userId: string;
  orgId: string;
  role: 'admin' | 'member' | 'viewer';
  permissions: string[]; // ["invoice.read", "invoice.write", ...]
}

// Context set once at app boot
const AuthContext = createContext<Me | null>(null);

// Hook consumed anywhere in the tree
function usePermission(permission: string): boolean {
  const me = useContext(AuthContext);
  if (!me) return false;
  return me.permissions.includes(permission);
}

// Usage in a component
function InvoiceActions({ invoiceId }: { invoiceId: string }) {
  const canWrite = usePermission('invoice.write');
  const canDelete = usePermission('invoice.delete');

  return (
    <ActionMenu>
      {/* Always show Edit, disable if no permission — user knows it exists */}
      <MenuItem
        onClick={() => openEditDrawer(invoiceId)}
        disabled={!canWrite}
        aria-disabled={!canWrite}
        title={!canWrite ? 'You need write access to edit invoices' : undefined}
      >
        Edit
      </MenuItem>

      {/* Hide Delete entirely — reduces clutter for viewer role */}
      {canDelete && (
        <MenuItem onClick={() => confirmDelete(invoiceId)} variant="danger">
          Delete
        </MenuItem>
      )}
    </ActionMenu>
  );
}
```

**Rule:** hide completely when the feature is irrelevant to the role; disable (with tooltip) when the feature is relevant but temporarily restricted — so users know it exists and can request access or upgrade.

#### 2. Route-level permission guard

```typescript
// Route manifest from server drives this — not hardcoded
function PermissionGuard({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const allowed = usePermission(permission);
  const location = useLocation();

  if (!allowed) {
    // Don't silently redirect — show a clear 403 page
    return <ForbiddenPage requestedPath={location.pathname} />;
  }
  return <>{children}</>;
}

// In router definition
<Route
  path="/settings/billing"
  element={
    <PermissionGuard permission="billing.read">
      <Suspense fallback={<SkeletonPage />}>
        <BillingPage />
      </Suspense>
    </PermissionGuard>
  }
/>
```

**Never trust the client.** If the user manipulates the route manifest in DevTools, the BFF still returns 403. The client guard is UX, not security.

#### 3. Virtualized data grid with server-side sort/filter/pagination

```typescript
// URL is the source of truth for filter state — shareable links
// /invoices?status=overdue&sort=amount&dir=desc&cursor=eyJ...

function useTableState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    status: searchParams.get('status') ?? 'all',
    sort: searchParams.get('sort') ?? 'createdAt',
    dir: (searchParams.get('dir') ?? 'desc') as 'asc' | 'desc',
    cursor: searchParams.get('cursor') ?? undefined,
  };

  const setFilter = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(key, value);
      next.delete('cursor'); // reset pagination on filter change
      return next;
    });
  };

  return { filters, setFilter };
}

// Virtual row rendering — only DOM nodes in the viewport exist
function InvoiceTable() {
  const { filters } = useTableState();
  const { data, fetchNextPage } = useInfiniteQuery({
    queryKey: ['invoices', filters],
    queryFn: ({ pageParam }) =>
      fetchInvoices({ ...filters, cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor,
  });

  const rows = data?.pages.flatMap((p) => p.items) ?? [];

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48, // row height px
    overscan: 5,
  });

  return (
    <div ref={tableContainerRef} style={{ height: '600px', overflow: 'auto' }}>
      <table style={{ height: rowVirtualizer.getTotalSize() }}>
        <tbody>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <tr
                key={row.id}
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <td>{row.invoiceNumber}</td>
                <td>{row.amount}</td>
                <td>{row.status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

**Cursor pagination** rather than offset: offset breaks when rows are inserted mid-query; cursor is stable. The server encodes sort position + id in the cursor (base64 JSON).

#### 4. 403 handling on mutations

```typescript
async function deleteInvoice(id: string) {
  try {
    await api.delete(`/invoices/${id}`);
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    toast.success('Invoice deleted');
  } catch (err) {
    if (err.status === 403) {
      // Client said "you can delete" but server disagreed — show clear message
      toast.error('You no longer have permission to delete invoices. Refresh to update your access.');
      // Optionally re-fetch /me to sync permissions
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } else {
      toast.error('Failed to delete invoice. Please try again.');
    }
  }
}
```

---

### Trade-offs

| Decision | Option A | Option B | Recommendation |
|---|---|---|---|
| Hide vs disable forbidden actions | **Hide** — cleaner UI for irrelevant roles | **Disable** with tooltip — user knows the feature exists | Disable for actions users might legitimately request access to; hide for actions that don't apply to the role at all |
| RBAC at route level vs component level | Route-level only — simpler, coarse | Component-level — fine-grained field/button control | Both: route guard for page access + `usePermission()` for inline actions |
| MFE vs monorepo SPA | MFE — independent deploys per team, true isolation | Monolith SPA — simpler shared state, one build | Monolith until you have 5+ independent teams deploying at different cadences; MFE adds real operational cost |
| Cursor vs offset pagination | Cursor — stable, works with real-time inserts | Offset — simple, jumpable to page N | Cursor for live data; offer offset only if "jump to page" is a hard requirement |
| URL as filter state vs in-memory | URL — shareable, survives refresh, back-button works | In-memory — simpler code | URL always for B2B tables — support tickets will reference URLs |
| Server-side vs client-side sort | Server-side — correct across pages | Client-side — instant, no round-trip | Server-side for any column that spans multiple pages; client-side sort is a lie for paginated data |

---

### Failure modes & degradation

- **Widget isolation:** Dashboard homepage is a grid of widgets. Each widget fetches independently. If the Invoices widget fails, the Users widget still loads. Use `ErrorBoundary` per widget, show a retry CTA, not a blank page.
- **Stale permissions:** User's role is changed by an admin mid-session. Client caches `/me` for 5 minutes. On the next mutation that returns 403, trigger a `/me` re-fetch and re-render the nav. Never silently fail.
- **Slow BFF:** Show skeleton loaders (not spinners) for table rows. After 10s, show a stale-data banner with a manual refresh button.
- **Org switch:** Invalidate the entire query cache on org switch; stale data from org A must never appear in org B's context.

---

### Accessibility checklist

- Tables use `<table>` with `<th scope="col">` and `<caption>` — not `<div>` grids (unless using ARIA grid role with full keyboard implementation).
- Virtual rows: announce row count changes via `aria-live="polite"` on a status region, not the table body (screen readers re-read the whole table).
- Sort buttons: `aria-sort="ascending"` on `<th>` when active.
- Action menus: roving `tabindex` so keyboard users can reach every action without Tab-flooding.
- Error states: `role="alert"` for critical errors; `aria-live="polite"` for non-critical status updates.
- Skip link at the top of the page to skip nav and jump directly to the table.

---

### Minute summary (closing)

"I'd treat RBAC as purely server-owned — the client hides or disables based on permissions from `GET /me`, but every mutation is enforced server-side and a 403 triggers a permission re-sync. The app shell is tiny and lazy-loads route chunks only when the manifest says the user can access them. Dense tables are virtualized with cursor pagination, and the full filter/sort state lives in the URL so B2B users can copy and share exact table views. Dashboard widgets are fault-isolated so a single failing data source doesn't blank the entire page."

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

- **Bootstrap:** `GET /me` returning capabilities → `GET /ui-manifest` → dynamic route tree unlocked.
- **Shell:** nav with permission-gated links + lazy route outlet with `<Suspense>`.
- **Table:** virtual window (viewport height) sitting over a full-height scroll container; only ~15 DOM rows exist at once; server pagination appends to the flat array.

### Deep dives — pick 2

**A. RBAC** — Walk through the hide/disable/redirect decision tree. Explain that `usePermission()` is a UX shortcut — the real enforcement is the BFF returning 403. Cover the org-switch cache-invalidation problem. Explain "upgrade" CTAs (show disabled with "requires Pro plan") vs simply hiding.

**B. Data grid** — Cursor vs offset pagination in detail. Debouncing filter changes (300ms) before firing a request. Column virtualization for 50+ column tables. Persisting column visibility/order in user profile (server) and localStorage (fallback). URL encoding for shareability.

**C. Micro-frontends** — Shell + remotes via Module Federation. Explain when this makes sense (independent team deploys) and its costs (version skew on shared design system, duplicate React in worst case, harder debugging). Reference [micro-frontends.md](../micro-frontends.md).

**D. Forms & wizards** — Step validation: validate on blur per field, validate all on "Next" step, never on every keystroke. Draft autosave via debounced `PATCH /drafts/:id`. Idempotency key on final submit to prevent double-charge. `beforeunload` warning only when there are unsaved changes.

### Common follow-ups

- **"CSV export 100k rows?"** — Never load 100k rows into the DOM. POST to `/exports` to start an async job; poll `/exports/:id/status`; when complete, serve a pre-signed S3 URL. Show a progress bar in the UI. This is mostly a backend design but define the contract: job status enum, estimated row count, download URL on completion.
- **"Real-time balances?"** — Poll every 30s with a stale indicator rather than WebSocket for financial data. Optimistic updates are dangerous for money — always show server-confirmed values. Provide a manual refresh button with last-updated timestamp.
- **"Impersonation / support mode?"** — Server issues a scoped session token for the support agent. Client renders a prominent non-dismissible banner: "Viewing as [user@company.com] — read-only". All mutations are blocked at the BFF level for impersonation tokens. Every action is audit-logged server-side.

### What you'd measure

- **Security-adjacent:** 403 rate on mutations (should trend toward zero if client UI is honest). Alert if it spikes — means client and server permissions are out of sync.
- **Performance:** P95 time-to-interactive on the heaviest route (e.g., Invoices table). Grid scroll frame rate (should stay 60 fps). Filter-change-to-new-results latency.
- **Reliability:** Error boundary trigger rate per widget. Blank dashboard rate (all widgets failed simultaneously).
- **Adoption:** Feature discoverability by role — track which permissions are most often the cause of 403s (could mean UI is misleading users into attempting forbidden actions).
