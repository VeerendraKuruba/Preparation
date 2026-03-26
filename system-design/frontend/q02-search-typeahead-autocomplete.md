# Q2. Search + typeahead / autocomplete

**Prompt variants:** Search-as-you-type for **marketplace**, **social graph**, or **docs**.

[← Question index](./README.md)

---

### One-line mental model

The client **throttles intent** (debounce), **cancels stale network work** (AbortController), and **caches** short prefixes so keystrokes feel instant without hammering your API.

---

### Clarify scope in the interview

Ask these before drawing anything:

- Global search (all content types) vs in-context (search within a conversation / product page)? Affects result schema and ranking.
- PII in suggestions? User names, emails, phone numbers — logging and caching must be scoped.
- Keyboard-only compliance required (WCAG 2.1 AA)? Drives ARIA combobox implementation.
- Mobile keyboard? Soft keyboard suggestions interact with autocomplete — may need to suppress native autocomplete.
- Multi-locale / RTL? Affects tokenization and text rendering.
- Should selecting a suggestion navigate, or populate the input for further editing?

---

### Goals & requirements

**Functional**
- Results visible within ~100–300ms *perceived* latency after user pauses typing.
- Full keyboard support: arrow keys navigate list, Enter selects, Escape dismisses, Tab moves focus.
- Recent searches shown when input is focused but empty.
- Highlight the matched substring in each suggestion.

**Non-functional**
- Bounded concurrency — never more than one in-flight request per input instance.
- Safe logging — do not log raw keystrokes; log only submitted queries.
- ARIA combobox semantics for screen reader users.
- Graceful degradation — show last good suggestions rather than a flash of empty on every keystroke.

---

### High-level frontend architecture

```
User keyboard input
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│  SearchInput component                                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Debounce hook (300ms trailing)                        │  │
│  │    └─► AbortController (cancel previous)               │  │
│  │           └─► LRU Cache check (key: query+locale)      │  │
│  │                  ├─ HIT  ──────────────────────────┐   │  │
│  │                  └─ MISS ──► fetch /api/suggest     │   │  │
│  │                                  │                  │   │  │
│  │                                  ▼                  │   │  │
│  │                            Cache write              │   │  │
│  │                                  └──────────────────┘   │  │
│  │                                         │               │  │
│  │                                         ▼               │  │
│  │                              suggestions: Suggestion[]  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Listbox / Combobox (ARIA)                             │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │  │
│  │  │ option 1 │  │ option 2 │  │ option 3 │  ...        │  │
│  │  │ [hi]ghlt │  │ [hi]ghlt │  │ [hi]ghlt │             │  │
│  │  └──────────┘  └──────────┘  └──────────┘             │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
         │ on select
         ▼
  navigate(suggestion.url) OR setInputValue(suggestion.label)
```

**Optional: Web Worker** for merging server suggestions with local recent-searches history without blocking the main thread.

---

### What the client does (core mechanics)

#### 1. Debounce — 300ms trailing edge

```ts
function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

// In component:
const debouncedQuery = useDebounce(inputValue, 300);

useEffect(() => {
  if (debouncedQuery.length < 2) {
    setSuggestions(recentSearches); // show recents on empty/short
    return;
  }
  fetchSuggestions(debouncedQuery);
}, [debouncedQuery]);
```

**Why trailing edge:** Leading-edge debounce fires on the first keystroke — useful for navigation, not for search where the first character "t" has no intent. Trailing fires after the user pauses, which matches real typing patterns.

**Why 300ms not 150ms:** On mobile soft keyboards, composing a single CJK character fires multiple input events. 300ms safely spans an IME composition. For a fast desktop-only product you can reduce to 150ms.

#### 2. AbortController — cancel stale requests

```ts
const abortRef = useRef<AbortController | null>(null);

async function fetchSuggestions(query: string) {
  // Cancel any in-flight request for the previous query
  abortRef.current?.abort();
  const controller = new AbortController();
  abortRef.current = controller;

  const cacheKey = `${query}:${locale}`;
  const cached = lruCache.get(cacheKey);
  if (cached) {
    setSuggestions(cached);
    return;
  }

  try {
    const res = await fetch(
      `/api/suggest?q=${encodeURIComponent(query)}&locale=${locale}`,
      { signal: controller.signal }
    );
    if (!res.ok) throw new Error(`${res.status}`);
    const data: Suggestion[] = await res.json();

    lruCache.set(cacheKey, data);
    setSuggestions(data);
  } catch (err) {
    if ((err as Error).name === 'AbortError') return; // user kept typing — ignore
    // Show last good results rather than clearing the list
    // setSuggestions stays unchanged
    console.warn('Suggest fetch failed, keeping stale results', err);
  }
}
```

**Race condition without abort:** User types "ap" → "app" → "appl" in quick succession. Without abort, responses arrive out of order. "ap" results (slow server) can overwrite "appl" results (fast cache hit). AbortController eliminates this class of bug entirely.

