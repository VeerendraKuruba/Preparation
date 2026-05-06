# JavaScript — Polyfills, Output Questions & Internals

> Adobe's Round 1 is heavily JS-focused. Expect: polyfill implementations, output-based questions, closures, async, event delegation. You must be able to WRITE polyfills from scratch, not just use them.

---

## POLYFILLS — Adobe's Favourite Interview Topic

### 1. Array.prototype.map

**Q: Implement `Array.prototype.myMap` from scratch.**

```js
Array.prototype.myMap = function(callback, thisArg) {
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }

  const result = [];
  for (let i = 0; i < this.length; i++) {
    // Only process defined indices (sparse arrays)
    if (Object.prototype.hasOwnProperty.call(this, i)) {
      result[i] = callback.call(thisArg, this[i], i, this);
    }
  }
  return result;
};

// Test
[1, 2, 3].myMap(x => x * 2);        // [2, 4, 6]
[1, , 3].myMap(x => x * 2);         // [2, empty, 6] — sparse array handled
['a', 'b'].myMap(function(v, i) {
  return `${i}:${v}`;
});                                   // ['0:a', '1:b']

// Key details to mention:
// 1. callback receives (element, index, array)
// 2. thisArg sets 'this' inside callback
// 3. sparse array slots are skipped
// 4. returns NEW array — doesn't mutate original
```

---

### 2. Array.prototype.filter

```js
Array.prototype.myFilter = function(callback, thisArg) {
  if (typeof callback !== 'function') throw new TypeError(callback + ' is not a function');

  const result = [];
  for (let i = 0; i < this.length; i++) {
    if (Object.prototype.hasOwnProperty.call(this, i)) {
      if (callback.call(thisArg, this[i], i, this)) {
        result.push(this[i]); // only push if predicate is truthy
      }
    }
  }
  return result;
};

[1, 2, 3, 4, 5].myFilter(x => x % 2 === 0); // [2, 4]
```

---

### 3. Array.prototype.reduce

```js
Array.prototype.myReduce = function(callback, initialValue) {
  if (typeof callback !== 'function') throw new TypeError(callback + ' is not a function');
  if (this.length === 0 && arguments.length < 2) {
    throw new TypeError('Reduce of empty array with no initial value');
  }

  let accumulator;
  let startIndex;

  if (arguments.length >= 2) {
    accumulator = initialValue;
    startIndex = 0;
  } else {
    // No initial value — use first element as accumulator
    accumulator = this[0];
    startIndex = 1;
  }

  for (let i = startIndex; i < this.length; i++) {
    if (Object.prototype.hasOwnProperty.call(this, i)) {
      accumulator = callback(accumulator, this[i], i, this);
    }
  }
  return accumulator;
};

[1, 2, 3, 4].myReduce((acc, val) => acc + val, 0);   // 10
[1, 2, 3, 4].myReduce((acc, val) => acc + val);       // 10 (no initialValue)
[].myReduce((acc, val) => acc + val);                  // TypeError
```

---

### 4. Function.prototype.bind

```js
Function.prototype.myBind = function(thisArg, ...outerArgs) {
  if (typeof this !== 'function') throw new TypeError('myBind called on non-function');

  const originalFn = this;

  function BoundFunction(...innerArgs) {
    // When called as a constructor with 'new', 'this' is the new instance
    // In that case, ignore thisArg — 'new' wins over bind
    const context = this instanceof BoundFunction ? this : thisArg;
    return originalFn.apply(context, [...outerArgs, ...innerArgs]);
  }

  // Maintain prototype chain for 'new' usage
  if (originalFn.prototype) {
    BoundFunction.prototype = Object.create(originalFn.prototype);
  }

  return BoundFunction;
};

function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}
const boundGreet = greet.myBind({ name: 'Veerendra' }, 'Hello');
boundGreet('!'); // 'Hello, Veerendra!'

// Partial application
const add = (a, b, c) => a + b + c;
const add5 = add.myBind(null, 5);
add5(3, 2); // 10
```

---

### 5. Function.prototype.call and apply

