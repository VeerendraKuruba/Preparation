/**
 * 152. Maximum Product Subarray
 *
 * Find the contiguous subarray with the largest product.
 * Track both max and min product ending at each index — a negative can flip
 * a small product into a large one. O(n) time, O(1) space.
 *
 * @param {number[]} nums
 * @return {number}
 */
var maxProduct = function (nums) {
  let maxEnding = nums[0];
  let minEnding = nums[0];
  let result = nums[0];

  for (let i = 1; i < nums.length; i++) {
    const n = nums[i];

    // Negative flips which running product is largest vs smallest
    if (n < 0) {
      [maxEnding, minEnding] = [minEnding, maxEnding];
    }

    maxEnding = Math.max(n, maxEnding * n);
    minEnding = Math.min(n, minEnding * n);
    result = Math.max(result, maxEnding);
  }

  return result;
};

// Example: maxProduct([2,3,-2,4]) → 6  ([2,3])
// Example: maxProduct([-2,0,-1]) → 0  ([0])