#### 3. LRU cache for repeated prefixes

```ts
class LRUCache<K, V> {
  private map = new Map<K, V>();
  constructor(private maxSize: number, private ttlMs: number) {}

  get(key: K): V | undefined {
    const entry = this.map.get(key) as any;
    if (!entry) return undefined;
    if (Date.now() - entry.ts > this.ttlMs) {
      this.map.delete(key);
      return undefined;
    }
    // Move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V) {
    if (this.map.size >= this.maxSize) {
      // Evict least recently used (first entry)
      this.map.delete(this.map.keys().next().value);
    }
    this.map.set(key, { value, ts: Date.now() });
  }
}

const lruCache = new LRUCache<string, Suggestion[]>(50, 60_000); // 50 queries, 1 min TTL
```

**Why LRU:** Users backspace and retype constantly. "appl" → backspace → "appl" should be instant from cache. A TTL prevents stale inventory/catalog data from persisting beyond 60 seconds.

#### 4. ARIA combobox pattern

```tsx
<div role="combobox"
     aria-expanded={isOpen}
     aria-haspopup="listbox"
     aria-owns="suggestion-listbox">
  <input
    id="search-input"
    type="text"
    autoComplete="off"
    aria-autocomplete="list"
    aria-controls="suggestion-listbox"
    aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
    value={inputValue}
    onChange={e => setInputValue(e.target.value)}
    onKeyDown={handleKeyDown}
  />
</div>

<ul id="suggestion-listbox" role="listbox" aria-label="Search suggestions">
  {suggestions.map((s, i) => (
    <li
      key={s.id}
      id={`suggestion-${i}`}
      role="option"
      aria-selected={i === activeIndex}
      onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
    >
      <HighlightMatch text={s.label} query={inputValue} />
    </li>
  ))}
</ul>
```

```ts
function handleKeyDown(e: React.KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setActiveIndex(i => Math.max(i - 1, -1)); // -1 = input focused
  } else if (e.key === 'Enter' && activeIndex >= 0) {
    selectSuggestion(suggestions[activeIndex]);
  } else if (e.key === 'Escape') {
    setIsOpen(false);
    setActiveIndex(-1);
  }
}
```

**`aria-activedescendant` not focus move:** We keep keyboard focus on the `<input>` at all times and update `aria-activedescendant` to point to the visually active option. This allows the user to keep typing while navigating — they can refine the query without losing the cursor position.

#### 5. Safe match highlighting — no XSS

```tsx
function HighlightMatch({ text, query }: { text: string; query: string }) {
  // Escape regex special chars in query
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i}>{part}</mark>  // safe — React escapes by default
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}
```

**Never use `dangerouslySetInnerHTML` for highlighted suggestions.** If the API returns the highlight markup as HTML (e.g., `<em>app</em>le`), you must sanitize it with DOMPurify before rendering — API responses can contain attacker-controlled strings if the search index was poisoned.

---

### Trade-offs

| Decision | Chosen approach | Why | Cost / risk |
|---|---|---|---|
| Client-side vs server-side filtering | Server-side for large catalogs | Can't send 100k product names to the client; server has ranking, personalization, and typo correction | Extra network hop; mitigated by debounce + cache |
| Debounce 150ms vs 300ms | 300ms default | Covers IME composition on mobile; reduces request count ~60% vs no debounce | Slightly less snappy on fast desktop typists; offer 150ms as a product config |
| LRU cache size (50 vs 200 entries) | 50 entries, 1min TTL | Low memory footprint; most users have < 20 distinct prefixes per session | Cache miss on long sessions; increase to 100 if analytics show high backspace rate |
| `aria-activedescendant` vs roving tabindex | `aria-activedescendant` | Focus stays on input — user can type and navigate simultaneously | Older AT support for `aria-activedescendant` is inconsistent; test with NVDA |
| Stale-while-revalidate vs TTL eviction | TTL eviction | Catalog changes (price, availability) must reflect within 60s in a marketplace | SWR shows stale data longer; acceptable for entertainment content, not for commerce |
| Min query length (0 vs 2 chars) | 2 characters minimum | Single-char queries are high volume, low precision; server index cost is high | Users searching for abbreviations ("AI", "JS") must type 2 chars — acceptable UX |

---

### Failure modes & degradation

- **API 5xx:** Keep displaying the last successful suggestion set. Do not flash an empty dropdown — the jarring empty state makes the input feel broken.
- **Network timeout (> 2s):** Show a subtle spinner in the input. After 5s, show "Search unavailable" but keep the input functional for full-search submission.
- **Empty results:** Show "No results for X" — never a blank listbox. Offer "Search all results for X" as a fallback action.
- **AbortError flood:** If a user types 20 chars per second, every keystroke aborts the previous. This is expected and correct behavior — log abort ratio separately from error rate.
- **Cache poisoning via API:** TTL limits blast radius. If bad data enters the cache, it expires within 60s.

---

### Accessibility checklist

