# Q2. Search + typeahead / autocomplete

**Prompt variants:** Search-as-you-type for **marketplace**, **social graph**, or **docs**.

 [← Question index](./README.md)

---

### One-line mental model

The client **throttles intent** (debounce), **cancels stale network work**, and **caches** short prefixes so keystrokes feel instant without DDOS-ing your API.

### Clarify scope in the interview

Global search vs in-context? PII in suggestions? **Keyboard-only** compliance required?

### Goals & requirements

- **Functional:** results under ~100–300ms *perceived*; ↑↓ Enter Esc; optional recents.
- **Non-functional:** bounded concurrency; safe logging (no secrets in URLs); **combobox** semantics.

### High-level frontend architecture

Input → **debounce** → **cache check** → **fetch** with **AbortController** → render listbox; optional **worker** for local history merge.

### What the client does (core mechanics)

1. Debounce **150–300ms**; abort previous request.
2. **LRU cache** keyed by `(prefix, locale)`; respect HTTP caching if CDN-friendly.
3. Highlight matches **without** `dangerouslySetInnerHTML` unless sanitized.
4. Throttle analytics on input.

### Trade-offs

| Choice upside | Trade-off |
|---------------|-----------|
| Larger cache | Stale suggestions after catalog changes—use TTL |
| Instant local history | Unsynced across devices unless account store |

### Failure modes & degradation

Show **last good** suggestions; honest empty state; back off after repeated 5xx.

### Accessibility checklist

**aria-expanded**, **aria-activedescendant** (or native combobox pattern); Esc clears/dismisses; visible focus ring.

### Minute summary (closing)

“We **debounce + abort + cache** typeahead, render an accessible **combobox**, and **degrade** to last-known results instead of flashing errors on every keystroke.”

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

### What to draw (whiteboard)

- Pipeline: `input` → `debounce` → `(cache hit?)` → `fetch` + `AbortController` → `suggestions[]`.
- **Sequence id** on each response to ignore stale replies.
- Combobox: input + listbox + **active option** (conceptual).

### Deep dives — pick 2

**A. Network & correctness** — Debounce vs throttle; trailing vs leading edge; cancel in-flight; **TTL** for local cache; **stale-while-revalidate** (show cache, refresh quietly).

**B. Accessibility** — ARIA combobox vs native limitations; focus and Esc; how often to **announce** result counts; mobile + screen reader.

**C. Highlighting & XSS** — Tokenize safely; escape; no raw HTML from API without sanitize; normalization (brief).

**D. Abuse & scale** — Min query length; cap concurrent fetches; don’t log full queries if sensitive; CDN for popular prefixes if allowed.

### Common follow-ups

- **“Recent searches?”** — `localStorage` vs server; sync across devices; clear on logout; cap size.
- **“Keyboard?”** — `/` to focus; ↑↓ navigation; Enter semantics (navigate vs submit)—state explicitly.
- **“Slow network?”** — Keep input responsive; last-good results; skeleton sparingly.
- **“GraphQL?”** — Fine if justified: one round-trip, **field cost**, persisted queries, avoid N+1 in resolvers (backend—mention boundary).

### What you’d measure

- **Latency:** marks from keystroke to suggestion paint; API p95/p99.
- **Quality:** zero-result rate; CTR by rank.
- **Reliability:** error rate, abort ratio, cache hit rate.

