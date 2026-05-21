/**
 * Maximum Product Subarray
 * 
 * Given an array of integers, find the contiguous subarray with the highest product.
 * 
 * Key insight: We track both max and min products at each position because
 * a negative number can turn a minimum product into a maximum product.
 * 
 * Time Complexity: O(n)
 * Space Complexity: O(1)
 */

function maxProductSubarray(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    // Track the maximum and minimum products ending at current position
    let maxEndingHere = numbers[0];
    let minEndingHere = numbers[0];
    let result = numbers[0];
    
    for (let i = 1; i < numbers.length; i++) {
        const current = numbers[i];
        
        // We need temp variables because we update both max and min simultaneously
        // and they depend on each other's previous values
        const tempMax = Math.max(
            current,                      // Start fresh from current element
            maxEndingHere * current,      // Extend previous max
            minEndingHere * current       // Extend previous min (useful when current is negative)
        );
        
        const tempMin = Math.min(
            current,                      // Start fresh from current element
            maxEndingHere * current,      // Extend previous max
            minEndingHere * current       // Extend previous min
        );
        
        maxEndingHere = tempMax;
        minEndingHere = tempMin;
        
        // Update global maximum
        result = Math.max(result, maxEndingHere);
    }
    
    return result;
}

// Test cases
console.log("Test 1:", maxProductSubarray([2, 3, -2, 4]));      // Expected: 6 (subarray [2, 3])
console.log("Test 2:", maxProductSubarray([-2, 0, -1]));        // Expected: 0 (subarray [0])
console.log("Test 3:", maxProductSubarray([-2, 3, -4]));        // Expected: 24 (subarray [-2, 3, -4])
console.log("Test 4:", maxProductSubarray([2, -5, -2, -4, 3])); // Expected: 24 (subarray [-2, -4, 3])
console.log("Test 5:", maxProductSubarray([-1]));               // Expected: -1
console.log("Test 6:", maxProductSubarray([0, 2]));             // Expected: 2
console.log("Test 7:", maxProductSubarray([-2, -3, 7]));        // Expected: 42 (subarray [-2, -3, 7])

// For module usage:
// export { maxProductSubarray };

