# Round 1 — React Component Design + Practical Problems

> **Duration:** 60–90 min · **Primary signal:** Can you design and build production React components at Staff bar?
> **Format (reported):** Mostly React — component API design, then **live build** of a real UI problem. Light theory; heavy hands-on.

---

## What This Round Actually Tests

| Signal | What they watch for |
|--------|---------------------|
| **Component design** | Clean API, composition, separation of concerns |
| **Practical problem solving** | Debounce, lists, forms, async states — not LeetCode |
| **TypeScript** | Typed props, discriminated unions for UI states |
| **Production habits** | Loading / error / empty, a11y, edge cases |
| **Communication** | Clarify requirements, explain trade-offs while coding |

**Less likely:** Deep JS trivia (event loop from scratch), hard DSA, CSS-only rounds.
**Still possible as follow-ups:** "Why did you structure it this way?" → hooks, re-renders, memoization.

Study: [02-react-typescript.md](../02-react-typescript.md) · [03-typescript-deep-dive.md](../03-typescript-deep-dive.md) · [12-coding-challenges.md](../12-coding-challenges.md)

---

## Typical Flow (React-Heavy)

| Phase | Time | What happens |
|-------|------|--------------|
| Intro | 5 min | Quick background |
| Component design discussion | 10–15 min | "How would you design X?" before coding |
| **Live build** | 35–50 min | Implement the component in React + TS |
| Follow-up Q&A | 10–15 min | Extend feature, fix bug, or explain your choices |

---

## Phase 1: Component Design Questions (Before You Code)

These often come **before** the editor opens. Practice answering out loud.

### Q1. How would you design a reusable `<DataTable />`?

**Staff answer structure:**
1. **Props API** — `columns`, `data`, `onSort`, `onRowClick`, `isLoading`, `emptyState`
2. **Composition** — `DataTable`, `DataTable.Column`, `DataTable.Pagination` (compound pattern)
3. **State** — sorting/filtering in URL or parent; table doesn't own server data
4. **Performance** — virtualize rows when `data.length > 100`
5. **a11y** — `<table>` semantics or `role="grid"`, sort buttons with `aria-sort`

```tsx
type Column<T> = {
  id: keyof T | string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
};
```

---

### Q2. How would you design a `<Modal />` / dialog system?

- **Compound components:** `Modal`, `Modal.Trigger`, `Modal.Content`, `Modal.Close`
- **Portal** for z-index / overflow escape
- **Focus trap**, Escape to close, return focus to trigger
- **Controlled vs uncontrolled:** `open` + `onOpenChange` (Radix pattern)
- **Stacking:** multiple modals — z-index manager or single portal stack

---

### Q3. Controlled vs uncontrolled — when and why?

| Pattern | Use when |
|---------|----------|
| Controlled | Parent needs live value (search, form w/ validation) |
| Uncontrolled | Simple inputs, file upload, perf-sensitive forms (RHF) |
| Hybrid | `defaultValue` + ref for imperative read on submit |

**Staff line:** "I default controlled for interactive UIs; uncontrolled when the DOM can own ephemeral input state."

---

### Q4. How do you structure a feature folder?

```
features/inbox/
  components/
    ConversationList.tsx
    MessageThread.tsx
    MessageComposer.tsx
  hooks/
    useConversation.ts
    useSendMessage.ts
  api/
    inbox.api.ts
  types.ts
  InboxPage.tsx
```

- **Smart/dumb split** — containers fetch; presentational components receive props
- **Colocate** hooks with the feature that owns them
- **No cross-feature imports** of internals — public barrel `index.ts`

---

### Q5. Quick React theory follow-ups (know cold)

- When does a component re-render? (state, parent, context, unstable props)
- Rules of hooks — why order matters
- `useEffect` cleanup — subscriptions, timers, abort controllers
- Keys in lists — stable ID, not index
- Error boundaries — what they catch / don't catch

Full answers: [02-react-typescript.md](../02-react-typescript.md)

---

## Phase 2: Practical Problems — Full Walkthroughs

### Problem 1: Debounced Contact Search ★★★ (MOST LIKELY)

**Prompt:** Build a contact search box. API returns results after user stops typing. Handle loading, empty, error. User can select a contact.

**Clarify first (2 min):**
- Debounce delay? (300ms default)
- Min chars? (2)
- Keyboard nav required?
- Mock API or real `fetch`?

**Component tree:**
```
ContactSearch
├── SearchInput (controlled)
├── SearchStatus (loading | error | empty)
└── ResultsList
    └── ResultItem (keyboard focusable)
```

