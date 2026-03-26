# 36. State Management at Scale

## The Core Problem

As an application grows past a single team, state becomes the biggest source of bugs and coupling. Engineers reach for Redux because "that's what we do," and within 6 months every piece of data — including server responses — lives in a reducer, stale data proliferates, and re-renders are everywhere. The solution is recognizing that not all state is the same.

---

## The 3 Types of State (and Where They Live)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        STATE TAXONOMY                               │
├─────────────────┬──────────────────────┬────────────────────────────┤
│  SERVER STATE   │     UI STATE         │   GLOBAL SHARED STATE      │
│                 │                      │                            │
│ - User list     │ - Modal open/closed  │ - Auth snapshot (user obj) │
│ - Invoice data  │ - Form draft         │ - Theme (dark/light)       │
│ - Search results│ - Accordion expanded │ - Notifications queue      │
│ - Pagination    │ - Tab selected       │ - Feature flags snapshot   │
│                 │                      │                            │
│ Lives in:       │ Lives in:            │ Lives in:                  │
│ React Query/SWR │ useState / useReducer│ Zustand / Jotai            │
│                 │ / Context (local)    │ (tiny, targeted)           │
└─────────────────┴──────────────────────┴────────────────────────────┘
```

The single most important decision is: **is this data owned by the server, or by the client?** If it comes from an API, it belongs in a server-state cache. If the user invented it locally (theme choice, panel visibility), it's UI state.

---

## Type 1: Server State — React Query

React Query treats server data as a cache, not a store. The key concepts: **query keys** as cache addresses, **staleTime** to control freshness, and **invalidation** to bust the cache after mutations.

### Query Key Design

Query keys are the cache addresses. Design them like a hierarchy:

```typescript
// Bad: flat, fragile strings
useQuery('invoices', fetchInvoices)

// Good: array hierarchy that supports partial invalidation
// ['invoices']                    → all invoices
// ['invoices', { status: 'paid' }] → filtered list
// ['invoices', 'detail', id]       → single invoice

const INVOICE_KEYS = {
  all: ['invoices'] as const,
  lists: () => [...INVOICE_KEYS.all, 'list'] as const,
  list: (filters: InvoiceFilters) => [...INVOICE_KEYS.lists(), filters] as const,
  details: () => [...INVOICE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...INVOICE_KEYS.details(), id] as const,
};
```

### Query with staleTime

```typescript
// invoices/hooks/useInvoices.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchInvoices, updateInvoice } from '../api/invoiceApi';

export function useInvoices(filters: InvoiceFilters) {
  return useQuery({
    queryKey: INVOICE_KEYS.list(filters),
    queryFn: () => fetchInvoices(filters),
    staleTime: 60_000,        // treat as fresh for 1 minute — no background refetch
    gcTime: 5 * 60_000,       // keep in cache 5 min after unmount
    placeholderData: keepPreviousData, // don't flash loading on filter change
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateInvoice,
    onSuccess: (updatedInvoice) => {
      // 1. Update the specific detail cache immediately
      queryClient.setQueryData(
        INVOICE_KEYS.detail(updatedInvoice.id),
        updatedInvoice
      );
      // 2. Invalidate all lists so they refetch with fresh data
      queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.lists() });
    },
  });
}
```

### Why not Redux for server state?

With Redux you would write: fetch action → loading reducer → success reducer → selector → component. React Query collapses all of that into one hook, with built-in deduplication (10 components mounting simultaneously = 1 network request), background refetch, and automatic retry. The Redux approach also creates a second source of truth — the store — that diverges from the server and requires manual invalidation.

---

## Type 2: UI State — useState, useReducer, Context (scoped)

Feature-local state belongs as close to where it's used as possible. The rule: **start with useState, promote to context only when drilling becomes painful, promote to global store only when multiple disconnected subtrees need it.**

```typescript
// Good: local state for feature-local UI
function InvoiceFilters() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  return (
    <div>
      <button onClick={() => setIsExpanded(v => !v)}>Filters</button>
      {isExpanded && <DateRangePicker value={dateRange} onChange={setDateRange} />}
    </div>
  );
}
```

### The Context Pitfall: Fat Context Causes Mass Re-renders

This is one of the most common mistakes:

```typescript
// BAD: mega-context — every consumer re-renders when anything changes
const AppContext = createContext<{
  user: User;
  theme: Theme;
  notifications: Notification[];
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  // ... 15 more fields
}>(null!);

// When sidebarOpen changes, the InvoiceList (which only reads `user`)
// also re-renders because it consumes AppContext.
```

**Fix 1: Split contexts by concern**

```typescript
// Each context only triggers re-renders in components that care about it
const UserContext = createContext<User>(null!);
const ThemeContext = createContext<Theme>('light');
const NotificationContext = createContext<Notification[]>([]);

// Components only subscribe to what they need
function InvoiceList() {
  const user = useContext(UserContext); // re-renders only when user changes
}
```

**Fix 2: useSyncExternalStore for external state with context as DI**

```typescript
// For high-frequency updates, bypass React's context re-render model entirely
const store = createExternalStore({ count: 0 });

function useCount() {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot // for SSR
  );
}
```

---

## Type 3: Global Shared State — Zustand (not Redux)

Use Zustand for state that is truly cross-cutting: auth snapshot, theme, notification queue. These are values that change infrequently and are needed by distant, unrelated components.

### Why Zustand over Redux for this?

- No boilerplate (no actions, reducers, dispatch)
- Component subscribes to only the slice it reads — no selector memoization required
- Works outside React (access store in non-component code like API interceptors)
- Bundle: ~1KB vs Redux Toolkit ~10KB

```typescript
// stores/authStore.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  permissions: string[];
  setAuth: (user: User, permissions: string[]) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  permissions: [],
  setAuth: (user, permissions) => set({ user, permissions }),
  clearAuth: () => set({ user: null, permissions: [] }),
}));

