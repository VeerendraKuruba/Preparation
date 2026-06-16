# Frontend System Design — Nextiva Staff FE Q&A

---

## Q1: System design framework (use every time)

1. **Requirements** (5 min) — functional + non-functional
2. **Constraints** — scale, latency, offline, multi-tab, a11y
3. **High-level architecture** — components, data flow
4. **Deep dive** — 2–3 critical paths
5. **Trade-offs** — what you deferred and why
6. **Observability** — metrics, error reporting, feature flags

---

## Q2: Design a Unified Agent Inbox (voice + chat + SMS)

### Requirements

| Functional | Non-functional |
|------------|----------------|
| List conversations across channels | < 100ms perceived message delivery |
| Real-time incoming messages/calls | Works with 500+ conversations |
| Compose and send replies | WCAG AA accessible |
| Presence and typing indicators | Multi-tab consistent |
| Search contacts and history | Graceful offline degradation |

### Architecture

```
┌────────────────────────────────────────────────────────────┐
│ App Shell (React Router / TanStack Router)                 │
├─────────────┬──────────────────────────┬───────────────────┤
│ Sidebar     │ Conversation Thread      │ Context Panel     │
│ - channels  │ - virtualized messages   │ - contact CRM     │
│ - filters   │ - composer               │ - call controls   │
│ - presence  │ - delivery status        │ - notes           │
└─────────────┴──────────────────────────┴───────────────────┘
         │              │                        │
         ▼              ▼                        ▼
   TanStack Query   Realtime Client         TanStack Query
   (REST history)   (WebSocket events)      (CRM integration)
```

### State breakdown

| State | Store |
|-------|-------|
| Conversation list | Query — `['conversations', filters]` |
| Message thread | Query — `['messages', conversationId]` + WS patches |
| Selected conversation | URL param `/inbox/:id` |
| Composer draft | Local state or `localStorage` |
| Connection status | Zustand or React context |
| Call state machine | Dedicated hook — `useCallSession()` |

### Critical path: incoming message

1. WebSocket receives `message.created`
2. Validate payload (Zod)
3. If conversation open → `setQueryData` append message
4. If not open → increment unread badge in conversation list cache
5. `aria-live` announcement for a11y
6. If tab backgrounded → Browser Notification

---

## Q3: Design Autocomplete for CRM Contact Search

### API contract

```typescript
GET /api/contacts/search?q=john&limit=10
→ { results: Contact[], nextCursor?: string }
```

### Frontend

- Debounce 300ms
- AbortController on query change
- TanStack Query with `enabled: q.length >= 2`
- Keyboard: ↑↓ navigate, Enter select, Escape close
- Highlight matching substring
- Recent searches cached locally
- Rate limit UI — "Too many requests, try again"

### Edge cases

- Empty results vs loading vs error — distinct UI
- Selected contact persists on blur behavior
- International phone formatting in display

---

## Q4: Design a Notification System

### Types

| Type | Priority | Channel |
|------|----------|---------|
| Incoming call | Critical | Modal + sound + `aria-live=assertive` |
| New message | High | Toast + badge |
| System maintenance | Low | Banner |

### Architecture

```typescript
type Notification = {
  id: string;
  type: 'call' | 'message' | 'system';
  priority: 'critical' | 'high' | 'low';
  payload: unknown;
  createdAt: Date;
  read: boolean;
};

// Queue with max visible toasts; stack critical on top
// Dedupe by id — don't show duplicate call notifications
```

### Real-time

- WebSocket `notification.created` events
- Fallback: SSE or polling for environments blocking WS

---

## Q5: Design a Design System for Multi-Surface (Web + Extension)

See [04-css-tailwind-design-system.md](./04-css-tailwind-design-system.md) and Round 2 guide.

**Key points:**
- `packages/ui` with Radix primitives + Tailwind tokens
- Storybook as single source of documentation
- Visual regression in CI
- Extension uses Shadow DOM wrapper to prevent style bleed

---

## Q6: Design Infinite Scroll Feed with Real-Time Inserts

**Challenge:** User scrolled up reading history; new messages arrive at bottom.

**Solution:**
```typescript
const [isAtBottom, setIsAtBottom] = useState(true);

// On scroll — detect if within 100px of bottom
// On new message:
if (isAtBottom) scrollToBottom();
else showNewMessagePill(count);
```

**Pagination:** Cursor-based `before` param for older messages; `useInfiniteQuery`.

---

## Q7: API error handling strategy

```typescript
type ApiError =
  | { kind: 'network' }
  | { kind: 'unauthorized' }
  | { kind: 'rate_limited'; retryAfter: number }
  | { kind: 'server'; status: number }
  | { kind: 'validation'; fields: Record<string, string> };

// Global Query error handler
queryClient.setDefaultOptions({
  queries: {
    retry: (count, error) => error.kind !== 'validation' && count < 3,
  },
});
```

**Per-integration error boundaries** — Salesforce down doesn't crash inbox.

---

## Q8: Authentication in SPA

- **httpOnly secure cookie** for refresh token (preferred)
- Access token in memory (not localStorage) — XSS mitigation
- Silent refresh before expiry
- WebSocket reconnect with fresh token
- Logout → invalidate all Query caches + close socket

---

## Q9: Testing strategy for system you designed

| Layer | Tool | What |
|-------|------|------|
| Unit | Vitest | Hooks, parsers, reducers |
| Component | RTL + Storybook play | User flows, a11y |
| Integration | MSW + RTL | API mocking |
| E2E | Playwright | Critical paths (login, send message) |
| Visual | Chromatic | Design system regressions |

---

## Q10: Migration — legacy jQuery/Ember app to React

**Strangler fig pattern:**
1. Identify bounded surface (e.g., settings page)
2. Build in React behind feature flag
3. Shared auth/session layer
4. iframe or module federation for coexistence during transition
5. Measure adoption; remove legacy when 100%

**Staff talking point:** "I wouldn't big-bang rewrite — I'd ship vertical slices with rollback capability."

---

## Q11: Scalability numbers to mention

- 10k messages per conversation → virtualization required
- 500 concurrent conversations in sidebar → virtualized list + server-side filter
- 50 agents per team → presence updates batched
- 100ms message delivery SLA → optimistic UI + WebSocket

---

## Q12: Questions to ask during system design

- What's the expected scale (users, messages/day)?
- Is offline a hard requirement?
- Single region or global latency concerns?
- Existing API contracts or greenfield?
- Mobile/extension in scope for v1?
