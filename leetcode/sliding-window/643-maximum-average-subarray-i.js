/**
 * 643. Maximum Average Subarray I
 * Find a contiguous subarray of length k with the maximum average.
 * Same as: find the length-k window with the biggest sum, then divide by k.
 *
 * @param {number[]} nums
 * @param {number} k
 * @return {number}
 */
var findMaxAverage = function (nums, k) {
  // Step 1: Sum of first k elements = our first window
  let windowSum = 0;
  for (let i = 0; i < k; i++) {
    windowSum += nums[i];
  }
  let maxSum = windowSum;

  // Step 2: Slide window right — add next number, drop leftmost
  for (let i = k; i < nums.length; i++) {
    windowSum = windowSum + nums[i] - nums[i - k];
    maxSum = Math.max(maxSum, windowSum);
  }

  return maxSum / k;
};

// --- tests ---

function test(name, nums, k, expected) {
  const got = findMaxAverage(nums, k);
  const ok = Math.abs(got - expected) < 1e-5;
  console.log(ok ? "✓" : "✗", name, ok ? "" : `got ${got}, expected ${expected}`);
}

test("Example 1", [1, 12, -5, -6, 50, 3], 4, 12.75);
test("Example 2", [5], 1, 5.0);
