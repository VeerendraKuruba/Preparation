/**
 * Find Distance to Next Smaller Number
 * 
 * Problem: For each element in the array, find how many steps to the right
 * you need to go to find a smaller number. If no smaller number exists, return 0.
 * 
 * Example 1:
 * Input: [5, 3, 8, 2, 9, 1]
 * Output: [1, 2, 2, 2, 0, 0]
 * Explanation: 
 *   - 5: next smaller is 3 at distance 1
 *   - 3: next smaller is 2 at distance 2 (skip 8)
 *   - 8: next smaller is 2 at distance 1
 *   - 2: next smaller is 1 at distance 2 (skip 9)
 *   - 9: no smaller number to the right, distance 0
 *   - 1: no smaller number to the right, distance 0
 * 
 * Example 2:
 * Input: [10, 8, 6, 4, 2]
 * Output: [1, 1, 1, 1, 0]
 * Explanation: Each element has next smaller immediately after (distance 1)
 * 
 * Example 3:
 * Input: [1, 2, 3, 4, 5]
 * Output: [0, 0, 0, 0, 0]
 * Explanation: Array is strictly increasing, no smaller numbers to the right
 */

/**
 * Approach 1: Find distance to next smaller number for each element
 * Time Complexity: O(n²) in worst case
 * Space Complexity: O(n) - for storing results
 * 
 * Returns array where each element is the distance to next smaller number
 */
function findDistanceToNextSmaller(arr) {
    if (!arr || arr.length === 0) {
        return [];
    }
    
    const result = [];
    
    for (let i = 0; i < arr.length; i++) {
        let distance = 0;
        let found = false;
        
        // Look for next smaller number to the right
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[j] < arr[i]) {
                distance = j - i;
                found = true;
                break;
            }
        }
        
        result.push(found ? distance : 0);
    }
    
    return result;
}

/**
 * Approach 2: Using Stack (Optimized - O(n))
 * More efficient approach using monotonic stack
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 */
function findDistanceToNextSmallerOptimized(arr) {
    if (!arr || arr.length === 0) {
        return [];
    }
    
    const n = arr.length;
    const result = new Array(n).fill(0);
    const stack = []; // stores indices
    
    // Traverse from right to left
    for (let i = n - 1; i >= 0; i--) {
        // Remove elements from stack that are >= current element
        while (stack.length > 0 && arr[stack[stack.length - 1]] >= arr[i]) {
            stack.pop();
        }
        
        // If stack is not empty, top element is the next smaller
        if (stack.length > 0) {
            result[i] = stack[stack.length - 1] - i;
        }
        
        stack.push(i);
    }
    
    return result;
}

/**
 * Alternative: Value gap (difference) to next smaller number
 * Returns the VALUE difference, not position distance
 */
function findValueGapToNextSmaller(arr) {
    if (!arr || arr.length === 0) {
        return [];
    }
    
    const result = [];
    
    for (let i = 0; i < arr.length; i++) {
        let found = false;
        
        // Look for next smaller number to the right
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[j] < arr[i]) {
                result.push(arr[i] - arr[j]); // value difference
                found = true;
                break;
            }
        }
        
        if (!found) {
            result.push(0);
        }
    }
    
    return result;
}

/**
 * Approach 3: Return detailed information
 * Returns object with current value, next smaller value, and distance
 */
function findNextSmallerDetailed(arr) {
    if (!arr || arr.length === 0) {
        return [];
    }
    
    const result = [];
    
    for (let i = 0; i < arr.length; i++) {
        let nextSmaller = null;
        let distance = 0;
        let nextSmallerIndex = -1;
        
        // Look for next smaller number to the right
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[j] < arr[i]) {
                nextSmaller = arr[j];
                distance = j - i;
                nextSmallerIndex = j;
                break;
            }
        }
        
        result.push({
            index: i,
            value: arr[i],
            nextSmaller: nextSmaller,
            nextSmallerIndex: nextSmallerIndex,
            distance: distance
        });
    }
    
    return result;
}

/**
 * Approach 4: Find maximum distance to next smaller
 */
function findMaxDistance(arr) {
    const distances = findDistanceToNextSmaller(arr);
    return Math.max(...distances);
}

/**
 * Approach 5: Count elements that have a next smaller number
 */
