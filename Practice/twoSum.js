/**
 * Two Sum Problem
 * 
 * Given an array of integers nums and an integer target, 
 * return indices of the two numbers such that they add up to target.
 * 
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 * 
 * @param {number[]} nums - Array of integers
 * @param {number} target - Target sum
 * @return {number[]} - Indices of the two numbers
 */
function twoSum(nums, target) {
    // Create a map to store value -> index mapping
    const map = new Map();
    
    // Iterate through the array
    for (let i = 0; i < nums.length; i++) {
        // Calculate the complement (what we need to reach target)
        const complement = target - nums[i];
        
        // Check if complement exists in our map
        if (map.has(complement)) {
            // Found the pair! Return both indices
            return [map.get(complement), i];
        }
        
        // Store current number and its index in map
        map.set(nums[i], i);
    }
    
    // No solution found (shouldn't happen based on problem constraints)
    return [];
}

// Example 1
console.log("Example 1:");
console.log("Input: nums = [2,7,11,15], target = 9");
console.log("Output:", twoSum([2, 7, 11, 15], 9));
console.log("Expected: [0,1]");
console.log();

// Example 2
console.log("Example 2:");
console.log("Input: nums = [3,2,4], target = 6");
console.log("Output:", twoSum([3, 2, 4], 6));
console.log("Expected: [1,2]");
console.log();

// Example 3
console.log("Example 3:");
console.log("Input: nums = [3,3], target = 6");
console.log("Output:", twoSum([3, 3], 6));
console.log("Expected: [0,1]");
console.log();

// Export for use in other modules (if needed)
module.exports = twoSum;

