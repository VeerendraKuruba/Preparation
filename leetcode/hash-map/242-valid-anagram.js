/**
 * 242. Valid Anagram
 *
 * Given two strings s and t, return true if t is an anagram of s, and false otherwise.
 *
 * @param {string} s
 * @param {string} t
 * @return {boolean}
 */

// Sort both strings and compare; O(n log n) time, O(n) space for the sorted copies.
var isAnagram = function (s, t) {
  if (s.length !== t.length) return false;
  return [...s].sort().join("") === [...t].sort().join("");
};

// 26 letter counts (assumes lowercase English letters); O(n) time, O(1) space.
var isAnagramManual = function (s, t) {
  if (s.length !== t.length) return false;
  var count = new Array(26).fill(0);
  var i;
  for (i = 0; i < s.length; i++) {
    count[s.charCodeAt(i) - 97]++;
    count[t.charCodeAt(i) - 97]--;
  }
  for (i = 0; i < 26; i++) {
    if (count[i] !== 0) return false;
  }
  return true;
};

// Character count (object): one pass — +1 for s[i], -1 for t[i]; all frequencies must be 0.
// O(n) time, O(k) space. Works for any characters that are valid object keys.
var isAnagramCharCount = function (s, t) {
  if (s.length !== t.length) return false;
  var count = {};
  for (var i = 0; i < s.length; i++) {
    var sc = s[i], tc = t[i];
    count[sc] = (count[sc] || 0) + 1;
    count[tc] = (count[tc] || 0) - 1;
  }
  for (var k in count) {
    if (count[k] !== 0) return false;
  }
  return true;
};

// Map: +1 for s[i], -1 for t[i]; O(n) time, O(k) space.
var isAnagramMap = function (s, t) {
  if (s.length !== t.length) return false;
  var count = new Map();
  for (var i = 0; i < s.length; i++) {
    var a = s[i], b = t[i];
    count.set(a, (count.get(a) || 0) + 1);
    count.set(b, (count.get(b) || 0) - 1);
  }
  for (var v of count.values()) {
    if (v !== 0) return false;
  }
  return true;
};
