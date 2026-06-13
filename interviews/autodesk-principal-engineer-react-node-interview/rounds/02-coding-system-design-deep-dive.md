# Round 2 — Frontend System Design + Coding Extension

| | |
|---|---|
| **Format** | 2–3 interviewers, whiteboard/Miro + CoderPad |
| **Duration** | ~60 min |
| **Eliminates?** | Yes |
| **Split** | ~30 min **frontend architecture** + ~15–30 min coding (UI extension or tree/DSA) |

> **Role note:** Lead every design answer with **component hierarchy, state ownership, and UX states**. Backend/AWS is supporting context — describe API *shapes* the UI needs, not Kafka cluster sizing unless asked.

---

## Interview Flow (Frontend-Weighted)

```
0:00–0:30   Frontend system design — viewer shell, project dashboard, or collaboration UI
0:30–0:45   Coding — UI extension (tree panel, seat grid) OR Round 1 DSA follow-up
0:45–0:60   React architecture follow-ups — state, perf, design system, OAuth from browser POV
```

> **Key insight:** Round 2 is not isolated — they **connect** coding across rounds. If Round 1 was nested boxes, Round 2 adds "print all paths" or "serialize to JSON" or "watch for changes."

---

## Part A — Frontend System Design Q&A

### Q1: Design the **React UI** for a design-file collaboration product (Autodesk-relevant)

**Clarifying questions (UX-first):**
- Which surfaces? Viewer + project browser + properties panel + comments?
- Real-time cursors/presence or lock-and-checkout UX?
- Desktop-only or responsive?
- Slow network / translation-in-progress UX?

**Frontend architecture (draw this first):**
```
App
├── AuthLayout (session, org switcher)
├── ProjectShell
│   ├── Sidebar — project tree (virtualized)
│   ├── Main — APS Viewer host + toolbar
│   ├── RightPanel — properties | comments (tabs)
│   └── PresenceBar — avatars, live cursors
└── Global — toasts, command palette, error boundary
```

**State ownership (Principal answer):**
| State | Where | Why |
|-------|-------|-----|
| Server: projects, files, permissions | React Query | Cache, invalidation, retry |
| Viewer selection, camera | Zustand or viewer SDK events | High-frequency, avoid root re-renders |
| UI chrome: panel widths, theme | localStorage + context | Persist UX preferences |
| Comment draft | Local component state | Don't pollute global store |

**Data flow:**
```
User action → optimistic UI → API/BFF → invalidate queries → reconcile
Conflict (409) → modal: refresh | overwrite | discard
```

**Performance:** code-split viewer route; virtualize tree; debounce search; Suspense for heavy panels.

**Full-stack (30 seconds, after UI):** presigned S3 uploads; WebSocket presence; Node BFF for APS OAuth only.

**Principal add:** "RFC covers component ownership, design tokens, perf budgets (LCP/INP), and error-state matrix before build."

---

**Optional — infra diagram (only if interviewer pushes beyond frontend):**

```
React SPA (Viewer shell) ──► BFF ──► APS APIs / Postgres / S3
                         └── WebSocket ──► presence updates
```

---

### Q2: Design the **frontend** for a real-time messenger UI (reported topic — UI lens)

**Focus on what you'd whiteboard for a React role:**

```
App
├── ConversationList (virtualized, unread badges, search)
├── MessageThread (infinite scroll ↑, date separators)
├── Composer (textarea, attachments, send state)
└── ConnectionStatus (reconnecting banner, offline queue UI)
```

**Frontend concerns:**
- **Optimistic send:** show message pending → sent → failed + retry
- **WebSocket hook:** reconnect with exponential backoff; merge events into React Query cache
- **Read receipts:** tick icons driven by message status in cache
- **Scroll:** stick to bottom on new message unless user scrolled up (preserve position)

**API shapes (not backend design):** `GET /conversations`, `GET /messages?cursor=`, `WS /realtime`

> Full WhatsApp backend (Kafka, sharding) is **awareness only** for this role — know that events exist, design the UI to handle delay, duplication, and ordering.

