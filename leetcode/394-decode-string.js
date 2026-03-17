/**
 * 394. Decode String
 *
 * Goal: Expand "3[a]2[bc]" → "aaabcbc". Nested brackets like "3[a2[c]]" → "accaccacc".
 *
 * Easy mental model:
 *   - We're building one "current" decoded string as we go.
 *   - When we hit "k[", we save: "how many times to repeat" and "what we had before".
 *   - When we hit "]", we repeat the part we just decoded and glue it back to "what we had before".
 *
 * So we need two stacks:
 *   - repeatCounts: the k in "k[ ... ]"
 *   - prefixes: the string we had before this bracket (to glue back after repeating)
 *
 * For each character:
 *   - digit     → keep reading the number (e.g. "10" for 10[)
 *   - '['       → save repeat count and current string; start fresh inside brackets
 *   - ']'       → repeat current string and prepend the saved prefix
 *   - letter    → add to current string
 *
 * --- Example: s = "3[a2[c]]" → "accaccacc" ---
 *
 *   ch   | action           | repeatCounts | prefixes | decoded   | num
 *   -----|------------------|--------------|----------|-----------|-----
 *   '3'  | digit            | []           | []       | ''        | '3'
 *   '['  | push, reset      | [3]          | ['']     | ''        | ''
 *   'a'  | letter           | [3]          | ['']     | 'a'       | ''
 *   '2'  | digit            | [3]          | ['']     | 'a'       | '2'
 *   '['  | push, reset      | [3, 2]       | ['', 'a']| ''        | ''
 *   'c'  | letter           | [3, 2]       | ['', 'a']| 'c'       | ''
 *   ']'  | pop 2, 'a'; repeat 'c' 2× → 'cc'; decoded = 'a'+'cc' = 'acc'
 *        |                  | [3]          | ['']     | 'acc'     | ''
 *   ']'  | pop 3, ''; repeat 'acc' 3× → 'accaccacc'; decoded = ''+'accaccacc'
 *        |                  | []          | []       | 'accaccacc'| ''
 *
 *   Return "accaccacc".
 *
 * --- Simpler example: "3[a]2[bc]" ---
 *   After "3[" we have repeatCounts=[3], prefixes=[''], decoded=''.
 *   We read 'a' → decoded='a'. On ']' we do prefix + decoded×3 = '' + 'aaa' = 'aaa'.
 *   Then "2[" → repeatCounts=[2], prefixes=['aaa'], decoded=''. Read "bc" → decoded='bc'.
 *   On ']' → 'aaa' + 'bc'.repeat(2) = 'aaa' + 'bcbc' = 'aaabcbc'.
 *
 * Time: O(n + M)
 *   n = input length (we read each char once).
 *   M = decoded output length. The expensive work is decoded.repeat(times) and
 *   concatenation; in total we build a string of length M, so cost is O(M).
 *   Problem bounds M ≤ 10^5.
 * Space: O(n) for the two stacks (counts + prefixes); decoded string can be O(M).
 *
 * @param {string} s
 * @return {string}
 */
function decodeString(s) {
  const repeatCounts = [];  // k for each "k[ ... ]"
  const prefixes = [];      // string we had before each "["
  let decoded = '';         // what we're building inside the current brackets
  let num = '';             // digits of the next k (e.g. "10")

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (ch >= '0' && ch <= '9') {
      num += ch;
    } else if (ch === '[') {
      repeatCounts.push(Number(num));
      prefixes.push(decoded);
      num = '';
      decoded = '';
    } else if (ch === ']') {
      const times = repeatCounts.pop();
      const prefix = prefixes.pop();
      decoded = prefix + decoded.repeat(times);
    } else {
      decoded += ch;
    }
  }

  return decoded;
}

// Examples
console.log(decodeString('3[a]2[bc]'));     // "aaabcbc"
console.log(decodeString('3[a2[c]]'));      // "accaccacc"
console.log(decodeString('2[abc]3[cd]ef')); // "abcabccdcdcdef"
