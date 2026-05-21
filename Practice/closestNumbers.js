/**
 * Closest Numbers in Array
 * 
 * Problem: Given an array of integers, find all pairs of elements 
 * with the minimum absolute difference.
 * 
 * Example 1:
 * Input: [4, 2, 1, 3]
 * Output: [[1,2], [2,3], [3,4]]
 * Explanation: All adjacent pairs have difference of 1, which is minimum
 * 
 * Example 2:
 * Input: [1, 5, 3, 19, 18, 25]
 * Output: [[18, 19]]
 * Explanation: The minimum difference is 1 (19-18)
 * 
 * Example 3:
 * Input: [5, 2, 4, 1, 3]
 * Output: [[1,2], [2,3], [3,4], [4,5]]
 */

/**
 * Approach 1: Sort and Compare Adjacent Elements
 * Time Complexity: O(n log n) - due to sorting
 * Space Complexity: O(n) - for storing result pairs
 * 
 * Algorithm:
 * 1. Sort the array
 * 2. One pass: track minimum adjacent difference and keep only pairs that match it
 */
function closestNumbers(arr) {
    if (!arr || arr.length < 2) {
        return [];
    }

    const sorted = [...arr].sort((a, b) => a - b);
    let minDiff = Infinity;
    const result = [];

    for (let i = 0; i < sorted.length - 1; i++) {
        const diff = sorted[i + 1] - sorted[i];
        if (diff < minDiff) {
            minDiff = diff;
            result.length = 0;
            result.push([sorted[i], sorted[i + 1]]);
        } else if (diff === minDiff) {
            result.push([sorted[i], sorted[i + 1]]);
        }
    }

    return result;
}

/**
 * Variation: Find the minimum absolute difference value only
 */
function minAbsoluteDifference(arr) {
    if (!arr || arr.length < 2) {
        return -1;
    }
    
    const sorted = [...arr].sort((a, b) => a - b);
    let minDiff = Infinity;
    
    for (let i = 0; i < sorted.length - 1; i++) {
        minDiff = Math.min(minDiff, sorted[i + 1] - sorted[i]);
    }
    
    return minDiff;
}

// Test Cases
console.log("=== Test Case 1 ===");
const test1 = [4, 2, 1, 3];
console.log("Input:", test1);
console.log("Output:", closestNumbers(test1));
console.log("Expected: [[1,2], [2,3], [3,4]]");

console.log("\n=== Test Case 2 ===");
const test2 = [1, 5, 3, 19, 18, 25];
console.log("Input:", test2);
console.log("Output:", closestNumbers(test2));
console.log("Expected: [[18, 19]]");

console.log("\n=== Test Case 3 ===");
const test3 = [5, 2, 4, 1, 3];
console.log("Input:", test3);
console.log("Output:", closestNumbers(test3));
console.log("Expected: [[1,2], [2,3], [3,4], [4,5]]");

console.log("\n=== Test Case 4 ===");
const test4 = [-20, -3916237, -357920, -3620601, 7374819, -7330761, 30, 6246457, -6461594, 266854];
console.log("Input:", test4);
console.log("Output:", closestNumbers(test4));

console.log("\n=== Test Case 5 (Duplicates) ===");
const test5 = [5, 1, 3, 3, 7];
console.log("Input:", test5);
console.log("Output:", closestNumbers(test5));
console.log("Expected: [[3, 3]] (difference of 0)");

console.log("\n=== Test Case 6 (All Same) ===");
const test6 = [2, 2, 2, 2];
console.log("Input:", test6);
console.log("Output:", closestNumbers(test6));
console.log("Expected: All pairs with difference 0");

console.log("\n=== Test Min Difference Only ===");
console.log("Min difference for test1:", minAbsoluteDifference(test1));
console.log("Min difference for test2:", minAbsoluteDifference(test2));

// Edge cases
console.log("\n=== Edge Cases ===");
console.log("Empty array:", closestNumbers([]));
console.log("Single element:", closestNumbers([5]));
console.log("Two elements:", closestNumbers([1, 5]));

