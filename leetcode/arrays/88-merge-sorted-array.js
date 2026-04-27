/**
 * Merge two sorted arrays into a new sorted array (merge-sort merge step).
 * Compare the front of each array; take the smaller, repeat.
 * O(n + m) time, O(n + m) space for the output.
 */
function mergeSorted(arr1, arr2) {
  const result = [];
  let i = 0;
  let j = 0;

  while (i < arr1.length && j < arr2.length) {
    if (arr1[i] <= arr2[j]) {
      result.push(arr1[i]);
      i += 1;
    } else {
      result.push(arr2[j]);
      j += 1;
    }
  }

  while (i < arr1.length) result.push(arr1[i++]);
  while (j < arr2.length) result.push(arr2[j++]);

  return result;
}

/**
 * LeetCode 88 — merge nums2 into nums1 in-place.
 * nums1 has length m + n; trailing zeros hold the merge result.
 * Merge from the end so values still to merge in nums1 are not overwritten.
 * O(m + n) time, O(1) extra space.
 */
function merge(nums1, m, nums2, n) {
  let i = m - 1;
  let j = n - 1;
  let k = m + n - 1;

  while (j >= 0) {
    if (i >= 0 && nums1[i] > nums2[j]) {
      nums1[k] = nums1[i];
      i -= 1;
    } else {
      nums1[k] = nums2[j];
      j -= 1;
    }
    k -= 1;
  }
}

console.log(mergeSorted([1, 3, 5], [2, 4, 6])); // [1, 2, 3, 4, 5, 6]

// LeetCode 88 — in-place
const nums1 = [1, 2, 3, 0, 0, 0];
merge(nums1, 3, [2, 5, 6], 3);
console.log(nums1); // [1, 2, 2, 3, 5, 6]
