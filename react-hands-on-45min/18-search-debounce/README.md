# 18 — Search with Debounce + AbortController

## What to Build

A search input that fetches results from an API, but waits until the user stops typing before making a request. Any in-flight request from a previous keystroke is cancelled before the new one starts.

Features:
- Responsive input (updates on every keystroke)
- Debounced API call (waits 300ms after typing stops)
- Stale request cancellation via `AbortController`
- Loading indicator and error handling
- Minimum query length check to avoid junk requests

---

## Two Techniques Combined

| Technique | Problem it solves |
|---|---|
| Debounce | Prevents an API call on every single keystroke |
| AbortController | Cancels stale in-flight requests when the query changes |

They complement each other. Debounce stops requests from starting too soon. AbortController cleans up any request that was already started if the user resumes typing before it completes.

---

## Debounce: `useEffect` + `setTimeout`

```js
function useDebounced(value, ms) {
  const [v, setV] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t); // this line IS the debounce
  }, [value, ms]);

  return v;
}
```

**How it works step by step:**

1. User types `"r"` → effect runs, schedules `setTimeout(fn, 300)`
2. User types `"re"` (50ms later) → cleanup fires `clearTimeout` on the previous timer, new `setTimeout` scheduled
3. User types `"rea"`, `"reac"`, `"react"` — same pattern, each keystroke cancels the previous timer
4. User stops typing after `"react"` → 300ms pass with no new change → `setV("react")` fires
5. The fetch effect sees `dq` change to `"react"` and starts the API call

The cleanup function (`clearTimeout`) is the core of debouncing. Without it, every keystroke would schedule a timer that fires independently — no debounce at all.

---

## AbortController: Cancel Stale Requests

```js
const ac = new AbortController();

fetch(url, { signal: ac.signal })  // attach the signal
  .catch((e) => {
    if (e instanceof DOMException && e.name === 'AbortError') return; // intentional, ignore
    setError(e.message);
  });

return () => ac.abort(); // cleanup: cancel the request when dq changes
```

**What happens without AbortController?**

- User types `"re"` → request A starts
- User types `"react"` → request B starts
- Request A (slower server, heavier query) resolves AFTER request B
- Request A's `.then` runs and overwrites the results from request B with stale data
- The user sees results for `"re"` even though they searched for `"react"`

`AbortController` prevents this: when the debounced query changes, the cleanup calls `ac.abort()`, which cancels request A entirely. It never resolves and never updates state.

---

## State

| Variable | Purpose |
|---|---|
| `q` | Raw input value — updates on every keystroke |
| `dq` | Debounced query — only updates after `debounceMs` of silence |
| `results` | Array of results from the API |
| `loading` | Boolean — show/hide the spinner |
| `error` | Error message string or `null` |

---

## Interview Questions

**Q: What is debouncing and why do we need it?**

A: Debouncing delays executing a function until it has not been called again for a specified time. For a search input, without debouncing, every keystroke fires an API call — typing "react" sends 5 requests. Debouncing waits until the user pauses (e.g., 300ms of silence) and fires only one request. It reduces server load and prevents flickering from rapid state updates.

**Q: What happens without `AbortController`?**

A: Without it, all requests from intermediate keystrokes stay in flight. If an older request resolves after a newer one (out-of-order responses — common when queries have different response times), it will overwrite the correct results with stale data. The user sees wrong results. `AbortController` cancels the old request before starting the new one, guaranteeing the final displayed result always matches the latest query.

**Q: What is the difference between debounce and throttle?**

A: Debounce waits for a quiet period — it fires once after the input has stopped. If you type continuously for 10 seconds, it fires once at the end. Throttle fires at most once per time window — if you type continuously for 10 seconds with a 300ms throttle, it fires roughly every 300ms throughout. Use debounce for search (fire when done typing); use throttle for scroll handlers or window resize events (fire regularly but not on every pixel).
