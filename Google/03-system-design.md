# Frontend System Design — Google

> L5 expectation: independently own a system long-term, make the right engineering decisions.
> Framework: Clarify → High-Level → Deep Dives → Trade-offs.

---

## RADIO Framework (Use This Structure Every Time)

| Step | What to cover |
|------|--------------|
| **R**equirements | Functional + non-functional; ask about scale, users, constraints |
| **A**rchitecture | High-level component diagram (client, API, storage) |
| **D**ata Model | What data flows? Schemas, API contracts |
| **I**nterface | API design, component interfaces, state shape |
| **O**ptimizations | Performance, accessibility, error handling, edge cases |

---

## Questions Confirmed at Google (from real candidate reports)

1. Design an **Emoji Autocomplete** for a chat app
2. Design a **JS Bin** (online code editor like CodePen)
3. Build a **Google Analytics SDK** consumed by third-party pages
4. Design a **slider/timeline component** with node selection via JavaScript
5. Design a **Tic-Tac-Toe game** (frontend only)
6. Design a **table renderer** — user enters rows/cols, renders HTML table
7. Implement a **file system API with streaming generators**
8. Design a page with **auto-loading posts** (infinite scroll with AJAX)
9. Design a **color swatch with slider** (April 2025 onsite)
10. Design a **nested checkboxes component** (indeterminate state)

---

## Deep Dive: Design Autocomplete (Emoji / Search)

### Requirements Clarification Questions
- How many suggestions to show? (default: 5-10)
- Trigger character? (`:` for emoji, any keystroke for search)
- Latency budget? (< 200ms perceived)
- Does it work offline?
- Mobile support? (virtual keyboard behavior)

### Architecture
```
User types → Debounce (300ms) → Check local cache → If miss: API call
                                      ↓
                              Render suggestion dropdown
                                      ↓
                         User selects → insert into input
```

### Key Technical Decisions

**Debounce**: 300ms — fires one request per typing pause, not per keystroke.

**Caching strategy**:
```js
const cache = new Map();
async function fetchSuggestions(query) {
  if (cache.has(query)) return cache.get(query);
  const results = await api.search(query);
  cache.set(query, results);
  return results;
}
```

**Request cancellation** (AbortController):
```js
let controller;
function search(query) {
  controller?.abort();
  controller = new AbortController();
  return fetch(`/api/search?q=${query}`, { signal: controller.signal });
}
```

**Keyboard navigation**: `ArrowUp/Down` move selection, `Enter` confirms, `Escape` closes.

**Accessibility**: `role="combobox"`, `aria-expanded`, `aria-activedescendant`, `aria-autocomplete`.

**List virtualization**: if 1000+ results, render only visible items using fixed-height rows + scroll offset.

---

## Deep Dive: Design Infinite Scroll Feed

### Requirements
- Load N items per page
- Trigger on scroll-to-bottom
- Handle slow networks gracefully
- Preserve scroll position on back navigation

### Implementation

**Option 1: Scroll event + debounce** (basic)
```js
window.addEventListener('scroll', debounce(() => {
  if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 200) {
    loadMore();
  }
}, 100));
```

**Option 2: IntersectionObserver** (preferred)
```js
const sentinel = document.querySelector('#sentinel');
const observer = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) loadMore();
}, { threshold: 0.1 });
observer.observe(sentinel);
```

**Pagination state management**:
```js
const state = {
  items: [],
  page: 1,
  hasMore: true,
  loading: false
};
```

**Optimistic UI**: add skeleton loaders while fetching.

**Performance**: Virtualize list (react-window) if > 500 items.

---

## Deep Dive: Design a Real-Time Chat App (Frontend)

### Key Architecture Decisions

| Concern | Decision | Why |
|---------|----------|-----|
| Real-time protocol | WebSocket over SSE | Bidirectional needed |
| Fallback | Long polling | SSE if WebSocket blocked |
| Message delivery | Optimistic update + ack | Perceived speed |
| History | Cursor-based pagination | Efficient for append-only |
| Images/files | Pre-signed S3 URL upload | Avoids large payloads to WS |

