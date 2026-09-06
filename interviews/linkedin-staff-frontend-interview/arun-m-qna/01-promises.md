# Q01–Q06 — Promise Polyfills

> Source pattern: [Arun M — Promise questions](https://www.linkedin.com/posts/arunm-engineer_frontend-interviewproblems-javascript-activity-7307413484898504704-ST4H)

---

## Q01. Implement a custom JavaScript Promise

**Ask:** Build a minimal Promise with `then`, `catch`, and resolve/reject.

**Approach:** Factory + closures. No `class`, no `this`. Four ideas total:

1. Keep `state` and `value` in closure variables.
2. If nobody is listening yet, park the handler in an array.
3. When we settle, replay the parked handlers in a microtask.
4. `then` returns a **new** MyPromise, so chaining just works.

**Practice files:** [../practice/my-promise-easy.js](../practice/my-promise-easy.js) (memorize this one) · [../practice/custom-promise-functional.js](../practice/custom-promise-functional.js) · [../practice/my-promise-detailed.js](../practice/my-promise-detailed.js) (spec-level reference)

```javascript
function MyPromise(executor) {
  let state = "pending"; // "pending" | "fulfilled" | "rejected"
  let value; // the value OR the error
  let handlers = []; // functions waiting for us to settle

  function resolve(val) {
    if (state !== "pending") return; // settle once

    // Resolved with another promise? Wait for it instead.
    if (val && typeof val.then === "function") {
      val.then(resolve, reject);
      return;
    }

    state = "fulfilled";
    value = val;
    replay();
  }

  function reject(err) {
    if (state !== "pending") return;
    state = "rejected";
    value = err;
    replay();
  }

  function replay() {
    handlers.forEach((h) => queueMicrotask(h));
    handlers = [];
  }

  function then(onSuccess, onError) {
    return MyPromise((res, rej) => {
      const handle = () => {
        try {
          if (state === "fulfilled") {
            res(onSuccess ? onSuccess(value) : value); // no handler → pass value on
          } else if (onError) {
            res(onError(value)); // catch recovers → back to success path
          } else {
            rej(value); // no handler → keep rejecting
          }
        } catch (e) {
          rej(e); // a throw rejects the NEXT promise
        }
      };

      if (state === "pending") handlers.push(handle);
      else queueMicrotask(handle);
    });
  }

  try {
    executor(resolve, reject);
  } catch (e) {
    reject(e);
  }

  return {
    then,
    catch: (onError) => then(undefined, onError),
    finally: (fn) =>
      then(
        (v) => {
          fn();
          return v;
        },
        (e) => {
          fn();
          throw e;
        }
      ),
  };
}

MyPromise.resolve = (val) => MyPromise((res) => res(val));
MyPromise.reject = (err) => MyPromise((_, rej) => rej(err));
```

**The only tricky part** is the three branches inside `handle`. They produce every behaviour people expect from a real Promise:

| Branch | Behaviour it creates |
|--------|---------------------|
| Fulfilled, no `onSuccess` | Value passes straight through `.catch()` |
| Rejected, `onError` returns normally | `.catch()` recovers, chain continues on the success path |
| Rejected, no `onError` | Rejection keeps travelling down the chain |
| `try/catch` around it all | A throw in your handler rejects the **next** promise |

**Edge cases to mention:** resolve twice (ignored), throw in the executor, resolving with a thenable, and `then` on an already-settled promise still firing asynchronously.

**Follow-ups:** How does this differ from Promises/A+? (No self-resolution cycle check, no protection against a foreign thenable calling back twice — see the detailed file.) What does `Promise.resolve` of another promise do? Add `finally`.

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
