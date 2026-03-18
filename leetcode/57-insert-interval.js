/**
 * 57. Insert Interval
 * Insert newInterval into sorted, non-overlapping intervals. Merge overlapping.
 *
 * @param {number[][]} intervals - sorted by start, non-overlapping
 * @param {number[]} newInterval - [start, end]
 * @return {number[][]}
 */

// --- Approach 1: Single loop O(n) ---
// One pass: before → push; overlap → merge into [start,end]; after → push merged then current.
function insert(intervals, newInterval) {
  const result = [];
  let [start, end] = newInterval;
  let merged = false;

  for (const [a, b] of intervals) {
    if (b < start) result.push([a, b]);           // strictly before
    else if (a > end) {                           // strictly after
      if (!merged) { result.push([start, end]); merged = true; }
      result.push([a, b]);
    } else {                                      // overlap: expand merged interval
      start = Math.min(start, a);
      end = Math.max(end, b);
    }
  }
  if (!merged) result.push([start, end]);
  return result;
}

// --- Approach 2: Sort then merge O(n log n) ---
/**
 * Append newInterval, sort, then merge (same as problem 56). Simpler, uses extra sort.
 * Simpler code but O(n log n) due to sort (intervals were already sorted).
 *
 * @param {number[][]} intervals
 * @param {number[]} newInterval - [start, end]
 * @return {number[][]}
 */
function insertSortAndMerge(intervals, newInterval) {
  const sortedIntervals = [...intervals, newInterval].sort((a, b) => a[0] - b[0]);
  const merged = [sortedIntervals[0]];

  for (let i = 1; i < sortedIntervals.length; i++) {
    const [start, end] = sortedIntervals[i];
    const last = merged[merged.length - 1];
    if (start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

// --- Approach 3: Binary search insert position, then merge neighbors O(n) ---
// Find where newInterval would go by start, then merge left/right overlapping intervals.
// Same O(n) but different structure; no extra gain unless you need the "insert index" idea.
function insertBinarySearch(intervals, newInterval) {
  const n = intervals.length;
  if (n === 0) return [newInterval];

  // Lower bound: first index where intervals[i][0] >= newInterval[0]
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (intervals[mid][0] < newInterval[0]) lo = mid + 1;
    else hi = mid;
  }
  const insertAt = lo;

  // Merge with overlapping intervals: expand [start, end] left and right
  let [start, end] = newInterval;
  let left = insertAt - 1;
  while (left >= 0 && intervals[left][1] >= start) {
    start = Math.min(start, intervals[left][0]);
    end = Math.max(end, intervals[left][1]);
    left--;
  }
  let right = insertAt;
  while (right < n && intervals[right][0] <= end) {
    start = Math.min(start, intervals[right][0]);
    end = Math.max(end, intervals[right][1]);
    right++;
  }

  return [...intervals.slice(0, left + 1), [start, end], ...intervals.slice(right)];
}

// Examples
console.log(insert([[1, 3], [6, 9]], [2, 5])); // [[1,5],[6,9]]
console.log(insert([[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8])); // [[1,2],[3,10],[12,16]]

console.log(insertSortAndMerge([[1, 3], [6, 9]], [2, 5])); // [[1,5],[6,9]]
console.log(insertSortAndMerge([[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8])); // [[1,2],[3,10],[12,16]]

console.log(insertBinarySearch([[1, 3], [6, 9]], [2, 5])); // [[1,5],[6,9]]
console.log(insertBinarySearch([[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8])); // [[1,2],[3,10],[12,16]]
console.log(insertBinarySearch([], [5, 7])); // [[5,7]]
