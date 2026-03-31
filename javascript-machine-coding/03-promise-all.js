/**
 * Polyfill-style Promise.all:
 * - Resolves with an array of results in the same order as the input iterable.
 * - Rejects with the first rejection (fail-fast); other work is ignored after that.
 * - Non-thenable values are treated as already fulfilled (via Promise.resolve).
 */

export function promiseAll(iterable) {
  // Snapshot input so later changes to the iterable do not affect this run.
  const input = [...iterable];
  // Spec: Promise.all([]) resolves immediately with an empty array.
  if (input.length === 0) return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    const out = [];
    // Count of promises still pending fulfillment; when 0, every index in `out` is set.
    let pending = input.length;
    // After the first rejection, we ignore further results and do not resolve.
    let failed = false;

    input.forEach((item, i) => {
      // Coerce to a thenable so primitives and plain values behave like fulfilled promises.
      Promise.resolve(item).then(
        (val) => {
          if (failed) return;
          out[i] = val;
          if (--pending === 0) resolve(out);
        },
        (err) => {
          if (failed) return;
          failed = true;
          reject(err);
        }
      );
    });
  });
}