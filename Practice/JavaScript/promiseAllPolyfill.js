/**
 * Promise.all polyfill: resolves with an array of results in input order,
 * or rejects with the first rejection. Non-thenables are treated as fulfilled values.
 *
 * Requires a working Promise implementation (ES2015+).
 */
function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    const n = items.length;
    const results = new Array(n);
    let pending = n;

    if (n === 0) {
      resolve([]);
      return;
    }

    items.forEach((item, index) => {
      Promise.resolve(item).then(
        (value) => {
          results[index] = value;
          pending -= 1;
          if (pending === 0) {
            resolve(results);
          }
        },
        reject
      );
    });
  });
}

/**
 * Promise.race polyfill: settles with the same outcome as the first promise
 * that settles (fulfillment or rejection). Non-thenables are treated as
 * immediately fulfilled values.
 *
 * Empty iterable: returns a forever-pending promise (matches native).
 */
function promiseRace(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    if (items.length === 0) {
      return;
    }
    items.forEach((item) => {
      Promise.resolve(item).then(resolve, reject);
    });
  });
}

/**
 * Promise.allSettled polyfill: always resolves (never rejects) with an array
 * of outcome objects in input order: { status: 'fulfilled', value } or
 * { status: 'rejected', reason }. Non-thenables are treated as fulfilled.
 */
function promiseAllSettled(iterable) {
  return new Promise((resolve) => {
    const items = Array.from(iterable);
    const n = items.length;
    const results = new Array(n);
    let pending = n;

    if (n === 0) {
      resolve([]);
      return;
    }

    items.forEach((item, index) => {
      Promise.resolve(item).then(
        (value) => {
          results[index] = { status: 'fulfilled', value };
          pending -= 1;
          if (pending === 0) {
            resolve(results);
          }
        },
        (reason) => {
          results[index] = { status: 'rejected', reason };
          pending -= 1;
          if (pending === 0) {
            resolve(results);
          }
        }
      );
    });
  });
}

function getAggregateError(errors, message) {
  if (typeof AggregateError === 'function') {
    return new AggregateError(errors, message);
  }
  const e = new Error(message);
  e.name = 'AggregateError';
  e.errors = errors;
  return e;
}

/**
 * Promise.any polyfill: resolves with the first fulfilled value.
 * Rejects with AggregateError only if every input rejects (or is empty).
 * Non-thenables count as fulfilled immediately.
 */
function promiseAny(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    const n = items.length;
    const errors = new Array(n);
    let rejections = 0;

    if (n === 0) {
      reject(getAggregateError([], 'All promises were rejected'));
      return;
    }

    items.forEach((item, index) => {
      Promise.resolve(item).then(
        resolve,
        (reason) => {
          errors[index] = reason;
          rejections += 1;
          if (rejections === n) {
            reject(getAggregateError(errors, 'All promises were rejected'));
          }
        }
      );
    });
  });
}

// Optional: install only if missing (keeps native behavior when present)
if (typeof Promise !== 'undefined' && typeof Promise.all !== 'function') {
  Promise.all = promiseAll;
}
if (typeof Promise !== 'undefined' && typeof Promise.race !== 'function') {
  Promise.race = promiseRace;
}
if (typeof Promise !== 'undefined' && typeof Promise.any !== 'function') {
  Promise.any = promiseAny;
}
if (typeof Promise !== 'undefined' && typeof Promise.allSettled !== 'function') {
  Promise.allSettled = promiseAllSettled;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    promiseAll,
    promiseRace,
    promiseAny,
    promiseAllSettled,
  };
}
