# 21. Handle Heavy API Data Without Blocking the UI

## The Problem

An API returns a large response — 10MB of JSON, 50,000 rows of table data, a full export file. The naive approach:

```js
const response = await fetch('/api/export');
const data = await response.json(); // blocks main thread for 200-500ms on large JSON
setState({ rows: data });           // triggers reconciliation of 50k rows
```

Three distinct bottlenecks appear:
1. **Network time:** Downloading 10MB on a 10Mbps connection takes ~8 seconds, with no progress feedback.
2. **JSON parse time:** `response.json()` is synchronous on the main thread. Parsing 10MB of JSON takes 200–500ms, freezing input handling.
3. **Render time:** Setting 50,000 rows in state triggers React reconciliation and browser layout for all 50,000 DOM nodes — unless you virtualize.

The solutions below address each bottleneck independently.

---

## Solution 1: Streaming JSON Parse — Process Data as It Arrives

Instead of waiting for the full response body, read it as a `ReadableStream` and process each chunk as it arrives. This enables showing progress and starting to render the first rows while the rest are still downloading.

**Best for:** NDJSON (newline-delimited JSON) or custom chunked text responses.

```js
// Server sends newline-delimited JSON (one JSON object per line):
// {"id":1,"name":"Alice"}\n
// {"id":2,"name":"Bob"}\n
// ...

async function streamNDJSON(url, onRow) {
  const response = await fetch(url);

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.body) throw new Error('ReadableStream not supported');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read(); // value is a Uint8Array chunk

    if (done) {
      // Process any remaining data in the buffer
      if (buffer.trim()) {
        onRow(JSON.parse(buffer.trim()));
      }
      break;
    }

    // Decode the binary chunk to text and add to buffer
    buffer += decoder.decode(value, { stream: true });

    // Split on newlines — each complete line is a JSON record
    const lines = buffer.split('\n');

    // Keep the last (potentially incomplete) line in the buffer
    buffer = lines.pop() ?? '';

    // Process all complete lines
    for (const line of lines) {
      if (line.trim()) {
        onRow(JSON.parse(line.trim()));
      }
    }
  }
}
```

```jsx
// React integration: stream rows into state with a progress indicator
function StreamingTable({ apiUrl }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rowCount, setRowCount] = useState(0);

  useEffect(() => {
    let batchBuffer = [];
    const BATCH_SIZE = 100; // add rows to state in batches of 100 to reduce re-renders

    const flush = () => {
      if (batchBuffer.length === 0) return;
      const batch = batchBuffer;
      batchBuffer = [];
      setRows(prev => [...prev, ...batch]);
      setRowCount(prev => prev + batch.length);
    };

    streamNDJSON(apiUrl, (row) => {
      batchBuffer.push(row);
      if (batchBuffer.length >= BATCH_SIZE) flush();
    }).then(() => {
      flush(); // flush remaining
      setLoading(false);
    });
  }, [apiUrl]);

  return (
    <div>
      {loading && <div>Loaded {rowCount} rows...</div>}
      <VirtualizedTable rows={rows} />
    </div>
  );
}
```

**Caveat:** Standard `response.json()` does not stream — you must use `response.body` as a `ReadableStream`. The server must support chunked transfer encoding or NDJSON format.

---

## Solution 2: Pagination — Do Not Fetch All Data

The simplest and most effective solution is to never send 50,000 rows to the browser in the first place. Use cursor-based pagination to fetch one page at a time.

```js
// Cursor-based pagination: more efficient than offset pagination for large datasets.
// The cursor encodes position (e.g., the last seen ID or timestamp).

async function fetchPage(cursor = null) {
  const params = new URLSearchParams({ limit: 50 });
  if (cursor) params.set('cursor', cursor);

  const res = await fetch(`/api/orders?${params}`);
  return res.json();
  // Returns: { items: [...], nextCursor: "eyJpZCI6NTB9", hasMore: true }
}
```

```jsx
function InfiniteOrderList() {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const { items: newItems, nextCursor, hasMore: more } = await fetchPage(cursor);
    setItems(prev => [...prev, ...newItems]);
    setCursor(nextCursor);
    setHasMore(more);
    setLoading(false);
  }, [cursor, hasMore, loading]);

  // IntersectionObserver triggers loadMore when the sentinel div enters the viewport
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore();
    }, { rootMargin: '200px' });

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div>
      <VirtualizedList items={items} />
      <div ref={sentinelRef} />
      {loading && <Spinner />}
      {!hasMore && <p>All orders loaded ({items.length})</p>}
    </div>
  );
}
```