**Full solution skeleton:**
```tsx
type Contact = { id: string; name: string; phone: string };

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; results: Contact[] }
  | { status: 'error'; message: string }
  | { status: 'empty' };

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function useContactSearch(query: string) {
  const [state, setState] = useState<SearchState>({ status: 'idle' });

  useEffect(() => {
    if (query.length < 2) {
      setState({ status: 'idle' });
      return;
    }

    const controller = new AbortController();
    setState({ status: 'loading' });

    fetch(`/api/contacts?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then(r => {
        if (!r.ok) throw new Error('Search failed');
        return r.json() as Promise<Contact[]>;
      })
      .then(results => {
        setState(
          results.length === 0
            ? { status: 'empty' }
            : { status: 'success', results }
        );
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setState({ status: 'error', message: err.message });
      });

    return () => controller.abort();
  }, [query]);

  return state;
}

export function ContactSearch({ onSelect }: { onSelect: (c: Contact) => void }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const searchState = useContactSearch(debouncedQuery);
  const [activeIndex, setActiveIndex] = useState(-1);

  const results = searchState.status === 'success' ? searchState.results : [];

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      onSelect(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setQuery('');
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative" onKeyDown={onKeyDown}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setActiveIndex(-1); }}
        aria-autocomplete="list"
        aria-controls="contact-results"
        aria-expanded={results.length > 0}
        placeholder="Search contacts..."
      />
      {searchState.status === 'loading' && <p role="status">Searching...</p>}
      {searchState.status === 'error' && <p role="alert">{searchState.message}</p>}
      {searchState.status === 'empty' && <p>No contacts found</p>}
      {searchState.status === 'success' && (
        <ul id="contact-results" role="listbox">
          {results.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === activeIndex}
              className={i === activeIndex ? 'bg-blue-100' : ''}
              onMouseDown={() => onSelect(c)}
            >
              {c.name} — {c.phone}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Staff extensions they may ask:**
- Extract `useDebouncedValue` and `useContactSearch` — show hook decomposition
- Swap to TanStack Query — explain cache key `['contacts', query]`
- Add highlight of matching substring

**Practice:** [Practice/React/Autocomplete/](../../Practice/React/Autocomplete/) · [react-hands-on-45min/18-search-debounce/](../../react-hands-on-45min/18-search-debounce/) · [react-hands-on-45min/08-searchable-dropdown/](../../react-hands-on-45min/08-searchable-dropdown/)

---

### Problem 2: Message List with Send ★★★

**Prompt:** Render a list of messages. User can type and send. New messages appear at bottom. Show sending/sent/failed status.

**Key design decisions:**
- `MessageList` (presentational) + `ChatPanel` (owns state)
- Optimistic insert with temp `clientId`
- Auto-scroll to bottom only if user is already at bottom

```tsx
type Message = {
  id: string;
  body: string;
  sender: 'me' | 'them';
  status: 'sending' | 'sent' | 'failed';
};

function MessageList({ messages }: { messages: Message[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <ul className="flex flex-col gap-2 overflow-y-auto h-96">
      {messages.map(m => (
        <li key={m.id} className={m.sender === 'me' ? 'text-right' : ''}>
          <span>{m.body}</span>
          {m.status === 'sending' && <span aria-label="Sending"> …</span>}
          {m.status === 'failed' && <button>Retry</button>}
        </li>
      ))}
      <div ref={bottomRef} />
    </ul>
  );
}

function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');

  const send = async () => {
    if (!draft.trim()) return;
    const optimistic: Message = {
      id: crypto.randomUUID(),
      body: draft,
      sender: 'me',
      status: 'sending',
    };
    setMessages(prev => [...prev, optimistic]);
    setDraft('');

    try {
      await postMessage(optimistic.body);
      setMessages(prev =>
        prev.map(m => m.id === optimistic.id ? { ...m, status: 'sent' } : m)
      );
    } catch {
      setMessages(prev =>
        prev.map(m => m.id === optimistic.id ? { ...m, status: 'failed' } : m)
      );
    }
  };

  return (
    <div>
      <MessageList messages={messages} />
      <input value={draft} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && send()} />
      <button onClick={send} disabled={!draft.trim()}>Send</button>
    </div>
  );
}
```

**Follow-ups:** Infinite scroll for history, virtualize 10k messages, typing indicator.

**Practice:** [react-hands-on-45min/13-infinite-scroll/](../../react-hands-on-45min/13-infinite-scroll/) · [react-hands-on-45min/14-virtualized-list/](../../react-hands-on-45min/14-virtualized-list/)

---

### Problem 3: Tabs with Lazy Panels ★★☆

**Prompt:** Tab component. Only mount active panel. Support keyboard (arrow keys).

```tsx
const TabsContext = createContext<{
  active: string;
  setActive: (id: string) => void;
} | null>(null);

function Tabs({ defaultTab, children }: { defaultTab: string; children: React.ReactNode }) {
  const [active, setActive] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
}

Tabs.List = function TabList({ children }: { children: React.ReactNode }) {
  return <div role="tablist">{children}</div>;
};

Tabs.Tab = function Tab({ id, children }: { id: string; children: React.ReactNode }) {
  const ctx = useContext(TabsContext)!;
  const selected = ctx.active === id;
  return (
    <button
      role="tab"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={() => ctx.setActive(id)}
    >
      {children}
    </button>
  );
};

Tabs.Panel = function Panel({ id, children }: { id: string; children: React.ReactNode }) {
  const ctx = useContext(TabsContext)!;
  if (ctx.active !== id) return null; // lazy — unmount inactive
  return <div role="tabpanel">{children}</div>;
};
```

**Practice:** [react-hands-on-45min/04-tabs/](../../react-hands-on-45min/04-tabs/) · [react-hands-on-45min/23-tabs-lazy/](../../react-hands-on-45min/23-tabs-lazy/)

---

### Problem 4: Toast / Notification Queue ★★☆

**Prompt:** Show toasts from anywhere. Max 3 visible. Auto-dismiss. Errors persist.

- Context + `useReducer` or Zustand
- `toast.success('Saved')` imperative API
- `aria-live="polite"` region

**Practice:** [react-hands-on-45min/21-toast-system/](../../react-hands-on-45min/21-toast-system/) · [Practice/React/ToastNotification/](../../Practice/React/ToastNotification/)

---

### Problem 5: Multi-Step Form ★★☆

**Prompt:** 3-step wizard with per-step validation.

- Single state object or step-scoped state
- Validate on Next, not every keystroke
- `aria-current="step"` on progress

**Practice:** [react-hands-on-45min/06-multi-step-form/](../../react-hands-on-45min/06-multi-step-form/) · [react-hands-on-45min/09-multi-step-form-validation/](../../react-hands-on-45min/09-multi-step-form-validation/)

---

### Problem 6: Call Timer / Stopwatch ★★☆ (Nextiva-specific)

```tsx
function useElapsedTimer(active: boolean, startedAt: Date | null) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active || !startedAt) return;
    const tick = () => setElapsed(Date.now() - startedAt.getTime());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, startedAt]);

  return elapsed;
}
```

**Practice:** [react-hands-on-45min/17-stopwatch-timer/](../../react-hands-on-45min/17-stopwatch-timer/) · [Practice/React/CountdownTimer/](../../Practice/React/CountdownTimer/)

---

## Phase 3: Follow-Up Questions (After You Code)

| Question | Strong answer angle |
|----------|---------------------|
| "How would you test this?" | RTL — user events, MSW for API, a11y queries |
| "How would you optimize?" | Profile first; memo only hot paths; virtualize lists |
| "What if the API is slow?" | Stale UI, cancel stale requests, skeleton not spinner |
| "How would this fit a design system?" | Headless primitive + styled wrapper in `@company/ui` |
| "Extend: add keyboard nav" | Show you can layer on without rewrite |

---

## Component Design Checklist (Use While Coding)

- [ ] Clarified requirements before coding
- [ ] Named types for props and domain entities
- [ ] Split hooks from UI (`useX` + dumb component)
- [ ] Handled **loading, error, empty, success**
- [ ] Keyboard + ARIA for interactive widgets
- [ ] `key` on list items — stable id
- [ ] Cleanup in `useEffect` (abort, timer, subscription)
- [ ] No `any`
- [ ] Explained one trade-off aloud

---

## 45-Minute Mock (Do This Twice Before Interview)

| Min | Task |
|-----|------|
| 0–3 | Read prompt, ask 3 clarifying questions |
| 3–8 | Draw component tree + types on paper |
| 8–35 | Implement happy path |
| 35–42 | Add error state + one a11y attribute |
| 42–45 | Walk through test cases aloud |

**Day 1 mock:** Contact search  
**Day 2 mock:** Message list with send

---

## Self-Check Before Round 1

- [ ] Built contact search in < 35 min without looking at notes
- [ ] Built message list with optimistic send in < 35 min
- [ ] Can explain component API for Modal or DataTable without code
- [ ] Can answer "when does React re-render?" in 30 seconds
- [ ] Know discriminated union pattern for async UI state
