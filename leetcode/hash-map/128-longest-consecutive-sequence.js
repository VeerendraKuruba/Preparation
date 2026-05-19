/**
 * 128. Longest Consecutive Sequence
 * https://leetcode.com/problems/longest-consecutive-sequence/
 * Difficulty: Medium
 *
 * Given an unsorted array of integers nums, return the length of the longest
 * consecutive elements sequence. Must run in O(n) time.
 *
 * Example 1: nums = [100,4,200,1,3,2] → 4  ([1,2,3,4])
 * Example 2: nums = [0,3,7,2,5,8,4,6,0,1] → 9
 * Example 3: nums = [1,0,1,2] → 3
 *
 * Approach: HashSet
 * - Add all numbers to a Set (O(n))
 * - For each number, only start a sequence if (num - 1) is NOT in the Set
 *   (i.e., it's the beginning of a sequence)
 * - Count consecutive numbers from that start
 * - Track the max length
 *
 * Time: O(n) — each number is visited at most twice (once as start, once as next)
 * Space: O(n) — for the Set
 *
 * @param {number[]} nums
 * @return {number}
 */
var longestConsecutive = function (nums) {
  const set = new Set(nums);
  let max = 0;

  for (const num of set) {
    // Only start counting from the beginning of a sequence
    if (!set.has(num - 1)) {
      let current = num;
      let length = 1;

      while (set.has(current + 1)) {
        current++;
        length++;
      }

      max = Math.max(max, length);
    }
  }

  return max;
};

/**
 * Approach 2: Set + sort
 * - Dedupe with a Set, then sort unique values (no duplicate branch in the scan)
 * - Walk through: extend length if next === prev + 1, else reset
 *
 * Time: O(n log n) — sort dominates
 * Space: O(n) — Set + sorted copy (does not mutate nums)
 *
 * @param {number[]} nums
 * @return {number}
 */
var longestConsecutiveSort = function (nums) {
  if (!nums.length) return 0;

  const sorted = [...new Set(nums)].sort((a, b) => a - b);

  let max = 1;
  let length = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      max = Math.max(max, ++length);
    } else {
      length = 1;
    }
  }

  return max;
};

// Tests
console.log("--- HashSet O(n) ---");
console.log(longestConsecutive([100, 4, 200, 1, 3, 2])); // 4
console.log(longestConsecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1])); // 9
console.log(longestConsecutive([1, 0, 1, 2])); // 3
console.log(longestConsecutive([])); // 0
console.log(longestConsecutive([1])); // 1

console.log("--- Sort O(n log n) ---");
console.log(longestConsecutiveSort([100, 4, 200, 1, 3, 2])); // 4
console.log(longestConsecutiveSort([0, 3, 7, 2, 5, 8, 4, 6, 0, 1])); // 9
console.log(longestConsecutiveSort([1, 0, 1, 2])); // 3
console.log(longestConsecutiveSort([])); // 0
console.log(longestConsecutiveSort([1])); // 1
