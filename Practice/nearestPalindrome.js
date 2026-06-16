/**
 * 564. Find the Closest Palindrome
 *
 * Example: "123" → "121"   |   "1" → "0"   |   "11" → "9"
 */

function isPalindrome(s) {
    return s === s.split("").reverse().join("");
}

function nearestPalindromic(n) {
    let num = Number(n);
    let lo = num - 1;
    let hi = num + 1;

    while (!isPalindrome(String(lo))) lo--;
    while (!isPalindrome(String(hi))) hi++;

    const loDiff = num - lo;
    const hiDiff = hi - num;

    if (loDiff < hiDiff) return String(lo);
    if (hiDiff < loDiff) return String(hi);
    return String(Math.min(lo, hi));
}

// --- Tests ---
console.log(nearestPalindromic("123")); // "121"
console.log(nearestPalindromic("1")); // "0"
console.log(nearestPalindromic("11")); // "9"
console.log(nearestPalindromic("10")); // "9"
console.log(nearestPalindromic("88")); // "77"
console.log(nearestPalindromic("100")); // "99"

module.exports = { nearestPalindromic };
