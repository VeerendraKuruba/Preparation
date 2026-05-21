/**
 * Maximum Subarray Problem
 * 
 * Given an integer array nums, find the subarray with the largest sum, and return its sum.
 * 
 * Example 1:
 * Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
 * Output: 6
 * Explanation: The subarray [4,-1,2,1] has the largest sum 6.
 * 
 * Example 2:
 * Input: nums = [1]
 * Output: 1
 * 
 * Example 3:
 * Input: nums = [5,4,-1,7,8]
 * Output: 23
 */

/**
 * Approach 1: Kadane's Algorithm (Optimal Solution)
 * Time Complexity: O(n)
 * Space Complexity: O(1)
 * 
 * The key insight is that at each position, we decide whether to:
 * 1. Add the current element to the existing subarray
 * 2. Start a new subarray from the current element
 * 
 * We choose whichever gives us a larger sum.
 */
function maxSubArray(nums) {
    if (nums.length === 0) return 0;
    
    let maxSum = nums[0];        // Maximum sum found so far
    let currentSum = nums[0];    // Maximum sum ending at current position
    
    for (let i = 1; i < nums.length; i++) {
        // Either extend the existing subarray or start a new one
        currentSum = Math.max(nums[i], currentSum + nums[i]);
        
        // Update the maximum sum found so far
        maxSum = Math.max(maxSum, currentSum);
    }
    
    return maxSum;
}


