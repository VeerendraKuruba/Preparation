/**
 * 334. Increasing Triplet Subsequence
 *
 * Return true if some i < j < k with nums[i] < nums[j] < nums[k].
 * Greedy: track the smallest end of a length-1 chain (first) and length-2 chain (second).
 * If we see a value > second, we have a valid triplet. O(n) time, O(1) space.
 *
 * @param {number[]} nums
 * @return {boolean}
 */
var increasingTriplet = function (nums) {
  let first = Infinity;
  let second = Infinity;

  for (const num of nums) {
    if (num <= first) {
      first = num;
    } else if (num <= second) {
      second = num;
    } else {
      return true;
    }
  }

  return false;
};

// Example: increasingTriplet([2, 1, 5, 0, 4, 6]) → true (e.g. indices 1, 4, 5)
