/**
 * 2390. Removing Stars From a String
 * Remove each star and the closest non-star character to its left.
 *
 * Approach: Stack
 * - For each char: if not '*', push; if '*', pop (removes closest non-star to left; star is not pushed).
 * - Result is stack joined.
 *
 * Example: "leet**cod*e"
 *   l,e,e push; * pop e → stack [l,e,e]; * pop e → [l,e]; c,o,d push; * pop d → [l,e,c,o]; e push → [l,e,c,o,e]
 *   Result: "lecoe"
 *
 * Time: O(n), Space: O(n)
 *
 * @param {string} s
 * @return {string}
 */
var removeStars = function (s) {
  const stack = [];
  for (const c of s) {
    if (c === '*') stack.pop();
    else stack.push(c);
  }
  return stack.join('');
};
