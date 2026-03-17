/**
 * 2006. Count Number of Pairs With Absolute Difference K
 * Given nums and k, return the number of pairs (i, j) with i < j such that |nums[i] - nums[j]| == k.
 *
 * ─── Key insight ─────────────────────────────────────────────────────────────────────────────
 * |a - b| = k  ⟺  either  a = b + k  or  a = b - k.
 * So every valid pair is (smaller, larger) with  larger - smaller = k  ⟺  (num, num + k).
 *
 * We only need to count pairs of the form (num, num + k). We do NOT need (num, num - k) separately:
 * - The pair (1, 2) has difference 1: we count it when we process num = 1 (numPlusK = 2).
 * - The pair (2, 1) is the same two numbers; we already count it as (1, 2) when num = 1.
 * So iterating each number and adding  freq[num] * freq[num + k]  counts every pair exactly once.
 *
 * ─── Example: nums = [1, 2, 2, 1], k = 1 ───────────────────────────────────────────────────
 * freqByNum: { 1 → 2,  2 → 2 }
 * num = 1: numPlusK = 2  →  freq[1]*freq[2] = 2*2 = 4  (all pairs with 1 and 2)
 * num = 2: numPlusK = 3  →  3 not in array, skip
 * Total = 4.
 *
 * Time O(n), space O(n).
 */

/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number}
 */
function countKDifference(nums, k) {
  // Step 1: frequency of each number (how many times it appears)
  const freqByNum = new Map();
  for (const num of nums) {
    freqByNum.set(num, (freqByNum.get(num) ?? 0) + 1);
  }

  // Step 2: for each number, every (num, num + k) is a valid pair
  // count of such pairs = (frequency of num) × (frequency of num + k)
  let pairs = 0;
  for (const [num, freq] of freqByNum) {
    const numPlusK = num + k;
    if (freqByNum.has(numPlusK)) {
      pairs += freq * freqByNum.get(numPlusK);
    }
  }

  return pairs;
}

// Examples
console.log(countKDifference([1, 2, 2, 1], 1)); // 4
console.log(countKDifference([1, 3], 3)); // 0
console.log(countKDifference([3, 2, 1, 5, 4], 2)); // 3
