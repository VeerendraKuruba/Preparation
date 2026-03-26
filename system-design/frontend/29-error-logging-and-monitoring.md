# 29. Design Error Logging and Monitoring

## Clarifying Questions

Before designing, I would ask:

- **Scope**: Frontend JavaScript errors only, or also performance degradation (slow LCP, long tasks), network errors (failed fetches), and user-reported feedback?
- **Environments**: All environments (dev, staging, prod) or production only? Dev noise can overwhelm a shared collector.
- **Volume**: Monolith with 10k users or distributed app with 10M DAU? At scale, capturing every error would flood the collector.
- **PII constraints**: Are user IDs safe to log? Do URLs contain tokens or personal data that must be scrubbed?
- **Source maps**: Are we comfortable uploading source maps to a third-party (Sentry), or do we need a self-hosted solution for IP/compliance reasons?
- **SLA**: Is there a target error rate that triggers an automated rollback, or is this purely observational?

For this answer I will assume: React SPA in production, JavaScript errors and unhandled promise rejections, PII scrubbing required, source maps uploaded to a protected self-hosted collector, and a feedback loop that triggers CI rollback on error rate spike.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Browser Runtime                                                             │
│                                                                              │
│  ┌──────────────────┐  ┌────────────────────────┐  ┌────────────────────┐  │
│  │  window.onerror  │  │  unhandledrejection     │  │  React             │  │
│  │  (sync JS errors)│  │  (async / Promise)      │  │  ErrorBoundary     │  │
│  └────────┬─────────┘  └───────────┬─────────────┘  └────────┬───────────┘  │
│           └────────────────────────┴──────────────────────────┘             │
│                                    │ raw error event                         │
│                                    ▼                                         │
│           ┌────────────────────────────────────────────────────────────┐    │
│           │  Error SDK                                                  │    │
│           │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │    │
│           │  │ Fingerprint │  │ Rate limiter │  │ Privacy scrubber │  │    │
│           │  │ (normalize  │  │ (max 10/sess,│  │ (URL params,     │  │    │
│           │  │  stack)     │  │  dedup by fp)│  │  form values)    │  │    │
│           │  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘  │    │
│           │         └─────────────────┴───────────────────┘            │    │
│           │                          │                                  │    │
│           │                          ▼                                  │    │
│           │              ┌───────────────────────┐                      │    │
│           │              │  Error payload builder│                      │    │
│           │              │  + breadcrumbs (last  │                      │    │
│           │              │    20 events)          │                      │    │
│           │              └───────────┬───────────┘                      │    │
│           └──────────────────────────│──────────────────────────────────┘    │
│                                      │ fire-and-forget POST                  │
└──────────────────────────────────────│───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Error Collector  (self-hosted or Sentry)                                    │
│  ┌───────────────┐  ┌───────────────────────────┐  ┌──────────────────────┐ │
│  │ Ingest API    │  │ Source Map resolver        │  │ Fingerprint grouper  │ │
│  │ POST /errors  │  │ (protected storage, never  │  │ (group by normalized │ │
│  │               │  │  public)                   │  │  stack frame)        │ │
│  └───────┬───────┘  └───────────────────────────┘  └──────────────────────┘ │
└──────────│───────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Dashboard + Alerting                                                        │
│  • Error rate by release / route / browser                                   │
│  • Top fingerprints with readable stack traces                               │
│  • Alert: error rate > 2x baseline for release N → CI webhook                │
│  • CI webhook → pause rollout / trigger rollback deploy                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Mechanics

### 1. Capture — Three Entry Points for Errors

```typescript
// errorCapture.ts — single file that registers all global error handlers
import { buildPayload } from './errorPayload';
import { ErrorSDK } from './errorSdk';

export function initErrorCapture(sdk: ErrorSDK): void {

  // Capture 1: Synchronous JS errors — syntax errors, reference errors,
  // type errors from non-async code paths
  window.onerror = (message, source, lineno, colno, error) => {
    if (!error) return false; // Ignore errors without stack (cross-origin scripts)
    sdk.capture(error, { source, lineno, colno });
    return false; // Do not suppress the error from DevTools
  };

  // Capture 2: Unhandled Promise rejections — async/await failures,
  // rejected fetch() calls, rejected Promise chains with no .catch()
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
    sdk.capture(error, { type: 'unhandledrejection' });
  });

  // Capture 3: React ErrorBoundary — component render errors with componentStack
  // (see ErrorBoundary class below)
}
```

