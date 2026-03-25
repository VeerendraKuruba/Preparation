/**
 * Promise.all: fail-fast when any rejection occurs (first rejection wins).
 * Preserves output order; non-promises are treated as fulfilled values.
 */

export function promiseAll<T>(iterable: Iterable<T | PromiseLike<T>>): Promise<T[]> {
  const input = Array.from(iterable);
  if (input.length === 0) return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    const results: T[] = new Array(input.length);
    let remaining = input.length;
    let settled = false;

    const onResolve = (i: number, val: T) => {
      if (settled) return;
      results[i] = val;
      remaining -= 1;
      if (remaining === 0) resolve(results);
    };

    const onReject = (err: unknown) => {
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
