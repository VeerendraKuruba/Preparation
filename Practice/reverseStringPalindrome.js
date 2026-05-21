/**
 * Reverse String and Check Palindrome
 * 
 * This file contains functions to:
 * 1. Reverse a string
 * 2. Check if a string is a palindrome
 * 
 * Example: "Leon sees Noel!"
 * - When ignoring case, spaces, and punctuation: "leonseesnoel"
 * - Reversed: "leonseesnoel"
 * - Is Palindrome: true
 */

/**
 * Reverse a string
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 */
function reverseString(str) {
  return str.split('').reverse().join('');
}

/**
 * Check if a string is a palindrome (case-sensitive)
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 */
function isPalindrome(str) {
  const reversed = reverseString(str);
  return str === reversed;
}

/**
 * Check if a string is a palindrome (case-insensitive, ignoring spaces and punctuation)
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 */
function isPalindromeAdvanced(str) {
  // Remove non-alphanumeric characters and convert to lowercase
  const cleaned = str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const reversed = reverseString(cleaned);
  return cleaned === reversed;
}

/**
 * Combined function: Reverse string and check if it's a palindrome
 * Returns an object with both results
 */
function reverseAndCheckPalindrome(str, options = {}) {
  const {
    caseSensitive = true,
    ignoreSpaces = false,
    ignorePunctuation = false
  } = options;
  
  let processedStr = str;
  
  // Apply filters based on options
  if (!caseSensitive) {
    processedStr = processedStr.toLowerCase();
  }
  
  if (ignorePunctuation) {
    processedStr = processedStr.replace(/[^a-zA-Z0-9]/g, '');
  } else if (ignoreSpaces) {
    processedStr = processedStr.replace(/\s/g, '');
  }
  
  const reversed = reverseString(processedStr);
  const isPal = processedStr === reversed;
  
  return {
    original: str,
    reversed: reversed,
    isPalindrome: isPal
  };
}

// Test with "Leon sees Noel!" example
console.log('=== Palindrome Example: "Leon sees Noel!" ===\n');

const example = "Leon sees Noel!";

console.log('Original string:', example);
console.log('Reversed (exact):', reverseString(example));
console.log('Is palindrome (exact):', isPalindrome(example)); // false

console.log('\n--- With case-insensitive and punctuation removal ---');
const cleaned = example.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
console.log('Cleaned string:', cleaned);
console.log('Reversed (cleaned):', reverseString(cleaned));
console.log('Is palindrome (advanced):', isPalindromeAdvanced(example)); // true

console.log('\n--- Using combined function ---');
const result = reverseAndCheckPalindrome(example, { 
  caseSensitive: false, 
  ignorePunctuation: true 
});
console.log('Result:', result);
console.log(`"${result.original}" is ${result.isPalindrome ? 'a palindrome' : 'not a palindrome'}`);

console.log('\n=== Additional Test Cases ===');
console.log('reverseAndCheckPalindrome("racecar"):');
console.log(reverseAndCheckPalindrome('racecar'));

console.log('\nreverseAndCheckPalindrome("A man a plan a canal Panama"):');
console.log(reverseAndCheckPalindrome('A man a plan a canal Panama', { 
  caseSensitive: false, 
  ignorePunctuation: true 
}));

console.log('\nreverseAndCheckPalindrome("hello"):');
console.log(reverseAndCheckPalindrome('hello'));

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    reverseString,
    isPalindrome,
    isPalindromeAdvanced,
    reverseAndCheckPalindrome
  };
}
