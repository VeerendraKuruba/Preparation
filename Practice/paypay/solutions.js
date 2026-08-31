/**
 * PayPay / CodeSignal Practice — Questions & Answers
 */

// =============================================================================
// Q1. Run-Length Encoding
// =============================================================================
/**
 * Apply run-length encoding to a string: count consecutive repeating characters
 * and output that count followed by the character.
 *
 * Example:
 *   Input:  "aabbbaaaac"
 *   Output: "2a3b4a1c"
 *
 * Guaranteed constraints:
 *   1 ≤ inputString.length ≤ 1000
 *   inputString consists of lowercase English letters only
 */
function solution1(inputString) {
  let result = "";
  let count = 1;

  for (let i = 1; i <= inputString.length; i++) {
    if (inputString[i] === inputString[i - 1]) {
      count++;
    } else {
      result += count + inputString[i - 1];
      count = 1;
    }
  }

  return result;
}

console.log("Q1:", solution1("aabbbaaaac")); // "2a3b4a1c"

// =============================================================================
// Q2. Stack with Min Operation
// =============================================================================
/**
 * Implement a modified stack that supports push, pop, and a special min operation.
 *
 * Operations (given as an array of strings):
 *   "push x" — add integer x to the top of the stack
 *   "pop"    — remove the top element (never called on empty stack)
 *   "min"    — return the current minimum in the stack (never called on empty stack)
 *
 * Return an array of integers: the result of every "min" call, in order.
 *
 * Constraint: O(operations.length) total time — each op must be O(1).
 *
 * Example:
 *   Input:  ["push 10", "min", "push 5", "min", "push 8", "min", "pop", "min", "pop", "min"]
 *   Output: [10, 5, 5, 5, 10]
 *
 *   Step-by-step:
 *     push 10  → stack [10]       min → 10
 *     push 5   → stack [10, 5]    min → 5
 *     push 8   → stack [10, 5, 8] min → 5
 *     pop      → stack [10, 5]    min → 5
 *     pop      → stack [10]       min → 10
 *
 * Guaranteed constraints:
 *   1 ≤ operations.length ≤ 10^5
 *   All pushed numbers are positive and ≤ 10^9
 *
 * Approach — Auxiliary Min Stack:
 *   Keep a second stack (minStack) where minStack[i] = minimum among the first i+1 elements.
 *   On push: push value onto stack; push min(value, currentMin) onto minStack.
 *   On pop:  pop both stacks.
 *   On min:  peek top of minStack (O(1)).
 *   Time: O(n)  |  Space: O(n)
 */
function solution2(operations) {
  const stack = [];
  const minStack = [];
  const result = [];

  for (const op of operations) {
    if (op.startsWith("push")) {
      const x = Number(op.split(" ")[1]);
      stack.push(x);
      const currentMin =
        minStack.length === 0 ? x : Math.min(x, minStack[minStack.length - 1]);
      minStack.push(currentMin);
    } else if (op === "pop") {
      stack.pop();
      minStack.pop();
    } else if (op === "min") {
      result.push(minStack[minStack.length - 1]);
    }
  }

  return result;
}

console.log(
  "Q2:",
  solution2([
    "push 10",
    "min",
    "push 5",
    "min",
    "push 8",
    "min",
    "pop",
    "min",
    "pop",
    "min",
  ])
); // [10, 5, 5, 5, 10]

// =============================================================================
// Q3. Even Digits Sum − Odd Digits Sum
// =============================================================================
/**
 * Given an integer n, return (sum of even digits) − (sum of odd digits).
 *
 * Examples:
 *   Input:  n = 412
 *   Output: 5
 *     Even digits: 4, 2 → sum = 6
 *     Odd digits:  1    → sum = 1
 *     Difference:  6 − 1 = 5
 *
 *   Input:  n = 1203
 *   Output: -2
 *     Even digits: 2, 0 → sum = 2
 *     Odd digits:  1, 3 → sum = 4
 *     Difference:  2 − 4 = -2
 *
 * Guaranteed constraints:
 *   23 ≤ n ≤ 10^7
 *
 * Approach — Digit extraction:
 *   Repeatedly take n % 10 to get the last digit, add to even or odd sum,
 *   then n = Math.floor(n / 10). Return evenSum − oddSum.
 *   Time: O(log n)  |  Space: O(1)
 */
function solution3(n) {
  let evenSum = 0;
  let oddSum = 0;

  while (n > 0) {
    const digit = n % 10;
    if (digit % 2 === 0) {
      evenSum += digit;
    } else {
      oddSum += digit;
    }
    n = Math.floor(n / 10);
  }

  return evenSum - oddSum;
}

console.log("Q3:", solution3(412)); // 5
console.log("Q3:", solution3(1203)); // -2

