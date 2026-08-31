/**
 * PayPay Japan SSE Frontend Interview
 * asyncAdd — sum of all resolved promises
 *
 * - Sum values from promises that fulfill
 * - Ignore rejected promises
 * - If nothing fulfills → reject with an error
 */

function asyncAdd(values) {
  return Promise.allSettled(values).then((results) => {
    let sum = 0;
    let fulfilledCount = 0;

    for (const result of results) {
      if (result.status === "fulfilled") {
        sum += result.value;
        fulfilledCount++;
      }
    }

    if (fulfilledCount === 0) {
      return Promise.reject(new Error("All promises rejected"));
    }

    return sum;
  });
}

// TEST CASES

// 1) All resolve → 42
asyncAdd([
  Promise.resolve(10),
  Promise.resolve(30),
  Promise.resolve(2),
]).then(console.log);

// 2) Mixed → 30
asyncAdd([
  Promise.reject(new Error("no value")),
  Promise.resolve(30),
]).then(console.log);

// 3) All reject → Error: All promises rejected
asyncAdd([
  Promise.reject(new Error("no value")),
  Promise.reject(new Error("no value")),
  Promise.reject(new Error("no value")),
]).catch(console.log);

module.exports = { asyncAdd };
