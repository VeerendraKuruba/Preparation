/**
 * 345. Reverse Vowels of a String
 *
 * @param {string} s
 * @return {string}
 */
function isVowel(c) {
  return "aeiouAEIOU".includes(c);
}

var reverseVowels = function (s) {
  // 1) Remember every vowel, left to right
  const vowelsFound = [];
  for (let i = 0; i < s.length; i++) {
    if (isVowel(s[i])) vowelsFound.push(s[i]);
  }

  // 2) Walk the string again; each vowel slot takes the next vowel from the end (reversed order)
  let result = "";
  for (let i = 0; i < s.length; i++) {
    if (isVowel(s[i])) result += vowelsFound.pop();
    else result += s[i];
  }

  return result;
};

// Two-pointer: swap vowels from both ends inward. Same O(n) time; one char array, no vowel stack.
// On LeetCode, submit this body as `reverseVowels` if you prefer this style.
var reverseVowelsTwoPointer = function (s) {
  const chars = s.split("");
  let left = 0;
  let right = chars.length - 1;

  while (left < right) {
    while (left < right && !isVowel(chars[left])) left++;
    while (left < right && !isVowel(chars[right])) right--;
    if (left < right) {
      const tmp = chars[left];
      chars[left] = chars[right];
      chars[right] = tmp;
      left++;
      right--;
    }
  }

  return chars.join("");
};
