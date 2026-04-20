/**
 * 55. Jump Game
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PROBLEM (in detail)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * You start at index 0 of an array. Each element nums[i] is the MAXIMUM number
 * of steps you may jump from that position (you may jump 1, 2, ... up to
 * nums[i] steps). Decide whether you can reach the LAST index.
 *
 * Rules:
 *   • Start: index 0
 *   • From index i you may jump to any index in [i+1, i+2, ..., i+nums[i]]
 *   • Goal: reach index (nums.length - 1)
 *   • Return true if possible, false otherwise
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DIAGRAM 1: Example where answer is TRUE — nums = [2, 3, 1, 1, 4]
 * ─────────────────────────────────────────────────────────────────────────
 *
 *   Index:    0    1    2    3    4
 *   nums:   [ 2    3    1    1    4 ]   ← last index = 4 (target)
 *             ↑
 *           start
 *
 *   At index 0 we can jump up to 2 steps → we can land on 1 or 2.
 *   One valid path: 0 → 1 (jump 1) then 1 → 4 (jump 3). Reached last index ✓
 *
 *   Visual path:
 *
 *   Index:    0    1    2    3    4
 *             ●----→----●              (from 0 jump 1 to 1)
 *                       |     \        (from 1 we CAN jump 3)
 *                       |      \___
 *                       |          ●  (land on 4 = last index)
 *
 *   So canJump([2,3,1,1,4]) === true
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DIAGRAM 2: Example where answer is FALSE — nums = [3, 2, 1, 0, 4]
 * ─────────────────────────────────────────────────────────────────────────
 *
 *   Index:    0    1    2    3    4
 *   nums:   [ 3    2    1    0    4 ]
 *             ↑              ↑
 *           start         stuck (0 means can't move forward)
 *
 *   From 0 we can reach 1, 2, or 3.
 *   From 1 we can reach 2 or 3.
 *   From 2 we can reach 3 only.
 *   From 3 we can jump 0 steps → we cannot get to 4. We're stuck.
 *
 *   Visual:
 *
 *   Index:    0    1    2    3    4
 *             ●----●----●----●    ?
 *                       \____/  (all paths lead to 3; from 3 we cannot jump)
 *
 *   So canJump([3,2,1,0,4]) === false
 *
 * ─────────────────────────────────────────────────────────────────────────
 * GREEDY IDEA (what we implement)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Don't simulate every path. Just ask: "What's the farthest index we can
 * reach so far?" (maxReach). Walk left to right:
 *
 *   • If current index i is beyond maxReach → we can never get to i → false.
 *   • Otherwise, from i we can reach up to (i + nums[i]). Update maxReach.
 *   • If maxReach >= last index → we can reach the end → true.
 *
 * Example [2,3,1,1,4]:
 *
 *   i=0: maxReach = 0+2 = 2     (we can reach 1 or 2)
 *   i=1: maxReach = max(2, 1+3) = 4   → 4 >= 4 → true
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Approach (code): Greedy — track farthest reachable index
 * - maxReach = farthest index we can get to so far.
 * - At each i: if i > maxReach we're stuck → return false.
 * - Update maxReach = max(maxReach, i + nums[i]).
 * - If maxReach >= last index, return true.
 *
 * Time: O(n), Space: O(1)
 *
 * @param {number[]} nums
 * @return {boolean}
 */
var canJump = function (nums) {
  const n = nums.length;
  let maxReach = 0;

  for (let i = 0; i < n; i++) {
    if (i > maxReach) return false;
    maxReach = Math.max(maxReach, i + nums[i]);
    if (maxReach >= n - 1) return true;
  }

  return true;
};

// Examples — 55. Jump Game (can we reach last index?)
console.log(canJump([2, 3, 1, 1, 4])); // true
console.log(canJump([3, 2, 1, 0, 4])); // false
console.log(canJump([0])); // true (already at last index)
console.log(canJump([1, 1, 1, 1])); // true (step 1 each time)
console.log(canJump([2, 0])); // true (jump 2 from 0 to end)
console.log(canJump([1, 0, 1])); // false (stuck at index 1)
console.log(canJump([1, 2, 0, 1])); // true (e.g. 0→1→3)
console.log(canJump([5, 0, 0, 0, 0, 1])); // true (0→5 in one jump)

// -----------------------------------------------------------------------------
// 45. Jump Game II — minimum number of jumps to reach last index
// -----------------------------------------------------------------------------
// Same jump rules as 55; from i you can jump to any (i+j) with 0<=j<=nums[i].
// Return the MINIMUM number of jumps to reach index n-1. (Test cases allow reaching it.)
//
// Approach: Greedy BFS — currentReach = farthest we can get with `jumps` jumps;
// nextReach = farthest we can get with one more jump from [0..currentReach].
// When i === currentReach we've exhausted this "level", so jumps++, currentReach = nextReach.
//
// Example [2,3,1,1,4]: i=0 → nextReach=2, i=currentReach → jumps=1, currentReach=2;
// i=2 → nextReach=4, i=currentReach → jumps=2, currentReach=4 >= 4 → return 2.
// Time: O(n), Space: O(1)
//
// @param {number[]} nums
// @return {number}
function jump(nums) {
  const n = nums.length;
  if (n <= 1) return 0;

  let jumps = 0;
  let currentReach = 0; // farthest index reachable with `jumps` jumps
  let nextReach = 0;     // farthest index with one more jump

  for (let i = 0; i < n - 1; i++) {
    nextReach = Math.max(nextReach, i + nums[i]);
    if (i === currentReach) {
      jumps++;
      currentReach = nextReach;
      if (currentReach >= n - 1) return jumps;
    }
  }
  return jumps;
}

// Examples — 45. Jump Game II (minimum jumps)
console.log(jump([2, 3, 1, 1, 4])); // 2 (0→1→4)
console.log(jump([2, 3, 0, 1, 4])); // 2 (0→1→4)
console.log(jump([1])); // 0 (already at end)
console.log(jump([1, 1, 1, 1])); // 3 (0→1→2→3)
console.log(jump([2, 0])); // 1 (0→2)
console.log(jump([1, 2, 0, 1])); // 2 (0→1→3)
console.log(jump([2, 1])); // 1 (0→1)
console.log(jump([1, 2, 1, 1, 1])); // 3 (0→1→3→4)