- `aria-expanded="true|false"` on the combobox wrapper — screen readers announce when the list opens/closes.
- `aria-activedescendant` points to the currently highlighted option — read aloud on change.
- Announce result count once when list opens: "5 suggestions available." Use `aria-live="polite"` on a visually hidden status element.
- Escape key: if list is open, close it. If list is already closed, clear the input. Document this behavior.
- Visible focus ring on input and each option — never `outline: none` without a custom indicator.
- Do not suppress native browser autocomplete with `autocomplete="off"` on password managers — only suppress it on the suggestions listbox input itself.

---

### Minute summary (closing statement)

"The key insight is that a typeahead is a rate-limiting problem disguised as a UI problem. We **debounce at 300ms** to match typing cadence and IME composition, **abort previous requests** on every new keystroke to prevent out-of-order response races, and back every request with an **LRU cache with a 1-minute TTL** so backspace-and-retype is always instant from memory. We render suggestions in a proper **ARIA combobox** keeping focus on the input so users can type and arrow-navigate simultaneously, and we highlight matches by splitting text — never injecting raw HTML from the API to avoid XSS. On failure we hold the last good result set rather than flashing empty, and we never log raw keystrokes — only submitted queries. The result is a typeahead that feels sub-100ms perceived, is keyboard and screen-reader accessible, and degrades gracefully when the suggest service is slow or down."

---

## For a ~60 minute round

### Suggested time boxes

| Block | Minutes | Focus |
|-------|--------:|--------|
| Clarify + requirements | 8–12 | Global vs scoped search, PII, locales, mobile keyboard |
| High-level architecture | 12–18 | Input pipeline → cache → network → listbox; API sketch |
| Deep dive 1 | 12–18 | **Debounce, cancel, cache** under fast typing |
| Deep dive 2 | 12–18 | **Combobox a11y** or **highlighting/XSS** or **BFF aggregation** |
| Trade-offs, failure, metrics | 8–12 | Empty/error states, logging boundaries, RUM |

---

### What to draw (whiteboard)

- **Pipeline diagram:** `input` → `debounce` → `(cache hit?)` → `fetch` + `AbortController` → `suggestions[]` → listbox render.
- **Sequence ID guard:** each fetch response carries a request ID; ignore responses with an ID less than the last rendered response.
- **Combobox layout:** `input[role=combobox]` + `ul[role=listbox]` + `li[role=option, aria-selected]` — three elements, two ARIA relationships.
- **Cache diagram:** LRU map with key = `(query, locale)`, value = `Suggestion[]`, eviction from left, inserts at right.

---

### Deep dives — pick 2

**A. Network & correctness** — Debounce vs throttle; trailing vs leading edge; cancel in-flight with AbortController; **TTL** for local cache; **stale-while-revalidate** (show cache, refresh quietly); minimum query length to avoid single-char flood.

**B. Accessibility** — ARIA combobox vs native `<datalist>` limitations; `aria-activedescendant` vs roving tabindex; Esc behavior; announcing result count; mobile keyboard + screen reader interaction matrix.

**C. Highlighting & XSS** — Safe tokenization with regex; escape special chars before splitting; never `dangerouslySetInnerHTML` without DOMPurify; normalization for diacritics (brief).

**D. Abuse & scale** — Min query length gate; cap concurrent fetches per session; do not log full queries if they contain PII; CDN-cacheable suggest endpoints for top-1000 prefixes; BFF to aggregate multiple suggest sources into one round-trip.

---

### Common follow-ups

- **"Recent searches?"** — Store in `localStorage` keyed by user ID; sync to server on login for cross-device; clear on logout; cap to last 10 entries; never store PII like full phone numbers.
- **"Keyboard shortcut to open search?"** — `/` key or `Ctrl+K` to focus input; document it in a tooltip; do not intercept inside text inputs.
- **"Slow network?"** — Debounce extends the window, so fewer requests are fired anyway. Show input spinner after 1s. Keep the input fully interactive — never disable it while fetching.
- **"GraphQL for suggestions?"** — Fine if the BFF already uses GraphQL: one round-trip, typed response, field cost aware. Use persisted queries to avoid sending the full query string on every keystroke. Avoid N+1 in resolvers by batching with DataLoader (backend boundary — mention it).
- **"What if the suggest API is slow (p99 > 1s)?"** — Show the last cached result; stale-while-revalidate pattern. Pair with a client-side prefix match on already-fetched results as a fast partial fallback.

---

### What you'd measure

- **Latency:** `performance.mark` from keydown to first suggestion painted; API p95/p99 by prefix length.
- **Quality:** zero-result rate by query; CTR per suggestion rank position (rank 1 vs rank 5); abandonment rate after seeing suggestions.
- **Reliability:** fetch error rate (distinct from abort rate); cache hit rate (target > 40% for returning users); abort ratio as a proxy for typing speed.
- **A11y:** keyboard navigation event count in RUM (confirms users are actually using arrow keys).
