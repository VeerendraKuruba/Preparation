// Color Batching Algorithm
//
// Optimizes the painting process of cars by creating batches based on
// minimum (N) and maximum (M) batch size constraints.
//
// Rules:
//  - Cars of the same color are grouped together.
//  - A batch is only created when constraints N <= size <= M are met for a single color.
//  - If batchesUnderMinSize is true, batches smaller than N are also emitted when
//    there aren't enough cars of that color left in the entire list.
//  - If there are more than M cars of the same color, multiple batches of M are created.
//  - The algorithm creates the largest possible group from consecutive colors.
//  - The original color order is respected as closely as possible.

function colorBatching(N, M, colorsForCars, batchesUnderMinSize) {
  const counts = new Map();

  // 1. Count how many cars of each color
  for (const color of colorsForCars) {
    counts.set(color, (counts.get(color) || 0) + 1);
  }

  const result = [];

  // 2. Make batches for each color (Map keeps first-seen order)
  for (const [color, total] of counts) {
    let left = total;

    // Make full batches of size M
    while (left >= M) {
      result.push(Array(M).fill(color));
      left -= M;
    }

    // Handle leftover cars
    if (left >= N) {
      result.push(Array(left).fill(color));
    } else if (batchesUnderMinSize && left > 0) {
      result.push(Array(left).fill(color));
    }
    // else: leftover is too small, skip it
  }

  return result;
}

// -----------------------------------------
// Tests — run with:  node colorbatching.js
// -----------------------------------------

function assert(description, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? "✅" : "❌"} ${description}`);
  if (!pass) {
    console.log("   Expected:", JSON.stringify(expected));
    console.log("   Actual  :", JSON.stringify(actual));
  }
}

// Example 1
assert(
  "Example 1 — batchesUnderMinSize: true",
  colorBatching(3, 5, ["red", "red", "blue", "red", "blue", "blue", "yellow"], true),
  [["red", "red", "red"], ["blue", "blue", "blue"], ["yellow"]]
);

// Example 2
assert(
  "Example 2 — batchesUnderMinSize: false",
  colorBatching(2, 4, ["red", "red", "blue", "red", "blue", "blue", "yellow"], false),
  [["red", "red", "red"], ["blue", "blue", "blue"]]
);

// Example 3
assert(
  "Example 3 — N=1, M=2",
  colorBatching(1, 2, ["red", "red", "yellow", "green", "green", "blue", "blue"], true),
  [["red", "red"], ["yellow"], ["green", "green"], ["blue", "blue"]]
);
