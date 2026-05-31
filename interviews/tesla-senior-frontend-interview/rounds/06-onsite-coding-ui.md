# Round 6 — Onsite Coding 2: React / UI Build (45–60 min)

| | |
|---|---|
| **Format** | Build working UI from API or mock JSON |
| **Eliminates?** | Yes |
| **Focus** | Autocomplete, pagination, dashboard, forms |

---

## Grading Rubric (What Interviewers Actually Score)

| Criteria | Weight | What "good" looks like |
|----------|--------|------------------------|
| Golden path works | **High** | Type → see results → select |
| Loading / error / empty | **High** | All three distinct UI states |
| Component structure | Medium | Small components, clear names |
| Debounce + abort | Medium | Mention + implement debounce |
| Accessibility | Medium | Labels, roles, keyboard bonus |
| TypeScript | Low–Med | Basic types if TS expected |
| CSS polish | **Low** | Don't spend 15 min on styling |

---

## Before You Code — Script

Say this out loud (buys trust):

> "I'll clarify three things: controlled input, async API, list probably under 100 items so no virtualization yet. I'll structure as AutocompleteInput + SuggestionsList, debounce 300ms, abort stale requests, handle loading/error/empty. Golden path first, then keyboard nav if time."

---

## Q1: Autocomplete with API — full solution

### Complete implementation with keyboard navigation

```tsx
import { useState, useEffect, useRef, useCallback } from 'react';

type AutocompleteProps = {
  fetchSuggestions: (query: string, signal: AbortSignal) => Promise<string[]>;
  onSelect?: (value: string) => void;
  minChars?: number;
  debounceMs?: number;
};

export function Autocomplete({
  fetchSuggestions,
  onSelect,
  minChars = 2,
  debounceMs = 300,
}: AutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Debounced fetch
  useEffect(() => {
    if (query.length < minChars) {
      setSuggestions([]);
      setOpen(false);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      setError(null);

      try {
        const results = await fetchSuggestions(query, abortRef.current.signal);
        setSuggestions(results);
        setOpen(true);
        setActiveIndex(-1);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setError('Failed to load suggestions');
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, fetchSuggestions, minChars, debounceMs]);

  const selectSuggestion = useCallback(
    (value: string) => {
      setQuery(value);
      setOpen(false);
      setSuggestions([]);
      onSelect?.(value);
    },
    [onSelect]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const listId = 'autocomplete-listbox';

  return (
    <div style={{ position: 'relative', width: 320 }}>
      <label htmlFor="ac-input">Search</label>
      <input
        id="ac-input"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `option-${activeIndex}` : undefined
        }
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
      />

      {loading && (
        <span aria-live="polite" style={{ fontSize: 12 }}>
          Loading…
        </span>
      )}

      {error && (
        <p role="alert" style={{ color: 'crimson', fontSize: 12 }}>
          {error}
        </p>
      )}

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            border: '1px solid #ccc',
            listStyle: 'none',
            margin: 0,
            padding: 0,
            background: '#fff',
            maxHeight: 200,
            overflow: 'auto',
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={s}
              id={`option-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={() => selectSuggestion(s)}
              style={{
                padding: '8px 12px',
                background: i === activeIndex ? '#eee' : 'transparent',
                cursor: 'pointer',
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && query.length >= minChars && suggestions.length === 0 && open && (
        <p style={{ fontSize: 12 }}>No results</p>
      )}
    </div>
  );
}
```

### Explain each decision (say aloud)

| Decision | Why |
|----------|-----|
| Debounce 300ms | Avoid API call per keystroke |
| AbortController | Cancel stale request when query changes |
| minChars = 2 | Reduce noise on single-char queries |
| onMouseDown not onClick | Select before input blur fires |
| aria-live on loading | Screen reader announces fetch state |
| activeIndex + Arrow keys | Senior bonus — combobox pattern |

---

## Q2: Paginated search — full component

```tsx
type SearchItem = { id: string; title: string };

