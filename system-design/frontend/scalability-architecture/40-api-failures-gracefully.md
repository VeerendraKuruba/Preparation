# 40. Handling API failures gracefully

## Categories

- **Network / timeout** — no response or `TypeError` from fetch.
- **HTTP errors** — 4xx (auth, validation), 5xx (upstream), **429** (rate limit).
- **Parse / contract** — 200 but invalid JSON or schema drift.

## Client strategy

1. **Typed error boundaries** — map status to user-facing copy; **don’t** leak raw stack traces.
2. **Retry policy** — idempotent GETs: backoff + jitter; don’t blindly retry POST unless idempotency keys exist.
3. **Stale-while-revalidate** — show last good data with banner; better than infinite spinners.
4. **Partial UI failure** — **error boundaries** or per-widget error states so one bad card doesn’t white-screen the dashboard.
5. **Optimistic updates** — pair with **rollback** and toast on failure; reconcile with server truth.

## UX patterns

- **Actionable** messages (“Try again”, “Contact support”) where possible.  
- **Correlation id** in logs (not always shown to users) for support.  
- **Offline** — queue mutations or read-only mode when `navigator.onLine` is false.

## Observability

Log failures with **route, feature, request id, status**; sample for volume; alert on error rate spikes post-deploy.

## One-liner

“**Classify errors, retry safely, degrade to cached data or isolated error states, and always reconcile optimistic UI with the server.**”