function countElementsWithNextSmaller(arr) {
    const distances = findDistanceToNextSmaller(arr);
    return distances.filter(d => d > 0).length;
}

/**
 * Approach 6: Find elements with no next smaller number
 */
function findElementsWithoutNextSmaller(arr) {
    if (!arr || arr.length === 0) {
        return [];
    }
    
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        let hasSmaller = false;
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[j] < arr[i]) {
                hasSmaller = true;
                break;
            }
        }
        if (!hasSmaller) {
            result.push({ index: i, value: arr[i] });
        }
    }
    
    return result;
}

// Test Cases
console.log("=== Test Case 1: Given Example ===");
const test1 = [5, 3, 8, 2, 9, 1];
console.log("Input:", test1);
const output1 = findDistanceToNextSmaller(test1);
const valueGap1 = findValueGapToNextSmaller(test1);
console.log("Output (position distance):", output1);
console.log("Output (value gap):        ", valueGap1);
console.log("Expected by user:           [1, 2, 2, 2, 0, 0]");
console.log("Optimized:", findDistanceToNextSmallerOptimized(test1));
console.log("\nDetailed:");
findNextSmallerDetailed(test1).forEach(item => {
    console.log(`  Index ${item.index} (value ${item.value}): next smaller = ${item.nextSmaller} at distance ${item.distance}`);
});

console.log("\n=== Test Case 2: Decreasing Array ===");
const test2 = [10, 8, 6, 4, 2];
console.log("Input:", test2);
console.log("Output:", findDistanceToNextSmaller(test2));
console.log("Expected: [1, 1, 1, 1, 0] (each element has next smaller immediately)");

console.log("\n=== Test Case 3: Increasing Array ===");
const test3 = [1, 2, 3, 4, 5];
console.log("Input:", test3);
console.log("Output:", findDistanceToNextSmaller(test3));
console.log("Expected: [0, 0, 0, 0, 0] (no smaller numbers to the right)");

console.log("\n=== Test Case 4: Large Gaps ===");
const test4 = [100, 10, 50, 5, 80, 1];
console.log("Input:", test4);
console.log("Output:", findDistanceToNextSmaller(test4));
console.log("Max distance:", findMaxDistance(test4));

console.log("\n=== Test Case 5: With Duplicates ===");
const test5 = [5, 5, 3, 3, 1];
console.log("Input:", test5);
console.log("Output:", findDistanceToNextSmaller(test5));
console.log("Note: Equal values are not considered 'smaller'");

console.log("\n=== Test Case 6: Skip Multiple Elements ===");
const test6 = [10, 20, 30, 5, 40, 50, 3];
console.log("Input:", test6);
console.log("Output:", findDistanceToNextSmaller(test6));
console.log("\nDetailed:");
findNextSmallerDetailed(test6).forEach(item => {
    console.log(`  Index ${item.index} (value ${item.value}): next smaller = ${item.nextSmaller} at distance ${item.distance}`);
});

console.log("\n=== Test Case 7: Alternating Pattern ===");
const test7 = [10, 1, 9, 2, 8, 3];
console.log("Input:", test7);
console.log("Output:", findDistanceToNextSmaller(test7));

// Edge Cases
console.log("\n=== Edge Cases ===");
console.log("Empty array:", findDistanceToNextSmaller([]));
console.log("Single element:", findDistanceToNextSmaller([5]));
console.log("Two elements (decreasing):", findDistanceToNextSmaller([5, 2]));
console.log("Two elements (increasing):", findDistanceToNextSmaller([2, 5]));
console.log("All same:", findDistanceToNextSmaller([3, 3, 3, 3]));

// Additional Statistics
console.log("\n=== Statistics for test1 ===");
const distances = findDistanceToNextSmaller(test1);
const nonZeroDistances = distances.filter(d => d > 0);
if (nonZeroDistances.length > 0) {
    const totalDistance = nonZeroDistances.reduce((sum, d) => sum + d, 0);
    const avgDistance = totalDistance / nonZeroDistances.length;
    console.log("Elements with next smaller:", countElementsWithNextSmaller(test1));
    console.log("Average distance:", avgDistance.toFixed(2));
    console.log("Max distance:", findMaxDistance(test1));
}
console.log("Elements without next smaller:", findElementsWithoutNextSmaller(test1));

