# Q01–Q06 — Promise Polyfills

> Source pattern: [Arun M — Promise questions](https://www.linkedin.com/posts/arunm-engineer_frontend-interviewproblems-javascript-activity-7307413484898504704-ST4H)

---

## Q01. Implement a custom JavaScript Promise

**Ask:** Build a minimal Promise with `then`, `catch`, and resolve/reject.

**Approach (functional — easiest for interviews):** Factory + closures. No `class` / `this`.

| Piece | Role |
|-------|------|
| `state` / `value` | `"pending"` → `"fulfilled"` \| `"rejected"` |
| `onFulfilled` / `onRejected` | Queues of waiting callbacks |
| `resolve` / `reject` | Settle **once**, then flush queues |
| `then` | Always returns a **new** promise (chaining) |

**Practice file:** [../practice/custom-promise-functional.js](../practice/custom-promise-functional.js)

```javascript
function createPromise(executor) {
  let state = "pending"; // "pending" | "fulfilled" | "rejected"
  let value;
  const onFulfilled = [];
  const onRejected = [];

  function resolve(val) {
    if (state !== "pending") return;

    // If resolved with another thenable, adopt its state
    if (val && typeof val.then === "function") {
      val.then(resolve, reject);
      return;
    }

    state = "fulfilled";
    value = val;
    onFulfilled.forEach((fn) => fn(val));
  }

  function reject(err) {
    if (state !== "pending") return;
    state = "rejected";
    value = err;
    onRejected.forEach((fn) => fn(err));
  }

  function then(onSuccess, onError) {
    return createPromise((resolveNext, rejectNext) => {
      function handleSuccess(val) {
        if (typeof onSuccess !== "function") {
          resolveNext(val); // pass-through
          return;
        }
        try {
          resolveNext(onSuccess(val));
        } catch (e) {
          rejectNext(e);
        }
      }

      function handleError(err) {
        if (typeof onError !== "function") {
          rejectNext(err); // pass-through
          return;
        }
        try {
          resolveNext(onError(err)); // catch can recover
        } catch (e) {
          rejectNext(e);
        }
      }

      if (state === "fulfilled") {
        queueMicrotask(() => handleSuccess(value));
      } else if (state === "rejected") {
        queueMicrotask(() => handleError(value));
      } else {
        onFulfilled.push(handleSuccess);
        onRejected.push(handleError);
      }
    });
  }

  function _catch(onError) {
    return then(undefined, onError);
  }

  try {
    executor(resolve, reject);
  } catch (e) {
    reject(e);
  }

  return { then, catch: _catch };
}

createPromise.resolve = (val) => createPromise((res) => res(val));
createPromise.reject = (err) => createPromise((_, rej) => rej(err));
```

**Optional `finally` (add if interviewer asks):**

```javascript
function _finally(onFinally) {
  return then(
    (v) => createPromise.resolve(onFinally()).then(() => v),
    (e) =>
      createPromise.resolve(onFinally()).then(() => {
        throw e;
      })
  );
}
// return { then, catch: _catch, finally: _finally };
```

**Edge cases:** Resolve twice (ignore), throw in executor, thenable resolve, microtask ordering for already-settled `then`.

**Follow-ups:** How does this differ from A+? What about `Promise.resolve` of another promise? Add `finally`?

---

## Q02. Polyfill `Promise.all` ★ LinkedIn P0

**Ask:** Resolve when all settle fulfilled; reject on first rejection; preserve order.

```javascript
function promiseAll(iterable) {
  const items = [...iterable];
  if (items.length === 0) return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    const results = new Array(items.length);
    let remaining = items.length;

    items.forEach((item, i) => {
      Promise.resolve(item).then(
        (val) => {
          results[i] = val;
          if (--remaining === 0) resolve(results);
        },
        reject // fail-fast
      );
    });
  });
}
```

**Edge cases:** Empty iterable → `[]`. Non-thenables via `Promise.resolve`. Order must match input indices (not completion order).

**Repo:** [javascript-machine-coding/03-promise-all.js](../../../javascript-machine-coding/03-promise-all.js)

**Testing aloud:** `[]`, `[1, Promise.resolve(2)]`, one reject, late fulfill after reject ignored.

---

## Q03. Polyfill `Promise.any`

**Ask:** Fulfill with first success; reject with `AggregateError` if all fail.

```javascript
function promiseAny(iterable) {
  const items = [...iterable];
  if (items.length === 0) {
    return Promise.reject(new AggregateError([], "All promises were rejected"));
  }

  return new Promise((resolve, reject) => {
    const errors = new Array(items.length);
    let rejected = 0;

    items.forEach((item, i) => {
      Promise.resolve(item).then(resolve, (err) => {
        errors[i] = err;
        if (++rejected === items.length) {
          reject(new AggregateError(errors, "All promises were rejected"));
        }
      });
    });
  });
}
```

---

## Q04. Polyfill `Promise.race`

**Ask:** Settle with the first settled promise (fulfill or reject).

```javascript
function promiseRace(iterable) {
  return new Promise((resolve, reject) => {
    for (const item of iterable) {
      Promise.resolve(item).then(resolve, reject);
    }
  });
}
```

**Edge cases:** Empty iterable never settles. First settle wins even if later ones are faster conceptually.

---

## Q05. Polyfill `Promise.allSettled`

**Ask:** Always fulfills with `{ status, value | reason }[]` for every input.

```javascript
function promiseAllSettled(iterable) {
  const items = [...iterable];
  if (items.length === 0) return Promise.resolve([]);

  return new Promise((resolve) => {
    const results = new Array(items.length);
    let remaining = items.length;

    items.forEach((item, i) => {
      Promise.resolve(item).then(
        (value) => {
          results[i] = { status: "fulfilled", value };
          if (--remaining === 0) resolve(results);
        },
        (reason) => {
          results[i] = { status: "rejected", reason };
          if (--remaining === 0) resolve(results);
        }
      );
    });
  });
}
```

**Interview tip:** Prefer `allSettled` for independent API fan-out where partial failure is OK.

---

## Q06. Polyfill `Promise.prototype.finally`

```javascript
Promise.prototype.finally = function (onFinally) {
  return this.then(
    (value) => Promise.resolve(onFinally()).then(() => value),
    (reason) =>
      Promise.resolve(onFinally()).then(() => {
        throw reason;
      })
  );
};
```

**Key:** `finally` does not change the settled value/reason unless `onFinally` throws/rejects.

---

## Quick comparison card

| Method | Success condition | Failure |
|--------|-------------------|---------|
| `all` | All fulfill | First reject |
| `any` | First fulfill | All reject → AggregateError |
| `race` | First settle | First settle |
| `allSettled` | Always (when all done) | Never rejects for child failures |
