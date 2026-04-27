function getNameById(id, callback) {
  const randomRequestTime = Math.floor(Math.random() * 100) + 200;
  setTimeout(() => {
    callback("User" + id);
  }, randomRequestTime);
}

// mapLimit runs iterateeFn on each input but ensures at most `limit` tasks
// run concurrently. Results are collected in the same order as inputs.
function mapLimit(inputs, limit, iterateeFn, mainCallback) {
  const results = [];
  let nextIndex = limit; // first `limit` slots are taken by the for loop below
  let completed = 0;

  // Called every time any task finishes
  function onDone(index, result) {
    results[index] = result; // store at original index to preserve order
    completed++;

    if (completed === inputs.length) {
      mainCallback(results); // all tasks done
    } else if (nextIndex < inputs.length) {
      // slot freed — pick up the next pending input
      const idx = nextIndex++;
      iterateeFn(inputs[idx], (res) => onDone(idx, res));
    }
  }

  // Launch the first batch (up to `limit`) using a for loop.
  // `let i` creates a new binding per iteration so each callback captures the right index.
  for (let i = 0; i < Math.min(limit, inputs.length); i++) {
    iterateeFn(inputs[i], (result) => onDone(i, result));
  }
}

mapLimit([1, 2, 3, 4, 5], 2, getNameById, (allResults) => {
  console.log('output:', allResults); // ["User1", "User2", "User3", "User4", "User5"]
});
