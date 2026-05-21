

/**
 * Helper: expand from a center and count palindromes (odd: left===right, even: right=left+1).
 * @param {string} s
 * @param {number} left
 * @param {number} right
 * @return {number}
 */
function expandAroundCenter(s, left, right) {
    let count = 0;
    while (left >= 0 && right < s.length && s[left] === s[right]) {
        count++;
        left--;
        right++;
    }
    return count;
}

/**
 * Count palindromic substrings — expand around each center.
 * Time O(n²), extra space O(1).
 * @param {string} s - Input string
 * @return {number}
 */
var countSubstrings = function(s) {
    if (!s || s.length === 0) return 0;

    let count = 0;
    for (let i = 0; i < s.length; i++) {
        // Odd-length palindromes (single center), e.g. "aba" at 'b'
        count += expandAroundCenter(s, i, i);
        // Even-length palindromes (center between i and i+1), e.g. "abba"
        count += expandAroundCenter(s, i, i + 1);
    }
    return count;
};

/**
 * Manacher (odd + even radii): O(n) time, O(n) extra space.
 * d1[i] = number of odd-length palindromes centered at i.
 * d2[i] = number of even-length palindromes centered between i-1 and i (CP-Algorithms).
 *
 * @param {string} s
 * @return {number}
 */
function countSubstringsManacher(s) {
    if (!s || s.length === 0) return 0;
    const n = s.length;

    const d1 = new Array(n);
    let l = 0;
    let r = -1;
    for (let i = 0; i < n; i++) {
        let k = i > r ? 1 : Math.min(d1[l + r - i], r - i + 1);
        while (i + k < n && i - k >= 0 && s[i + k] === s[i - k]) k++;
        d1[i] = k--;
        if (i + k > r) {
            l = i - k;
            r = i + k;
        }
    }

    const d2 = new Array(n).fill(0);
    l = 0;
    r = -1;
    for (let i = 0; i < n; i++) {
        let k = i > r ? 0 : Math.min(d2[l + r - i + 1], r - i + 1);
        while (i + k < n && i - k - 1 >= 0 && s[i + k] === s[i - k - 1]) k++;
        d2[i] = k--;
        if (i + k > r) {
            l = i - k - 1;
            r = i + k;
        }
    }

    let total = 0;
    for (let i = 0; i < n; i++) total += d1[i] + d2[i];
    return total;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { countSubstrings, countSubstringsManacher, expandAroundCenter };
}
