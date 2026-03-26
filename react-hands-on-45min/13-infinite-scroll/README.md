# Infinite Scroll

## What to Build

A scrollable list that automatically loads more items as the user scrolls toward the bottom. No "Load more" button — loading is triggered passively when the user reaches the end.

---

## How It Works

1. A hidden **sentinel div** sits at the very bottom of the list (inside the scroll container).
2. An **IntersectionObserver** watches the sentinel.
3. When the sentinel enters the viewport, the observer fires `loadMore`.
4. `loadMore` fetches the next page and appends the new items.
5. The sentinel is pushed down as items are added — the cycle repeats.

```
[ Item 1   ]
[ Item 2   ]
[ ...      ]
[ Item N   ]   ← last rendered item
[ sentinel ]   ← 1px div; observer fires when this becomes visible
```

---

## State

| Variable      | Type                                  | Purpose                                 |
|---------------|---------------------------------------|-----------------------------------------|
| `items`       | string[]                              | Accumulated list of all loaded items    |
| `page`        | number                                | Next page index to request              |
| `status`      | `'idle'`\|`'loading'`\|`'error'`\|`'done'` | Controls the footer UI            |
| `loadingRef`  | `useRef(false)`                       | Synchronous guard against duplicate fetches |
| `sentinelRef` | `useRef(null)`                        | Reference to the sentinel div           |

---

## Why loadingRef is useRef, Not useState

```js
const loadingRef = useRef(false);

// Inside loadMore:
if (loadingRef.current) return;
loadingRef.current = true; // synchronous — instant mutex
```

`useState` updates are asynchronous — the new value is not visible until the next render. Between calling `setLoading(true)` and the re-render, a second observer callback could fire and still read the old `false` value, causing a **duplicate fetch**. `useRef` mutations are synchronous and immediately visible to every subsequent read in the same call stack.

---

## The Sentinel Element

```jsx
<div ref={sentinelRef} style={{ height: 1 }} />
```

A 1px-tall invisible div placed after the last list item, **inside the scrollable container**. When it scrolls into view, the observer fires. It must be inside the container (not in the page body) so the IntersectionObserver root is the scroll container, not the whole viewport.

---

## IntersectionObserver vs Scroll Events

| Approach             | How it fires                         | Cost                  |
|----------------------|--------------------------------------|-----------------------|
| Scroll event         | Every scroll pixel — hundreds/second | High CPU usage        |
| IntersectionObserver | Only when element crosses a threshold | Near-zero overhead   |

The observer is also declarative: you describe what to watch, not how to calculate positions.

---

## rootMargin: Pre-fetch Before the User Hits Bottom

```js
{ rootMargin: '120px' }
```

Treats the viewport as 120px taller than it actually is. The callback fires when the sentinel is 120px away from the bottom edge — before it is fully visible. The fetch starts while the user still has content to read, so new items arrive before they reach the end.

---

## Cleanup

```js
useEffect(() => {
  const ob = new IntersectionObserver(...);
  ob.observe(sentinelRef.current);
  return () => ob.disconnect(); // cleanup on unmount or re-run
}, [loadMore]);
```

`ob.disconnect()` tears down the observer when the component unmounts or when `loadMore` changes identity. Without cleanup the old observer keeps firing after the component is gone, calling into dead state.

---

## Interview Questions

**Q: Why IntersectionObserver and not a scroll event?**

Scroll events fire at up to 60 times per second. Each handler has to manually calculate `scrollTop + clientHeight >= scrollHeight` on every event. IntersectionObserver fires only when the watched element crosses the threshold — typically once per page load — at near-zero cost. It is also simpler code with no manual math.

---

**Q: Why useRef for the loading guard instead of useState?**

`useState` updates are async. Between `setLoading(true)` and the re-render that makes the new value visible, the observer could fire again and read the stale `false` value — launching a duplicate request. `useRef` mutations are synchronous: `loadingRef.current = true` is visible to the very next line of code and to every observer callback that fires before the re-render.

---

**Q: What is a sentinel element?**

A zero-content (or 1px) invisible element placed at a specific position in the DOM as a "trip wire". Instead of calculating scroll positions manually, you let the browser tell you when that element enters the viewport. The name comes from a sentinel value in algorithms — a special marker that signals a boundary condition.
