# 19. Optimize Expensive Computations in the UI

## The Problem: Heavy JS on the Main Thread Blocks User Interaction

The browser main thread handles JavaScript execution, style calculation, layout, paint, and user input. It can only do one thing at a time. A JavaScript task that runs for 200ms means the browser cannot respond to clicks, keyboard events, or scroll for 200ms. This directly damages INP (Interaction to Next Paint), a Core Web Vital.

**What "expensive" looks like:**
- Sorting or filtering 50,000 rows of data on a keystroke
- Parsing a 5MB JSON API response
- Computing statistical aggregates across a large dataset
- Image processing or pixel manipulation with Canvas
- Recursive tree traversal (org charts, file trees)

**How to confirm it is a CPU problem (not network):**
Open DevTools → Performance → record interaction → look for long orange "Task" bars in the main thread lane. Any task > 50ms is a "Long Task" and a candidate for optimization.

---

## Solution 1: useMemo — When It Helps and When It Doesn't

`useMemo` caches the result of a computation and only recomputes when its dependencies change. It is a React-level optimization that keeps expensive work off hot render paths.

```jsx
// SCENARIO: Filtering and sorting a large product catalog.
// The user can change: filter text, sort column, page — but also toggle a modal,
// which causes a parent re-render unrelated to the catalog data.

// WITHOUT useMemo: filterAndSort runs on every render, including unrelated ones.
function ProductCatalog({ products, filterText, sortKey }) {
  // Runs even when a modal opens/closes — wasted 80ms each time
  const displayProducts = filterAndSort(products, filterText, sortKey);
  return <ProductTable rows={displayProducts} />;
}

// WITH useMemo: filterAndSort only runs when products, filterText, or sortKey changes.
function ProductCatalog({ products, filterText, sortKey }) {
  const displayProducts = useMemo(
    () => filterAndSort(products, filterText, sortKey),
    [products, filterText, sortKey]
  );
  return <ProductTable rows={displayProducts} />;
}

function filterAndSort(products, text, key) {
  const lower = text.toLowerCase();
  return products
    .filter(p => p.name.toLowerCase().includes(lower))
    .sort((a, b) => a[key] < b[key] ? -1 : 1);
}
```

**When useMemo helps:**
- The computation is measurably expensive (> 1ms per run — check with `console.time`).
- The dependency array values are referentially stable between renders (e.g., `products` array reference does not change unless actual data changes).
- The component re-renders frequently due to unrelated causes (parent state, context).

**When useMemo does NOT help:**
- The dependencies change on every render. If `filterText` is an inline object `{ text: '...' }` created in the parent, `useMemo` recomputes every time.
- The computation is trivial (< 0.1ms). The memo bookkeeping overhead may be comparable.
- The memoized value is not passed to children — saving computation in a render that is already fast changes nothing perceptible.

---

## Solution 2: Web Worker — Move CPU-Heavy Work Off the Main Thread

A Web Worker runs JavaScript in a background thread. It cannot access the DOM, but it can run pure CPU-intensive code and postMessage results back to the main thread. The main thread stays responsive throughout.

**When to reach for a Worker:**
- Sorting or filtering 100,000+ rows
- Parsing large JSON blobs (> 1MB)
- Image processing, pixel operations with OffscreenCanvas
- Cryptographic operations (hashing, encryption)
- Running a physics simulation or complex algorithm

### Worker Setup: Sort 100k Rows

```js
// workers/sort-worker.js
// This file runs in the worker thread — no DOM, no React, no window.

self.onmessage = function(event) {
  const { items, sortKey, sortDirection } = event.data;

  // Heavy sort — blocks the WORKER thread, not the main thread.
  const sorted = [...items].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Send result back to main thread.
  // For large arrays, use Transferable (SharedArrayBuffer) to avoid copying.
  self.postMessage({ sorted });
};

self.onerror = function(err) {
  self.postMessage({ error: err.message });
};
```

