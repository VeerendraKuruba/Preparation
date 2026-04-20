/**
 * 151. Reverse Words in a String
 *
 * Reverse the order of words. Words are non-space sequences; input may have
 * leading/trailing spaces or multiple spaces between words. Output uses a
 * single space between words only.
 *
 * @param {string} s
 * @return {string}
 */

// Split on runs of whitespace, reverse, rejoin. O(n) time, O(n) space for the word array.
var reverseWords = function (s) {
  return s.trim().split(/\s+/).reverse().join(" ");
};

// Example: reverseWords("the sky is blue") → "blue is sky the"
