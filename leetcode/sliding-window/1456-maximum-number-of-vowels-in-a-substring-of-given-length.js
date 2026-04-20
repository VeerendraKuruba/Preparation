/**
 * 1456. Maximum Number of Vowels in a Substring of Given Length
 * Sliding window of length k. Two phases: (1) count vowels in first window,
 * (2) slide — add right char, drop left char, track max. O(n) time, O(1) space.
 *
 * Example: s = "abciiidef", k = 3
 * Index:    0 1 2 3 4 5 6 7 8
 * String:   a b c i i i d e f
 *
 * Phase 1 — First window [0..2] = "abc"
 *   i=0: 'a' vowel → count=1
 *   i=1: 'b' no
 *   i=2: 'c' no
 *   count=1, max=1
 *
 * Phase 2 — Slide (window = s[i-k..i-1], we add s[i], drop s[i-k])
 *   i=3: add s[3]='i' (vowel) → count=2; drop s[0]='a' (vowel) → count=1. Window "bci", max=1
 *   i=4: add s[4]='i' (vowel) → count=2; drop s[1]='b' (no) → count=2. Window "cii", max=2
 *   i=5: add s[5]='i' (vowel) → count=3; drop s[2]='c' (no) → count=3. Window "iii", max=3
 *   i=6: add s[6]='d' (no) → count=3; drop s[3]='i' (vowel) → count=2. Window "iid", max=3
 *   i=7: add s[7]='e' (vowel) → count=3; drop s[4]='i' (vowel) → count=2. Window "ide", max=3
 *   i=8: add s[8]='f' (no) → count=2; drop s[5]='i' (vowel) → count=1. Window "def", max=3
 *
 * Return max = 3 (substring "iii").
 *
 * @param {string} s
 * @param {number} k
 * @return {number}
 */
var maxVowels = function (s, k) {
  const vowels = new Set("aeiou");

  let count = 0;
  for (let i = 0; i < k; i++) if (vowels.has(s[i])) count++;
  let max = count;

  for (let i = k; i < s.length; i++) {
    if (vowels.has(s[i])) count++;
    if (vowels.has(s[i - k])) count--;
    max = Math.max(max, count);
  }
  return max;
};

// --- tests ---

function test(name, s, k, expected) {
  const got = maxVowels(s, k);
  const ok = got === expected;
  console.log(ok ? "✓" : "✗", name, ok ? "" : `got ${got}, expected ${expected}`);
}

test("Example 1", "abciiidef", 3, 3);
test("Example 2", "aeiou", 2, 2);
test("Example 3", "leetcode", 3, 2);
