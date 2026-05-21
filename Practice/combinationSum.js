/**
 * COMBINATION SUM
 * --------------
 * Find all unique combinations of numbers from `nums` that add up to `target`.
 * You can use the same number multiple times.
 *
 * Example: nums = [2, 3, 6, 7], target = 7
 *   Valid: [2, 2, 3] (2+2+3=7), [7] (7=7)
 *   Not valid: [2, 5] (5 not in nums), [3, 4] (3+4=7 but 4 not in nums)
 *
 * HOW IT WORKS (backtracking)
 * ---------------------------
 * We build combinations one number at a time. For each number we have two choices:
 *   - Include it (and maybe include it again, since we can reuse).
 *   - Skip it and try the next number.
 *
 * We use "startIndex" so we only look at numbers from that index onward. That way
 * we get [2, 3] but never [3, 2] as a separate combo—both sum to 5, we count once.
 *
 * After trying a number (push → recurse), we pop it off and try the next option.
 * That "undo" step is the "backtrack"—we go back and try another branch.
 * WALKTHROUGH: nums = [2, 3], target = 5
 * ---------------------------------------
 * We want combinations that sum to 5. The only way is [2, 3].
 *
 *   findCombinations(0, 0, [])
 *   |
 *   |-- Try 2: path = [2], sum = 2. Recurse (we can use 2 again).
 *   |      |-- Try 2: [2,2], sum = 4. Recurse.
 *   |      |      |-- Try 2: [2,2,2], sum = 6 > 5 → stop
 *   |      |      |-- Try 3: [2,2,3], sum = 7 > 5 → stop
 *   |      |-- Try 3: [2,3], sum = 5 ✓ SAVE [2, 3]
 *   |
 *   |-- Try 3: path = [3], sum = 3. Recurse from index 1 only (so we don't try [3,2] later).
 *   |      |-- Try 3: [3,3], sum = 6 > 5 → stop
 *
 * Result: [[2, 3]]. We never get [3, 2] because we only look forward (startIndex).
 *
 * BETTER WALKTHROUGH: nums = [2, 3, 6, 7], target = 7
 * ----------------------------------------------------
 *   Start: findCombinations(0, 0, [])
 *
 *   • Pick 2 → [2], sum=2. Recurse from index 0 (can pick 2 again).
 *     • Pick 2 → [2,2], sum=4. Recurse from index 0.
 *       • Pick 2 → [2,2,2], sum=6. Recurse.
 *         • Pick 2 → sum=8 > 7, stop.
 *         • Pick 3 → [2,2,2,3], sum=9 > 7, stop. ... no more.
 *       • Pick 3 → [2,2,3], sum=7 ✓ SAVE [2,2,3]
 *       • Pick 6, 7 → over. Backtrack.
 *     • Pick 3, 6, 7 from [2] → 2+3=5, 2+6=8, 2+7=9. Only 5 is under 7, so recurse [2,3]...
 *   • Pick 3 → [3], sum=3. Then 3+3=6, 3+6=9, 3+7=10. Recurse [3,3] → 6+3=9, no.
 *   • Pick 6 → [6], sum=6. Recurse → 6+6=12, 6+7=13. No.
 *   • Pick 7 → [7], sum=7 ✓ SAVE [7]
 *
 * Result: [[2, 2, 3], [7]]
 *
 * @param {number[]} nums - Array of positive integers (no duplicates for unique combos)
 * @param {number} target - Target sum
 * @returns {number[][]} - List of unique combinations that sum to target
 */
function combinationSum(nums, target) {
  const allCombinations = [];

  function findCombinations(startIndex, sumSoFar, currentCombination) {
    // Success: we've reached the target sum
    if (sumSoFar === target) {
      allCombinations.push([...currentCombination]);
      return;
    }

    // Stop: we've exceeded the target, no point adding more
    if (sumSoFar > target) {
      return;
    }

    // Try each number from startIndex onward (avoid duplicate combos like [2,3] and [3,2])
    for (let i = startIndex; i < nums.length; i++) {
      const num = nums[i];

      // Include this number in the current combination
      currentCombination.push(num);

      // Recurse: try to reach target using same number again (unlimited use)
      findCombinations(i, sumSoFar + num, currentCombination);

      // Backtrack: remove this number and try the next candidate
      currentCombination.pop();
    }
  }

  findCombinations(0, 0, []);
  return allCombinations;
}

// -------- Examples with explanations --------

// nums=[2,3,6,7], target=7 → [2,2,3] and [7] are the only combinations that sum to 7
console.log(combinationSum([2, 3, 6, 7], 7));
// [[2, 2, 3], [7]]

// nums=[2,3,5], target=8 → 2+2+2+2=8, 2+3+3=8, 3+5=8
console.log(combinationSum([2, 3, 5], 8));
// [[2, 2, 2, 2], [2, 3, 3], [3, 5]]

// Can't make 1 from [2] → no combinations
console.log(combinationSum([2], 1));
// []

// Only way to get 3 from [1] is 1+1+1
console.log(combinationSum([1], 3));
// [[1, 1, 1]]

// =============================================================================
// COMBINATION SUM II (LeetCode #40)
// =============================================================================
// Same idea, but:
//   1. Each candidate can only be used ONCE.
//   2. Input may have duplicates — skip them at the same recursion level to
//      avoid duplicate combinations in the result.
//
// Key trick: after sorting, if candidates[i] === candidates[i-1] and i > start,
// we already explored a branch starting with that value — skip it.
//
// WALKTHROUGH: candidates = [1,1,2,5,6,7,10], target = 8
//   At depth 0, i=0: pick 1 → [1], recurse with start=1
//     At depth 1, i=1: pick 1 → [1,1], recurse with start=2
//       ...eventually finds [1,1,6] ✓
//     At depth 1, i=2: pick 2 → [1,2], recurse → finds [1,2,5] ✓
//     At depth 1, i=3: pick 5 → [1,5], recurse → finds nothing
//     At depth 1, i=4: pick 6 → [1,6], recurse → sum=7, pick 1? No—start=5.
//       pick 7 → over. No match.
//     At depth 1, i=5: pick 7 → [1,7], sum=8 ✓
//   At depth 0, i=1: candidates[1]===candidates[0] AND i>start(0) → SKIP
//     (would duplicate everything we found under the first 1)
//   At depth 0, i=2: pick 2 → [2], recurse → finds [2,6] ✓
//   ...
// Result: [[1,1,6],[1,2,5],[1,7],[2,6]]

/**
 * @param {number[]} candidates
 * @param {number} target
 * @returns {number[][]}
 */
function combinationSum2(candidates, target) {
  candidates.sort((a, b) => a - b); // sort so duplicates are adjacent
  const result = [];

  function backtrack(start, remaining, current) {
    if (remaining === 0) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) break; // sorted: no point going further

      // Skip duplicate values at the same recursion depth
      if (i > start && candidates[i] === candidates[i - 1]) continue;

      current.push(candidates[i]);
      backtrack(i + 1, remaining - candidates[i], current); // i+1: each used once
      current.pop();
    }
  }

  backtrack(0, target, []);
  return result;
}

// -------- Examples --------
console.log(combinationSum2([10, 1, 2, 7, 6, 1, 5], 8));
// [[1,1,6],[1,2,5],[1,7],[2,6]]

console.log(combinationSum2([2, 5, 2, 1, 2], 5));
// [[1,2,2],[5]]