```typescript
// ErrorBoundary.tsx — catches render-time errors in React component tree
import React, { Component, ErrorInfo } from 'react';
import { ErrorSDK } from './errorSdk';

type Props = { children: React.ReactNode; sdk: ErrorSDK; fallback: React.ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // info.componentStack is the React component stack — more useful than the JS stack
    // for tracing which component tree caused the render failure
    this.props.sdk.capture(error, {
      componentStack: info.componentStack,
      type: 'react_error_boundary',
    });
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
```

---

### 2. Error Payload — Everything Needed to Reproduce the Bug

```typescript
type ErrorPayload = {
  // The error itself
  message: string;
  stack: string;           // minified at this point — collector resolves via source maps
  componentStack?: string; // React component tree, populated by ErrorBoundary

  // Context for reproduction
  breadcrumbs: Breadcrumb[]; // last 20 user actions before the error (see below)
  url: string;               // scrubbed — no token query params
  route: string;             // /product/:id — not /product/12345

  // Release correlation — mandatory for grouping errors by deploy
  release: string;           // '2024.03.15-abc1234' — matches source map upload
  environment: 'production' | 'staging';

  // User context — hashed, not raw PII
  userId: string | null;     // SHA-256 hash of actual user ID, or null if anonymous
  sessionId: string;

  // Device context
  userAgent: string;
  viewport: { width: number; height: number };
  language: string;

  timestamp: string;         // ISO 8601
};

type Breadcrumb = {
  type: 'navigation' | 'click' | 'api' | 'console';
  timestamp: string;
  data: Record<string, unknown>;
};

// Breadcrumb ring buffer — keep only the last 20 events before an error
class BreadcrumbBuffer {
  private buffer: Breadcrumb[] = [];
  private readonly MAX = 20;

  add(crumb: Breadcrumb): void {
    this.buffer.push(crumb);
    if (this.buffer.length > this.MAX) {
      this.buffer.shift(); // Drop oldest
    }
  }

  getAll(): Breadcrumb[] {
    return [...this.buffer];
  }
}

// Auto-instrument breadcrumbs
function instrumentBreadcrumbs(buffer: BreadcrumbBuffer): void {
  // Navigation breadcrumbs via History API
  const originalPushState = history.pushState.bind(history);
  history.pushState = (...args) => {
    buffer.add({ type: 'navigation', timestamp: new Date().toISOString(), data: { to: args[2] } });
    return originalPushState(...args);
  };

  // Click breadcrumbs — only capture element label, not value (avoid capturing form input values)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    buffer.add({
      type: 'click',
      timestamp: new Date().toISOString(),
      data: {
        tagName: target.tagName,
        id: target.id,
        // aria-label or text content (truncated) — never input.value
        label: target.getAttribute('aria-label') || target.textContent?.trim().slice(0, 50),
      },
    });
  }, { capture: true });

  // API breadcrumbs — patch fetch
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
    const response = await originalFetch(...args);
    buffer.add({
      type: 'api',
      timestamp: new Date().toISOString(),
      data: { url: scrubURL(url), status: response.status, ok: response.ok },
    });
    return response;
  };
}
```

---

### 3. Fingerprinting — Group Errors Without Duplicate Alerts

Two users hitting the same bug produce different stack traces (different line numbers after minification resolves differently, different call paths). Fingerprinting normalizes the stack to a stable identifier so all occurrences of the same bug group together.

