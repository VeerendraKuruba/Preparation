/**
 * 215. Kth Largest Element in an Array
 * https://leetcode.com/problems/kth-largest-element-in-an-array/
 *
 * QuickSelect: no full sort. kth largest = element at index (n - k) in sorted order.
 * Average O(n), worst O(n²). Space O(1).
 *
 * --- Example: nums = [3, 2, 1, 5, 6, 4], k = 2 (find 2nd largest) ---
 *
 * Sorted would be [1, 2, 3, 4, 5, 6]. 2nd largest = 5, at index 4.
 * So targetIndex = n - k = 6 - 2 = 4. We want the element that ends up at index 4.
 *
 * Partition step (Lomuto): pick last element as pivot, move everything <= pivot left.
 *
 *   [3, 2, 1, 5, 6, 4]   pivot = 4, left=0, right=5
 *   Compare each with 4: 3<=4 ✓ swap to i, 2<=4 ✓, 1<=4 ✓, 5>4 skip, 6>4 skip
 *   Then swap pivot 4 with position i → [3, 2, 1, 4, 6, 5]. Pivot at index 3.
 *
 *   p=3, targetIndex=4. p < target → answer is in right side. low = 4, high = 5.
 *
 *   [3, 2, 1, 4, 6, 5]   partition between indices 4..5, pivot = 5
 *   Only 6: 6>5 skip. Swap pivot with i → [3, 2, 1, 4, 5, 6]. Pivot at index 4.
 *
 *   p=4 === targetIndex=4 → return nums[4] = 5. Done.
 */

/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number}
 */
function findKthLargest(nums, k) {
  const targetIndex = nums.length - k;

  function partition(left, right) {
    const pivot = nums[right];
    let i = left;
    for (let j = left; j < right; j++) {
      if (nums[j] <= pivot) {
        [nums[i], nums[j]] = [nums[j], nums[i]];
        i++;
      }
    }
    [nums[i], nums[right]] = [nums[right], nums[i]];
    return i;
  }

  let low = 0;
  let high = nums.length - 1;

  while (low <= high) {
    const p = partition(low, high);
    if (p === targetIndex) return nums[p];
    if (p < targetIndex) low = p + 1;
    else high = p - 1;
  }

  return nums[targetIndex];
}

// --- Tests ---

console.log(findKthLargest([3, 2, 1, 5, 6, 4], 2)); // 5
console.log(findKthLargest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4)); // 4
