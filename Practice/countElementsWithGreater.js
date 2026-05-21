/**
 * Count Elements With At Least One Greater Element
 * 
 * Given an array A of N integers, count the number of elements 
 * that have at least 1 element greater than itself.
 * 
 * Example 1:
 * Input: [1, 2, 3, 4, 5]
 * Output: 4 (all except 5)
 * 
 * Example 2:
 * Input: [1, 2, 3, 5, 5]
 * Output: 3 (all except the two 5s)
 * 
 * Example 3:
 * Input: [5, 5, 5, 5, 5]
 * Output: 0 (no element has a greater one)
 * 
 * Time Complexity: O(n)
 * Space Complexity: O(1)
 */
function countElementsWithGreater(arr) {
    if (arr.length === 0) return 0;
    
    let max = arr[0];
    let maxCount = 1;
    
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            max = arr[i];
            maxCount = 1;
        } else if (arr[i] === max) {
            maxCount++;
        }
    }
    
    return arr.length - maxCount;
}

// Test examples
console.log("--- Testing countElementsWithGreater ---");
console.log('Input: [1, 2, 3, 4, 5] => Output:', countElementsWithGreater([1, 2, 3, 4, 5])); // 4
console.log('Input: [1, 2, 3, 5, 5] => Output:', countElementsWithGreater([1, 2, 3, 5, 5])); // 3
console.log('Input: [5, 5, 5, 5, 5] => Output:', countElementsWithGreater([5, 5, 5, 5, 5])); // 0
console.log('Input: [3, 1, 2] => Output:', countElementsWithGreater([3, 1, 2])); // 2
console.log('Input: [] => Output:', countElementsWithGreater([])); // 0

