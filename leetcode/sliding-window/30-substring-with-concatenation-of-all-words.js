/**
 * 30. Substring with Concatenation of All Words
 * Find all start indices where a substring is a concatenation of every word
 * in `words` exactly once (any order). One loop: at each start, count words
 * in the window and compare to target. O(n * numWords), O(numWords).
 *
 */

/**
 * @param {string} s
 * @param {string[]} words
 * @return {number[]}
 */
var findSubstring = function (s, words) {
  if (!s?.length || !words?.length) return [];
  // no string or no words → no valid substring

  const wordLen = words[0].length;
  // all words have the same length
  const numWords = words.length;
  const totalLen = wordLen * numWords;
  if (s.length < totalLen) return [];
  // string too short to fit all words once

  const target = {};
  for (const w of words) target[w] = (target[w] || 0) + 1;
  // target freq: how many times each word must appear

  const result = [];
  for (let start = 0; start <= s.length - totalLen; start++) {
    // try each start where a full window [start, start+totalLen) fits
    const count = {};
    for (let i = 0; i < numWords; i++) {
      const w = s.slice(start + i * wordLen, start + (i + 1) * wordLen);
      // i-th word in window: chunk of length wordLen
      // e.g. s="barfoothefoobarman", wordLen=3, start=0 → i=0: "bar", i=1: "foo"
      //      start=9 → i=0: "foo", i=1: "bar" (window "foobar")
      count[w] = (count[w] || 0) + 1;
      // tally this word in the current window
    }
    let match = Object.keys(count).length === Object.keys(target).length;
    // same # of distinct words (no extra word in window, e.g. "the")
    for (const w in target) {
      if (count[w] !== target[w]) {
        match = false;
        break;
      }
    }
    // every target word has same count in window → permutation of words
    if (match) result.push(start);
  }
  return result;
};

/*
 * EXPLANATION (e.g. s = "barfoothefoobarman", words = ["foo","bar"])
 * ------------------------------------------------------------------
 *
 * 1. Early exits
 *    If s or words is empty, or s is shorter than the total length of all words
 *    (wordLen * numWords), there is no valid substring → return [].
 *
 * 2. Setup
 *    wordLen = length of each word (e.g. 3).
 *    totalLen = wordLen * numWords = length of one full concatenation (e.g. 6).
 *    A valid substring is exactly totalLen chars and uses each word exactly once.
 *
 * 3. Target map
 *    target[w] = how many times word w must appear (e.g. { foo: 1, bar: 1 }).
 *    We will compare the word counts in each window to this map.
 *
 * 4. Try every start index
 *    For each start from 0 to (s.length - totalLen), we look at the window
 *    s[start .. start+totalLen]. We split it into numWords chunks of length
 *    wordLen and count how many times each chunk appears in that window.
 *
 * 5. Check if window matches
 *    The window is valid only if:
 *    - It has the same number of distinct words as target (no extra word like "the").
 *    - For every word in target, its count in the window equals target[w].
 *    If both hold, the window is a concatenation of some permutation of words →
 *    push start into result.
 *
 * 6. Return
 *    result holds all start indices (e.g. [0, 9]: "barfoo" at 0, "foobar" at 9).
 */
