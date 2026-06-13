/**
 * 485. Max Consecutive Ones
 * https://leetcode.com/problems/max-consecutive-ones/
 *
 * No flips allowed (k = 0). Find the longest run of consecutive 1's.
 *
 * Simple scan: extend a streak on each 1, reset on 0.
 * Equivalent to longestOnes(nums, 0) from LC 1004.
 *
 * Time: O(n). Space: O(1).
 *
 * @param {number[]} nums
 * @return {number}
 */
var findMaxConsecutiveOnes = function (nums) {
  let best = 0;
  let streak = 0;

  for (const n of nums) {
    if (n === 1) {
      streak++;
      best = Math.max(best, streak);
    } else {
      streak = 0;
    }
  }

  return best;
};

// --- tests ---

function test(name, nums, expected) {
  const got = findMaxConsecutiveOnes(nums);
  const ok = got === expected;
  console.log(ok ? "✓" : "✗", name, ok ? "" : `got ${got}, expected ${expected}`);
}

test("Example 1", [1, 1, 0, 1, 1, 1], 3);
test("Example 2", [1, 0, 1, 1, 0, 1], 2);
test("All ones", [1, 1, 1, 1], 4);
test("All zeros", [0, 0, 0], 0);
test("Single one", [1], 1);
test("Single zero", [0], 0);
