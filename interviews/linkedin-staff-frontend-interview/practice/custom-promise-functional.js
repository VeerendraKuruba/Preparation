/**
 * Custom Promise — easiest functional style (interview-friendly)
 *
 * Mental model:
 * 1. Start as "pending" with empty handler queues
 * 2. resolve/reject settles state once, then drains queues
 * 3. then() always returns a NEW promise (chaining)
 *
 * Run: node practice/custom-promise-functional.js
 */

function createPromise(executor) {
  let state = "pending"; // "pending" | "fulfilled" | "rejected"
  let value;
  const onFulfilled = [];
  const onRejected = [];

  function resolve(val) {
    if (state !== "pending") return;

    // If resolved with another thenable, adopt its state
    if (val && typeof val.then === "function") {
      val.then(resolve, reject);
      return;
    }

    state = "fulfilled";
    value = val;
    onFulfilled.forEach((fn) => fn(val));
  }

  function reject(err) {
    if (state !== "pending") return;
    state = "rejected";
    value = err;
    onRejected.forEach((fn) => fn(err));
  }

  function then(onSuccess, onError) {
    return createPromise((resolveNext, rejectNext) => {
      function handleSuccess(val) {
        if (typeof onSuccess !== "function") {
          resolveNext(val); // pass-through
          return;
        }
        try {
          resolveNext(onSuccess(val));
        } catch (e) {
          rejectNext(e);
        }
      }

      function handleError(err) {
        if (typeof onError !== "function") {
          rejectNext(err); // pass-through
          return;
        }
        try {
          resolveNext(onError(err)); // catch can recover
        } catch (e) {
          rejectNext(e);
        }
      }

      if (state === "fulfilled") {
        queueMicrotask(() => handleSuccess(value));
      } else if (state === "rejected") {
        queueMicrotask(() => handleError(value));
      } else {
        onFulfilled.push(handleSuccess);
        onRejected.push(handleError);
      }
    });
  }

  function _catch(onError) {
    return then(undefined, onError);
  }

  try {
    executor(resolve, reject);
  } catch (e) {
    reject(e);
  }

  return { then, catch: _catch };
}

// ─── Helpers (optional) ──────────────────────────────────────────────────────

createPromise.resolve = (val) => createPromise((res) => res(val));
createPromise.reject = (err) => createPromise((_, rej) => rej(err));

// ─── Demo / tests ────────────────────────────────────────────────────────────

createPromise((resolve) => {
  setTimeout(() => resolve(10), 20);
})
  .then((n) => n * 2)
  .then((n) => {
    console.assert(n === 20, "chain should double");
    return n;
  })
  .then((n) => {
    console.log("ok: chain →", n);
  });

createPromise((_, reject) => reject("boom"))
  .catch((err) => {
    console.assert(err === "boom");
    return "recovered";
  })
  .then((v) => {
    console.assert(v === "recovered");
    console.log("ok: catch recovery →", v);
  });

createPromise((resolve) => resolve(1))
  .then(() => {
    throw new Error("fail");
  })
  .catch((e) => {
    console.assert(e.message === "fail");
    console.log("ok: then throw → catch");
  });

export { createPromise };
