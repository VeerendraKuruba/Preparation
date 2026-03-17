/**
 * 80. Remove Duplicates from Sorted Array II
 * Remove duplicates in-place so each unique element appears at most twice.
 * First k elements of nums = result; return k. O(1) extra memory.
 *
 * --- Line-by-line example: nums = [1, 1, 1, 2, 2, 3] ---
 *
 *   nums.length > 2, so we don't return early.
 *
 *   Initial:  k = 2
 *             nums = [1, 1, 1, 2, 2, 3]
 *             Valid so far: indices 0..1 → [1, 1]
 *
 *   i = 2:    nums[2] = 1,  nums[k-2] = nums[0] = 1  →  same
 *             Skip (would be 3rd "1"). No write.
 *             nums = [1, 1, 1, 2, 2, 3],  k = 2
 *
 *   i = 3:    nums[3] = 2,  nums[k-2] = nums[0] = 1  →  different
 *             k first = 2.  nums[k++] = nums[i]  →  nums[2] = 2,  then k = 3 (after).
 *             nums = [1, 1, 2, 2, 2, 3],  k = 3
 *
 *   i = 4:    nums[4] = 2,  nums[k-2] = nums[1] = 1  →  different
 *             nums[k] = nums[i] = nums[4] = 2,  then k = 4
 *             nums = [1, 1, 2, 2, 2, 3],  k = 4
 *
 *   i = 5:    nums[5] = 3,  nums[k-2] = nums[2] = 2  →  different
 *             nums[k] = nums[i] = nums[5] = 3,  then k = 5
 *             nums = [1, 1, 2, 2, 3, 3],  k = 5
 *
 *   Loop ends. Result = first k = 5 elements: [1, 1, 2, 2, 3]. Return 5.
 *
 * @param {number[]} nums - Sorted in non-decreasing order
 * @return {number}
 */
var removeDuplicates = function (nums) {
  if (nums.length <= 2) return nums.length;
  let k = 2; // first two elements are always valid (at most 2 each)
  for (let i = 2; i < nums.length; i++) {
    if (nums[i] !== nums[k - 2]) {
      nums[k++] = nums[i];
    }
  }
  console.log('nums:', nums);
  console.log('result is first k =', k, 'elements');
  return k;
};

// Example run
const nums = [1, 1, 1, 2, 2, 3];
console.log('k =', removeDuplicates(nums));
