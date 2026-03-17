/**
 * 70. Climbing Stairs
 * n steps to top; each move: 1 or 2 steps. Return number of distinct ways.
 * Recurrence: ways(n) = ways(n-1) + ways(n-2) — same as Fibonacci.
 *
 * Fibonacci series (each number = sum of previous two):
 *   Classic:  F0=0, F1=1 → 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ...
 *   Climbing: ways(1)=1, ways(2)=2 → 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ...
 *   So "climbing stairs" is the Fibonacci sequence starting at 1, 2 instead of 0, 1.
 *
 * Example (n = 4):
 *   Step 1: 1 way   → [1]
 *   Step 2: 2 ways  → [1,1] or [2]
 *   Step 3: 3 ways  → [1,1,1], [1,2], [2,1]
 *   Step 4: 5 ways  → [1,1,1,1], [1,1,2], [1,2,1], [2,1,1], [2,2]
 *
 * Loop for n=4 (twoBack=1, oneBack=2 at start):
 *   step=3: waysToHere = 2+1 = 3 → twoBack=2, oneBack=3
 *   step=4: waysToHere = 3+2 = 5 → twoBack=3, oneBack=5
 *   return oneBack = 5
 */

// --- Method 1: Iterative, O(n) time, O(1) space ---
/**
 * Solution 1 keeps only two numbers: ways to reach the previous step (oneBack)
 * and the step before that (twoBack). For each new step we add them, then slide.
 *
 * Example n = 4 with Solution 1:
 *
 *   Before loop: twoBack = 1 (ways to step 1), oneBack = 2 (ways to step 2).
 *
 *   step = 3:
 *     waysToHere = oneBack + twoBack = 2 + 1 = 3  ← ways to reach step 3
 *     twoBack = 2,  oneBack = 3   (slide: "one step back" is now step 2, "two back" is step 1)
 *
 *   step = 4:
 *     waysToHere = 3 + 2 = 5  ← ways to reach step 4
 *     twoBack = 3,  oneBack = 5
 *
 *   return oneBack = 5
 *
 * Example n = 10 with Solution 1 (same idea, more steps):
 *
 *   Start: twoBack = 1, oneBack = 2
 *   step  3: waysToHere =  3  → twoBack=2,  oneBack=3
 *   step  4: waysToHere =  5  → twoBack=3,  oneBack=5
 *   step  5: waysToHere =  8  → twoBack=5,  oneBack=8
 *   step  6: waysToHere = 13  → twoBack=8,  oneBack=13
 *   step  7: waysToHere = 21  → twoBack=13, oneBack=21
 *   step  8: waysToHere = 34  → twoBack=21, oneBack=34
 *   step  9: waysToHere = 55  → twoBack=34, oneBack=55
 *   step 10: waysToHere = 89 → twoBack=55, oneBack=89
 *   return oneBack = 89
 *
 * So we never store all step counts — only the last two — and get the answer in O(1) space.
 *
 * @param {number} n
 * @return {number}
 */
function climbStairs(n) {
  if (n <= 2) return n;
  let twoBack = 1;   // ways to reach step 1
  let oneBack = 2;   // ways to reach step 2
  for (let step = 3; step <= n; step++) {
    const waysToHere = oneBack + twoBack;
    twoBack = oneBack;
    oneBack = waysToHere;
  }
  return oneBack;
}

// --- Method 2: DP array (bottom-up), O(n) time, O(n) space ---
function climbStairsDP(n) {
  if (n <= 2) return n;
  const dp = [0, 1, 2];
  for (let i = 3; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
}

// --- Method 3: Memoized recursion (top-down) ---
function climbStairsMemo(n) {
  const memo = new Map();
  function ways(k) {
    if (k <= 2) return k;
    if (memo.has(k)) return memo.get(k);
    const result = ways(k - 1) + ways(k - 2);
    memo.set(k, result);
    return result;
  }
  return ways(n);
}

// Examples
console.log(climbStairs(2)); // 2
console.log(climbStairs(3)); // 3
console.log(climbStairs(4)); // 5
console.log(climbStairs(5));  // 8
console.log(climbStairs(10)); // 89
