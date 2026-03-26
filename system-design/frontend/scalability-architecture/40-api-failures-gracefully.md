# 40. Handling API Failures Gracefully

## Why This Matters

APIs fail. Networks drop. Servers time out. A well-designed frontend degrades gracefully — showing stale data, isolating failures, and guiding users toward recovery. A poorly designed one either shows a blank white screen or silently lies (showing stale data with no indication).

The goal is: **maximize usability even when things go wrong.**

---

## Failure Taxonomy

```
┌──────────────────────────────────────────────────────────────────┐
│  FAILURE TYPE         │ HTTP Status   │ Retry? │ User Action?     │
├──────────────────────────────────────────────────────────────────┤
│  Network offline      │ TypeError     │ Yes    │ "Check connection"│
│  Request timeout      │ AbortError    │ Yes    │ "Try again"       │
│  Server error         │ 500, 502, 503 │ Yes    │ "Try again later" │
│  Rate limited         │ 429           │ Yes*   │ "Slow down" toast │
│  Auth expired         │ 401           │ No     │ Redirect to login │
│  Permission denied    │ 403           │ No     │ "Contact admin"   │
│  Not found            │ 404           │ No     │ Empty state       │
│  Validation error     │ 422, 400      │ No     │ Inline field error│
│  Partial success      │ 207           │ No     │ Show partial UI   │
│  Schema drift (parse) │ 200 (bad body)│ No     │ "Unexpected error"│
└──────────────────────────────────────────────────────────────────┘
* Retry 429 only after the Retry-After header delay
```

The most important column is **Retry?** — you must never blindly retry 4xx errors. A 400 will return 400 again. A 422 validation error won't fix itself. Retrying them wastes bandwidth and may have side effects (e.g., duplicate POST).

---

## React Query Retry Configuration

```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry configuration
      retry: (failureCount, error) => {
        // Never retry client errors — they won't fix themselves
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        // Retry network/server errors up to 3 times
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => {
        // Exponential backoff with jitter: 1s, 2s, 4s (±20%)
        const base = Math.min(1000 * 2 ** attemptIndex, 30_000);
        const jitter = base * 0.2 * Math.random();
        return base + jitter;
      },
      staleTime: 60_000,
    },
    mutations: {
      // Mutations: don't auto-retry — too risky for side-effecting operations
      retry: (failureCount, error) => {
        if (error instanceof ApiError) return false; // never retry mutations on 4xx or 5xx
        // Only retry on network error (no response at all) once
        return failureCount < 1;
      },
    },
  },
});
```

---

## Error Boundary Per Feature Section

A single top-level error boundary means one broken widget takes down the whole page. Scope them to feature sections.

```typescript
// components/FeatureErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  featureName: string;   // for error reporting context
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State { hasError: boolean; error: Error | null; }

export class FeatureErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Report to error monitoring (Sentry, Datadog)
    reportError(error, {
      feature: this.props.featureName,
      componentStack: info.componentStack,
    });
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div role="alert" className="feature-error">
          <p>Something went wrong loading {this.props.featureName}.</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Dashboard page — each widget is isolated
function DashboardPage() {
  return (
    <div className="dashboard-grid">
      <FeatureErrorBoundary featureName="Invoice Summary">
        <InvoiceSummaryWidget />
      </FeatureErrorBoundary>

      <FeatureErrorBoundary featureName="Recent Activity">
        <RecentActivityWidget />
      </FeatureErrorBoundary>

      <FeatureErrorBoundary featureName="Revenue Chart">
        <RevenueChartWidget />
      </FeatureErrorBoundary>
    </div>
  );
  // If RevenueChart breaks, Invoice Summary and Recent Activity still work.
}
```

---

## Error States in React Query: Different UI Per Error Type

