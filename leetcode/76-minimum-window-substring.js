/**
 * 76. Minimum Window Substring
 * Smallest substring of s that contains every character from t (including duplicates).
 * Sliding window: expand right until valid, then shrink left. O(|s| + |t|), O(|s| + |t|).
 *
 * Example: s = "ADOBECODEBANC", t = "ABC" → "BANC"
 *
 * LINE-BY-LINE (example: s = "ADOBECODEBANC", t = "ABC")
 * -------------------------------------------------------
 * need = {}, then for (ch of t) need[ch]++
 *   need = how many of each char we still need in the current window. Starts as freq of t.
 *   Example: need = { A: 1, B: 1, C: 1 }.
 *
 * distinctCount = Object.keys(need).length
 *   Number of distinct characters we must “satisfy” (have at least that many in the window).
 *   Example: distinctCount = 3 (A, B, C).
 *
 * satisfied = 0
 *   Count of distinct chars that currently have enough in the window (window count ≥ need from t).
 *   When satisfied === distinctCount, the window contains all of t.
 *
 * left, bestStart, bestLen
 *   left = start of current window. bestStart / bestLen = start and length of best valid window so far.
 *
 * for (right = 0 .. s.length - 1)
 *   right = end of current window. We expand by moving right and including s[right].
 *
 * ch = s[right]; if (!(ch in need)) continue
 *   Only care about chars that appear in t. Others don’t affect need or satisfied.
 *
 * need[ch]--; if (need[ch] === 0) satisfied++
 *   We’re adding one occurrence of ch to the window, so we need one less. When we’ve got
 *   enough of that char (need hits 0), one more distinct char is satisfied.
 *
 * while (satisfied === distinctCount && left <= right)
 *   Current window [left..right] contains all of t. Try to shrink from the left while it stays valid.
 *
 * len = right - left + 1; if (len < bestLen) update bestStart, bestLen
 *   Current window length. If it’s the smallest valid window so far, remember its start and length.
 *
 * leftCh = s[left]; left++
 *   Remove the leftmost character from the window (shrink by one from the left).
 *
 * if (!(leftCh in need)) continue
 *   If we removed a char not in t, nothing to adjust; go to next shrink step.
 *
 * if (need[leftCh] === 0) satisfied--; need[leftCh]++
 *   We’re removing one occurrence of a required char. If we had exactly enough (need was 0),
 *   we no longer have enough, so satisfied decreases. We then increase need (we need one more again).
 *
 * return bestLen === Infinity ? "" : s.slice(bestStart, bestStart + bestLen)
 *   If we never found a valid window, return "". Otherwise return that minimum window substring.
 *
 * WALKTHROUGH: s = "ADOBECODEBANC", t = "ABC"
 * --------------------------------------------
 * need = { A:1, B:1, C:1 }, distinctCount = 3, satisfied = 0, left = 0.
 *
 * right=0  ch='A'   need['A']=0, satisfied=1   no while
 * right=1  ch='D'   (skip)
 * right=2  ch='O'   (skip)
 * right=3  ch='B'   need['B']=0, satisfied=2   no while
 * right=4  ch='E'   (skip)
 * right=5  ch='C'   need['C']=0, satisfied=3   window "ADOBEC" valid
 *   while: len=6, bestLen=6, bestStart=0. Remove 'A' → need['A']=1, satisfied=2. exit.
 * right=6..8  'O','D','E'  (skip)
 * right=9   ch='B'   need['B']=-1 (extra B), satisfied=2
 * right=10  ch='A'   need['A']=0, satisfied=3   window "DOBECODEBA" valid
 *   while: len=10, no update. Remove 'D','O'. Remove 'B' → need['B'] was -1 (extra B), so need['B']=0, satisfied stays 3.
 *   Remove 'E'. Remove 'C' → need['C'] was 0, satisfied=2. exit. left=6.
 * right=11  ch='N'   (skip)
 * right=12 ch='C'   need['C']=0, satisfied=3   window "ODEBANC" valid
 *   while: len=7, no update. Remove 'O','D','E'. left=9, len=4, bestLen=4, bestStart=9.
 *   Remove 'B' → need['B'] was 0, satisfied=2. exit.
 * return s.slice(9, 13) = "BANC"
 */

/**
 * @param {string} s
 * @param {string} t
 * @return {string}
 */
var minWindow = function (s, t) {
  if (!s?.length || !t?.length || s.length < t.length) return "";

  //WALKTHROUGH: s = "ADOBECODEBANC", t = "ABC"
  // How many of each character we still need in the current window (starts as freq of t)
  const need = {};
  for (const ch of t) need[ch] = (need[ch] || 0) + 1;
  const distinctCount = Object.keys(need).length; // number of distinct chars we must cover

  let satisfied = 0; // how many distinct chars already have enough in the window
  let left = 0;
  let bestStart = 0;
  let bestLen = Infinity;

  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (!(ch in need)) continue;
    need[ch]--;
    if (need[ch] === 0) satisfied++; // we now have enough of this char
    // While window [left..right] contains all of t, try to shrink from the left
    while (satisfied === distinctCount && left <= right) {
      const len = right - left + 1;
      if (len < bestLen) {
        bestLen = len;
        bestStart = left;
      }

      const leftCh = s[left];
      left++;
      if (!(leftCh in need)) continue;

      if (need[leftCh] === 0) satisfied--; // we're removing one we needed
      need[leftCh]++;
    }
  }

  return bestLen === Infinity ? "" : s.slice(bestStart, bestStart + bestLen);
};
