/**
 * 125. Valid Palindrome
 *
 * A phrase is a palindrome if, after converting all uppercase letters into
 * lowercase and removing all non-alphanumeric characters, it reads the same
 * forward and backward. Alphanumeric = letters and numbers.
 *
 * @param {string} s
 * @return {boolean}
 */
// Simplest: clean, then compare with reverse
var isPalindrome = function (s) {
  const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return Boolean(cleaned === cleaned.split('').reverse().join(''));
};

// ─── Alternative: in-place two pointers (no extra string) ───────────────────
// Skip non-alphanumeric and compare; O(n) time, O(1) space.

var isPalindromeInPlace = function (s) {
  const isAlphanumeric = (c) =>
    (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9');

  let left = 0;
  let right = s.length - 1;

  while (left < right) {
    const l = s[left].toLowerCase();
    const r = s[right].toLowerCase();

    if (!isAlphanumeric(l)) {
      left++;
      continue;
    }
    if (!isAlphanumeric(r)) {
      right--;
      continue;
    }
    if (l !== r) return false;
    left++;
    right--;
  }
  return true;
};
