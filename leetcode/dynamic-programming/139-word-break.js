// 139. Word Break
// https://leetcode.com/problems/word-break/
//
// Can we split s into dictionary words?
// Example: "leetcode" + ["leet","code"] → true ("leet" + "code")
//
// Idea: canForm[i] = can the first i characters of s be split into valid words?
//   canForm[0] = true  (empty string is ok)
//   Unset indices are undefined (falsy) — same as false for our checks.
//   Final answer lives at canForm[s.length] (needs index 0..s.length).

function wordBreak(s, wordDict) {
  const words = new Set(wordDict);
  const canForm = [];
  canForm[0] = true;

  for (let end = 1; end <= s.length; end++) {
    for (let start = 0; start < end; start++) {
      const word = s.slice(start, end);

      if (canForm[start] && words.has(word)) {
        canForm[end] = true;
        break; // found one valid split, no need to check more
      }
    }
  }

  return !!canForm[s.length];
}

// --- tests ---
console.log(wordBreak("leetcode", ["leet", "code"]));       // true
console.log(wordBreak("applepenapple", ["apple", "pen"]));  // true
console.log(wordBreak("catsandog", ["cats", "dog", "sand", "cat", "an"])); // false
