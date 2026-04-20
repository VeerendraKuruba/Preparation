/**
 * 1493. Longest Subarray of 1's After Deleting One Element
 * https://leetcode.com/problems/longest-subarray-of-1s-after-deleting-one-element/
 *
 * Sliding window: longest subarray with at most one 0. We must delete one
 * element, so answer = maxWindowLength - 1.
 *
 * @param {number[]} nums
 * @return {number}
 */
var longestSubarray = function (nums) {
  let left = 0;
  let zeros = 0;
  let maxLen = 0;

  for (let right = 0; right < nums.length; right++) {
    if (nums[right] === 0) zeros++;

    while (zeros > 1) {
      if (nums[left] === 0) zeros--;
      left++;
    }

    maxLen = Math.max(maxLen, right - left + 1);
  }

  return maxLen - 1;
};

// Tests
console.log(longestSubarray([1, 1, 0, 1])); // 3
console.log(longestSubarray([0, 1, 1, 1, 0, 1, 1, 0, 1])); // 5
console.log(longestSubarray([1, 1, 1])); // 2
