/**
 * 713. Subarray Product Less Than K
 *
 * Count contiguous subarrays whose product is strictly less than k.
 * Sliding window: expand right, shrink left while product >= k.
 * When valid, every subarray ending at right and starting in [left..right]
 * qualifies — add (right - left + 1) to the count.
 *
 * Assumes positive nums (standard constraint). If k <= 1, no positive product
 * can be strictly less than k.
 *
 * Time O(n), space O(1).
 *
 * @param {number[]} nums
 * @param {number} k
 * @return {number}
 */
var numSubarrayProductLessThanK = function (nums, k) {
  if (k <= 1) return 0;

  let left = 0;
  let product = 1;
  let count = 0;

  for (let right = 0; right < nums.length; right++) {
    product *= nums[right];

    while (product >= k) {
      product /= nums[left];
      left++;
    }

    // subarrays ending at right: [right], [right-1, right], ..., [left, right]
    count += right - left + 1;
  }

  return count;
};

// Example: numSubarrayProductLessThanK([10,5,2,6], 100) → 8
// Example: numSubarrayProductLessThanK([1,2,3], 0) → 0
