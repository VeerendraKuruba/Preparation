/**
 * 167. Two Sum II - Input Array Is Sorted
 * Find two numbers that add up to target. Return 1-indexed indices.
 *
 * Approach: Two pointers (array is sorted)
 * - Left at start, right at end.
 * - If sum < target → move left right (increase sum).
 * - If sum > target → move right left (decrease sum).
 * - If sum === target → return [left + 1, right + 1].
 *
 * Example: numbers = [2,7,11,15], target = 9
 *   left=0, right=3: 2+15=17 > 9 → right=2
 *   left=0, right=2: 2+11=13 > 9 → right=1
 *   left=0, right=1: 2+7=9 → [1, 2]
 *
 * Time: O(n), Space: O(1)
 *
 * @param {number[]} numbers
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function (numbers, target) {
  let left = 0;
  let right = numbers.length - 1;

  while (left < right) {
    const sum = numbers[left] + numbers[right];
    if (sum === target) {
      return [left + 1, right + 1];
    }
    if (sum < target) {
      left++;
    } else {
      right--;
    }
  }

  return [-1, -1]; // no solution (problem guarantees one exists)
};

// Example
console.log(twoSum([2, 7, 11, 15], 9)); // [1, 2]
console.log(twoSum([2, 3, 4], 6)); // [1, 3]
console.log(twoSum([-1, 0], -1)); // [1, 2]
