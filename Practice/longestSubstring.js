/**
 * 3. Longest Substring Without Repeating Characters
 * 
 * Given a string s, find the length of the longest substring without duplicate characters.
 * 
 * Example 1:
 * Input: s = "abcabcbb"
 * Output: 3
 * Explanation: The answer is "abc", with the length of 3.
 * 
 * Example 2:
 * Input: s = "bbbbb"
 * Output: 1
 * Explanation: The answer is "b", with the length of 1.
 */


/**
 * Approach 2: Sliding Window with HashMap (Optimized)
 * Time Complexity: O(n)
 * Space Complexity: O(min(n, m))
 * 
 * Algorithm:
 * 1. Use a HashMap to store the last seen index of each character
 * 2. When duplicate found, jump left pointer to position after the last occurrence
 * 3. This avoids the inner while loop of Approach 1
 */
function lengthOfLongestSubstringOptimized(s) {
    if (!s || s.length === 0) return 0;
    
    const charIndexMap = new Map();
    let left = 0;
    let maxLength = 0;
    
    for (let right = 0; right < s.length; right++) {
        const char = s[right];
        
        // If character was seen and is within current window
        if (charIndexMap.has(char) && charIndexMap.get(char) >= left) {
            // Move left pointer to position after the last occurrence
            left = charIndexMap.get(char) + 1;
        }
        
        // Update the last seen index of current character
        charIndexMap.set(char, right);
        
        // Update max length
        maxLength = Math.max(maxLength, right - left + 1);
    }
    
    return maxLength;
}

/**
 * Returns the actual longest substring without repeating characters
 * Time Complexity: O(n)
 * Space Complexity: O(min(n, m))
 */
function getLongestSubstringOptimized(s) {
    if (!s || s.length === 0) return "";
    
    const charIndexMap = new Map();
    let left = 0;
    let maxLength = 0;
    let maxStart = 0;  // Track the start index of longest substring
    
    for (let right = 0; right < s.length; right++) {
        const char = s[right];
        
        // If character was seen and is within current window
        if (charIndexMap.has(char) && charIndexMap.get(char) >= left) {
            // Move left pointer to position after the last occurrence
            left = charIndexMap.get(char) + 1;
        }
        
        // Update the last seen index of current character
        charIndexMap.set(char, right);
        
        // Update max length and track the starting position
        const currentLength = right - left + 1;
        if (currentLength > maxLength) {
            maxLength = currentLength;
            maxStart = left;
        }
    }
    
    // Return the actual substring using the tracked start and length
    return s.substring(maxStart, maxStart + maxLength);
}

// Test examples
console.log("\n--- Testing getLongestSubstringOptimized ---");
console.log('Input: "abcabcbb" => Output:', getLongestSubstringOptimized("abcabcbb")); // "abc"
console.log('Input: "bbbbb" => Output:', getLongestSubstringOptimized("bbbbb")); // "b"
console.log('Input: "pwwkew" => Output:', getLongestSubstringOptimized("pwwkew")); // "wke"
console.log('Input: "" => Output:', getLongestSubstringOptimized("")); // ""
console.log('Input: "abcdef" => Output:', getLongestSubstringOptimized("abcdef")); // "abcdef"
