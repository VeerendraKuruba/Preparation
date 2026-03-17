/**
 * @param {number[]} arr
 * @return {boolean}
 */
var uniqueOccurrences = function (arr) {
  const count = {};
  for (const num of arr) {
    count[num] = (count[num] ?? 0) + 1;
  }
  const counts = Object.values(count);
  const uniqueCounts = new Set(counts);
  return counts.length === uniqueCounts.size;
};
