/**
 * Count of substrings in a string
 *
 * 1. Total number of possible (contiguous) substrings
 *    For string of length n: n*(n+1)/2 non-empty substrings
 *
 * 2. Count occurrences of a specific substring within a string
 */

/**
 * Total count of all possible non-empty contiguous substrings
 * @param {string} s - Input string
 * @returns {number} - Count of substrings
 */
function totalSubstringCount(s) {
  if (!s || s.length === 0) return 0;
  const n = s.length;
  return (n * (n + 1)) / 2;
}

/**
 * Count how many times substring `sub` appears in string `s` using includes()
 * (overlapping occurrences are all counted)
 * At each starting index i, check if the rest of the string from i contains sub.
 * @param {string} s - Full string
 * @param {string} sub - Substring to count
 * @returns {number}
 */
function countSubstringOccurrences(s, sub) {
  if (!s || !sub || sub.length === 0) return 0;
  let count = 0;
  for (let i = 0; i < s.length; i++) {
    if (s.slice(i).includes(sub)) count++;
  }
  return count;
}

// --- Better alternatives ---

/**
 * Overlapping count – indexOf loop (faster, no slice per index)
 * Single pass, O(n) extra space, better constant factors than includes+slice.
 */
function countOverlapping(s, sub) {
  if (!s || !sub || sub.length === 0) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = s.indexOf(sub, pos)) !== -1) {
    count++;
    pos += 1;
  }
  return count;
}

/**
 * Non-overlapping count – split (one-liner, very readable)
 * s.split(sub) gives (count + 1) parts, so count = parts.length - 1.
 */
function countNonOverlapping(s, sub) {
  if (!s || !sub || sub.length === 0) return 0;
  return s.split(sub).length - 1;
}

/**
 * Overlapping count – regex lookahead (?=sub) matches every start position
 * Escape sub so special regex chars don't break it.
 */
function countOverlappingRegex(s, sub) {
  if (!s || !sub || sub.length === 0) return 0;
  const escaped = sub.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?=${escaped})`, "g");
  return (s.match(re) || []).length;
}

/**
 * Count occurrences without overlapping, using includes() in the loop condition
 * e.g. "aaa" and "aa" → 1 (not 2)
 */
function countSubstringOccurrencesNonOverlapping(s, sub) {
  if (!s || !sub || sub.length === 0) return 0;
  let count = 0;
  let pos = 0;
  while (pos <= s.length - sub.length && s.slice(pos).includes(sub)) {
    count++;
    pos = s.indexOf(sub, pos) + sub.length; // jump past this occurrence
  }
  return count;
}

// --- Tests ---
const str = "abcab";
console.log("String:", str);
console.log("Total substring count (all possible):", totalSubstringCount(str)); // 15

console.log("\n--- Overlapping ---");
console.log("'ab' in 'abcab' (includes):", countSubstringOccurrences("abcab", "ab")); // 2
console.log("'ab' in 'abcab' (indexOf):", countOverlapping("abcab", "ab")); // 2
console.log("'aa' in 'aaa' (regex lookahead):", countOverlappingRegex("aaa", "aa")); // 2

console.log("\n--- Non-overlapping ---");
console.log("'aa' in 'aaa' (split):", countNonOverlapping("aaa", "aa")); // 1
console.log("'aa' in 'aaa' (includes+indexOf):", countSubstringOccurrencesNonOverlapping("aaa", "aa")); // 1
