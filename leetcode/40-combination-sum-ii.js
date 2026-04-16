/**
 * 40. Combination Sum II
 *
 * Idea: sort the array, then try every number one by one.
 * After picking a number, recurse with the NEXT index (i+1) so each
 * number is used at most once.
 * To avoid duplicate combos (e.g. picking the first "1" vs the second "1"
 * at the same position), skip a number if it equals the previous one at
 * the same loop level.
 */
var combinationSum2 = function (candidates, target) {
  candidates.sort((a, b) => a - b); // sort so duplicates are side by side

  const result = [];

  function explore(startIndex, remaining, current) {
    // Found a valid combination
    if (remaining === 0) {
      result.push([...current]);
      return;
    }

    for (let i = startIndex; i < candidates.length; i++) {
      const num = candidates[i];

      // All numbers ahead are even larger — no point continuing
      if (num > remaining) break;

      // Same number was already tried at this level → skip to avoid duplicate combos
      // (i > startIndex means we're not at the very first pick of this level)
      if (i > startIndex && num === candidates[i - 1]) continue;

      current.push(num);
      explore(i + 1, remaining - num, current); // i+1 → each number used once
      current.pop(); // undo the pick and try next
    }
  }

  explore(0, target, []);
  return result;
};

// Examples
console.log(combinationSum2([10, 1, 2, 7, 6, 1, 5], 8));
// [[1,1,6],[1,2,5],[1,7],[2,6]]
console.log(combinationSum2([2, 5, 2, 1, 2], 5));
// [[1,2,2],[5]]