**Why cursor over offset:** `OFFSET 50000` in SQL requires the database to scan and discard 50,000 rows. Cursor-based (`WHERE id > :cursor LIMIT 50`) uses an index seek and scales to billions of rows.

---

## Solution 3: Web Worker for Parse and Transform

Move the JSON parse and data transformation entirely off the main thread. The main thread posts the raw response text to the worker; the worker parses, filters, and transforms; the main thread receives the processed result.

```js
// workers/data-processor.worker.js
// Runs in worker thread — no DOM, no React

self.onmessage = function(event) {
  const { type, payload } = event.data;

  if (type === 'PROCESS') {
    try {
      const { rawText, filters } = payload;

      // Parse is now on the worker thread, not blocking user input
      const allRows = JSON.parse(rawText);

      // Transform and filter in the worker
      const processed = allRows
        .filter(row => {
          if (filters.status && row.status !== filters.status) return false;
          if (filters.minAmount && row.amount < filters.minAmount) return false;
          return true;
        })
        .map(row => ({
          id: row.id,
          displayName: `${row.firstName} ${row.lastName}`,
          amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
                      .format(row.amount),
          status: row.status,
          date: new Date(row.createdAt).toLocaleDateString(),
        }));

      self.postMessage({ type: 'DONE', payload: { rows: processed, total: processed.length } });
    } catch (err) {
      self.postMessage({ type: 'ERROR', payload: { message: err.message } });
    }
  }
};
```

```jsx
// Main thread React component
import { useState, useEffect, useRef, useCallback } from 'react';

function ReportPage({ filters }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | processing | done | error
  const workerRef = useRef(null);

  useEffect(() => {
    // Create worker once, reuse for multiple requests
    workerRef.current = new Worker(
      new URL('./workers/data-processor.worker.js', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'DONE') {
        setRows(payload.rows);
        setStatus('done');
      } else if (type === 'ERROR') {
        console.error('Worker error:', payload.message);
        setStatus('error');
      }
    };

    return () => workerRef.current?.terminate();
  }, []);

  const loadReport = useCallback(async () => {
    setStatus('loading');

    // Fetch the raw response text — do NOT call response.json() on the main thread
    const response = await fetch('/api/report/export');
    const rawText = await response.text(); // text() is faster than json() and returns raw string

    setStatus('processing');

    // Hand off to worker — the postMessage copy is O(n) for strings,
    // but it's a one-time cost and happens off the critical render path
    workerRef.current.postMessage({
      type: 'PROCESS',
      payload: { rawText, filters }
    });
  }, [filters]);

  return (
    <div>
      <button onClick={loadReport} disabled={status === 'loading' || status === 'processing'}>
        {status === 'loading' && 'Downloading...'}
        {status === 'processing' && 'Processing...'}
        {(status === 'idle' || status === 'done') && 'Load Report'}
      </button>

      {status === 'done' && <VirtualizedTable rows={rows} />}
      {status === 'error' && <ErrorMessage />}
    </div>
  );
}
```

**Performance note on postMessage:** Sending a 10MB string via `postMessage` copies the data (structured clone). For very large data, use `SharedArrayBuffer` or encode data as `ArrayBuffer` and transfer ownership with `postMessage(data, [buffer])` (zero-copy).

---

## Solution 4: requestIdleCallback to Batch Render Large Result Sets

When data is already available (e.g., from a worker or small API), use `requestIdleCallback` to render it in batches during browser idle frames instead of committing 50,000 rows at once.

```js
function renderInIdleSlices(allRows, setRows, sliceSize = 200) {
  let index = 0;

  function processSlice(deadline) {
    // Keep processing slices while we have idle time AND data remaining
    while (index < allRows.length && deadline.timeRemaining() > 8) {
      const slice = allRows.slice(index, index + sliceSize);
      setRows(prev => [...prev, ...slice]);
      index += sliceSize;
    }

    // If there is still data left, schedule the next slice
    if (index < allRows.length) {
      requestIdleCallback(processSlice, { timeout: 1000 });
    }
  }

  requestIdleCallback(processSlice, { timeout: 500 });
}
```

```jsx
function AnalyticsTable({ apiUrl }) {
  const [displayedRows, setDisplayedRows] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch(apiUrl)
      .then(r => r.json())
      .then(allRows => {
        setTotal(allRows.length);
        // Render first batch immediately for perceived performance
        setDisplayedRows(allRows.slice(0, 50));
        // Queue remaining rows during idle time
        renderInIdleSlices(allRows.slice(50), setDisplayedRows);
      });
  }, [apiUrl]);

  return (
    <div>
      <p>Showing {displayedRows.length} of {total} rows</p>
      <VirtualizedTable rows={displayedRows} />
    </div>
  );
}
```

