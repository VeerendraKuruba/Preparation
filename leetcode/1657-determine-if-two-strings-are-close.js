/**
 * 1657. Determine if Two Strings Are Close
 *
 * Two strings are "close" if you can turn one into the other using only:
 * 1) Swaps (any order of letters),
 * 2) Pick two different letters x,y and swap every x with y and every y with x.
 *
 * That means we need: same length, exact same set of letters that appear,
 * and the same list of frequencies when sorted (e.g. counts 1,2,3 can be
 * assigned to different letters after operations).
 *
 * Example walkthrough: word1 = "cabbba", word2 = "abbccc"
 * - Length: both 6 ✓
 * - Letter counts word1: a=2, b=3, c=1  →  sorted frequencies [1,2,3]
 * - Letter counts word2: a=1, b=2, c=3  →  sorted frequencies [1,2,3]
 * - Letters used: both use only {a,b,c} ✓  →  return true
 *
 * Counterexample: word1 = "uau", word2 = "ssx"
 * - Same length 3, but letters differ (u,a vs s,x) → return false early.
 *
 * Implementation: Map<char, count> (same idea as length-26 arrays; keys must match,
 * then sort the value lists and compare).
 *
 * @param {string} word1
 * @param {string} word2
 * @return {boolean}
 */
var closeStrings = function (word1, word2) {
  if (word1.length !== word2.length) return false;

  const countChars = (word) => {
    const m = new Map();
    for (const ch of word) {
      m.set(ch, (m.get(ch) || 0) + 1);
    }
    return m;
  };

  const m1 = countChars(word1);
  const m2 = countChars(word2);

  // Same set of distinct letters: same size and every char in m1 exists in m2.
  if (m1.size !== m2.size) return false;
  for (const ch of m1.keys()) {
    if (!m2.has(ch)) return false;
  }

  const sortedValues = (m) => [...m.values()].sort((a, b) => a - b);
  const v1 = sortedValues(m1);
  const v2 = sortedValues(m2);
  for (let i = 0; i < v1.length; i++) {
    if (v1[i] !== v2[i]) return false;
  }

  return true;
};
