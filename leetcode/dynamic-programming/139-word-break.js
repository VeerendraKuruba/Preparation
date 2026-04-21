// 139. Word Break
// https://leetcode.com/problems/word-break/
//
// Given a string s and a dictionary of words, return true if s can be
// segmented into a space-separated sequence of one or more dictionary words.
//
// Example: s = "leetcode", wordDict = ["leet","code"] → true

// Time: O(n²)  Space: O(n)
function wordBreak(s, wordDict) {
  const wordSet = new Set(wordDict);
  const dp = new Array(s.length + 1).fill(false);
  dp[0] = true; // empty prefix is always valid

  for (let i = 1; i <= s.length; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && wordSet.has(s.slice(j, i))) {
        dp[i] = true;
        break;
      }
    }
  }

  return dp[s.length];
}

// --- tests ---
console.log(wordBreak("leetcode", ["leet", "code"]));       // true
console.log(wordBreak("applepenapple", ["apple", "pen"]));  // true
console.log(wordBreak("catsandog", ["cats", "dog", "sand", "cat", "an"])); // false
