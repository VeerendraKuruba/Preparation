/**
 * 5. Longest Palindromic Substring
 * Time: O(n²) | Space: O(1)
 */

var longestPalindrome = function(s) {
    let result = "";

    for (let i = 0; i < s.length; i++) {
        // odd length: "aba" — center is s[i]
        let odd = expandFrom(s, i, i);
        // even length: "abba" — center is between s[i] and s[i+1]
        let even = expandFrom(s, i, i + 1);

        if (odd.length > result.length) result = odd;
        if (even.length > result.length) result = even;
    }

    return result;
};

function expandFrom(s, left, right) {
    while (left >= 0 && right < s.length && s[left] === s[right]) {
        left--;
        right++;
    }
    // left and right overshot by 1, so slice back
    return s.slice(left + 1, right);
}

// Examples
console.log(longestPalindrome("babad")); // "bab"
console.log(longestPalindrome("cbbd"));  // "bb"
