/**
 * 1679. Max Number of K-Sum Pairs
 * In one operation, pick two numbers that sum to k and remove them.
 * Return the maximum number of operations.
 *
 * Simplest: sort, then two pointers from both ends. If sum === k, count and
 * move both; if sum < k move left; if sum > k move right.
 *
 * @param {number[]} nums
 * @param {number} k
 * @return {number}
 */
var maxOperations = function (nums, k) {
  nums.sort((a, b) => a - b);
  let ops = 0;
  let left = 0;
  let right = nums.length - 1;

  while (left < right) {
    const sum = nums[left] + nums[right];
    if (sum === k) {
      ops++;
      left++;
      right--;
    } else if (sum < k) {
      left++;
    } else {
      right--;
    }
  }

  return ops;
};

// --- tests ---

function test(name, nums, k, expected) {
  const actual = maxOperations(nums, k);
  const ok = actual === expected;
  console.log(ok ? "✓" : "✗", name, ok ? "" : `got ${actual}, expected ${expected}`);
}

test("Example 1", [1, 2, 3, 4], 5, 2);
test("Example 2", [3, 1, 3, 4, 3], 6, 1);
test("No pairs", [1, 2, 3], 10, 0);
test("All same, form pairs", [2, 2, 2, 2], 4, 2);
