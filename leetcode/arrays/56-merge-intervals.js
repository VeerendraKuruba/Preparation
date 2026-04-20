/**
 * 56. Merge Intervals
 * Given intervals [start, end], merge all overlapping intervals and return
 * non-overlapping intervals covering the input.
 *
 * Approach: Sort by start, then traverse. If current overlaps with last merged
 * (current start <= last end), extend last end to max(last end, current end);
 * otherwise push current as a new interval.
 * Time O(n log n), space O(log n) for sort (or O(n) for result).
 *
 * @param {number[][]} intervals
 * @return {number[][]}
 */
function merge(intervals) {
  if (intervals.length <= 1) return intervals;

  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const [start, end] = intervals[i];
    const last = merged[merged.length - 1];

    if (start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }

  return merged;
}

// Examples
console.log(
  merge([
    [1, 3],
    [2, 6],
    [8, 10],
    [15, 18],
  ])
); // [[1,6],[8,10],[15,18]]
console.log(
  merge([
    [1, 4],
    [4, 5],
  ])
); // [[1,5]]
