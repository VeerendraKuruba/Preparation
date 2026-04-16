/**
 * Q15. Web Workers for CPU-heavy tasks off the main thread
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE PROBLEM
 * ────────────
 * Any CPU-intensive task running on the main thread (sorting, parsing, crypto,
 * image processing, ML inference) blocks everything else:
 *   • UI becomes unresponsive
 *   • Animations freeze (drop frames)
 *   • User input is ignored
 *
 * THE SOLUTION: Web Workers
 * ─────────────────────────
 * A Web Worker is a separate JavaScript execution context that:
 *   ✅ Runs on a DIFFERENT thread (no main thread blocking)
 *   ✅ Has access to: fetch, WebSockets, IndexedDB, crypto, timers
 *   ❌ Has NO access to: DOM, window, document
 *   ✅ Communicates via message passing (postMessage / onmessage)
 *   ✅ Can share memory with SharedArrayBuffer + Atomics
 *
 * TYPES OF WORKERS
 * ─────────────────
 *  Dedicated Worker   → used by one page only (most common)
 *  Shared Worker      → shared across multiple pages/tabs of the same origin
 *  Service Worker     → intercepts network requests; see Q22
 */

// ─────────────────────────────────────────────────────────────────────────────
// BASIC WEB WORKER
// ─────────────────────────────────────────────────────────────────────────────

// === worker.js (separate file) ===
/*
self.onmessage = function(event) {
  const { items } = event.data;

  // CPU-heavy work — runs OFF the main thread
  const result = items
    .map(item => expensiveTransform(item))
    .sort((a, b) => a.score - b.score);

  self.postMessage({ result });
};

function expensiveTransform(item) {
  let acc = 0;
  for (let i = 0; i < 100000; i++) acc += Math.sqrt(item.value * i);
  return { ...item, score: acc };
}
*/

// === main.js ===
const worker = new Worker(new URL("./worker.js", import.meta.url));

worker.onmessage = ({ data }) => {
  console.log("Worker result:", data.result);
  renderResults(data.result); // update DOM on main thread
};

worker.onerror = (err) => {
  console.error("Worker error:", err.message);
};

worker.postMessage({ items: getLargeDataset() });

// Clean up when done
// worker.terminate();

// ─────────────────────────────────────────────────────────────────────────────
// INLINE WORKER (no separate file needed)
// ─────────────────────────────────────────────────────────────────────────────
function createInlineWorker(fn) {
  const blob = new Blob([`(${fn.toString()})()`], { type: "application/javascript" });
  const url  = URL.createObjectURL(blob);
  const w    = new Worker(url);
  URL.revokeObjectURL(url); // free the object URL after worker starts
  return w;
}

