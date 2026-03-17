/**
 * 58. Length of Last Word
 * String of words and spaces. Return length of last word (maximal non-space substring).
 * Two steps with while: skip trailing spaces, then count the last word backwards.
 *
 * LINE-BY-LINE EXPLANATION (example: s = "   moon   ")
 * -------------------------------------------------
 * Index:    0   1   2   3   4   5   6   7   8
 * s[i]:   ' ' ' ' 'm' 'o' 'o' 'n' ' ' ' ' ' '
 *
 * --- Step 1: Skip trailing spaces ---
 *
 * let i = s.length - 1;
 *   → i = 9 - 1 = 8   (i points to last character, index 8)
 *
 * while (i >= 0 && s[i] === " ")
 *   → 8 >= 0? Yes. s[8] === " "? Yes. → enter loop.
 * i--;
 *   → i = 7. Check again: s[7] is ' ' → i = 6. s[6] is ' ' → i = 5.
 *   → s[5] is 'n' (not space) → condition false, exit loop.
 *   → After Step 1: i = 5  (index of last letter 'n' of "moon")
 *
 * --- Step 2: Count the last word ---
 *
 * let count = 0;
 *   → count will hold the length of the last word.
 *
 * while (i >= 0 && s[i] !== " ")
 *   → i=5: 5>=0? Yes. s[5] !== " "? 'n' !== " " → true. Enter loop.
 * count++; i--;
 *   → count=1, i=4. Loop: s[4]='o' → count=2, i=3. s[3]='o' → count=3, i=2.
 *   → s[2]='m' → count=4, i=1. Next check: s[1]=' ' → condition false, exit.
 *   → After Step 2: count = 4
 *
 * return count;
 *   → Return 4  (length of "moon")
 */

/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLastWord(s) {
  // Step 1: Skip trailing spaces (move from end towards start)
  let i = s.length - 1;
  while (i >= 0 && s[i] === " ") {
    i--;
  }

  // Step 2: Count the last word
  let count = 0;
  while (i >= 0 && s[i] !== " ") {
    count++;
    i--;
  }

  return count;
}
