/**
 * @param {number[]} nums
 * @return {number}
 */
var missingNumber = function(nums) {
    const totalNum = nums.length; // Fixed: removed -1
    const totalVal = totalNum * (totalNum + 1) / 2;
    const op = nums.reduce((currentVal, val) => currentVal + val, 0);
    return totalVal - op;
};

// Test cases
console.log(missingNumber([3, 0, 1])); // Expected: 2
console.log(missingNumber([0, 1])); // Expected: 2
console.log(missingNumber([9,6,4,2,3,5,7,0,1])); // Expected: 8
console.log(missingNumber([0])); // Expected: 1
