```typescript
function fingerprint(error: Error): string {
  const frames = parseStack(error.stack ?? '');

  // Normalize each frame: strip dynamic segments, keep file + function name
  const normalizedFrames = frames
    .slice(0, 5)  // Top 5 frames are usually sufficient to distinguish errors
    .map((frame) => {
      // Strip line/column numbers — they change across builds
      const file = frame.file
        .replace(/\?[^)]+/, '')       // remove query strings (?v=abc)
        .replace(/:\d+:\d+$/, '')     // remove :line:col
        .replace(/\/[a-f0-9]{8,}\//g, '/[hash]/'); // strip content hash directories

      return `${frame.fn}@${file}`;
    });

  // Hash the normalized frames to produce a stable ID
  return murmurhash3(normalizedFrames.join('|')).toString(16);
}

// Usage: two users hitting the same undefined property access on the same
// component will produce the same fingerprint, regardless of which user,
// which session, or which minor build variation
```

---

### 4. Rate Limiting — Prevent Error Floods from Overwhelming the Collector

A single broken component re-rendering in a loop can generate thousands of identical errors per second. Rate limiting per session protects the collector and keeps the payload meaningful.

```typescript
class ErrorRateLimiter {
  private errorCount = 0;
  private seenFingerprints = new Set<string>();
  private readonly MAX_ERRORS_PER_SESSION = 10;

  shouldCapture(fingerprint: string): boolean {
    // Hard limit: stop after 10 errors per session regardless of uniqueness
    if (this.errorCount >= this.MAX_ERRORS_PER_SESSION) return false;

    // Dedup: same fingerprint within a session is one error, not thousands
    if (this.seenFingerprints.has(fingerprint)) return false;

    this.errorCount++;
    this.seenFingerprints.add(fingerprint);
    return true;
  }
}
```

---

### 5. Source Maps — Readable Stacks Without Shipping Maps to Users

Source maps translate minified production stacks back into readable development code. They must never be publicly accessible — any user who downloads them can read your full source code.

```
Build pipeline:
  1. Vite/Webpack builds production bundle
     → app.abc123.js (minified)
     → app.abc123.js.map (source map)

  2. Deploy script uploads source maps to collector:
     POST https://errors.internal.example.com/sourcemaps
     Headers: Authorization: Bearer $DEPLOY_TOKEN
     Body: { release: '2024.03.15-abc1234', maps: [...] }

  3. Source maps stored with authentication on collector
     → only the error dashboard service can read them

  4. Delete source maps from public CDN / S3 bucket before deploy completes
     → never serve *.map files publicly

  5. When an error arrives at the collector with release = '2024.03.15-abc1234',
     the collector resolves the stack trace using the stored source map
     → readable file:line shown in dashboard
     → minified stack never stored after resolution
```

```typescript
// vite.config.ts — configure source map generation
export default defineConfig({
  build: {
    sourcemap: true,         // Generate source maps
    // Do NOT set sourcemapExcludeSources: false — this keeps source content
    // out of the map itself, so the map only resolves positions, not full code
  },
});

// CI deploy script (pseudocode)
async function uploadSourceMaps(release: string, distDir: string) {
  const maps = glob.sync(`${distDir}/**/*.map`);
  await fetch('https://errors.internal.example.com/sourcemaps', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.DEPLOY_TOKEN}` },
    body: JSON.stringify({ release, maps: maps.map(readAndEncode) }),
  });
  // Delete maps from public output before sync to CDN
  maps.forEach(fs.unlinkSync);
}
```

---

### 6. Transport — Fire-and-Forget, Never Block the User

Error reporting must never degrade the user experience. A slow error collector should not freeze the page.

```typescript
class ErrorSDK {
  private rateLimiter = new ErrorRateLimiter();

  capture(error: Error, context: Record<string, unknown> = {}): void {
    const fp = fingerprint(error);

    if (!this.rateLimiter.shouldCapture(fp)) return;

    const payload = buildPayload(error, context, fp);

    // Fire-and-forget: use sendBeacon when available (survives page close)
    // Fall back to fetch with keepalive (also survives navigation)
    // Never await — never add error reporting latency to the user action
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/v1/errors', blob);
    } else {
      fetch('/v1/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // Silently swallow — error reporting must never throw
      });
    }
  }
}
```

---

### 7. Feedback Loop — Error Rate Spike Triggers Rollback

```
Deploy release '2024.03.15-abc1234' to 5% of traffic
  │
  ├── Error rate for this release: 0.2% (baseline: 0.05%)
  │   → 4x spike within 10 minutes of release
  │
  ├── Alerting rule fires:
  │   IF (error_rate[release=N, last_10m] > 2 * baseline[last_24h])
  │   THEN POST to CI webhook
  │
  └── CI webhook handler:
        1. Pause progressive rollout (keep 5%, do not continue to 100%)
        2. Page on-call engineer with link to Sentry fingerprint group
        3. If error rate > 5x baseline: auto-rollback to previous release
