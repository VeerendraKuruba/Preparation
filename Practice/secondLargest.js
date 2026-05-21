/**
 * Find the second largest element in an array
 * @param {number[]} A - The input array of integers
 * @returns {number|null} - The second largest element, or null if it doesn't exist
 */
function findSecondLargest(A) {
  // Edge case: array must have at least 2 elements
  if (!A || A.length < 2) {
    return null;
  }

  let largest = -Infinity;
  let secondLargest = -Infinity;

  for (const num of A) {
    if (num > largest) {
      secondLargest = largest;
      largest = num;
    } else if (num > secondLargest && num < largest) {
      secondLargest = num;
    }
  }

  // If secondLargest is still -Infinity, no valid second largest exists
  // (all elements are the same)
  return secondLargest === -Infinity ? null : secondLargest;
}

// Test cases
console.log("Test 1:", findSecondLargest([1, 2, 3, 4, 5])); // 4
console.log("Test 2:", findSecondLargest([5, 5, 5, 5]));     // null (all same)
console.log("Test 3:", findSecondLargest([10]));            // null (only one element)
console.log("Test 4:", findSecondLargest([]));              // null (empty array)
console.log("Test 5:", findSecondLargest([7, 7, 7, 3, 1])); // 3
console.log("Test 6:", findSecondLargest([-1, -2, -3]));    // -2
console.log("Test 7:", findSecondLargest([1, 1]));          // null (both same)
console.log("Test 8:", findSecondLargest([2, 1]));          // 1