```jsx
// Main thread: React component
import { useState, useEffect, useRef } from 'react';

function SortableTable({ rawData }) {
  const [sortKey, setSortKey] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [sortedData, setSortedData] = useState(rawData);
  const [isSorting, setIsSorting] = useState(false);
  const workerRef = useRef(null);

  useEffect(() => {
    // Create the worker once.
    workerRef.current = new Worker(
      new URL('./workers/sort-worker.js', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event) => {
      const { sorted, error } = event.data;
      if (error) {
        console.error('Worker error:', error);
      } else {
        setSortedData(sorted);
      }
      setIsSorting(false);
    };

    // Terminate the worker when the component unmounts — prevents memory leaks.
    return () => workerRef.current.terminate();
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;
    setIsSorting(true);

    // Send data to the worker. This is a structured clone — for large data,
    // consider using Transferable objects (ArrayBuffer) to avoid copying.
    workerRef.current.postMessage({ items: rawData, sortKey, sortDirection });
  }, [rawData, sortKey, sortDirection]);

  const handleSort = (key) => {
    if (key === sortKey) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div>
      {isSorting && <div className="loading-indicator">Sorting...</div>}
      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort('name')}>Name</th>
            <th onClick={() => handleSort('price')}>Price</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map(row => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Important caveats:**
- `postMessage` serializes data via structured clone, which is O(n) and copies the data. For a 100k row dataset, this copy itself may take 50ms. Use `Transferable` (`ArrayBuffer`) to pass ownership without copying.
- Workers cannot access `localStorage`, `sessionStorage`, cookies, or the DOM.
- Error boundaries do not catch Worker errors — handle `onerror` and `onmessage` error payloads explicitly.

---

## Solution 3: requestIdleCallback — Defer Non-Critical Work to Browser Idle Time

`requestIdleCallback` (rIC) schedules a callback to run when the browser is idle between frames. This is appropriate for work that does not need to complete immediately (e.g., pre-indexing data for search, analytics collection, prefetching).

```js
// Idle task scheduler with timeout fallback.
// deadline.timeRemaining() tells us how much idle time is left in the current frame.
// If the browser is never idle, the timeout forces execution anyway.

function runWhenIdle(task, options = {}) {
  const { timeout = 2000 } = options; // force execution after 2 seconds if still busy

  if ('requestIdleCallback' in window) {
    requestIdleCallback((deadline) => {
      // Only run if we have at least 5ms of idle time left.
      // If not, reschedule for the next idle period.
      if (deadline.timeRemaining() > 5 || deadline.didTimeout) {
        task(deadline);
      } else {
        runWhenIdle(task, options);
      }
    }, { timeout });
  } else {
    // Fallback for Safari (which added rIC support late)
    setTimeout(task, 0);
  }
}

// Example: pre-build a search index during idle time so it is ready when the user types
function buildSearchIndex(items) {
  return new Promise((resolve) => {
    runWhenIdle(() => {
      const index = items.map(item => ({
        id: item.id,
        tokens: `${item.name} ${item.description}`.toLowerCase().split(/\s+/),
      }));
      resolve(index);
    });
  });
}
```

**When to use rIC vs Worker:**
- rIC is simpler to set up and appropriate for small, deferrable tasks (< 50ms total).
- Workers are for truly heavy work that should run concurrently, not just deferred.
- rIC work still blocks the main thread while it runs — just during an idle slice.

---

## Solution 4: Chunked Processing — Time-Sliced Large Array Processing

When you must process a large array on the main thread (Worker is too complex, rIC timeout too uncertain), split the work into chunks and yield between them. Each chunk runs in one task; between tasks the browser can handle user input.

```js
// processInChunks: processes items[] in batches, yielding every ~16ms.
// onProgress is called with each batch's results.
// Returns a Promise that resolves when all items are processed.