```js
Function.prototype.myCall = function(thisArg, ...args) {
  // Use a Symbol to avoid property name collision
  const sym = Symbol('fn');
  const context = thisArg ?? globalThis; // handle null/undefined
  context[sym] = this;
  const result = context[sym](...args);
  delete context[sym];
  return result;
};

Function.prototype.myApply = function(thisArg, argsArray = []) {
  const sym = Symbol('fn');
  const context = thisArg ?? globalThis;
  context[sym] = this;
  const result = context[sym](...argsArray);
  delete context[sym];
  return result;
};

function introduce(role, company) {
  return `${this.name} — ${role} at ${company}`;
}
introduce.myCall({ name: 'Veerendra' }, 'Senior FE', 'Adobe'); // 'Veerendra — Senior FE at Adobe'
introduce.myApply({ name: 'Veerendra' }, ['Senior FE', 'Adobe']); // same
```

---

### 6. Promise.all

```js
function myPromiseAll(promises) {
  return new Promise((resolve, reject) => {
    if (!promises.length) return resolve([]);

    const results = new Array(promises.length);
    let resolved = 0;

    promises.forEach((promise, index) => {
      Promise.resolve(promise) // handle non-Promise values
        .then(value => {
          results[index] = value;
          resolved++;
          if (resolved === promises.length) resolve(results);
        })
        .catch(reject); // first rejection → reject all
    });
  });
}

myPromiseAll([
  Promise.resolve(1),
  Promise.resolve(2),
  Promise.resolve(3),
]).then(console.log); // [1, 2, 3]

myPromiseAll([
  Promise.resolve(1),
  Promise.reject('error'),
  Promise.resolve(3),
]).catch(console.log); // 'error'
```

---

### 7. Promise.allSettled

```js
function myPromiseAllSettled(promises) {
  return new Promise(resolve => {
    if (!promises.length) return resolve([]);

    const results = new Array(promises.length);
    let settled = 0;

    promises.forEach((promise, index) => {
      Promise.resolve(promise)
        .then(value => {
          results[index] = { status: 'fulfilled', value };
        })
        .catch(reason => {
          results[index] = { status: 'rejected', reason };
        })
        .finally(() => {
          settled++;
          if (settled === promises.length) resolve(results);
        });
    });
  });
}

// Returns all results, never rejects
myPromiseAllSettled([
  Promise.resolve(1),
  Promise.reject('fail'),
  Promise.resolve(3),
]).then(results => {
  results.forEach(r => {
    if (r.status === 'fulfilled') console.log('Value:', r.value);
    else console.log('Error:', r.reason);
  });
});
// Value: 1
// Error: fail
// Value: 3
```

---

### 8. Promise.race and Promise.any

```js
function myPromiseRace(promises) {
  return new Promise((resolve, reject) => {
    promises.forEach(p => Promise.resolve(p).then(resolve).catch(reject));
  });
}

function myPromiseAny(promises) {
  return new Promise((resolve, reject) => {
    if (!promises.length) return reject(new AggregateError([], 'All promises rejected'));

    const errors = new Array(promises.length);
    let rejected = 0;

    promises.forEach((p, i) => {
      Promise.resolve(p)
        .then(resolve) // first success → resolve
        .catch(err => {
          errors[i] = err;
          rejected++;
          if (rejected === promises.length) {
            reject(new AggregateError(errors, 'All promises rejected'));
          }
        });
    });
  });
}
```

---

### 9. Debounce & Throttle (Full implementations — see 01-javascript.md in Commvault for extended versions)

```js
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function throttle(fn, limit) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= limit) {
      lastTime = now;
      return fn.apply(this, args);
    }
  };
}
```

---

### 10. Deep Clone

```js
function deepClone(obj) {
  // Handle primitives, null, undefined
  if (obj === null || typeof obj !== 'object') return obj;

  // Handle Date
  if (obj instanceof Date) return new Date(obj.getTime());

  // Handle Array
  if (Array.isArray(obj)) return obj.map(deepClone);

  // Handle RegExp
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);

  // Handle Map
  if (obj instanceof Map) {
    const cloned = new Map();
    obj.forEach((val, key) => cloned.set(deepClone(key), deepClone(val)));
    return cloned;
  }

  // Handle Set
  if (obj instanceof Set) {
    return new Set([...obj].map(deepClone));
  }

  // Handle plain object
  const cloned = Object.create(Object.getPrototypeOf(obj));
  for (const key of Reflect.ownKeys(obj)) { // includes Symbols
    cloned[key] = deepClone(obj[key]);
  }
  return cloned;
}

// NOTE: structuredClone() (native) handles most of this — mention it
// structuredClone does NOT support: functions, DOM nodes, class instances with methods
```

