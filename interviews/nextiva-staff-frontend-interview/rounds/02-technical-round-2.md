# Round 2 — Frontend System Design

> **Duration:** 60–90 min · **Primary signal:** Can you architect a frontend system at Staff bar?
> **Format (reported):** **System design focused** — whiteboard/diagram + discussion. May include light follow-ups tied to the design; not a heavy coding round.

---

## What This Round Actually Tests

| Signal | What they watch for |
|--------|---------------------|
| **Requirements gathering** | You ask clarifying questions before designing |
| **Architecture** | Component boundaries, data flow, state ownership |
| **Real-time** | WebSocket lifecycle, optimistic UI, reconnect |
| **Scale & perf** | Virtualization, caching, bundle strategy |
| **Staff judgment** | Trade-offs, what you defer, how you'd migrate |
| **Product sense** | Ties design to agent/user experience |

**Primary activity:** 40–50 min system design whiteboard.  
**Secondary:** Resume stories, "how would you extend this?" discussions.

Study: [09-frontend-system-design.md](../09-frontend-system-design.md) · [06-realtime-websocket-telephony.md](../06-realtime-websocket-telephony.md) · [05-tanstack-ecosystem.md](../05-tanstack-ecosystem.md)

---

## Typical Flow (System Design Heavy)

| Phase | Time | What happens |
|-------|------|--------------|
| Intro / resume | 5–10 min | Anchor to your largest frontend system |
| **System design prompt** | 40–50 min | Design end-to-end — you drive the whiteboard |
| Deep dive | 10–15 min | Interviewer picks 2–3 areas to probe |
| Wrap-up | 5 min | Your questions |

---

## The 5-Step Framework (Use Every Time)

### Step 1 — Requirements (5 min)

**Functional** — what the user can do  
**Non-functional** — latency, scale, offline, a11y, multi-tab

**Example clarifying questions:**
- How many concurrent users / messages per agent?
- Real-time required or polling OK?
- Offline support?
- Mobile / extension in scope?
- Existing APIs or greenfield?

### Step 2 — High-Level UI (5 min)

Draw the screen regions first — interviewers want product thinking.

```
┌─────────────────────────────────────────────────────────┐
│ Header — presence, notifications, call status           │
├──────────────┬──────────────────────────┬───────────────┤
│ Sidebar      │ Main content             │ Context panel │
│ (lists)      │ (thread / dashboard)     │ (CRM, details)│
└──────────────┴──────────────────────────┴───────────────┘
```

### Step 3 — Data & State Architecture (15 min)

**State ownership table — always draw this:**

| Data | Owner | Tool |
|------|-------|------|
| Server entities (messages, contacts) | Server | TanStack Query |
| URL (selected id, filters) | URL | Router search params |
| WebSocket connection | Client module | Custom hook + event bus |
| Ephemeral UI (draft, modals) | Local | `useState` |
| Cross-cutting UI (theme) | Rare updates | Context |

### Step 4 — Critical Paths (15 min)

Pick 2 flows and go deep:
1. **Happy path** — user opens inbox, sees messages
2. **Real-time path** — new message arrives via WebSocket
3. **Failure path** — disconnect, retry, offline queue

### Step 5 — Trade-offs & Rollout (5 min)

- What ships in v1 vs v2
- Feature flags for rollout
- How you'd migrate from legacy
- Metrics you'd track

---

## Prompt 1: Real-Time Agent Inbox ★★★ (MOST LIKELY)

### Requirements (state these)

| Functional | Non-functional |
|------------|----------------|
| Conversation list across channels | < 100ms perceived message delivery |
| Message thread with send/receive | 500+ conversations, 10k+ messages/thread |
| Presence & typing indicators | WCAG AA, keyboard navigable |
| Unread badges | Multi-tab consistent |
| Contact/CRM sidebar | Graceful offline / reconnect |

### Architecture Diagram

```
┌────────────────────────────────────────────────────────────┐
│ InboxApp (TanStack Router — /inbox/:conversationId)        │
├─────────────┬──────────────────────────┬───────────────────┤
│ Conversation│ MessageThread            │ ContactPanel      │
│ Sidebar     │ (virtualized)            │ (CRM data)        │
│             │ + Composer               │                   │
└─────────────┴──────────────────────────┴───────────────────┘
       │                │                         │
       ▼                ▼                         ▼
  TanStack Query    RealtimeClient            TanStack Query
  ['conversations']  (WebSocket)              ['contact', id]
  ['messages', id]        │
       ▲                  ▼
       │           EventNormalizer
       └──── setQueryData / invalidateQueries
```

### Deep Dive: Incoming Message Flow

1. WebSocket receives `{ type: 'message.created', payload }`
2. **Validate** with Zod at boundary
3. If thread open → `queryClient.setQueryData` append message
4. If thread closed → patch conversation list (unread +1, preview text)
5. `aria-live="polite"` announcement
6. If tab hidden → Browser Notification API

### Deep Dive: WebSocket Client

- Connect on auth → heartbeat 30s → exponential backoff reconnect
- **Decouple transport from UI** — EventEmitter / pub-sub internally
- Queue outgoing while disconnected; replay in order on reconnect
- On reconnect → `sync(since: lastSequenceId)` to catch up

