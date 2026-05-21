// ==========================================
// APPROACH 6: Most Concise/Clean Version
// ==========================================
// Time Complexity: O(n)
// Space Complexity: O(n)
// Note: Balance between readability and performance
/**
 * @param {string} s
 * @return {boolean}
 */
function isValidConcise(s) {
    const stack = [];
    const pairs = { '(': ')', '{': '}', '[': ']' };
    
    for (const char of s) {
        if (char in pairs) {
            // Opening bracket
            stack.push(pairs[char]); // Push the expected closing bracket
        } else if (char !== stack.pop()) {
            // Closing bracket doesn't match expected
            return false;
        }
    }
    
    return stack.length === 0;
}
