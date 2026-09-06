# Q01–Q06 — Promise Polyfills

> Source pattern: [Arun M — Promise questions](https://www.linkedin.com/posts/arunm-engineer_frontend-interviewproblems-javascript-activity-7307413484898504704-ST4H)

---

## Q01. Implement a custom JavaScript Promise

**Ask:** Build a minimal Promise with `then`, `catch`, `finally`, and resolve/reject.

**Approach:** States: `pending | fulfilled | rejected`. Queue handlers; flush on settle. `then` always returns a new Promise (chaining).

```javascript
class MyPromise {
  constructor(executor) {
    this.state = "pending";
    this.value = undefined;
    this.handlers = [];

    const resolve = (value) => {
      if (this.state !== "pending") return;
      // Thenable assimilation (simplified)
      if (value && typeof value.then === "function") {
        value.then(resolve, reject);
        return;
      }
      this.state = "fulfilled";
      this.value = value;
      this.handlers.forEach(this.#handle);
    };

    const reject = (reason) => {
      if (this.state !== "pending") return;
      this.state = "rejected";
      this.value = reason;
      this.handlers.forEach(this.#handle);
    };

    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err);
    }
  }

  #handle = (handler) => {
    if (this.state === "pending") {
      this.handlers.push(handler);
      return;
    }
    queueMicrotask(() => {
      const cb =
        this.state === "fulfilled" ? handler.onFulfilled : handler.onRejected;
      if (!cb) {
        this.state === "fulfilled"
          ? handler.resolve(this.value)
          : handler.reject(this.value);
        return;
      }
      try {
        handler.resolve(cb(this.value));
      } catch (err) {
        handler.reject(err);
      }
    });
  };

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      this.#handle({ onFulfilled, onRejected, resolve, reject });
    });
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  finally(onFinally) {
    return this.then(
      (v) => MyPromise.resolve(onFinally()).then(() => v),
      (e) =>
        MyPromise.resolve(onFinally()).then(() => {
          throw e;
        })
    );
  }

  static resolve(v) {
    return new MyPromise((res) => res(v));
  }
  static reject(e) {
    return new MyPromise((_, rej) => rej(e));
  }
}
```

**Edge cases:** Resolve twice (ignore), throw in executor, thenable resolve, microtask ordering.

**Follow-ups:** How does this differ from A+? What about `Promise.resolve` of another promise?

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
