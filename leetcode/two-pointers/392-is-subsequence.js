/**
 * 392. Is Subsequence
 *
 * Given two strings s and t, return true if s is a subsequence of t, or false otherwise.
 * A subsequence: formed by deleting some (can be none) characters without disturbing
 * the relative positions of the remaining characters.
 *
 * @param {string} s
 * @param {string} t
 * @return {boolean}
 */

// Two pointers: match s left-to-right in t; O(|s| + |t|) time, O(1) space.
var isSubsequence = function (s, t) {
  if (s.length === 0) return true;
  let i = 0; // index in s
  for (let j = 0; j < t.length; j++) {
    if (t[j] === s[i]) {
      i++;
      if (i === s.length) return true;
    }
  }
  return false;
};

// Example
// isSubsequence("abc", "ahbgdc") → true
// isSubsequence("aec", "abcde") → false
