/**
 * Promise.all: fail-fast on first rejection.
 * Output order preserved; non-promises treated as fulfilled.
 */

export function promiseAll(iterable) {
  const input = Array.from(iterable);
  if (input.length === 0) return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    const results = new Array(input.length);
    let remaining = input.length;
    let settled = false;

    const onResolve = (i, val) => {
      if (settled) return;
      results[i] = val;
      remaining -= 1;
      if (remaining === 0) resolve(results);
    };

    const onReject = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    input.forEach((item, i) => {
      Promise.resolve(item).then(
        (val) => onResolve(i, val),
        (err) => onReject(err)
      );
    });
  });
}