```typescript
// features/invoices/components/InvoiceList.tsx
function InvoiceList() {
  const { data, isLoading, isError, error, dataUpdatedAt } = useInvoices(filters);

  if (isLoading) return <InvoiceSkeleton count={10} />;

  if (isError) {
    const status = error instanceof ApiError ? error.status : 0;

    // 404 → empty state (not an error from user's perspective)
    if (status === 404) {
      return <EmptyState
        icon={<InvoiceIcon />}
        title="No invoices found"
        description="Create your first invoice to get started."
        action={<Button onClick={openCreateModal}>Create Invoice</Button>}
      />;
    }

    // 403 → permission message
    if (status === 403) {
      return <EmptyState
        icon={<LockIcon />}
        title="Access denied"
        description="You don't have permission to view invoices. Contact your admin."
      />;
    }

    // 5xx or network → actionable retry
    return <ErrorState
      title="Failed to load invoices"
      description={status >= 500
        ? "Our servers are having trouble. Please try again."
        : "Check your internet connection and try again."
      }
      onRetry={() => refetch()}
    />;
  }

  return (
    <>
      {/* Show stale data indicator if last fetch failed */}
      <StaleDataBanner dataUpdatedAt={dataUpdatedAt} />
      <InvoiceTable invoices={data} />
    </>
  );
}
```

---

## Optimistic Updates with Rollback

Optimistic updates make the UI feel instant. But they require a rollback strategy when the mutation fails.

```typescript
// hooks/useUpdateInvoiceStatus.ts
export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  const notify = useNotifications();

  return useMutation({
    mutationFn: ({ invoiceId, status }: { invoiceId: string; status: InvoiceStatus }) =>
      updateInvoiceStatus(invoiceId, status),

    onMutate: async ({ invoiceId, status }) => {
      // 1. Cancel any in-flight refetches that could overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: INVOICE_KEYS.detail(invoiceId) });

      // 2. Snapshot the current value for rollback
      const previousInvoice = queryClient.getQueryData<Invoice>(
        INVOICE_KEYS.detail(invoiceId)
      );

      // 3. Optimistically update the cache
      queryClient.setQueryData<Invoice>(INVOICE_KEYS.detail(invoiceId), (old) => ({
        ...old!,
        status,
        updatedAt: new Date().toISOString(),
      }));

      // 4. Return snapshot in context for rollback
      return { previousInvoice };
    },

    onError: (error, { invoiceId }, context) => {
      // 5. Rollback to snapshot on failure
      if (context?.previousInvoice) {
        queryClient.setQueryData(
          INVOICE_KEYS.detail(invoiceId),
          context.previousInvoice
        );
      }
      notify.error('Failed to update invoice status. Changes have been reverted.');
    },

    onSettled: (data, error, { invoiceId }) => {
      // 6. Always refetch to sync with server truth (even on success)
      queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.detail(invoiceId) });
    },
  });
}
```

---

## Stale Data Indicator

When a background refetch fails, don't silently show stale data. Tell the user when data was last updated.

```typescript
// components/StaleDataBanner.tsx
interface StaleDataBannerProps {
  dataUpdatedAt: number;       // timestamp from React Query
  isRefetching: boolean;
  isRefetchError: boolean;
  onRetry: () => void;
}

export function StaleDataBanner({
  dataUpdatedAt,
  isRefetching,
  isRefetchError,
  onRetry,
}: StaleDataBannerProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Only show when background refetch has failed
  if (!isRefetchError) return null;

  const minutesAgo = Math.floor((now - dataUpdatedAt) / 60_000);
  const freshness = minutesAgo < 1
    ? 'just now'
    : `${minutesAgo} minute${minutesAgo === 1 ? '' : 's'} ago`;

  return (
    <div role="status" className="stale-banner">
      <WarningIcon />
      <span>Showing data from {freshness}. Unable to refresh.</span>
      <button onClick={onRetry} disabled={isRefetching}>
        {isRefetching ? 'Refreshing...' : 'Retry'}
      </button>
    </div>
  );
}
```