export function PaginatedSearch() {
  const [items, setItems] = useState<SearchItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?page=${pageNum}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { items: SearchItem[]; hasMore: boolean } = await res.json();
      setItems(prev => (pageNum === 1 ? data.items : [...prev, ...data.items]));
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const loadMore = () => {
    if (!loading && hasMore) loadPage(page + 1);
  };

  if (error && items.length === 0) {
    return (
      <div>
        <p role="alert">{error}</p>
        <button onClick={() => loadPage(1)}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <ul>
        {items.map(item => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>

      {!loading && items.length === 0 && <p>No results</p>}

      {error && items.length > 0 && (
        <p role="alert">{error} — <button onClick={loadMore}>Retry</button></p>
      )}

      {hasMore ? (
        <button onClick={loadMore} disabled={loading}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      ) : items.length > 0 ? (
        <p>End of results</p>
      ) : null}
    </div>
  );
}
```

### Infinite scroll variant (if interviewer asks)

```tsx
// IntersectionObserver — preferred over onScroll + throttle
useEffect(() => {
  const el = sentinelRef.current;
  if (!el) return;
  const observer = new IntersectionObserver(
    entries => {
      if (entries[0].isIntersecting && hasMore && !loading) loadMore();
    },
    { rootMargin: '100px' }
  );
  observer.observe(el);
  return () => observer.disconnect();
}, [hasMore, loading, loadMore]);
```

**Say:** "`onScroll` fires too often and couples to layout. IntersectionObserver is the modern primitive."

---

## Q3: Dashboard from mock JSON — full example

```tsx
type KPI = { id: string; label: string; value: string | number; trend?: 'up' | 'down' };
type Alert = { id: string; severity: 'info' | 'warning' | 'critical'; message: string };

type DashboardData = {
  kpis: KPI[];
  alerts: Alert[];
  updatedAt: string;
};

function StatCard({ kpi }: { kpi: KPI }) {
  return (
    <article style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
      <h3 style={{ margin: 0, fontSize: 14, color: '#666' }}>{kpi.label}</h3>
      <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 600 }}>{kpi.value}</p>
      {kpi.trend && <span aria-label={`Trend ${kpi.trend}`}>{kpi.trend === 'up' ? '↑' : '↓'}</span>}
    </article>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const colors = { info: '#036', warning: '#960', critical: '#c00' };
  return (
    <li style={{ color: colors[alert.severity] }}>
      <strong>[{alert.severity}]</strong> {alert.message}
    </li>
  );
}

export function Dashboard({ data }: { data: DashboardData }) {
  const { kpis, alerts, updatedAt } = data;

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1>Factory Line Status</h1>
        <time dateTime={updatedAt}>
          Updated {new Date(updatedAt).toLocaleString()}
        </time>
      </header>

      <section aria-label="Key metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {kpis.map(k => <StatCard key={k.id} kpi={k} />)}
      </section>

      <section aria-label="Active alerts" style={{ marginTop: 32 }}>
        <h2>Alerts</h2>
        {alerts.length === 0 ? (
          <p>No active alerts</p>
        ) : (
          <ul>{alerts.map(a => <AlertRow key={a.id} alert={a} />)}</ul>
        )}
      </section>
    </div>
  );
}
```

**Senior note:** "With more time I'd add skeleton loading, error boundary per section, and poll/WebSocket for `updatedAt`."

---

## Q4: Service appointment form — full validation

```tsx
type FormValues = { email: string; vin: string; date: string };
type FormErrors = Partial<Record<keyof FormValues, string>>;

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Invalid email format';
  }
  if (!values.vin.trim()) {
    errors.vin = 'VIN is required';
  } else if (values.vin.length !== 17) {
    errors.vin = 'VIN must be exactly 17 characters';
  }
  if (!values.date) {
    errors.date = 'Please select a date';
  }
  return errors;
}

export function ServiceForm({ onSubmit }: { onSubmit: (v: FormValues) => Promise<void> }) {
  const [values, setValues] = useState<FormValues>({ email: '', vin: '', date: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleChange = (field: keyof FormValues) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setValues(v => ({ ...v, [field]: e.target.value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      await onSubmit(values);
    } catch {
      setServerError('Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={values.email} onChange={handleChange('email')} />
        {errors.email && <span role="alert">{errors.email}</span>}
      </div>
      <div>
        <label htmlFor="vin">VIN</label>
        <input id="vin" value={values.vin} onChange={handleChange('vin')} maxLength={17} />
        {errors.vin && <span role="alert">{errors.vin}</span>}
      </div>
      <div>
        <label htmlFor="date">Preferred date</label>
        <input id="date" type="date" value={values.date} onChange={handleChange('date')} />
        {errors.date && <span role="alert">{errors.date}</span>}
      </div>
      {serverError && <p role="alert">{serverError}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Booking…' : 'Book appointment'}
      </button>
    </form>
  );
}
```

---

## Concept Questions — Detailed Answers

### Q5: Context vs TanStack Query vs Redux?

**Detailed answer:**

| Tool | Best for | Avoid for |
|------|----------|-----------|
| **Local useState** | Single component UI | Shared server data |
| **Context** | Theme, locale, auth user, OA paginated list | High-frequency server updates |
| **TanStack Query** | All server state — fetch, cache, refetch, infinite scroll | Local modal open state |
| **Redux / Zustand** | Complex client global state, middleware, devtools | Simple apps with mostly server data |

> "I'd default to TanStack Query for API data in production. Context is fine for OA or low-frequency globals. Redux when you have many cross-feature client actions — not for caching GET responses."

---

### Q6: What causes unnecessary re-renders? How to fix?

**Detailed answer:**

1. **Parent re-render** → child re-renders even if props "look" same
   - Fix: `React.memo(child)`, stable callbacks via `useCallback`

2. **Inline objects/functions as props** → new reference every render → memo useless
   - Fix: `useCallback`, `useMemo`, or move state down

3. **Context value recreated** → all consumers re-render
   - Fix: split contexts, `useMemo` on value, or selector libraries

4. **State too high** → typing in search re-renders entire dashboard
   - Fix: colocate state nearest consumer

**Example:** Query input should not live in same component as 500-row table if table isn't memoized.

---

### Q7: Infinite scroll — how?

**Detailed answer:**

> **Bad:** `window.onScroll` + throttle — janky, hard to test, runs on every scroll event.
>
> **Good:** Sentinel `div` at list bottom + `IntersectionObserver` — when sentinel enters viewport, fetch next page if `hasMore && !loading`.
>
> **Also:** Preserve scroll position on back navigation (sessionStorage or router state). Virtualize if 1000+ DOM nodes.

---

## 45-Minute Time Budget

| Min | Do |
|-----|-----|
| 0–5 | Clarify + write component skeleton in comments |
| 5–20 | Input + fetch + render list |
| 20–30 | Loading, error, empty |
| 30–38 | Debounce + abort |
| 38–43 | Keyboard or one a11y improvement |
| 43–45 | Verbal walkthrough |

---

## Prep Checklist

- [ ] Autocomplete with keyboard — 35 min timed from blank file
- [ ] Paginated list — 25 min timed
- [ ] Explain Context vs Query in 60 sec aloud

**Next round:** [07-system-design.md](./07-system-design.md)
