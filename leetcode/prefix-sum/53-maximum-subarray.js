/**
 * 53. Maximum Subarray
 * Find the subarray with the largest sum and return its sum.
 * Kadane's algorithm: for each position, max sum ending here is either
 * extend previous (currentSum + num) or start fresh (num). Track global max.
 * Time O(n), space O(1).
 */

/**
 * @param {number[]} nums
 * @return {number}
 */
function maxSubArray(nums) {
  let maxSum = nums[0];
  let currentSum = nums[0];

  for (let i = 1; i < nums.length; i++) {
    currentSum = Math.max(nums[i], currentSum + nums[i]);
    maxSum = Math.max(maxSum, currentSum);
  }

  return maxSum;
}

// Examples
console.log(maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4])); // 6  -> [4,-1,2,1]
console.log(maxSubArray([1])); // 1
console.log(maxSubArray([5, 4, -1, 7, 8])); // 23 -> whole array
