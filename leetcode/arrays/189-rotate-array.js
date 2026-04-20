/**
 * 189. Rotate Array
 * Rotate the array to the right by k steps (k is non-negative).
 *
 * Approach: Three reversals (in-place)
 * - Rotate right by k ⇒ last k elements move to the front.
 * - k may be >= n, so first do k = k % n.
 * - Reverse entire array, then reverse first k, then reverse last n - k.
 *
 * Example: [1,2,3,4,5,6,7], k = 3
 *   Reverse all:     [7,6,5,4,3,2,1]
 *   Reverse [0..2]:  [5,6,7,4,3,2,1]
 *   Reverse [3..6]:  [5,6,7,1,2,3,4] ✓
 *
 * Time: O(n), Space: O(1)
 *
 * Alternative: slice + copy back (O(n) time, O(n) space but very readable)
 *   const n = nums.length;
 *   k = k % n;
 *   const rotated = [...nums.slice(-k), ...nums.slice(0, n - k)];
 *   rotated.forEach((v, i) => { nums[i] = v; });
 *
 * @param {number[]} nums
 * @param {number} k
 * @return {void} Do not return anything, modify nums in-place instead.
 */
var rotate = function (nums, k) {
  const n = nums.length;
  k = k % n;
  if (k === 0) return;

  const reverse = (start, end) => {
    while (start < end) {
      [nums[start], nums[end]] = [nums[end], nums[start]];
      start++;
      end--;
    }
  };

  reverse(0, n - 1);
  reverse(0, k - 1);
  reverse(k, n - 1);
};

/** Same result using slice + concat (O(n) space). */
function rotateSlice(nums, k) {
  const n = nums.length;
  k = k % n;
  if (k === 0) return;
  const rotated = [...nums.slice(-k), ...nums.slice(0, n - k)];
  rotated.forEach((v, i) => {
    nums[i] = v;
  });
}

// Example
const nums = [1, 2, 3, 4, 5, 6, 7];
rotate(nums, 3);
console.log(nums); // [5, 6, 7, 1, 2, 3, 4]

const nums2 = [1, 2, 3, 4, 5, 6, 7];
rotateSlice(nums2, 3);
console.log(nums2); // [5, 6, 7, 1, 2, 3, 4]
