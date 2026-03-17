/**
 * 1732. Find the Highest Altitude
 * https://leetcode.com/problems/find-the-highest-altitude/
 *
 * Prefix sum: altitude at point i = sum(gain[0..i-1]). Track max altitude.
 *
 * Example: gain = [-5, 1, 5, 0, -7]
 *   point:    0    1    2    3    4    5
 *   altitude: 0   -5   -4    1    1   -6   (prefix sums: 0, 0+(-5), 0+(-5)+1, ...)
 *   max altitude = 1
 *
 * @param {number[]} gain
 * @return {number}
 */
var largestAltitude = function (gain) {
  let altitude = 0;
  let maxAltitude = 0;

  for (const g of gain) {
    altitude += g;
    maxAltitude = Math.max(maxAltitude, altitude);
  }

  return maxAltitude;
};
