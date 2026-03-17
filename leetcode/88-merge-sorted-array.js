/**
 * LeetCode 88 - Merge Sorted Array
 * https://leetcode.com/problems/merge-sorted-array/
 */
function merge(nums1, m, nums2, n) {
  const sorted = [...nums1.slice(0, m), ...nums2.slice(0, n)].sort((a, b) => a - b);
  sorted.forEach((val, i) => (nums1[i] = val));
}

// Example 1
const nums1 = [1, 2, 3, 0, 0, 0];
merge(nums1, 3, [2, 5, 6], 3);
console.log(nums1); // [1, 2, 2, 3, 5, 6]