### State Shape
```js
{
  channels: { [channelId]: { messages: [], cursor: null, hasMore: true } },
  activeChannel: 'ch_123',
  pendingMessages: Map<localId, message>, // optimistic
  typingUsers: { [channelId]: Set<userId> }
}
```

### Optimistic Message Send
```js
function sendMessage(text) {
  const localId = uuid();
  dispatch({ type: 'ADD_OPTIMISTIC', message: { localId, text, status: 'sending' } });
  socket.emit('message', { text }, (ack) => {
    dispatch({ type: 'CONFIRM_MESSAGE', localId, serverId: ack.id });
  });
}
```

---

## Deep Dive: Design a Google Analytics SDK

### What it does
- Embedded on third-party pages via `<script>` tag
- Tracks pageviews, clicks, custom events
- Sends data to Google's collection endpoint

### Architecture Concerns
1. **Minimal footprint** — script must be tiny (<5KB gzipped)
2. **Non-blocking** — must not affect host page performance
3. **Batching** — don't send a request per event; batch with 2s flush or before `unload`
4. **Queue before loaded** — `ga('event', ...)` must work even before SDK is ready
5. **Beacon API** — use `navigator.sendBeacon` for `unload` events (XHR may be cancelled)

```js
// Async queue pattern
window.ga = window.ga || function(...args) {
  (window.ga.q = window.ga.q || []).push(args);
};
// When SDK loads, it drains ga.q
```

**Cross-Origin**: SDK on third-party domain — can't use cookies directly; use first-party cookies via the user's domain or localStorage.

---

## Deep Dive: Design Nested Checkboxes

### Requirements
- Tree of checkboxes with parent-child relationships
- Parent is checked if all children checked
- Parent is **indeterminate** if some children checked
- Clicking parent checks/unchecks all children

### State Design
```js
// Don't store derived state — compute parent state from children
function getCheckboxState(node, checkedIds) {
  if (node.children.length === 0) return checkedIds.has(node.id) ? 'checked' : 'unchecked';
  const childStates = node.children.map(c => getCheckboxState(c, checkedIds));
  if (childStates.every(s => s === 'checked')) return 'checked';
  if (childStates.every(s => s === 'unchecked')) return 'unchecked';
  return 'indeterminate';
}
```

```js
// Set indeterminate via ref (CSS cannot set this)
useEffect(() => {
  if (ref.current) ref.current.indeterminate = state === 'indeterminate';
}, [state]);
```

---

## Design a JS Bin / Online Code Editor

### Components
- **Editor panels**: HTML / CSS / JS editors (use CodeMirror or Monaco)
- **Preview iframe**: sandboxed, isolated from main app
- **Console output**: intercept `console.log` in iframe via `postMessage`
- **Execution**: inject all three panels into iframe document
- **Auto-run**: debounce 500ms after last keystroke
- **Storage**: autosave to localStorage / URL-based state sharing

### Security
- `<iframe sandbox="allow-scripts">` — prevents access to parent window
- Never `eval` user code in main context

---

## Trade-off Topics (Know These Well)

| Decision | Option A | Option B | When to pick |
|----------|----------|----------|-------------|
| Rendering | CSR | SSR | SSR for SEO/TTFB; CSR for app-like interactions |
| Real-time | WebSocket | Server-Sent Events | WS if bidirectional; SSE if server-push only |
| State | Local component state | Global store (Redux) | Global only when truly shared across distant components |
| Images | Eager load | Lazy load | Lazy below the fold; eager for hero images |
| Data fetching | REST | GraphQL | GraphQL if multiple consumers with different field needs |
| Caching | HTTP cache | Service Worker | SW for offline; HTTP cache for standard CDN caching |
