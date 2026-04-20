/**
 * 49. Group Anagrams
 *
 * Given an array of strings strs, group the anagrams together.
 * You can return the answer in any order.
 *
 * @param {string[]} strs
 * @return {string[][]}
 */

// Sort each word as key; O(n * k log k) time, O(n * k) space (k = max word length).
var groupAnagrams = function (strs) {
  var map = new Map();
  for (var s of strs) {
    var key = [...s].sort().join("");
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  return [...map.values()];
};

// 26-char frequency array as key; O(n * k) time, O(n * k) space — avoids sorting.
var groupAnagramsFreq = function (strs) {
  var map = new Map();
  for (var s of strs) {
    var count = new Array(26).fill(0);
    for (var i = 0; i < s.length; i++) count[s.charCodeAt(i) - 97]++;
    var key = count.join(",");
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  return [...map.values()];
};
