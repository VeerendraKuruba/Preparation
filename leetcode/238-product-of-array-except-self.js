/**
 * 238. Product of Array Except Self
 *
 * Return answer[i] = product of all nums[j] where j !== i. O(n) time, no division.
 * Use prefix products in answer, then multiply by a running suffix from the right.
 *
 * @param {number[]} nums
 * @return {number[]}
 */
var productExceptSelf = function (nums) {
  const n = nums.length;
  const answer = new Array(n);

  let prefix = 1;
  for (let i = 0; i < n; i++) {
    answer[i] = prefix;
    prefix *= nums[i];
  }

  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) {
    answer[i] *= suffix;
    suffix *= nums[i];
  }

  return answer;
};

// Example: productExceptSelf([1,2,3,4]) → [24,12,8,6]
