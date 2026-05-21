/**
 * Merge a new interval into a sorted array of non-overlapping intervals.
 * Simplest: add new interval, sort by start, then merge overlapping.
 */
function mergeIntervals(intervals, newInterval) {
  const merged = [...intervals, newInterval].sort((a, b) => a[0] - b[0]);
  const result = [merged[0]];

  for (let i = 1; i < merged.length; i++) {
    const prev = result[result.length - 1];
    const curr = merged[i];
    if (curr[0] <= prev[1]) {
      prev[1] = Math.max(prev[1], curr[1]);
    } else {
      result.push(curr);
    }
  }
  return result;
}

// Example 1
const array1 = [[1, 3],[4,10],[5, 7], [8, 11], [12, 14]];
const array2 = [4, 10];
console.log(mergeIntervals(array1, array2));
// [[1, 3], [4, 11], [12, 14]]

// Example 2
const array3 = [[1, 2], [4, 8],[5, 10], [9, 11], [13, 15]];
const array4 = [5, 10];
console.log(mergeIntervals(array3, array4));
// [[1, 2], [4, 11], [13, 15]]