```

```typescript
// CI webhook handler (Node.js, runs in CI/CD infrastructure)
app.post('/webhooks/error-spike', async (req, res) => {
  const { release, errorRate, baselineRate } = req.body;

  if (errorRate > baselineRate * 5) {
    // Auto-rollback: set traffic weight for this release to 0%
    await deploymentService.setWeight(release, 0);
    await notifySlack(`#incidents`, `Auto-rollback triggered for ${release}. Error rate: ${errorRate.toFixed(2)}%`);
  } else {
    // Pause rollout and alert — human decision required
    await deploymentService.pauseRollout(release);
    await notifySlack(`#deployments`, `Rollout paused for ${release}. Error rate spike detected.`);
  }

  res.sendStatus(200);
});
```

---

### 8. Privacy — Scrub Before Transmission

```typescript
// Never log these in any error payload
const SCRUB_URL_PARAMS = ['token', 'code', 'state', 'access_token', 'id_token', 'session'];

function scrubURL(url: string): string {
  try {
    const parsed = new URL(url);
    for (const param of SCRUB_URL_PARAMS) {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '[REDACTED]');
      }
    }
    return parsed.toString();
  } catch {
    return '[UNPARSEABLE_URL]';
  }
}

// Scrub error messages — some errors accidentally contain field values
// Example: "Cannot read property 'balance' of undefined" is safe
// But: "Invalid email: user@example.com" leaks PII
function scrubMessage(message: string): string {
  return message
    // Email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    // Credit card-like numbers
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')
    // JWT tokens (three base64 segments)
    .replace(/ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[JWT]');
}

// Never log form field values in breadcrumbs
// When instrumenting click events, capture tagName and aria-label only
// When instrumenting input events, capture field name, never field value
```

---

## Trade-offs

| Decision | Sentry (third-party) | Self-hosted collector | Recommendation |
|---|---|---|---|
| **Operational cost** | Zero ops — managed SaaS | Requires maintenance, scaling | Sentry for most teams; self-host when compliance requires keeping source maps and user data on-prem |
| **Source map security** | Maps uploaded to Sentry servers | Maps stay in your infrastructure | Self-host if source code confidentiality is a hard requirement |
| **Feature richness** | Mature UI, session replay, tracing | Build what you need | Sentry is almost always the right default |

| Decision | Full capture (100%) | Sampled capture (1–10%) | Recommendation |
|---|---|---|---|
| **Debuggability** | Every occurrence captured | May miss rare errors | 100% for production critical paths; sample for high-volume, low-value errors (e.g., script tag cross-origin errors) |
| **Cost at scale** | Expensive (100M events/day) | Cheap | Sample after N occurrences of same fingerprint: first 10 always capture, then 10% |

| Decision | 20 breadcrumbs | 5 breadcrumbs | Recommendation |
|---|---|---|---|
| **Reproducibility** | Rich context for debugging | Minimal context | 20 is the practical sweet spot; beyond 20 the payload grows and PII risk increases |
| **PII exposure risk** | More breadcrumbs = more potential PII | Minimal surface | Strict breadcrumb scrubbing (no input values, no response bodies) mitigates this |

---

## Closing Statement

A production error monitoring system is the combination of reliable capture (window.onerror, unhandledrejection, React ErrorBoundary), meaningful context (breadcrumbs, release ID, hashed userId, componentStack), and operational discipline (source maps protected from public access, rate limiting to prevent collector floods, privacy scrubbing before transmission). The feedback loop — error rate by release feeding back into the deployment pipeline — is what makes error monitoring actionable rather than purely observational. The priority is always: capture accurately, transport without blocking the user, and never log PII.
