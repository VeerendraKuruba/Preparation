/**
 * CustomPromise — constructor, then, catch, chaining, resolve/reject.
 */

function CustomPromise(executor) {
  const runAsync = (fn) =>
    typeof queueMicrotask === 'function' ? queueMicrotask(fn) : setTimeout(fn, 0);

  let value, error;
  let state = 'pending'; // 'pending' | 'fulfilled' | 'rejected'
  const onFulfill = [];
  const onReject = [];

  const resolve = (val) => {
    if (state !== 'pending') return;
    state = 'fulfilled';
    value = val;
    onFulfill.forEach((fn) => runAsync(() => fn(value)));
  };

  const reject = (err) => {
    if (state !== 'pending') return;
    state = 'rejected';
    error = err;
    onReject.forEach((fn) => runAsync(() => fn(error)));
  };

  // Run handler, then resolve or reject the next promise
  const run = (handler, val, res, rej) => {
    try {
      res(handler(val));
    } catch (e) {
      rej(e);
    }
  };

  this.then = function (onRes, onRej) {
    onRes = typeof onRes === 'function' ? onRes : (v) => v;
    onRej = typeof onRej === 'function' ? onRej : (e) => { throw e; };

    return new CustomPromise((res, rej) => {
      const doFulfill = () => run(onRes, value, res, rej);
      const doReject = () => run(onRej, error, res, rej);

      if (state === 'fulfilled') runAsync(doFulfill);
      else if (state === 'rejected') runAsync(doReject);
      else {
        onFulfill.push(doFulfill);
        onReject.push(doReject);
      }
    });
  };

  this.catch = function (fn) {
    return this.then(null, fn);
  };

  try {
    executor(resolve, reject);
  } catch (e) {
    reject(e);
  }
}

CustomPromise.resolve = (val) => new CustomPromise((r) => r(val));
CustomPromise.reject = (err) => new CustomPromise((_, r) => r(err));

module.exports = CustomPromise;
