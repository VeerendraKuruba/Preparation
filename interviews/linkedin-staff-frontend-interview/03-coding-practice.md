# Coding Practice — Phone Screen

> Mix of **vanilla JS utilities** (LinkedIn FE-specific) and **LC easy/medium** (Staff fallback pattern).

---

## Tier 1 — Must Implement From Memory (Vanilla JS)

| Problem | Time target | Solution |
|---------|-------------|----------|
| Memoize | 8 min | [practice/memoize.js](./practice/memoize.js) |
| Memoize + maxSize (LRU) | +5 min | Same file |
| Infinite scroll + fetch | 20 min | [practice/infinite-scroll-vanilla.js](./practice/infinite-scroll-vanilla.js) |
| getElementsByClassName | 10 min | [practice/getElementsByClassName.js](./practice/getElementsByClassName.js) |
| Debounce | 10 min | [../../javascript-machine-coding/01-debounce-throttle.js](../../javascript-machine-coding/01-debounce-throttle.js) |
| Throttle | 10 min | Same file |
| EventEmitter | 15 min | [../../javascript-machine-coding/02-event-emitter.js](../../javascript-machine-coding/02-event-emitter.js) |
| Promise.all polyfill | 15 min | [../../javascript-machine-coding/03-promise-all.js](../../javascript-machine-coding/03-promise-all.js) |

---

## Tier 2 — LeetCode (LinkedIn Tag + Reported)

Filter: [leetcode.com — Company: LinkedIn](https://leetcode.com/company/linkedin/)

### Easy (Phone screen — edge case focus)

| # | Problem | Pattern |
|---|---------|---------|
| 242 | Valid Anagram | Hash map |
| 125 | Valid Palindrome | Two pointers |
| 344 | Reverse String | Two pointers |
| 20 | Valid Parentheses | Stack |
| 1 | Two Sum | Hash map |
| 217 | Contains Duplicate | Set |

### Medium (Staff SWE-style phone screen)

| # | Problem | Pattern | Reported |
|---|---------|---------|----------|
| 56 | Merge Intervals | Sort + merge | FE Handbook |
| 3 | Longest Substring Without Repeating | Sliding window | Common |
| 146 | LRU Cache | Map + doubly linked list | Staff onsite |
| 716 | Max Stack | Stack + auxiliary | Staff LC discuss |
| 127 | Word Ladder | BFS | LinkedIn connections variant |
| 981 | Time Based Key-Value Store | Binary search | Tagged |

### Staff Follow-up Themes

- LRU + **TTL expiry** — lazy vs background cleanup
- Shortest path in connection graph — **bi-directional BFS**
- Concurrency / thread-safe cache — discuss even in JS context (Workers, SharedArrayBuffer)

---

## Tier 3 — String Manipulation (FE Phone Screen)

Reported as "easy LC level but focus on edge cases":

```javascript
// Reverse words in a string
function reverseWords(s) {
  return s.trim().split(/\s+/).reverse().join(" ");
}

// Edge cases to state aloud:
// - empty string, only spaces, multiple spaces, unicode?
```

Practice in repo:
- [../../Practice/validAnagram.js](../../Practice/validAnagram.js)
- [../../Practice/longestSubstring.js](../../Practice/longestSubstring.js)
- [../../leetcode/strings/](../../leetcode/strings/)

---

## Tier 4 — Guess the Output (Daily Drill)

| Resource | Format |
|----------|--------|
| [practice/guess-the-output.js](./practice/guess-the-output.js) | 10 LinkedIn-style questions |
| [../../javascript/js-tricky-questions-answers.js](../../javascript/js-tricky-questions-answers.js) | Full explanations |

**Routine:** 10 questions/day, timed 15 min, log score.

---

## Timed Mock Sessions

### Mock A — FE Pattern (60 min)

| Block | Task |
|-------|------|
| 0–15 min | 5 output questions + explain 2 closures |
| 15–25 min | Event delegation + CSS specificity oral |
| 25–40 min | Memoize from blank file |
| 40–55 min | Infinite scroll from blank file |
| 55–60 min | Retrospective — what broke? |

### Mock B — Staff LC Pattern (60 min)

| Block | Task |
|-------|------|
| 0–15 min | 3 behavioral bullets (STAR) |
| 15–45 min | 1 LC medium (LinkedIn tag) |
| 45–55 min | Dry-run adversarial test case |
| 55–60 min | Complexity + optimization follow-up |

---

## How to Practice Without a Console (LinkedIn-Specific)

1. Use **VS Code / Notepad** with syntax highlighting off (optional).
2. After writing, **trace on paper** with a table: line | variables | output.
3. Say explanations **out loud** — interview is verbal.
4. For DOM code, sketch the tree and event flow.

---

## Repo Cross-Links

| Topic | Path |
|-------|------|
| Machine coding index | [../../javascript-machine-coding/README.md](../../javascript-machine-coding/README.md) |
| TTL cache (LRU follow-up) | [../../javascript-machine-coding/10-ttl-cache.js](../../javascript-machine-coding/10-ttl-cache.js) |
| Infinite scroll React | [../../Practice/React/InfiniteScrollMessageList/](../../Practice/React/InfiniteScrollMessageList/) |
| Tic-tac-toe (reported) | [../../react-hands-on-45min/tic-tac-toe/](../../react-hands-on-45min/tic-tac-toe/) |
| Autocomplete (reported) | [../../react-hands-on-45min/08-searchable-dropdown/](../../react-hands-on-45min/08-searchable-dropdown/) |