---

### 11. Curry & Partial Application

```js
// Curry — transform fn(a, b, c) into fn(a)(b)(c)
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function (...nextArgs) {
      return curried.apply(this, [...args, ...nextArgs]);
    };
  };
}

const add = (a, b, c) => a + b + c;
const curriedAdd = curry(add);
curriedAdd(1)(2)(3);    // 6
curriedAdd(1, 2)(3);    // 6
curriedAdd(1)(2, 3);    // 6
curriedAdd(1, 2, 3);    // 6

// Real-world use: create specialized functions from general ones
const multiply = curry((multiplier, val) => val * multiplier);
const double = multiply(2);
const triple = multiply(3);
[1, 2, 3].map(double); // [2, 4, 6]
[1, 2, 3].map(triple); // [3, 6, 9]
```

---

### 12. Memoize

```js
function memoize(fn) {
  const cache = new Map();

  return function (...args) {
    const key = JSON.stringify(args); // simple key — works for JSON-serializable args
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// For object args — use WeakMap for the first arg
function memoizeWithWeakMap(fn) {
  const weakCache = new WeakMap();
  const primitiveCache = new Map();

  return function (arg) {
    const cache = typeof arg === 'object' && arg !== null ? weakCache : primitiveCache;
    if (cache.has(arg)) return cache.get(arg);
    const result = fn.call(this, arg);
    cache.set(arg, result);
    return result;
  };
}

const expensiveCalc = memoize(n => {
  console.log('Computing...');
  return n * n;
});
expensiveCalc(5); // logs 'Computing...' → 25
expensiveCalc(5); // no log (cached) → 25
```

---

## OUTPUT-BASED QUESTIONS

### Q: What is the output?

```js
// 1. Hoisting
console.log(typeof foo); // 'undefined' — var is hoisted but not initialized
console.log(typeof bar); // ReferenceError: Cannot access before initialization (TDZ)
var foo = 1;
let bar = 2;

// 2. Closure in loops
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Output: 3, 3, 3 (var is function-scoped, all share same i)

for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Output: 0, 1, 2 (let is block-scoped, new binding per iteration)

// 3. Prototypal method
function Person(name) { this.name = name; }
Person.prototype.getName = function() { return this.name; };

const p = new Person('Veerendra');
const getNameFn = p.getName;
console.log(getNameFn());        // undefined — 'this' is global/undefined
console.log(getNameFn.call(p)); // 'Veerendra' — explicit binding

// 4. Event loop
console.log(1);
setTimeout(() => console.log(2), 0);
Promise.resolve().then(() => console.log(3));
console.log(4);
// Output: 1, 4, 3, 2

// 5. typeof checks
console.log(typeof null);         // 'object' (JS historical bug)
console.log(typeof undefined);    // 'undefined'
console.log(typeof NaN);          // 'number'
console.log(typeof function(){}); // 'function'
console.log(typeof []);           // 'object'
console.log(null instanceof Object); // false

// 6. Tricky equality
console.log(0 == false);    // true (0 coerces to false)
console.log('' == false);   // true ('' coerces to 0, false to 0)
console.log(null == 0);     // false (null only equals undefined in loose)
console.log(null == undefined); // true
console.log(NaN === NaN);   // false (NaN is not equal to anything)

// 7. this in object method
const obj = {
  x: 10,
  getX() { return this.x; },
  getXArrow: () => this.x, // arrow: captures 'this' from module scope (undefined in strict)
};
obj.getX();       // 10
obj.getXArrow();  // undefined (or window.x in browser sloppy mode)

// 8. Spread and rest
const [first, ...rest] = [1, 2, 3, 4];
console.log(first); // 1
console.log(rest);  // [2, 3, 4]

const { a, ...others } = { a: 1, b: 2, c: 3 };
console.log(a);      // 1
console.log(others); // { b: 2, c: 3 }
```

---

## VANILLA JS IMPLEMENTATION QUESTIONS

### Q: Implement `document.getElementsByClassName` without using it.