---

## Circuit Breaker Pattern

If an endpoint is consistently failing, stop retrying and show a degraded mode instead of hammering a struggling server.

```typescript
// lib/circuitBreaker.ts
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;       // true = circuit is open, stop retrying
}

const FAILURE_THRESHOLD = 5;
const RECOVERY_TIMEOUT  = 60_000; // 1 minute before trying again

class CircuitBreaker {
  private state: Map<string, CircuitBreakerState> = new Map();

  isOpen(key: string): boolean {
    const s = this.state.get(key);
    if (!s?.isOpen) return false;

    // Auto-recover after timeout — allow one "probe" request
    if (Date.now() - s.lastFailure > RECOVERY_TIMEOUT) {
      this.state.set(key, { failures: 0, lastFailure: 0, isOpen: false });
      return false;
    }

    return true;
  }

  recordSuccess(key: string) {
    this.state.delete(key); // reset on success
  }

  recordFailure(key: string) {
    const current = this.state.get(key) ?? { failures: 0, lastFailure: 0, isOpen: false };
    const failures = current.failures + 1;
    this.state.set(key, {
      failures,
      lastFailure: Date.now(),
      isOpen: failures >= FAILURE_THRESHOLD,
    });
  }
}

export const circuitBreaker = new CircuitBreaker();

// Usage in a React Query queryFn
async function fetchWithCircuitBreaker<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (circuitBreaker.isOpen(key)) {
    throw new CircuitOpenError(key); // don't even attempt the request
  }

  try {
    const result = await fetcher();
    circuitBreaker.recordSuccess(key);
    return result;
  } catch (err) {
    circuitBreaker.recordFailure(key);
    throw err;
  }
}

// In the component — show degraded UI when circuit is open
function RevenueWidget() {
  const { error } = useRevenue();

  if (error instanceof CircuitOpenError) {
    return (
      <DegradedMode
        message="Revenue data is temporarily unavailable."
        retryAfter="1 minute"
      />
    );
  }
  // ...
}
```

---

## Toast vs Inline Error vs Full-Page Error: When to Use Each

```
┌─────────────────────────────────────────────────────────────────┐
│  ERROR TYPE          │ PATTERN       │ WHEN                      │
├─────────────────────────────────────────────────────────────────┤
│  Optimistic rollback │ Toast (error) │ "Couldn't save, reverted" │
│  Background sync fail│ Toast (warn)  │ Non-blocking, low urgency │
│  Mutation success    │ Toast (success│ Confirmation feedback     │
│                      │               │                           │
│  Form field error    │ Inline        │ "Email is invalid"        │
│  Empty data set      │ Inline        │ Empty state in the section│
│  Widget load failure │ Inline        │ Error within the card     │
│                      │               │                           │
│  Auth expired        │ Full page     │ Can't proceed at all      │
│  Critical route fail │ Full page     │ The page itself failed    │
│  Offline detection   │ Full page     │ No network at all         │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
// hooks/useApiError.ts — centralized error → UI pattern mapping
export function useHandleApiError() {
  const notify = useNotifications();
  const navigate = useNavigate();

  return (error: unknown, context: { action: string }) => {
    if (error instanceof ApiError) {
      switch (error.status) {
        case 401:
          navigate('/login', { state: { returnTo: window.location.pathname } });
          return;
        case 403:
          notify.error("You don't have permission to " + context.action);
          return;
        case 422:
          // Validation — handled inline by the form, don't toast
          return;
        case 429:
          notify.warning('Too many requests. Please wait a moment.');
          return;
        default:
          notify.error(`Failed to ${context.action}. Please try again.`);
      }
    } else {
      // Network error
      notify.error('Network error. Check your connection and try again.');
    }
  };
}
```

---

## Request Timeout with AbortController

