# Q19–Q30 — Object & Array Manipulation

---

## Q19. Deep Flatten I — one level

```javascript
function flattenOnce(arr) {
  return arr.reduce(
    (acc, item) => acc.concat(Array.isArray(item) ? item : [item]),
    []
  );
}
// Or: arr.flat(1)
```

---

## Q20. Deep Flatten II — to depth n ★ P0

```javascript
function flattenDepth(arr, depth = 1) {
  if (depth < 1) return arr.slice();
  return arr.reduce((acc, item) => {
    if (Array.isArray(item)) {
      acc.push(...flattenDepth(item, depth - 1));
    } else {
      acc.push(item);
    }
    return acc;
  }, []);
}

function flattenDeep(arr) {
  return flattenDepth(arr, Infinity);
}
```

**Edge cases:** Sparse arrays, empty nested arrays, non-array inputs.

---

## Q21. Deep Flatten III — flatten object values / nested object

```javascript
function flattenObject(obj, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenObject(value, path, out);
    } else {
      out[path] = value;
    }
  }
  return out;
}
// { a: { b: 1 } } → { "a.b": 1 }
```

---

## Q22. Deep Flatten IV — generator / iterator style

```javascript
function* flattenGen(arr) {
  for (const item of arr) {
    if (Array.isArray(item)) yield* flattenGen(item);
    else yield item;
  }
}
[...flattenGen([1, [2, [3]]])]; // [1, 2, 3]
```

---

## Q23. Deep Equal ★ P0

```javascript
function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  return keysA.every((k) => Object.hasOwn(b, k) && deepEqual(a[k], b[k]));
}
```

**Follow-ups:** Date, Map, Set, RegExp, circular refs (need WeakMap visited set).

```javascript
function deepEqualCircular(a, b, seen = new WeakMap()) {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (seen.get(a) === b) return true;
  seen.set(a, b);
  // ... same key walk
}
```

**Interview use:** Virtual DOM diff lite / “are these two trees equal?”

---

## Q24. Deep Clone (circular refs) ★ P0

```javascript
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);

  if (value instanceof Date) return new Date(value);
  if (value instanceof RegExp) return new RegExp(value);

  if (Array.isArray(value)) {
    const arr = [];
    seen.set(value, arr);
    value.forEach((item, i) => {
      arr[i] = deepClone(item, seen);
    });
    return arr;
  }

  const obj = Object.create(Object.getPrototypeOf(value));
  seen.set(value, obj);
  for (const key of Reflect.ownKeys(value)) {
    obj[key] = deepClone(value[key], seen);
  }
  return obj;
}
```

**Repo:** [javascript-machine-coding/04-deep-clone.js](../../../javascript-machine-coding/04-deep-clone.js) — also `structuredClone` in modern browsers (mention trade-offs: no functions).

---

## Q25. `Object.assign` polyfill

```javascript
function objectAssign(target, ...sources) {
  if (target == null) throw new TypeError("Cannot convert undefined or null");
  const to = Object(target);
  for (const source of sources) {
    if (source == null) continue;
    for (const key of Object.keys(source)) {
      to[key] = source[key];
    }
  }
  return to;
}
```

**Note:** Shallow copy only. Symbols via `Object.getOwnPropertySymbols` for complete polyfill.

---

## Q26. `Object.is` polyfill

```javascript
function objectIs(x, y) {
  if (x === y) {
    // +0 !== -0
    return x !== 0 || 1 / x === 1 / y;
  }
  // NaN === NaN
  return x !== x && y !== y;
}
```

---

## Q27. `JSON.stringify` (subset)

```javascript
function jsonStringify(value) {
  if (value === null) return "null";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "null";
  }
  if (typeof value === "boolean") return String(value);
  if (typeof value === "string") return `"${value.replace(/"/g, '\\"')}"`;
  if (typeof value === "undefined" || typeof value === "function") return undefined;

  if (Array.isArray(value)) {
    const parts = value.map((v) => {
      const s = jsonStringify(v);
      return s === undefined ? "null" : s;
    });
    return `[${parts.join(",")}]`;
  }

  if (typeof value === "object") {
    const parts = [];
    for (const [k, v] of Object.entries(value)) {
      const s = jsonStringify(v);
      if (s === undefined) continue;
      parts.push(`${jsonStringify(k)}:${s}`);
    }
    return `{${parts.join(",")}}`;
  }
  return undefined;
}
```

**Edge cases:** `undefined` in objects omitted; in arrays → `null`. Circular → throw (add WeakSet).

---

## Q28. `JSON.parse` (subset — interview sketch)

**Ask:** Tokenize + recursive descent. Full parser is long; explain structure:

1. Lexer → tokens (`{`, `}`, string, number, `true`/`false`/`null`)
2. `parseValue()` dispatches on token
3. `parseObject` / `parseArray` recursively

**Staff answer:** "I'd use a recursive descent parser; for production we don't reimplement — interview is about handling nesting and escape sequences."

---

## Q29. Correct `typeof` helper

```javascript
function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

// Or detailed:
function preciseType(value) {
  return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
}
// preciseType([]) → "array"; preciseType(null) → "null"
```

---

## Q30. Array `map` / `filter` / `reduce` polyfills

```javascript
Array.prototype.myMap = function (cb, thisArg) {
  const result = [];
  for (let i = 0; i < this.length; i++) {
    if (i in this) result[i] = cb.call(thisArg, this[i], i, this);
  }
  return result;
};

Array.prototype.myFilter = function (cb, thisArg) {
  const result = [];
  for (let i = 0; i < this.length; i++) {
    if (i in this && cb.call(thisArg, this[i], i, this)) result.push(this[i]);
  }
  return result;
};

Array.prototype.myReduce = function (cb, initial) {
  let i = 0;
  let acc = initial;
  if (arguments.length < 2) {
    while (i < this.length && !(i in this)) i++;
    if (i >= this.length) throw new TypeError("Reduce of empty array");
    acc = this[i++];
  }
  for (; i < this.length; i++) {
    if (i in this) acc = cb(acc, this[i], i, this);
  }
  return acc;
};
```

**Sparse arrays:** Use `i in this` — classic follow-up.