---

## Solution 5: Progressive Rendering — First 50 Items Immediately, Queue the Rest

Perceived performance is often more important than actual performance. If the user sees the first 50 rows within 100ms, the page feels fast even if the remaining 49,950 rows take another 2 seconds to load.

```jsx
function ProgressiveDataPage({ apiUrl }) {
  const [rows, setRows] = useState([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    fetch(apiUrl)
      .then(res => res.json())
      .then(allRows => {
        // 1. Render first 50 immediately — user sees content right away
        setRows(allRows.slice(0, 50));
        setIsLoadingMore(true);

        // 2. Queue remaining rows — use React 18 startTransition to mark as non-urgent
        import('react').then(({ startTransition }) => {
          startTransition(() => {
            setRows(allRows);
            setIsLoadingMore(false);
          });
        });
      });
  }, [apiUrl]);

  return (
    <div>
      {isLoadingMore && (
        <div className="banner">Loading all {rows.length}+ results...</div>
      )}
      <VirtualizedTable rows={rows} />
    </div>
  );
}
```

---

## Solution 6: Server-Side Aggregation — Ask the API for Less Data

The most scalable solution is to never send raw rows to the client. Instead, ask the server to pre-aggregate.

```
// INSTEAD OF: GET /api/orders → 50,000 raw order objects (10MB)

// SEND: GET /api/orders/summary → aggregated stats (<1KB)
{
  "totalOrders": 52340,
  "totalRevenue": 4823910.50,
  "byStatus": { "completed": 48000, "pending": 3200, "refunded": 1140 },
  "topProducts": [
    { "id": "p1", "name": "Widget A", "units": 12400, "revenue": 248000 },
    ...
  ],
  "revenueByDay": [
    { "date": "2026-03-20", "revenue": 42100 },
    ...
  ]
}
```

```
// INSTEAD OF: GET /api/users?export=all → all users (5MB)
// SEND: GET /api/users?page=1&limit=50 → 50 users (5KB) + pagination cursor
```

**When server aggregation is not possible** (you have no control over the API), combine the client-side solutions: stream the response, parse in a worker, render progressively, and virtualize the result.

---

## Decision Framework

| Data Size | Solution |
|---|---|
| < 1,000 rows | Fetch normally, `response.json()` is fine |
| 1,000 – 10,000 rows | Paginate on the server; virtualize on the client |
| 10,000 – 100,000 rows | Worker for parse/transform + virtualize |
| > 100,000 rows | Server-side aggregation + pagination; never raw rows to client |
| Streaming API available | ReadableStream + NDJSON + progressive render |
| Processing needed client-side | Worker → parse → transform → main thread receives processed rows |

---

## Failure Modes to Know

**Worker parse is still slow for very large JSON:** A worker thread has the same V8 engine limitations. Parsing 50MB JSON takes 2–3 seconds even in a worker. The fix: use binary formats (Apache Arrow, FlatBuffers, MessagePack) that are faster to deserialize, or paginate.

**Batching rows into state too eagerly:** Calling `setRows` 1,000 times in a loop (one row at a time) causes 1,000 re-renders. Batch into groups of 50–200 rows per `setState` call.

**Structured clone cost for postMessage:** Sending 10MB via `postMessage` clones the data, which takes ~50–100ms. For write-once large buffers, use `ArrayBuffer` with transfer semantics.

**Memory pressure from duplicate copies:** If you have the raw JSON string AND the parsed array AND the filtered array AND the worker's copy all in memory simultaneously, you might use 4–5x the original data size in RAM. Release references eagerly and use workers to avoid keeping multiple copies on the main thread.

---

## Interview Sound Bite

"A large API response has three distinct bottleneck zones: network download time, JSON parse time, and render time. I attack them separately. For render time, virtualization is mandatory — 50,000 DOM nodes is always wrong. For parse time, I move `JSON.parse` to a Web Worker so it never blocks the main thread: the worker receives the raw response text, parses and transforms, then postMessages the processed rows back. For network time, the right answer is server-side pagination — cursor-based, not offset — so we never download more than one page. When streaming is available, I use `response.body` as a `ReadableStream` with NDJSON parsing to show the first rows before the response finishes downloading. For non-paginated APIs I can't change, I combine: Worker parse, `requestIdleCallback` for batched rendering, and `startTransition` to keep the UI responsive while React commits the large update."
