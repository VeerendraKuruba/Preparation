/**
 * Find the maximum number in an array
 * @param {number[]} arr - Array of numbers
 * @returns {number} - Maximum number in the array
 */
function findMax(arr) {
  // Handle edge cases
  if (!arr || arr.length === 0) {
    return undefined;
  }
  
  if (arr.length === 1) {
    return arr[0];
  }
  
  // Find maximum
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) {
      max = arr[i];
    }
  }
  
  return max;
}

/**
 * Find the second maximum number in an array
 * @param {number[]} arr - Array of numbers
 * @returns {number} - Second maximum number in the array
 */
function findSecondMax(arr) {
  // Handle edge cases
  if (!arr || arr.length === 0) {
    return undefined;
  }
  
  if (arr.length === 1) {
    return undefined;
  }
  
  // Initialize max and secondMax
  let max = -Infinity;
  let secondMax = -Infinity;
  
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > max) {
      secondMax = max;
      max = arr[i];
    } else if (arr[i] > secondMax && arr[i] < max) {
      secondMax = arr[i];
    }
  }
  
  // If secondMax is still -Infinity, it means all elements are the same
  return secondMax === -Infinity ? undefined : secondMax;
}

/**
 * Test function to validate function output
 * @param {string} testName - Name of the test
 * @param {Function} fn - Function to test
 * @param {*} input - Input to the function
 * @param {*} expected - Expected output
 * @returns {boolean} - Whether the test passed
 */
function runTest(testName, fn, input, expected) {
  const result = fn(input);
  const passed = result === expected;
  
  if (passed) {
    console.log(`✓ PASS: ${testName}`);
    console.log(`  Input: [${input}]`);
    console.log(`  Expected: ${expected}, Got: ${result}\n`);
  } else {
    console.log(`✗ FAIL: ${testName}`);
    console.log(`  Input: [${input}]`);
    console.log(`  Expected: ${expected}, Got: ${result}\n`);
  }
  
  return passed;
}

/**
 * Run all test cases
 */
function runAllTests() {
  console.log("=".repeat(60));
  console.log("Testing findMax function");
  console.log("=".repeat(60) + "\n");
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test cases for findMax
  totalTests++;
  if (runTest("Basic positive numbers", findMax, [1, 5, 3, 9, 2], 9)) passedTests++;
  
  totalTests++;
  if (runTest("Array with negative numbers", findMax, [-5, -2, -10, -1, -8], -1)) passedTests++;
  
  totalTests++;
  if (runTest("Array with mixed positive and negative", findMax, [-5, 10, -2, 0, 15], 15)) passedTests++;
  
  totalTests++;
  if (runTest("Single element array", findMax, [42], 42)) passedTests++;
  
  totalTests++;
  if (runTest("Array with duplicate max values", findMax, [5, 9, 3, 9, 2], 9)) passedTests++;
  
  totalTests++;
  if (runTest("Array with all same values", findMax, [7, 7, 7, 7], 7)) passedTests++;
  
  totalTests++;
  if (runTest("Array with zero", findMax, [0, -1, -5, 0], 0)) passedTests++;
  
  totalTests++;
  if (runTest("Empty array", findMax, [], undefined)) passedTests++;
  
  totalTests++;
  if (runTest("Large numbers", findMax, [1000000, 999999, 1000001], 1000001)) passedTests++;
  
  totalTests++;
  if (runTest("Decimal numbers", findMax, [1.5, 2.7, 0.9, 3.2], 3.2)) passedTests++;
  
  console.log("=".repeat(60));
  console.log("Testing findSecondMax function");
  console.log("=".repeat(60) + "\n");
  
  // Test cases for findSecondMax
  totalTests++;
  if (runTest("Basic positive numbers", findSecondMax, [1, 5, 3, 9, 2], 5)) passedTests++;
  
  totalTests++;
  if (runTest("Array with negative numbers", findSecondMax, [-5, -2, -10, -1, -8], -2)) passedTests++;
  
  totalTests++;
  if (runTest("Array with mixed positive and negative", findSecondMax, [-5, 10, -2, 0, 15], 10)) passedTests++;
  
  totalTests++;
  if (runTest("Single element array", findSecondMax, [42], undefined)) passedTests++;
  
  totalTests++;
  if (runTest("Two element array", findSecondMax, [5, 3], 3)) passedTests++;
  
  totalTests++;
  if (runTest("Array with duplicate max values", findSecondMax, [5, 9, 3, 9, 2], 5)) passedTests++;
  
  totalTests++;
  if (runTest("Array with all same values", findSecondMax, [7, 7, 7, 7], undefined)) passedTests++;
  
  totalTests++;
  if (runTest("Array with zero", findSecondMax, [0, -1, -5, 0], -1)) passedTests++;
  
  totalTests++;
  if (runTest("Empty array", findSecondMax, [], undefined)) passedTests++;
  
  totalTests++;
  if (runTest("Large numbers", findSecondMax, [1000000, 999999, 1000001], 1000000)) passedTests++;
  
  totalTests++;
  if (runTest("Decimal numbers", findSecondMax, [1.5, 2.7, 0.9, 3.2], 2.7)) passedTests++;
  
  totalTests++;
  if (runTest("Array with consecutive numbers", findSecondMax, [1, 2, 3, 4, 5], 4)) passedTests++;
  
  totalTests++;
  if (runTest("Unsorted array", findSecondMax, [8, 3, 10, 2, 6], 8)) passedTests++;
  
  // Summary
  console.log("=".repeat(60));
  console.log("TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
  console.log("=".repeat(60));
}

// Run all tests
runAllTests();

// Export functions for use in other modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    findMax,
    findSecondMax,
    runTest,
    runAllTests
  };
}

