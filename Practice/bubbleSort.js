/**
 * Bubble sort: repeatedly compare adjacent elements and swap if out of order.
 * Time: O(n²), Space: O(1)
 */
function bubbleSort(arr) {
  const result = [...arr];
  const n = result.length;

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;

    for (let j = 0; j < n - 1 - i; j++) {
      if (result[j] > result[j + 1]) {
        [result[j], result[j + 1]] = [result[j + 1], result[j]];
        swapped = true;
      }
    }

    // Early exit if no swaps in a pass (array is sorted)
    if (!swapped) break;
  }

  return result;
}

// Example
const arr = [64, 34, 25, 12, 22, 11, 90];
console.log(bubbleSort(arr)); // [11, 12, 22, 25, 34, 64, 90]
