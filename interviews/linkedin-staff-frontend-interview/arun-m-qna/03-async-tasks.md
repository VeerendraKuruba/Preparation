# Q10–Q18 — Async Tasks & Functional Style

> LinkedIn official brief: functional style + async operations. Series/parallel appear constantly in FE screens.

---

## Q10. N async tasks in series ★ P0

**Ask:** Run tasks one after another; pass result of previous (optional) or just await each.

```javascript
async function runInSeries(tasks) {
  const results = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}

// Callback-style (older interview variant)
function series(tasks, finalCb) {
  let i = 0;
  const results = [];
  function next(err, val) {
    if (err) return finalCb(err);
    if (i > 0) results.push(val);
    if (i === tasks.length) return finalCb(null, results);
    const task = tasks[i++];
    task(next);
  }
  next();
}
```

**Edge cases:** Empty list → `[]`. Fail-fast on first reject. Don't use `forEach` with `async` (won't await).

---

## Q11. N async tasks in parallel ★ P0

```javascript
async function runInParallel(tasks) {
  return Promise.all(tasks.map((t) => t()));
}
```

**Talking point:** Unbounded parallel can overwhelm the server — lead into **mapLimit** (Q55).

---

## Q12. N async tasks in race

```javascript
async function runInRace(tasks) {
  return Promise.race(tasks.map((t) => t()));
}
```

**Use case:** Timeout racing — `Promise.race([fetch(url), timeout(3000)])`.

---

## Q13. Custom `setTimeout` (conceptual / queue)

**Ask:** Schedule `fn` after `delay` ms without native timer (or explain polyfill using event loop).

```javascript
// Interview-friendly: wrap native, track IDs for clearAllTimeouts (Q51)
const timers = new Map();
let nextId = 1;

function mySetTimeout(fn, delay, ...args) {
  const id = nextId++;
  const handle = setTimeout(() => {
    timers.delete(id);
    fn(...args);
  }, delay);
  timers.set(id, handle);
  return id;
}

function myClearTimeout(id) {
  const handle = timers.get(id);
  if (handle != null) {
    clearTimeout(handle);
    timers.delete(id);
  }
}

function clearAllTimeouts() {
  for (const handle of timers.values()) clearTimeout(handle);
  timers.clear();
}
```

---

## Q14. Custom `setInterval`

```javascript
function mySetInterval(fn, delay, ...args) {
  let cancelled = false;
  let id;

  function tick() {
    if (cancelled) return;
    id = setTimeout(() => {
      fn(...args);
      tick();
    }, delay);
  }
  tick();

  return {
    clear() {
      cancelled = true;
      clearTimeout(id);
    },
  };
}
```

**Why not recursive setTimeout in prod?** Drift handling, `clearInterval` semantics — discuss trade-offs.

---

## Q15. Promisify (error-first callback)

```javascript
function promisify(fn) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      fn.call(this, ...args, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  };
}

// Usage
const readFileAsync = promisify(fs.readFile);
```

**Edge cases:** Multi-success-args → resolve array. Preserve `this`.

---

## Q16. `pipe` — left-to-right compose

```javascript
function pipe(...fns) {
  return (initial) => fns.reduce((acc, fn) => fn(acc), initial);
}

const add1 = (x) => x + 1;
const double = (x) => x * 2;
pipe(add1, double)(3); // 8
```

---

## Q17. Curry with placeholders ★

```javascript
const _ = Symbol("placeholder");

function curry(fn) {
  return function curried(...args) {
    const merged = args;
    const ready =
      merged.length >= fn.length &&
      merged.slice(0, fn.length).every((a) => a !== _);

    if (ready) return fn(...merged);

    return (...next) => {
      const combined = [];
      let j = 0;
      for (let i = 0; i < merged.length; i++) {
        if (merged[i] === _ && j < next.length) combined.push(next[j++]);
        else combined.push(merged[i]);
      }
      while (j < next.length) combined.push(next[j++]);
      return curried(...combined);
    };
  };
}

const sum = (a, b, c) => a + b + c;
const curried = curry(sum);
curried(_, 2)(1, 3); // 6
```

---

## Q18. Delayed / cancellable promise

```javascript
function delay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function cancellable(promise) {
  let cancelled = false;
  const wrapped = promise.then((v) => {
    if (cancelled) return new Promise(() => {}); // hang / or reject
    return v;
  });
  return {
    promise: wrapped,
    cancel() {
      cancelled = true;
    },
  };
}

// Prefer AbortController in real apps:
async function fetchWithTimeout(url, ms) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}
```

---

## Interview checklist

- [ ] Series vs parallel vs race — when to use each
- [ ] Why `for...of` + `await`, not `forEach(async ...)`
- [ ] Lead with `mapLimit` when interviewer asks about rate limits
- [ ] Mention `AbortController` for production cancellation