```typescript
// utils/fetchWithTimeout.ts
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10_000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new TimeoutError(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// In a component — show "taking longer than expected" at 5s
function SlowRequestIndicator({ isLoading }: { isLoading: boolean }) {
  const [isSlowRequest, setIsSlowRequest] = useState(false);

  useEffect(() => {
    if (!isLoading) { setIsSlowRequest(false); return; }
    const id = setTimeout(() => setIsSlowRequest(true), 5_000);
    return () => clearTimeout(id);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div role="status" aria-live="polite">
      <Spinner />
      {isSlowRequest && (
        <p>Taking longer than expected. Please wait...</p>
      )}
    </div>
  );
}
```

---

## Offline Detection and Graceful Degradation

```typescript
// hooks/useOnlineStatus.ts
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// App-level offline banner
function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div role="alert" className="offline-banner">
      You are offline. Viewing cached data. Changes will sync when you reconnect.
    </div>
  );
}

// Disable mutations when offline — don't let user make changes that can't persist
function SaveButton({ onSave }: { onSave: () => void }) {
  const isOnline = useOnlineStatus();

  return (
    <Button
      onClick={onSave}
      disabled={!isOnline}
      title={!isOnline ? 'You are offline. Reconnect to save.' : undefined}
    >
      Save
    </Button>
  );
}
```

---

## Graceful Degradation Hierarchy

```
1. Live data      → fresh server response, everything works
       ↓ (fetch fails)
2. Stale cache    → React Query serves stale data + StaleDataBanner
       ↓ (no cache, circuit open)
3. Degraded mode  → limited UI with "data unavailable" message
       ↓ (critical failure)
4. Error state    → isolated error boundary with retry action
       ↓ (catastrophic)
5. Fallback page  → full-page error with support link + error ID
```

```typescript
// The full hierarchy in a single component
function InvoiceSummaryWidget() {
  const { data, isLoading, isError, error, isStale, dataUpdatedAt, refetch } =
    useInvoiceSummary();

  if (isLoading && !data) return <WidgetSkeleton />;

  // Level 4: circuit open — show degraded
  if (error instanceof CircuitOpenError) {
    return <DegradedWidget message="Summary temporarily unavailable" />;
  }

  // Level 4: no cache, real error
  if (isError && !data) {
    return (
      <WidgetError
        message="Failed to load invoice summary"
        onRetry={refetch}
      />
    );
  }

  // Level 2: stale cache — show data with warning
  return (
    <div>
      {isStale && isError && (
        <StaleDataBanner dataUpdatedAt={dataUpdatedAt} onRetry={refetch} />
      )}
      <SummaryCards data={data!} />
    </div>
  );
}
```

---

## Observability: What to Log

Every failure should be logged with enough context to diagnose:

```typescript
function reportError(error: unknown, context: Record<string, string>) {
  // Sentry / Datadog / custom
  errorMonitor.capture(error, {
    tags: {
      feature: context.feature,
      route: window.location.pathname,
    },
    extra: {
      requestId: context.requestId,       // for cross-referencing server logs
      httpStatus: context.status,
      userId: getCurrentUserId(),         // hashed or anonymized
    },
  });
}

// Emit to logging pipeline
// - Aggregate by (route + feature + status) to find patterns
// - Alert if error rate for a feature spikes >5% after a deploy
// - Track p95 of retry counts to detect degraded dependencies
```

---

## Summary Sound Bite

"I classify errors first — network vs 4xx vs 5xx — because the right response differs: 4xx errors should never be retried, 5xx and network errors retry with exponential backoff and jitter. Each feature section has its own error boundary so one failure doesn't take down the whole page. React Query serves stale cache with a banner when background refetch fails, so users always see something. Mutations use optimistic updates with snapshot rollback on failure. A circuit breaker pattern stops hammering a struggling endpoint after N failures and shows degraded mode UI. For timeouts, AbortController cuts long requests at 10s with a user-visible 'taking longer than expected' message at 5s."
