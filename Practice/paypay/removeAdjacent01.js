/**
 * PayPay Japan SSE Frontend Interview
 *
 * Only adjacent "01" or "10" can be removed (repeatedly).
 * '*' never cancels — it stays and blocks neighbors from meeting.
 *
 * Return the length after all possible removals.
 *
 * Examples:
 *   "1010"    → 0
 *   "0101"    → 0
 *   "000111"  → 0  (middle 01 keeps collapsing)
 *   "000"     → 3
 *   "0*1"     → 3  (* blocks; 0 and 1 are not adjacent)
 *   "*1010"   → 1  (binary part cancels; '*' remains)
 *   "0101*10" → 1
 *   "***"     → 3
 */

function remainingLength(str) {
  const stack = [];

  for (const ch of str) {
    const top = stack[stack.length - 1];

    // ONLY adjacent 0&1 or 1&0 remove — never involving '*'
    if (
      stack.length > 0 &&
      ((top === "0" && ch === "1") || (top === "1" && ch === "0"))
    ) {
      stack.pop();
    } else {
      stack.push(ch);
    }
  }

  return stack.length;
}

// Tests
console.log("1010 →", remainingLength("1010")); // 0
console.log("0101 →", remainingLength("0101")); // 0
console.log("000111 →", remainingLength("000111")); // 0
console.log("000 →", remainingLength("000")); // 3
console.log("010 →", remainingLength("010")); // 1

console.log("0*1 →", remainingLength("0*1")); // 3
console.log("*1010 →", remainingLength("*1010")); // 1
console.log("0101*10 →", remainingLength("0101*10")); // 1
console.log("*** →", remainingLength("***")); // 3
console.log("000* →", remainingLength("000*")); // 4

module.exports = { remainingLength };
