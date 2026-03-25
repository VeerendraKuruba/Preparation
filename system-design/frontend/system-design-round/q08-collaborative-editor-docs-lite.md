# Q8. Collaborative editor (docs-lite)

**Prompt variants:** **Google Docs**–like—frontend angle.

 [← Question index](./README.md)

---

### One-line mental model

The browser holds a **document model** and **sequence/version**; updates flow through a **long-lived session**; the UI must **merge** concurrent edits per **OT/CRDT** assumptions the team defines, without freezing typing.

### Clarify scope in the interview

Rich text vs blocks? Comments? Offline? Presence cursors?

### Goals & requirements

- **Functional:** typing, selection, presence, reconnect.
- **Non-functional:** typing latency, bounded memory, **no silent clobber**.

### High-level frontend architecture

Editor core (blocks) → **WS** session → periodic snapshot → storage service; presence **throttled**.

### What the client does (core mechanics)

1. Split model into **blocks**; render only visible range where possible.
2. **Buffer local ops**; flush with ordering rules.
3. On reconnect: **snapshot + catch-up**.

### Trade-offs

| Choice upside | Trade-off |
|---------------|-----------|
| CRDT | More client complexity, easier offline story |
| OT | Server coordination heavier |

### Failure modes & degradation

Read-only mode if locked; offer **copy** of unsynced changes before hard refresh.

### Accessibility checklist

Don’t trap users in contenteditable hell—expose **toolbar** and structure; shortcuts doc.

### Minute summary (closing)

“We keep **latency low** with block-wise editing and a **sessioned sync** path; **reconnect** does snapshot + delta; conflicts become **explicit UX**, not silent data loss.”

---

## For a ~60 minute round

### Suggested time boxes

| Block | Minutes | Focus |
|-------|--------:|--------|
| Clarify + requirements | 8–12 | Rich text vs blocks, comments, offline, concurrent users scale |
| High-level architecture | 12–18 | Document model, session transport, persistence sketch |
| Deep dive 1 | 12–18 | **OT vs CRDT** (high level) + client responsibilities |
| Deep dive 2 | 12–18 | **Reconnect / snapshot** or **presence** or **editor perf** |
| Trade-offs, failure, metrics | 8–12 | Conflict UX, typing latency SLOs |

### What to draw (whiteboard)

- **Blocks** array with ids; visible slice rendered.
- **WS session:** client ops → server → fanout; **version/seq** on ack.
- **Reconnect:** `snapshot` + `catch-up ops` arrow.
- Optional: **presence** bus (throttled cursors).

### Deep dives — pick 2

**A. Concurrency model** — Name **OT** vs **CRDT** trade-offs; client holds **pending local ops**; server serializes or merges; **undo** interacts badly with shared undo—scope carefully.

**B. Performance** — Per-block editors vs one giant `contenteditable`; minimize React re-renders; measure **input latency**; isolate toolbar; web workers for spellcheck (optional).

**C. Reconnect** — Snapshot boundary; replay buffer; **duplicate op** idempotency; “save conflict” screen; offer export of unsynced buffer.

**D. Presence & comments** — Anchored threads; throttle cursor broadcasts; **anonymize** in large meetings (product); read-only viewers.

### Common follow-ups

- **“Offline-aware?”** — Queue ops; explicit “pending sync” state; conflict explosion—maybe **read-only** offline v1.
- **“Paste from Word?”** — Sanitize HTML aggressively; clipboard APIs; progressive enhancement.
- **“Permissions within doc?”** — Sections editable by role—server validates every op; UI hints only.

### What you’d measure

- **Latency:** keystroke → stable render; server round-trip for op ack.
- **Reliability:** reconnect success, merge conflict rate, data loss incidents (target **zero**).
- **Collaboration:** concurrent author count per doc vs error rate.

