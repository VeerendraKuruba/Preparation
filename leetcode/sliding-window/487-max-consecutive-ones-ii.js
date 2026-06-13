/**
 * 487. Max Consecutive Ones II
 * https://leetcode.com/problems/max-consecutive-ones-ii/
 *
 * Flip at most one 0 → longest run of consecutive 1's.
 * Same as LC 1004 with k = 1: longest subarray with at most 1 zero.
 *
 * Sliding window:
 * - Expand right; count zeros in [start..end].
 * - If zeros > 1, shrink from left until zeros ≤ 1.
 * - Track max window size.
 *
 * Time: O(n). Space: O(1).
 *
 * @param {number[]} nums
 * @return {number}
 */
var findMaxConsecutiveOnes = function (nums) {
  let start = 0;
  let zerosInWindow = 0;
  let bestLength = 0;

  for (let end = 0; end < nums.length; end++) {
    if (nums[end] === 0) {
      zerosInWindow++;
    }

    while (zerosInWindow > 1) {
      if (nums[start] === 0) {
        zerosInWindow--;
      }
      start++;
    }

    bestLength = Math.max(bestLength, end - start + 1);
  }

  return bestLength;
};

// --- Example 1 walkthrough ---
// nums = [1, 0, 1, 1, 0], k = 1
// Best window: indices 0–3 → [1, 0, 1, 1] (1 zero). Flip it → 4 consecutive 1's.

// --- tests ---

function test(name, nums, expected) {
  const got = findMaxConsecutiveOnes(nums);
  const ok = got === expected;
  console.log(ok ? "✓" : "✗", name, ok ? "" : `got ${got}, expected ${expected}`);
}

test("Example 1", [1, 0, 1, 1, 0], 4);
test("Example 2", [1, 0, 1, 1, 0, 1], 4);
test("All ones", [1, 1, 1], 3);
test("Single zero surrounded", [1, 0, 1], 3);
test("Two zeros", [0, 0, 1], 2);
test("Longer window", [1, 1, 0, 1, 1, 1], 6);