async function processInChunks(items, processItem, { chunkSize = 500, onProgress } = {}) {
  const results = [];
  let i = 0;

  while (i < items.length) {
    const chunkStart = performance.now();

    // Process items until we hit the chunk size OR run out of idle time (16ms budget)
    while (i < items.length && performance.now() - chunkStart < 16) {
      results.push(processItem(items[i]));
      i++;
    }

    if (onProgress) {
      onProgress({ processed: i, total: items.length, results });
    }

    // Yield to the browser — allows input handling, rendering, layout.
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return results;
}
```

```jsx
// React integration: process 100k items progressively with a progress bar.
function DataProcessor({ rawItems }) {
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);

  useEffect(() => {
    processInChunks(
      rawItems,
      (item) => ({ ...item, computed: heavyTransform(item) }),
      {
        chunkSize: 500,
        onProgress: ({ processed, total }) => {
          setProgress(Math.round((processed / total) * 100));
        }
      }
    ).then(allResults => {
      setResults(allResults);
    });
  }, [rawItems]);

  return (
    <div>
      {progress < 100 && <ProgressBar value={progress} />}
      <DataTable rows={results} />
    </div>
  );
}
```

**Trade-off:** Chunked processing extends total processing time (due to setTimeout overhead per chunk) compared to synchronous processing. The gain is that the UI remains interactive throughout. For time-critical processing, prefer Web Workers.

---

## React 18: startTransition for Non-Urgent State Updates

`startTransition` tells React that a state update is non-urgent. React will yield to more urgent updates (user input, click handlers) while computing the transition. The UI stays responsive; the heavy render completes when the browser has capacity.

```jsx
import { useState, useTransition, useMemo } from 'react';

function SearchableList({ allItems }) {
  const [query, setQuery] = useState('');
  const [deferredQuery, setDeferredQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    const value = e.target.value;
    // Immediately update the input (urgent — user sees their typing instantly)
    setQuery(value);
    // Defer the expensive filter — React will yield if needed
    startTransition(() => {
      setDeferredQuery(value);
    });
  };

  const filtered = useMemo(
    () => allItems.filter(item =>
      item.name.toLowerCase().includes(deferredQuery.toLowerCase())
    ),
    [allItems, deferredQuery]
  );

  return (
    <div>
      <input value={query} onChange={handleChange} placeholder="Search..." />
      {isPending && <span>Filtering...</span>}
      <ItemList items={filtered} />
    </div>
  );
}
```

**startTransition vs useDeferredValue:**
- `startTransition` wraps the state update that causes the heavy work.
- `useDeferredValue` wraps the value that is consumed by the heavy component — useful when you do not own the state update.

---

## Metrics to Prove Improvement

**Long Task Duration (> 50ms)**
DevTools → Performance → record → look for orange bars in the main thread. Each bar is a task. Tasks exceeding 50ms are flagged as Long Tasks by the browser. Goal: no Long Tasks triggered by user interactions.

**INP (Interaction to Next Paint)**
The time from user interaction (click, keypress) to the next frame the browser paints after processing the interaction. Target: < 200ms (good), < 500ms (needs improvement).

```js
// Observe INP candidates in production
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.interactionId > 0) {
      console.log(`Interaction: ${entry.name}, duration: ${entry.duration}ms`);
    }
  }
});
observer.observe({ type: 'event', buffered: true, durationThreshold: 40 });
```

**TTI (Time to Interactive)**
Measured by Lighthouse. The point at which the main thread is quiet enough to respond to input. Heavy computation on load delays TTI.

**Profiling useMemo effectiveness:**
```js
// Wrap the computation to measure whether useMemo is saving time.
const startTime = performance.now();
const result = expensiveComputation(input);
console.log(`Computation took: ${performance.now() - startTime}ms`);
```
If this logs < 1ms, `useMemo` is not necessary.

---

## Interview Sound Bite

"The primary symptom of expensive computation is INP degradation and Long Tasks > 50ms in the Performance tab. My solution hierarchy: first, `useMemo` to avoid re-running the computation on unrelated renders — this is cheap to add and effective when deps are stable. If the computation is intrinsically expensive (sorting 100k rows, parsing MB of JSON), I move it to a Web Worker so the main thread stays free; I set up the worker once in a `useEffect` and `terminate` it on unmount to avoid leaks. For deferred, non-critical work like pre-indexing data for search, `requestIdleCallback` is cleaner than Workers. For progressive processing with a progress indicator, I use `processInChunks` — a while-loop with a `setTimeout(0)` yield every 16ms. In React 18, `startTransition` is my first reach for search filter UX — it keeps the input snappy while deferring the expensive list update."
