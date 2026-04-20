/**
 * 209. Minimum Size Subarray Sum
 * Minimal length of a contiguous subarray with sum >= target. Sliding window. O(n), O(1).
 *
 * LINE-BY-LINE (example: target = 7, nums = [2, 3, 1, 2, 4, 3])
 * ---------------------------------------------------------------
 *
 * Line 10: let left = 0;
 *   Start of the window. Index of the leftmost element currently in the window.
 *
 * Line 11: let sum = 0;
 *   Sum of the current window [left..right]. Starts at 0.
 *
 * Line 12: let minLen = Infinity;
 *   Smallest window length seen so far that has sum >= target. Infinity = "none found yet".
 *
 * Line 14: for (let right = 0; right < nums.length; right++)
 *   right = index of the right end of the window. We expand by moving right.
 *
 * Line 15: sum += nums[right];
 *   Add the new element at right into the window. Window is now [left..right].
 *
 * Line 17: while (sum >= target)
 *   As long as this window's sum is >= target, we have a valid window. Try to shrink it.
 *
 * Line 18: minLen = Math.min(minLen, right - left + 1);
 *   Window length = right - left + 1. Update the best length we've seen.
 *
 * Line 19: sum -= nums[left];
 *   Remove the leftmost element from the window before moving left.
 *
 * Line 20: left++;
 *   Shrink the window from the left. Next iteration may shrink more or exit the while.
 *
 * Line 24: return minLen === Infinity ? 0 : minLen;
 *   If we never found a valid window, minLen stayed Infinity → return 0. Else return minLen.
 *
 * WALKTHROUGH: target = 7, nums = [2, 3, 1, 2, 4, 3]
 * -------------------------------------------------
 * right=0: add 2 → sum=2, window [2]         sum<7, no shrink
 * right=1: add 3 → sum=5, window [2,3]       sum<7, no shrink
 * right=2: add 1 → sum=6, window [2,3,1]     sum<7, no shrink
 * right=3: add 2 → sum=8, window [2,3,1,2]   sum>=7:
 *   minLen=4, sum-=2 → sum=6, left=1  [3,1,2] sum<7
 * right=4: add 4 → sum=10, window [3,1,2,4]  sum>=7:
 *   minLen=min(4,4)=4, sum-=3 → sum=7, left=2  [1,2,4] sum>=7:
 *   minLen=min(4,3)=3, sum-=1 → sum=6, left=3  [2,4] sum<7
 * right=5: add 3 → sum=9, window [2,4,3]     sum>=7:
 *   minLen=min(3,3)=3, sum-=2 → sum=7, left=4  [4,3] sum>=7:
 *   minLen=min(3,2)=2, sum-=4 → sum=3, left=5  [3] sum<7
 * return 2
 */
var minSubArrayLen = function (target, nums) {
  let left = 0;
  let sum = 0;
  let minLen = Infinity;

  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];

    while (sum >= target) {
      minLen = Math.min(minLen, right - left + 1);
      sum -= nums[left];
      left++;
    }
  }

  return minLen === Infinity ? 0 : minLen;
};

// --- tests (run with node or in console) ---
// console.log(minSubArrayLen(7, [2, 3, 1, 2, 4, 3])); // 2
// console.log(minSubArrayLen(4, [1, 4, 4]));         // 1
// console.log(minSubArrayLen(11, [1, 1, 1, 1, 1, 1, 1, 1])); // 0
