/**
 * 5. Longest Palindromic Substring
 * 
 * Given a string s, return the longest palindromic substring in s.
 * 
 * Example 1:
 * Input: s = "babad"
 * Output: "bab" (or "aba")
 * 
 * Example 2:
 * Input: s = "cbbd"
 * Output: "bb"
 */

// ============================================================================
// SOLUTION 1: EXPAND AROUND CENTER (RECOMMENDED FOR INTERVIEWS)
// ============================================================================
// Time: O(n²), Space: O(1)
// This is the BEST solution for interviews - simple, elegant, and efficient

/**
 * @param {string} s
 * @return {string}
 */
function longestPalindrome(s) {
    if (!s || s.length < 2) return s;
    
    let start = 0, maxLen = 1;
    
    for (let i = 0; i < s.length; i++) {
        // Odd-length palindrome (center is a single character)
        const len1 = expandAroundCenter(s, i, i);
        // Even-length palindrome (center is between two characters)
        const len2 = expandAroundCenter(s, i, i + 1);
        
        const len = Math.max(len1, len2);
        
        if (len > maxLen) {
            maxLen = len;
            start = i - Math.floor((len - 1) / 2);
        }
    }
    
    return s.substring(start, start + maxLen);
}

function expandAroundCenter(s, left, right) {
    while (left >= 0 && right < s.length && s[left] === s[right]) {
        left--;
        right++;
    }
    return right - left - 1;
}

// ============================================================================
// SOLUTION 2: MANACHER'S ALGORITHM — O(n) TIME, O(n) SPACE
// ============================================================================
//
// HOW IT WORKS (3 ideas):
//
//  1. TRANSFORM: Insert '#' between every char so we only deal with odd-length
//     palindromes. "babad" → "#b#a#b#a#d#". Now every center is one index.
//
//  2. RADIUS: At each index i we store radius[i] = how far the palindrome
//     extends to the right (so full length in original = radius).
//
//  3. REUSE: Keep the "rightmost" palindrome we've seen (center + its right
//     boundary). For each new i inside that range, we don't start from 0 —
//     we copy the radius from the mirror position (i' = 2*center - i), then
//     expand only if needed. That reuse is why total work is O(n).
//

/**
 * Manacher's algorithm — O(n) time, O(n) space
 * @param {string} s
 * @return {string}
 */
function longestPalindromeManacher(s) {
    if (!s || s.length < 2) return s;

    // --- Step 1: Transform so every palindrome has odd length ---
    // "babad" → "#b#a#b#a#d#"  (original chars end up at odd indices)
    const T = '#' + s.split('').join('#') + '#';
    const n = T.length;

    // radiusAt[i] = how many chars the palindrome centered at i extends to each side
    const radiusAt = new Array(n).fill(0);

    // The "rightmost" palindrome we've seen so far (so we can reuse info)
    let centerOfRightmost = 0;
    let rightBoundOfRightmost = 0;

    // Best palindrome we've found (largest radius)
    let bestCenter = 0;
    let bestRadius = 0;

    for (let i = 0; i < n; i++) {
        // Mirror of i with respect to centerOfRightmost (symmetric position inside the current rightmost palindrome)
        const mirror = 2 * centerOfRightmost - i;

        // If i is inside the rightmost palindrome, we can start with the mirror's radius (can't exceed distance to right bound)
        if (i < rightBoundOfRightmost) {
            radiusAt[i] = Math.min(rightBoundOfRightmost - i, radiusAt[mirror]);
        }

        // Expand: step outward while the two sides still match
        while (
            i - 1 - radiusAt[i] >= 0 &&
            i + 1 + radiusAt[i] < n &&
            T[i - 1 - radiusAt[i]] === T[i + 1 + radiusAt[i]]
        ) {
            radiusAt[i]++;
        }

        // If we went past the rightmost boundary, this palindrome is now the rightmost
        if (i + radiusAt[i] > rightBoundOfRightmost) {
            centerOfRightmost = i;
            rightBoundOfRightmost = i + radiusAt[i];
        }

        if (radiusAt[i] > bestRadius) {
            bestRadius = radiusAt[i];
            bestCenter = i;
        }
    }

    // --- Convert back to original string ---
    // In T, original chars are at odd indices (1, 3, 5, ...). So index in original = (indexInT - 1) / 2.
    // Our palindrome in T spans [bestCenter - bestRadius, bestCenter + bestRadius].
    // First original char in that span is at the first odd index in that range.
    const firstOddIndexInSpan = (bestCenter - bestRadius) | 1;  // |1 makes it odd (e.g. 2→3)
    const startInOriginal = (firstOddIndexInSpan - 1) / 2;
    return s.substring(startInOriginal, startInOriginal + bestRadius);
}
