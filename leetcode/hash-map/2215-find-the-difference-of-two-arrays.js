/**
 * 2215. Find the Difference of Two Arrays
 * https://leetcode.com/problems/find-the-difference-of-two-arrays/
 *
 * Return [answer[0], answer[1]] where:
 *   answer[0] = distinct integers in nums1 not in nums2
 *   answer[1] = distinct integers in nums2 not in nums1
 *
 * Approach: Use sets for O(1) membership checks. Filter each set by the other.
 * Time: O(n + m), Space: O(n + m)
 */

/**
 * @param {number[]} nums1
 * @param {number[]} nums2
 * @return {number[][]}
 */
function findDifference(nums1, nums2) {
  const set1 = new Set(nums1);
  const set2 = new Set(nums2);

  const onlyIn1 = [...set1].filter((x) => !set2.has(x));
  const onlyIn2 = [...set2].filter((x) => !set1.has(x));

  return [onlyIn1, onlyIn2];
}

// Examples
console.log(findDifference([1, 2, 3], [2, 4, 6])); // [[1, 3], [4, 6]]
console.log(findDifference([1, 2, 3, 3], [1, 1, 2, 2])); // [[3], []]