// stores/notificationStore.ts
interface NotificationState {
  queue: Notification[];
  push: (n: Omit<Notification, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  queue: [],
  push: (n) =>
    set((s) => ({ queue: [...s.queue, { ...n, id: crypto.randomUUID() }] })),
  dismiss: (id) =>
    set((s) => ({ queue: s.queue.filter((n) => n.id !== id) })),
}));

// Component subscribes to only what it reads — no re-render from other fields
function Avatar() {
  const user = useAuthStore((s) => s.user); // fine-grained subscription
  return <img src={user?.avatar} />;
}
```

---

## Normalized Entity Store

When your app displays relational data (users who own invoices that belong to projects), storing raw nested API payloads creates duplication and update inconsistency:

```typescript
// BAD: nested mirrors of API — update user name in one place?
// You must update it everywhere it appears nested.
{
  invoices: [
    { id: '1', owner: { id: 'u1', name: 'Alice' }, ... },
    { id: '2', owner: { id: 'u1', name: 'Alice' }, ... },  // duplicate!
  ]
}

// GOOD: normalized — user data in one place, referenced by id
{
  entities: {
    users: {
      byId: { 'u1': { id: 'u1', name: 'Alice' } }
    },
    invoices: {
      byId: {
        '1': { id: '1', ownerId: 'u1', amount: 500 },
        '2': { id: '2', ownerId: 'u1', amount: 750 },
      },
      allIds: ['1', '2']
    }
  }
}
```

With React Query, you can normalize at the query level using `select`:

```typescript
useQuery({
  queryKey: INVOICE_KEYS.lists(),
  queryFn: fetchInvoices,
  select: (data) => ({
    byId: Object.fromEntries(data.map(inv => [inv.id, inv])),
    allIds: data.map(inv => inv.id),
  }),
});
```

---

## Fine-Grained Subscriptions with Jotai

When you have many atoms of state that components subscribe to independently, Jotai's atom model prevents the "any change re-renders everyone" problem:

```typescript
// atoms/invoiceAtoms.ts
import { atom } from 'jotai';

// Primitive atoms
export const selectedInvoiceIdAtom = atom<string | null>(null);
export const invoiceFiltersAtom = atom<InvoiceFilters>({ status: 'all' });

// Derived atom — only recomputes when its dependencies change
export const filteredInvoicesAtom = atom((get) => {
  const invoices = get(allInvoicesAtom);
  const filters = get(invoiceFiltersAtom);
  return invoices.filter(inv =>
    filters.status === 'all' || inv.status === filters.status
  );
});

// Components subscribe to exactly the atom they need
function InvoiceCount() {
  const filtered = useAtomValue(filteredInvoicesAtom);
  return <span>{filtered.length} invoices</span>;
  // Only re-renders when filteredInvoicesAtom changes
}
```

---

## Decision Tree: What Goes Where

```
Is this data fetched from a server/API?
├── YES → React Query / SWR
│         (cache key, staleTime, invalidation on mutation)
│
└── NO → Is this state reflected in the URL?
         ├── YES → useSearchParams / router state
         │         (filters, pagination, selected tab in URL)
         │
         └── NO → Is it needed only within this feature/component tree?
                  ├── YES → useState / useReducer
                  │         (form fields, toggle states, local UI)
                  │
                  └── NO → Does it need to coordinate across
                           unrelated parts of the app?
                           ├── YES → Zustand store / Jotai atom
                           │         (auth, theme, notifications, modals)
                           │
                           └── NO → Context (scoped to a subtree)
                                    (wizard step state, drag context)
```

---

## Common Failure Modes

### 1. Duplicated server cache in Redux + React Query
```
Problem: Team uses Redux for "everything" and then adds React Query.
Now invoice data exists in both redux.invoices and the React Query cache.
They diverge. A mutation updates React Query but not Redux. Two components
that read from different sources show different data.

Fix: Pick one source of truth per resource type. Use React Query for ALL
server state. Delete the Redux slice for that resource.
```

### 2. Mega-context churn
```
Problem: AppContext has 20 fields. Adding a notification causes
every component that reads AppContext to re-render, including heavy
components like the DataGrid.

Fix: Split into focused contexts (UserContext, ThemeContext, etc.)
or move high-frequency updates to Zustand where subscriptions are
per-field by default.
```

### 3. Stale closure bugs in event handlers
```typescript
// BAD: count is captured at render time, never updates
function Counter() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      console.log(count); // always logs 0 — stale closure
      setCount(count + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []); // empty deps = stale forever
}

// GOOD: use functional update form
setCount(prev => prev + 1); // no closure needed
// OR include count in deps array and re-create the interval
```

### 4. Missing queryKey when query params change
```typescript
// BAD: changing page doesn't trigger refetch because key is static
useQuery({ queryKey: ['invoices'], queryFn: () => fetchInvoices(page) });

// GOOD: page is part of the key — new key = new fetch
useQuery({ queryKey: ['invoices', { page }], queryFn: () => fetchInvoices(page) });
```

---

## Summary Sound Bite

"Server state belongs in React Query with structured cache keys and mutation-driven invalidation. UI state lives as close to the component as possible — useState first, then scoped context. Truly global cross-cutting state like auth or notifications goes in Zustand atoms with fine-grained subscriptions. The failure mode to avoid is copying server responses into Redux — you end up with two sources of truth that diverge."
