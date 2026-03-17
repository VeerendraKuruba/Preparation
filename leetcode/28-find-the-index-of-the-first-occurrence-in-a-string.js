/**
 * 28. Find the Index of the First Occurrence in a String
 * Return index of first occurrence of needle in haystack, or -1.
 * Try each start index i; at each i, compare chars one by one. If any mismatch, try next i.
 */

/**
 * @param {string} haystack
 * @param {string} needle
 * @return {number}
 */
function strStr(haystack, needle) {
  const n = needle.length;
  const h = haystack.length;

  for (let i = 0; i <= h - n; i++) {
    let match = true;
    for (let j = 0; j < n; j++) {
      if (haystack[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

// --- Tests ---
console.log(strStr("sadbutsad", "sad")); // 0
console.log(strStr("leetcode", "leeto")); // -1
console.log(strStr("hello", "ll")); // 2
console.log(strStr("a", "a")); // 0
console.log(strStr("abc", "c")); // 2
