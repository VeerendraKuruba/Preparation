/**
 * 215. Kth Largest Element in an Array
 * https://leetcode.com/problems/kth-largest-element-in-an-array/
 *
 * Easy idea (no sort): find the largest number, "remove" it, repeat.
 * After doing this k times, the last largest you found is the kth largest.
 *
 * Example: nums = [3, 2, 1, 5, 6, 4], k = 2
 *
 *   Round 1 — largest is 6 → mark 6 as gone
 *   Round 2 — largest left is 5 → that's the 2nd largest ✓
 *
 * We mark removed values as -Infinity (nums are within 32-bit int range).
 */

/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number}
 */
function findKthLargest(nums, k) {
  const arr = [...nums];

  for (let round = 0; round < k; round++) {
    let maxIdx = 0;

    for (let i = 1; i < arr.length; i++) {
      if (arr[i] > arr[maxIdx]) {
        maxIdx = i;
      }
    }

    if (round === k - 1) {
      return arr[maxIdx];
    }

    arr[maxIdx] = -Infinity;
  }
}

// --- Tests ---

console.log(findKthLargest([3, 2, 1, 5, 6, 4], 2)); // 5
console.log(findKthLargest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4)); // 4
