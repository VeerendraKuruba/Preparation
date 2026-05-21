/**
 * 242. Valid Anagram
 * 
 * Given two strings s and t, return true if t is an anagram of s, and false otherwise.
 * 
 * An anagram is a word or phrase formed by rearranging the letters of a different word or phrase,
 * typically using all the original letters exactly once.
 * 
 * Example 1:
 * Input: s = "anagram", t = "nagaram"
 * Output: true
 * 
 * Example 2:
 * Input: s = "rat", t = "car"
 * Output: false
 * 
 * Constraints:
 * - 1 <= s.length, t.length <= 5 * 10^4
 * - s and t consist of lowercase English letters
 */

/**
 * Approach 1: Frequency Counter (Hash Map)
 * Time Complexity: O(n) where n is the length of the strings
 * Space Complexity: O(1) - at most 26 characters for lowercase English letters
 * 
 * @param {string} s
 * @param {string} t
 * @return {boolean}
 */
var isAnagram1 = function(s, t) {
    // If lengths are different, they can't be anagrams
    if (s.length !== t.length) {
        return false;
    }
    
    // Create a frequency map for characters
    const charCount = {};
    
    // Count characters in string s
    for (let char of s) {
        charCount[char] = (charCount[char] || 0) + 1;
    }
    
    // Decrement count for characters in string t
    for (let char of t) {
        if (!charCount[char]) {
            return false; // Character not in s or count already 0
        }
        charCount[char]--;
    }
    
    // All counts should be 0
    return true;
};

/**
 * Approach 2: Sorting
 * Time Complexity: O(n log n) due to sorting
 * Space Complexity: O(n) for the sorted strings
 * 
 * @param {string} s
 * @param {string} t
 * @return {boolean}
 */
var isAnagram2 = function(s, t) {
    // If lengths are different, they can't be anagrams
    if (s.length !== t.length) {
        return false;
    }
    
    // Sort both strings and compare
    const sortedS = s.split('').sort().join('');
    const sortedT = t.split('').sort().join('');
    
    return sortedS === sortedT;
};



