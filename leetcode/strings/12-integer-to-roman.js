/**
 * 12. Integer to Roman
 * Convert an integer (1–3999) to a Roman numeral string.
 * Greedy: use a table of value→symbol (largest first), subtract largest fitting value and append. O(1), O(1).
 *
 * Example: 1994 → "MCMXCIV"
 *
 * LINE-BY-LINE (example: num = 1994)
 * -------------------------------------------------------
 * values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
 * symbols = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"]
 *   Pairs ordered by value descending. Includes subtractive forms (4, 9, 40, 90, 400, 900).
 *
 * For each (value, symbol) in order:
 *   count = num / value (integer division)
 *   Append symbol repeated count times.
 *   num -= count * value
 *   Greedily use the largest possible value at each step.
 *
 * WALKTHROUGH: num = 1994
 * --------------------------------------------
 * 1000 "M"   count=1  append "M"   num=994
 * 900  "CM"  count=1  append "CM"  num=94
 * 500,400    count=0  skip
 * 100 "C"    count=0  skip
 * 90  "XC"   count=1  append "XC"  num=4
 * 50,40,10,9,5  count=0  skip
 * 4   "IV"   count=1  append "IV"  num=0
 * Result: "MCMXCIV"
 */

/**
 * @param {number} num
 * @return {string}
 */
var intToRoman = function (num) {
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const symbols = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let out = "";
  for (let i = 0; i < values.length; i++) {
    const count = Math.floor(num / values[i]);
    if (count > 0) {
      out += symbols[i].repeat(count);
      num -= count * values[i];
    }
  }
  return out;
};
