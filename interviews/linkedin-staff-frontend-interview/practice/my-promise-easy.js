/**
 * MyPromise — the easy version. ~60 lines, nothing clever.
 *
 * Four ideas only:
 *   1. Keep state + value in closure variables.
 *   2. If nobody is listening yet, park the handler in an array.
 *   3. When we settle, replay the parked handlers in a microtask.
 *   4. then() returns a new MyPromise, so chaining just works.
 *
 * Run: node practice/my-promise-easy.js
 */

function MyPromise(executor) {
  let state = "pending"; // "pending" | "fulfilled" | "rejected"
  let value; // the value OR the error
  let handlers = []; // functions waiting for us to settle

  function resolve(val) {
    if (state !== "pending") return; // settle once

    // Resolved with another promise? Wait for it instead.
    if (val && typeof val.then === "function") {
      val.then(resolve, reject);
      return;
    }

    state = "fulfilled";
    value = val;
    replay();
  }

  function reject(err) {
    if (state !== "pending") return;
    state = "rejected";
    value = err;
    replay();
  }

  function replay() {
    handlers.forEach((h) => queueMicrotask(h));
    handlers = [];
  }

  function then(onSuccess, onError) {
    return MyPromise((res, rej) => {
      const handle = () => {
        try {
          if (state === "fulfilled") {
            res(onSuccess ? onSuccess(value) : value); // no handler → pass value on
          } else if (onError) {
            res(onError(value)); // catch recovers → back to success path
          } else {
            rej(value); // no handler → keep rejecting
          }
        } catch (e) {
          rej(e); // a throw rejects the NEXT promise
        }
      };

      if (state === "pending") handlers.push(handle);
      else queueMicrotask(handle);
    });
  }

  try {
    executor(resolve, reject);
  } catch (e) {
    reject(e);
  }

  return {
    then,
    catch: (onError) => then(undefined, onError),
    finally: (fn) =>
      then(
        (v) => {
          fn();
          return v;
        },
        (e) => {
          fn();
          throw e;
        }
      ),
  };
}

MyPromise.resolve = (val) => MyPromise((res) => res(val));
MyPromise.reject = (err) => MyPromise((_, rej) => rej(err));

MyPromise.all = (list) =>
  MyPromise((resolve, reject) => {
    const out = [];
    let done = 0;
    if (list.length === 0) return resolve(out);

    list.forEach((item, i) => {
      MyPromise.resolve(item).then((val) => {
        out[i] = val; // index keeps input order
        if (++done === list.length) resolve(out);
      }, reject); // first failure rejects everything
    });
  });

MyPromise.race = (list) =>
  MyPromise((resolve, reject) => {
    list.forEach((item) => MyPromise.resolve(item).then(resolve, reject));
  });

// ── Quick checks ───────────────────────────────────────────────────────────

MyPromise((res) => setTimeout(() => res(10), 10))
  .then((n) => n * 2)
  .then((n) => console.log("chain:", n)); // 20

MyPromise.resolve(1)
  .then((n) => MyPromise.resolve(n + 1)) // returning a promise flattens
  .then((n) => console.log("flatten:", n)); // 2

MyPromise.reject("boom")
  .then((v) => console.log("skipped", v)) // errors skip then()
  .catch((e) => console.log("caught:", e)) // boom
  .then(() => console.log("catch recovers, chain continues"));

MyPromise.all([1, MyPromise.resolve(2), Promise.resolve(3)]).then((vals) =>
  console.log("all:", vals)
); // [1, 2, 3]

export { MyPromise };
