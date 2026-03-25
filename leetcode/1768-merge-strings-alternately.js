/**
 * 1768. Merge Strings Alternately
 *
 * Merge word1 and word2 by alternating letters, starting with word1.
 * Append the remainder of the longer string.
 *
 * @param {string} word1
 * @param {string} word2
 * @return {string}
 */

// Overlap: pair indices 0..min-1; then append tails. O(m+n) time, O(m+n) for result.
var mergeAlternately = function (word1, word2) {
  let out = "";
  const n = Math.min(word1.length, word2.length);
  for (let i = 0; i < n; i++) {
    out += word1[i] + word2[i];
  }
  return out + word1.slice(n) + word2.slice(n);
};

// Examples
// mergeAlternately("abc", "pqr") → "apbqcr"
// mergeAlternately("ab", "pqrs") → "apbqrs"