const inlineWorker = createInlineWorker(function () {
  self.onmessage = ({ data }) => {
    const result = data.numbers.reduce((acc, n) => acc + n * n, 0);
    self.postMessage(result);
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// PROMISE-BASED WORKER ABSTRACTION
// ─────────────────────────────────────────────────────────────────────────────
function createWorkerPool(workerUrl, poolSize = navigator.hardwareConcurrency) {
  const workers = Array.from({ length: poolSize }, () => new Worker(workerUrl));
  const queue = [];
  let available = [...workers];

  function runTask(data) {
    return new Promise((resolve, reject) => {
      const run = (worker) => {
        worker.onmessage = ({ data: result }) => {
          available.push(worker);
          if (queue.length) {
            const { data: nextData, res, rej } = queue.shift();
            run(available.pop());
          }
          resolve(result);
        };
        worker.onerror = (e) => { available.push(worker); reject(e); };
        worker.postMessage(data);
      };

      if (available.length) {
        run(available.pop());
      } else {
        queue.push({ data, res: resolve, rej: reject });
      }
    });
  }

  return { runTask, terminate: () => workers.forEach((w) => w.terminate()) };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMLINK — wraps worker API in Proxy (transparent async calls)
// ─────────────────────────────────────────────────────────────────────────────
/*
  // worker.js
  import * as Comlink from 'comlink';
  const api = {
    async sortItems(items) {
      return items.sort((a, b) => a.value - b.value);
    },
  };
  Comlink.expose(api);

  // main.js
  import * as Comlink from 'comlink';
  const worker = new Worker('./worker.js');
  const api = Comlink.wrap(worker);

  // Feels like calling a local function, but runs off main thread:
  const sorted = await api.sortItems(items);
*/

// ─────────────────────────────────────────────────────────────────────────────
// TRANSFERABLE OBJECTS (zero-copy transfer to worker)
// ─────────────────────────────────────────────────────────────────────────────
// By default, postMessage CLONES data (expensive for large buffers).
// Transferable objects (ArrayBuffer, ImageBitmap, OffscreenCanvas) are
// TRANSFERRED — zero-copy, ownership moves to the worker.

function sendLargeBuffer(worker) {
  const buffer = new ArrayBuffer(10 * 1024 * 1024); // 10 MB
  // Transfer (zero-copy) instead of clone:
  worker.postMessage({ buffer }, [buffer]);
  // Note: `buffer` is now empty (detached) in the main thread
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED ARRAY BUFFER (shared memory between main thread and worker)
// ─────────────────────────────────────────────────────────────────────────────
/*
  Requires Cross-Origin-Opener-Policy: same-origin
           Cross-Origin-Embedder-Policy: require-corp

  // main.js
  const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 100);
  const shared = new Int32Array(sharedBuffer);
  worker.postMessage({ sharedBuffer });

  // worker.js
  self.onmessage = ({ data }) => {
    const shared = new Int32Array(data.sharedBuffer);
    Atomics.store(shared, 0, 42);  // thread-safe write
    const val = Atomics.load(shared, 0);  // thread-safe read
  };
*/

// ─────────────────────────────────────────────────────────────────────────────
// REACT INTEGRATION: Offloading heavy computation
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";

function useWorkerComputation(items) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!items.length) return;
    setLoading(true);

    const worker = new Worker(new URL("./heavy-worker.js", import.meta.url));

    worker.onmessage = ({ data }) => {
      setResult(data.result);
      setLoading(false);
      worker.terminate();
    };

    worker.postMessage({ items });

    return () => worker.terminate(); // cleanup if component unmounts
  }, [items]);

  return { result, loading };
}

// ─────────────────────────────────────────────────────────────────────────────
// GOOD USE CASES FOR WEB WORKERS
// ─────────────────────────────────────────────────────────────────────────────
/*
  ✅ Sorting/filtering large datasets (10,000+ items)
  ✅ Parsing large JSON/CSV/XML files
  ✅ Image processing (resize, filter, compress) — with OffscreenCanvas
  ✅ ML inference (TensorFlow.js, ONNX)
  ✅ Cryptographic operations (hashing, encryption)
  ✅ Zip/unzip compression
  ✅ Text search and indexing (Fuse.js, lunr)
  ✅ Complex physics or game simulations
  ✅ Real-time data stream processing

  ❌ NOT useful for:
  • DOM manipulation (not available in workers)
  • Simple/fast computations (communication overhead > computation)
  • Tasks that need frequent sync with DOM state
*/

/**
 * KEY POINTS
 * ──────────
 *  1. Workers run in a separate thread — no DOM access.
 *  2. Communication via postMessage (message cloning, not shared memory by default).
 *  3. Use Transferable objects for large buffers (zero-copy).
 *  4. Use SharedArrayBuffer + Atomics for high-frequency sharing.
 *  5. Comlink library makes workers feel like async function calls.
 *  6. Terminate workers when done to free thread resources.
 *  7. Worker startup has overhead — reuse workers for repeated tasks.
 */

function renderResults(results) {}
function getLargeDataset() { return []; }
