/**
 * Find Duplicates in Array
 */

function findDuplicates(arr) {
  const seen = new Set();
  const duplicates = [];

  for (const num of arr) {
    if (seen.has(num)) {
      if (!duplicates.includes(num)) {
        duplicates.push(num);
      }
    } else {
      seen.add(num);
    }
  }

  return duplicates;
}

// Test
console.log(findDuplicates([1, 2, 3, 4, 5, 2, 3, 6])); // [2, 3]
console.log(findDuplicates([1, 2, 3, 4, 5])); // []
console.log(findDuplicates([1, 1, 1, 2, 2, 3])); // [1, 2]
