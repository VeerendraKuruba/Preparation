/**
 * 724. Find Pivot Index
 * https://leetcode.com/problems/find-pivot-index/
 *
 * Pivot at index i means: sum of elements strictly left of i === sum strictly right of i.
 * Key: total = leftSum + nums[i] + rightSum  =>  rightSum = total - leftSum - nums[i].
 * We walk left-to-right, maintain leftSum, and check if leftSum === rightSum.
 *
 * Example: nums = [1, 7, 3, 6, 5, 6]
 *   total = 1+7+3+6+5+6 = 28
 *
 *   i=0: leftSum=0,        rightSum=28-0-1=27   → 0 ≠ 27, then leftSum=1
 *   i=1: leftSum=1,        rightSum=28-1-7=20   → 1 ≠ 20, then leftSum=8
 *   i=2: leftSum=8,        rightSum=28-8-3=17   → 8 ≠ 17, then leftSum=11
 *   i=3: leftSum=11,       rightSum=28-11-6=11  → 11 === 11  → return 3
 *
 *   Visual:  [ 1,  7,  3,  6,  5,  6 ]
 *   index:     0   1   2  [3]  4   5
 *   left of 3: 1+7+3 = 11,  right of 3: 5+6 = 11  ✓
 *
 * @param {number[]} nums
 * @return {number}
 */
var pivotIndex = function (nums) {
  const total = nums.reduce((s, n) => s + n, 0);
  let leftSum = 0;

  for (let i = 0; i < nums.length; i++) {
    const rightSum = total - leftSum - nums[i];
    if (leftSum === rightSum) return i;
    leftSum += nums[i];
  }

  return -1;
};
