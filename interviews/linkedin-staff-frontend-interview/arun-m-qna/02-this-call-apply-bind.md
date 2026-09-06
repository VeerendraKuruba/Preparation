# Q07–Q09 — `call` / `apply` / `bind`

> LinkedIn P0 — inheritance / `this` is in the official Staff FE brief.

---

## Q07. Polyfill `Function.prototype.call`

**Ask:** Invoke `fn` with explicit `this` and comma-separated args.

```javascript
Function.prototype.myCall = function (thisArg, ...args) {
  if (typeof this !== "function") {
    throw new TypeError("myCall must be called on a function");
  }
  // Nullish this → globalThis (non-strict mental model for interviews)
  const context =
    thisArg === null || thisArg === undefined
      ? globalThis
      : Object(thisArg);

  const key = Symbol("fn");
  context[key] = this;
  try {
    return context[key](...args);
  } finally {
    delete context[key];
  }
};

// Usage
function greet(greeting) {
  return `${greeting}, ${this.name}`;
}
greet.myCall({ name: "Ada" }, "Hi"); // "Hi, Ada"
```

**Edge cases:** Primitive `thisArg` boxed via `Object()`. Symbol key avoids collision. Cleanup in `finally`.

---

## Q08. Polyfill `Function.prototype.apply`

**Ask:** Same as `call`, but args as an array (or array-like).

```javascript
Function.prototype.myApply = function (thisArg, argsArray) {
  if (typeof this !== "function") {
    throw new TypeError("myApply must be called on a function");
  }
  const context =
    thisArg === null || thisArg === undefined
      ? globalThis
      : Object(thisArg);

  const args = argsArray == null ? [] : Array.from(argsArray);
  const key = Symbol("fn");
  context[key] = this;
  try {
    return context[key](...args);
  } finally {
    delete context[key];
  }
};
```

**Difference vs call:** `call(this, a, b)` vs `apply(this, [a, b])`.

---

## Q09. Polyfill `Function.prototype.bind` ★

**Ask:** Return a new function permanently bound to `this`, with optional partial args. Support `new boundFn()`.

```javascript
Function.prototype.myBind = function (thisArg, ...boundArgs) {
  if (typeof this !== "function") {
    throw new TypeError("myBind must be called on a function");
  }
  const original = this;

  function bound(...args) {
    // If used with `new`, ignore thisArg — use the new instance
    const isNew = this instanceof bound;
    return original.apply(isNew ? this : thisArg, [...boundArgs, ...args]);
  }

  // Preserve prototype for `new bound()`
  if (original.prototype) {
    bound.prototype = Object.create(original.prototype);
  }

  return bound;
};

function Person(name) {
  this.name = name;
}
const Bound = Person.myBind(null, "Ada");
const p = new Bound();
p.name; // "Ada"
```

**Follow-ups:** Soft bind? Bound function `length`? Arrow functions ignore bind?

**Staff talking point:** "`bind` is partial application + fixed `this`. Prefer explicit args over binding when writing functional utilities."

---

## Comparison card

| Method | Invokes now? | Args form | Returns |
|--------|--------------|-----------|---------|
| `call` | Yes | List | Result |
| `apply` | Yes | Array | Result |
| `bind` | No | Partial + later | New function |

**Testing aloud:**
1. Method stolen from object — restore `this` with `call`.
2. `Math.max.apply(null, arr)` pattern.
3. `new (fn.bind(obj))()` — `this` is instance, not `obj`.
