/**
 * 1004. Max Consecutive Ones III
 *
 * In plain English: We can turn at most k zeros into ones. What's the longest
 * stretch of consecutive 1's we can get? So we're really asking: what's the
 * longest segment of the array that has at most k zeros? (We'll "flip" those.)
 *
 * Sliding window idea:
 * - Keep a window [start, end]. Count how many zeros are inside it.
 * - If zeros ≤ k, this window is valid — we can flip those zeros and get all 1's.
 * - If zeros > k, shrink from the left until we have ≤ k zeros again.
 * - Always remember the biggest valid window size.
 *
 * Time: O(n). end runs 0..n-1 (n steps). start only moves forward; over the whole
 * run it can advance at most n times. So the while loop runs O(n) times in total
 * (amortized), not n times per end. Each element is "added" once (when end passes it)
 * and "removed" at most once (when start passes it).
 * Space: O(1).
 *
 * @param {number[]} nums
 * @param {number} k  max zeros we're allowed to flip
 * @return {number}   length of longest subarray of 1's (after flipping ≤ k zeros)
 */
var longestOnes = function (nums, k) {
  let start = 0;              // left edge of our window
  let zerosInWindow = 0;      // how many 0's are currently inside the window
  let bestLength = 0;         // best answer so far

  // Move the right edge of the window one step at a time
  for (let end = 0; end < nums.length; end++) {
    // Include nums[end] in the window
    if (nums[end] === 0) {
      zerosInWindow++;
    }
    while (zerosInWindow > k) {
      if (nums[start] === 0) {
        zerosInWindow--;
      }
      start++;
    }
    bestLength = Math.max(bestLength, end - start + 1);
  }

  return bestLength;
};

// --- Example 1 walkthrough ---
// nums = [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0],  k = 2
// index:  0  1  2  3  4  5  6  7  8  9 10
//
// We slide "end" from 0 to 10. Window = [start..end], we allow at most 2 zeros.
//
//  end=0: window [1]           → 0 zeros → length 1, best=1
//  end=1: window [1,1]         → 0 zeros → length 2, best=2
//  end=2: window [1,1,1]       → 0 zeros → length 3, best=3
//  end=3: window [1,1,1,0]     → 1 zero  → length 4, best=4
//  end=4: window [1,1,1,0,0]   → 2 zeros → length 5, best=5
//  end=5: window [1,1,1,0,0,0] → 3 zeros! (exceeds k=2) → enter while loop.
//          Loop runs until zerosInWindow ≤ 2:
//            iter 1: drop nums[0]=1 → zerosInWindow still 3, start=1 → continue
//            iter 2: drop nums[1]=1 → zerosInWindow still 3, start=2 → continue
//            iter 3: drop nums[2]=1 → zerosInWindow still 3, start=3 → continue
//            iter 4: drop nums[3]=0 → zerosInWindow-- → 2, start=4 → 2 ≤ 2, exit
//          Why window is [0,0]: we shrink from the left until zeros ≤ k. We dropped
//          indices 0,1,2 (all 1's) then index 3 (a 0). So we keep only indices 4 and 5.
//          nums[4]=0, nums[5]=0 → window is [0,0]. We don't "choose" it; it's what's left.
//  end=6: window [0,0,1]           → 2 zeros → length 3, best=5
//  end=7: window [0,0,1,1]        → 2 zeros → length 4, best=5
//  end=8: window [0,0,1,1,1]      → 2 zeros → length 5, best=5
//  end=9: window [0,0,1,1,1,1]    → 2 zeros → length 6, best=6  ← answer
//  end=10: add 0 → 3 zeros, shrink → window ends up length 6 again, best=6
//
// So the best window is length 6, e.g. indices 4–9: [0,0,1,1,1,1].
// We "flip" the two 0's at indices 4 and 5 → all 1's → 6 consecutive 1's.

// --- Example 1 logs (from console.log in the loop) ---
// end: 0  start: 0  window: [ 1 ] length: 1 best: 1
// end: 1  start: 0  window: [ 1, 1 ] length: 2 best: 2
// end: 2  start: 0  window: [ 1, 1, 1 ] length: 3 best: 3
// end: 3  start: 0  window: [ 1, 1, 1, 0 ] length: 4 best: 4
// end: 4  start: 0  window: [ 1, 1, 1, 0, 0 ] length: 5 best: 5
// end: 5  start: 4  window: [ 0, 0 ] length: 2 best: 5        ← after shrink
// end: 6  start: 4  window: [ 0, 0, 1 ] length: 3 best: 5
// end: 7  start: 4  window: [ 0, 0, 1, 1 ] length: 4 best: 5
// end: 8  start: 4  window: [ 0, 0, 1, 1, 1 ] length: 5 best: 5
// end: 9  start: 4  window: [ 0, 0, 1, 1, 1, 1 ] length: 6 best: 6  ← answer
// end: 10 start: 5 window: [ 0, 1, 1, 1, 1, 0 ] length: 6 best: 6

// --- tests ---

function test(name, nums, k, expected) {
  const got = longestOnes(nums, k);
  const ok = got === expected;
  console.log(ok ? "✓" : "✗", name, ok ? "" : `got ${got}, expected ${expected}`);
}

test("Example 1", [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], 2, 6);
test("Example 2", [0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1], 3, 10);
test("All ones", [1, 1, 1, 1], 0, 4);
test("All zeros k=2", [0, 0, 0], 2, 2);
