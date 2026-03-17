/**
 * 35. Search Insert Position
 * Sorted distinct integers, target. Return index if found, else index where it would be inserted.
 * Binary search for smallest i where nums[i] >= target (insert position / found index).
 */

/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
function searchInsert(nums, target) {
  let left = 0;
  let right = nums.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2); // middle index
    if (nums[mid] < target) {
      left = mid + 1; // target is in the right half
    } else {
      right = mid; // target is here or in the left half
    }
  }

  return left;
}

// Examples
console.log(searchInsert([1, 3, 5, 6], 5)); // 2
console.log(searchInsert([1, 3, 5, 6], 2)); // 1
console.log(searchInsert([1, 3, 5, 6], 7)); // 4
