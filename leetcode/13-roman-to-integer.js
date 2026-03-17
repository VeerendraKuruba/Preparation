/**
 * 13. Roman to Integer
 * Convert a Roman numeral string to an integer.
 * Scan left to right: if current symbol value < next symbol value, subtract; else add. O(n), O(1).
 *
 * Example: "MCMXCIV" → 1994 (M=1000, CM=900, XC=90, IV=4)
 *
 * LINE-BY-LINE (example: s = "MCMXCIV")
 * -------------------------------------------------------
 * map: I→1, V→5, X→10, L→50, C→100, D→500, M→1000
 *   Lookup table for each symbol’s value.
 *
 * sum = 0, i from 0 to s.length - 1
 *   Accumulate the integer value. We process each character.
 *
 * val = map[s[i]], nextVal = map[s[i+1]] (or 0 if no next)
 *   Current symbol’s value and the next symbol’s value (for subtraction check).
 *
 * if (val < nextVal) sum -= val  else  sum += val
 *   Subtraction case: e.g. "C" before "M" → 100 < 1000, so we subtract 100 (CM = 900).
 *   Normal case: e.g. "M" then "C" → 1000 >= 100, so we add 1000.
 *
 * WALKTHROUGH: s = "MCMXCIV"
 * --------------------------------------------
 * i=0  'M'  val=1000  next=100  1000>=100  sum=1000
 * i=1  'C'  val=100   next=1000 100<1000   sum=1000-100=900
 * i=2  'M'  val=1000  next=10   1000>=10   sum=900+1000=1900
 * i=3  'X'  val=10    next=100  10<100     sum=1900-10=1890
 * i=4  'C'  val=100   next=1    100>=1     sum=1890+100=1990
 * i=5  'I'  val=1     next=5    1<5        sum=1990-1=1989  → wait, IV=4 so we want 1990+4=1994
 * Actually: i=5 'I' val=1 next=5 → subtract: sum=1990-1=1989. Then i=6 'V' val=5 next=undefined → sum=1989+5=1994. So we get 1994. Correct.
 */

/**
 * @param {string} s
 * @return {number}
 */
var romanToInt = function (s) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    const val = map[s[i]];
    const nextVal = map[s[i + 1]] ?? 0;
    if (val < nextVal) sum -= val;
    else sum += val;
  }
  return sum;
};