---

### Q3: OAuth 2.0 for a React app integrating APS — **frontend + BFF flow**

**Answer (what a frontend Principal must know):**

| | OAuth 1.0 | OAuth 2.0 |
|---|-----------|-----------|
| **Tokens** | Request token + access token + signature | Access token (+ refresh token) |
| **Crypto** | HMAC signatures on every request | HTTPS + bearer tokens |
| **Flows** | Limited | Authorization code, client credentials, device, PKCE |
| **Use today** | Legacy (Twitter API v1) | Modern APIs (APS, Google, Azure AD) |

> "React never holds client_secret. SPA uses **authorization code + PKCE** → redirect → Node BFF exchanges code → **httpOnly session cookie**. React calls `/api/*` only; loading states during auth redirect; handle 401 with silent refresh or re-login modal."

**OAuth 1 vs 2 (one line if asked):** OAuth 2 + PKCE is the modern standard; OAuth 1 HMAC signatures are legacy.

---

### Q4: Kafka — what does the **frontend engineer** need to know? (Reported)

**Answer:**
> "Kafka is backend infrastructure. My concern is **UI correctness**: eventual consistency, polling vs push, showing 'processing' while translation jobs run, invalidating React Query when `ModelReady` event arrives via WebSocket or SSE. I design idempotent UI actions and clear job status — not broker partitions."

---

## Part B — Coding Extension Q&A

### Q1: Filesystem — print all paths to leaf nodes (Round 1 extension)

```js
function allPaths(root, path = [], result = []) {
  const current = [...path, root.name];
  const children = root.children ?? [];

  if (children.length === 0) {
    result.push(current.join('/'));
    return result;
  }

  for (const child of children) {
    allPaths(child, current, result);
  }
  return result;
}
```

**Follow-up:** Serialize tree to JSON and deserialize — discuss schema validation (Zod).

---

### Q2: Watch filesystem for changes (extension)

**Approach (verbal):**
> "In browser: polling or SSE from server. On server: inotify/FSEvents debounced → emit WebSocket event. For S3: S3 Event Notifications → SQS → worker → Kafka → UI."

---

### Q3: Rate limiter — 100 requests/min per user (Node)

```js
// Token bucket in Redis — production pattern
async function isAllowed(userId, limit = 100, windowSec = 60) {
  const key = `rl:${userId}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSec);
  return count <= limit;
}
```

**Express middleware:**
```js
async function rateLimit(req, res, next) {
  if (!(await isAllowed(req.user.id))) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
}
```

---

## Part C — Delivery Context (Brief — Not the Main Bar)

**How the React app is hosted (mention after UI design):**
- Static build → S3 + CloudFront
- BFF on ECS if needed for APS token proxy
- Environment config at build time vs runtime for feature flags

> Reference: [APS — Build on AWS](https://aps.autodesk.com/blog/how-build-your-forge-application-aws) — know the diagram, don't lead with it.

---

## Part D — Trade-off Questions (Principal Bar)

### Q: Micro-frontends vs monolith React app for 15 FE engineers?

**Answer (frontend Principal):**
> "Start with a **well-structured monolith** — feature folders, lazy routes, shared design system. Extract micro-frontends when **independent deploy cadence** or team boundaries hurt velocity. Module Federation for viewer shell vs admin is a common Autodesk-shaped split. Premature MFEs hurt UX consistency and bundle deduplication."

---

### Q: REST vs GraphQL for this platform?

**Answer:**
> "REST + OpenAPI for public-ish CRUD and cache-friendly resources. GraphQL if many clients need vastly different field sets and you're willing to invest in query cost limits and dataloaders. For APS integration, REST maps cleanly to resource-oriented design files and versions."

---

## Questions to Ask in Round 2

1. "How does your team split APS Viewer concerns vs product-specific UI?"
2. "What's your event backbone — Kafka, SNS/SQS, or something else?"
3. "How do Principals participate in architecture reviews vs squad leads?"
