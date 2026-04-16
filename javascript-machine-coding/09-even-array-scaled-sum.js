/**
 * From an array of numbers: drop odds, scale each remaining value by `multiplier`, return the sum.
 *
 * Implementations: iterative loop, recursion, and `filter` + `reduce`.
 *
 * @param {number[]} numbers
 * @param {number} multiplier
 * @returns {number}
 */

/** Iterative: single pass with a classic `for` loop. */
export function sumScaledEvens(numbers, multiplier) {
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    const n = numbers[i];
    if (n % 2 === 0) {
      sum += n * multiplier;
    }
  }
  return sum;
}

/**
 * Recursive: same rules, no array helpers; `i` is the current index (internal detail).
 * Same params as `sumScaledEvens` when called as `sumScaledEvensRecursive(numbers, multiplier)`.
 */
export function sumScaledEvensRecursive(numbers, multiplier, i = 0) {
  if (i >= numbers.length) return 0;
  const n = numbers[i];
  const contribution = n % 2 === 0 ? n * multiplier : 0;
  return contribution + sumScaledEvensRecursive(numbers, multiplier, i + 1);
}

/** `filter` evens, then `reduce` to sum scaled values. */
export function sumScaledEvensFilterReduce(numbers, multiplier) {
  return numbers
    .filter((n) => n % 2 === 0)
    .reduce((sum, n) => sum + n * multiplier, 0);
}
