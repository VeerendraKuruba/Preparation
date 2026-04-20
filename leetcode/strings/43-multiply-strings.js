/**
 * 43. Multiply Strings
 *
 * Idea: simulate grade-school multiplication digit by digit.
 * For digits at index i (num1) and j (num2), their product lands at
 * position i+j+1 in the result array, carry goes to i+j.
 * Result array is at most m+n digits long.
 *
 *   1 2 3
 * ×  4 5 6
 * ─────────
 *     7 3 8   ← 123 × 6  (shift 0)
 *   6 1 5     ← 123 × 5  (shift 1)
 * 4 9 2       ← 123 × 4  (shift 2)
 * ─────────
 * 5 6 0 8 8
 */
var multiply = function (num1, num2) {
  const pos = new Array(num1.length + num2.length).fill(0);

  for (let i = num1.length - 1; i >= 0; i--) {
    for (let j = num2.length - 1; j >= 0; j--) {
      const sum = num1[i] * num2[j] + pos[i + j + 1];
      pos[i + j + 1] = sum % 10;
      pos[i + j] += Math.floor(sum / 10);
    }
  }

  return pos.join("").replace(/^0+/, "") || "0";
};

// Tests
console.log(multiply("2", "3"));       // "6"
console.log(multiply("123", "456"));   // "56088"
console.log(multiply("0", "0"));       // "0"
console.log(multiply("99", "99"));     // "9801"