### Deep Dive: Composer / Send

1. Optimistic insert with `clientId`, `status: 'sending'`
2. POST or WS send
3. ACK → `status: 'sent'`, replace temp id
4. Error → `status: 'failed'`, retry button

### What to defer (shows judgment)

- v1: No offline IndexedDB — banner "connection lost" is enough
- v2: Offline queue, full-text search, read receipts batching

Full detail: [09-frontend-system-design.md](../09-frontend-system-design.md) · [06-realtime-websocket-telephony.md](../06-realtime-websocket-telephony.md)

---

## Prompt 2: Contact Center Agent Dashboard ★★★

### Screen regions

- **Queue panel** — waiting calls/chats, priority
- **Active interaction** — current call or chat
- **Agent status** — available, on-call, away, after-call-work
- **Metrics strip** — calls handled, avg handle time

### State machine for agent status

```typescript
type AgentStatus =
  | { state: 'available' }
  | { state: 'on-call'; callId: string; startedAt: Date }
  | { state: 'after-call-work'; callId: string }
  | { state: 'away'; reason?: string };
```

- Status drives what UI is shown and what actions are enabled
- Server is source of truth; optimistic only for non-critical toggles

### Real-time events

- `queue.updated`, `call.assigned`, `call.ended`, `agent.status.changed`
- Critical events → `aria-live="assertive"` (incoming call)

---

## Prompt 3: Shared Design System ★★☆

### Package structure

```
packages/ui/
  primitives/     # Radix wrappers — Dialog, Combobox, Tooltip
  components/     # Button, Input, DataTable
  tokens/         # CSS variables, Tailwind preset
  icons/
```

### Key decisions

| Topic | Recommendation |
|-------|----------------|
| Primitives | Radix / Base UI — behavior + a11y |
| Styling | Tailwind + `cva` variants |
| Docs | Storybook + autodocs |
| Testing | Interaction tests in Storybook; Chromatic visual regression |
| Versioning | Semver + changesets; codemods for breaking changes |
| Extension | Shadow DOM wrapper or prefixed tokens for style isolation |

Full detail: [04-css-tailwind-design-system.md](../04-css-tailwind-design-system.md)

---

## Prompt 4: Notification System ★★☆

| Type | Priority | UX |
|------|----------|-----|
| Incoming call | Critical | Modal + sound + `aria-live=assertive` |
| New message | High | Toast + badge |
| System alert | Low | Dismissible banner |

- Central notification store (Zustand or reducer)
- Dedupe by `id`
- Max 3 visible toasts; queue the rest
- WebSocket `notification.created` + fallback polling

---

## Prompt 5: Autocomplete over CRM Contacts ★★☆

- Debounced search, AbortController, TanStack Query cache
- Recent searches in `localStorage`
- Rate-limit UI feedback
- Per-integration error boundary (Salesforce down ≠ whole app crash)

---

## Follow-Up Questions Interviewers Ask

| Question | Answer angle |
|----------|--------------|
| "Where does Redux fit?" | Rarely for server state; maybe legacy; prefer Query + Zustand |
| "How do you handle auth?" | httpOnly refresh cookie; access in memory; WS reconnect with fresh token |
| "How do you test this?" | MSW + RTL for flows; E2E Playwright for critical paths |
| "How do you monitor?" | RUM (LCP, INP), error tracking (Sentry), WS connection metrics |
| "How would you migrate legacy?" | Strangler fig — vertical slices behind feature flags |
| "Bundle size concerns?" | Route-level code split; lazy heavy charts; analyze with visualizer |

---

## Resume Stories to Have Ready (5–10 min slot)

1. **Largest system you architected** — scale, your decisions, outcome
2. **Real-time feature** — latency, reconnect, optimistic UI
3. **Design system** — adoption, primitives you built
4. **Performance win** — metric before/after
5. **Production incident** — detect, mitigate, prevent

Template: [10-staff-level-behavioral.md](../10-staff-level-behavioral.md)

---

## System Design Rubric

| Dimension | Staff bar | Below bar |
|-----------|-----------|-----------|
| Requirements | Asks 5+ clarifying questions | Jumps to solution |
| State | Server / client / URL separated | "Global Redux store" |
| Real-time | Reconnect + optimistic + ordering | "Use WebSocket" only |
| Scale | Virtualization, pagination cursors | Renders all rows |
| Product | Agent UX, failure modes | Boxes and arrows only |
| Pragmatism | v1 scope, feature flags | Boils the ocean |

---

## 30-Minute Whiteboard Mock

| Min | Activity |
|-----|----------|
| 0–5 | Clarify requirements — write on board |
| 5–10 | UI regions diagram |
| 10–20 | State table + data flow arrows |
| 20–25 | Deep dive one real-time flow |
| 25–30 | Trade-offs + "what I'd ship in v1" |

**Practice prompt:** "Design the agent inbox for Nextiva — chat + calls in one view."

---

## Self-Check Before Round 2

- [ ] Whiteboarded agent inbox in 30 min without notes
- [ ] Can draw WebSocket reconnect flow from memory
- [ ] Can explain TanStack Query cache invalidation strategy
- [ ] Have 3 resume stories with metrics ready
- [ ] Know what you'd defer to v2 (shows Staff judgment)
