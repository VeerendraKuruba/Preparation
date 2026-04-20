/**
 * 169. Majority Element
 * Return the element that appears more than ⌊n / 2⌋ times.
 * Majority element is guaranteed to exist.
 *
 * Approach: Boyer-Moore Voting Algorithm
 * - Maintain a candidate and count. Same element → count++; different → count--.
 * - If count becomes 0, take current element as new candidate.
 * - Majority element always "wins" because it appears > n/2 times.
 *
 * Time: O(n), Space: O(1)
 *
 * @param {number[]} nums
 * @return {number}
 */
var majorityElement = function (nums) {
  let candidate = nums[0];
  let count = 1;

  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === candidate) {
      count++;
    } else {
      count--;
      if (count === 0) {
        candidate = nums[i];
        count = 1;
      }
    }
  }

  return candidate;
};

// Example
console.log(majorityElement([3, 2, 3])); // 3