```js
function getElementsByClassName(root, className) {
  const result = [];

  function traverse(node) {
    if (!node) return;
    // Check if it's an Element (not text node)
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.classList.contains(className)) {
        result.push(node);
      }
    }
    // Traverse children
    for (const child of node.childNodes) {
      traverse(child);
    }
  }

  traverse(root);
  return result;
}
```

### Q: Implement event delegation.

```js
// Event delegation: attach ONE listener to parent, handle all matching children
function delegate(parent, selector, eventType, handler) {
  parent.addEventListener(eventType, function(event) {
    // event.target is the actual clicked element
    // Walk up the DOM to find a matching ancestor
    let target = event.target;
    while (target && target !== parent) {
      if (target.matches(selector)) {
        handler.call(target, event);
        break;
      }
      target = target.parentElement;
    }
  });
}

// Usage — handles dynamically added items too
delegate(document.querySelector('.job-list'), '.retry-btn', 'click', function(e) {
  const jobId = this.closest('[data-job-id]').dataset.jobId;
  retryJob(jobId);
});
```

### Q: Implement `once` — a function that can only be called once.

```js
function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result; // return cached result on subsequent calls
  };
}

const initApp = once(() => {
  console.log('App initialized');
  return { initialized: true };
});
initApp(); // 'App initialized' → { initialized: true }
initApp(); // (no log) → { initialized: true }
```

### Q: Implement `pipe` and `compose`.

```js
// pipe: left-to-right (f, g, h) → h(g(f(x)))
const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);

// compose: right-to-left (f, g, h) → f(g(h(x)))
const compose = (...fns) => (x) => fns.reduceRight((v, f) => f(v), x);

const process = pipe(
  x => x * 2,       // 10
  x => x + 1,       // 11
  x => `Result: ${x}` // 'Result: 11'
);
process(5); // 'Result: 11'
```

### Q: Implement `flatten` with depth support.

```js
function flatten(arr, depth = Infinity) {
  if (depth === 0) return arr.slice();
  return arr.reduce((acc, val) => {
    if (Array.isArray(val)) {
      acc.push(...flatten(val, depth - 1));
    } else {
      acc.push(val);
    }
    return acc;
  }, []);
}

flatten([1, [2, [3, [4]]]], 1);        // [1, 2, [3, [4]]]
flatten([1, [2, [3, [4]]]]);           // [1, 2, 3, 4]
flatten([1, [2, [3, [4]]]], Infinity); // [1, 2, 3, 4]
```

### Q: Implement `groupBy` (Lodash).

```js
function groupBy(arr, iteratee) {
  const fn = typeof iteratee === 'function'
    ? iteratee
    : (item) => item[iteratee]; // property string shorthand

  return arr.reduce((groups, item) => {
    const key = fn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {});
}

groupBy([6.1, 4.2, 6.3], Math.floor); // { 6: [6.1, 6.3], 4: [4.2] }
groupBy(['one', 'two', 'three'], 'length'); // { 3: ['one', 'two'], 5: ['three'] }
```

---

## Async & Promise Questions

### Q: Implement a function that runs N async tasks with a max concurrency of K.

```js
async function runWithConcurrency(tasks, limit) {
  const results = [];
  const executing = new Set();

  for (const [index, task] of tasks.entries()) {
    const promise = Promise.resolve().then(() => task()).then(result => {
      results[index] = result;
      executing.delete(promise);
    });

    executing.add(promise);

    if (executing.size >= limit) {
      await Promise.race(executing); // wait for one to finish
    }
  }

  await Promise.all(executing); // wait for remaining
  return results;
}

// Usage: fetch 10 items, max 3 at a time
const tasks = urls.map(url => () => fetch(url).then(r => r.json()));
const results = await runWithConcurrency(tasks, 3);
```

### Q: What is the difference between `async/await` error handling patterns?

```js
// Pattern 1: try/catch — clean, readable
async function fetchData() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

// Pattern 2: .catch() chaining — for optional error handling
const data = await fetch('/api/data')
  .then(r => r.json())
  .catch(err => { console.error(err); return null; });

// Pattern 3: Go-style error tuple (avoids nested try/catch)
const [err, data] = await fetchData()
  .then(d => [null, d])
  .catch(e => [e, null]);

if (err) return handleError(err);
process(data);
```
