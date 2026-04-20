/**
 * 121. Best Time to Buy and Sell Stock
 * Maximize profit by buying on one day and selling on a later day.
 *
 * Approach: Single pass — track minimum price so far
 * - For each day, the best profit if we sell today = price - minPriceSoFar.
 * - Update minPrice when we see a lower price; update maxProfit when we see a better profit.
 *
 * Example: [7,1,5,3,6,4]
 *   Day 0: min=7, profit=0
 *   Day 1: min=1, profit=0
 *   Day 2: min=1, profit=4
 *   Day 3: min=1, profit=2
 *   Day 4: min=1, profit=5  ← max
 *   Day 5: min=1, profit=3
 *   → 5
 *
 * Time: O(n), Space: O(1)
 *
 * @param {number[]} prices
 * @return {number}
 */
var maxProfit = function (prices) {
  let minPrice = Infinity;
  let maxProfit = 0;

  for (const price of prices) {
    minPrice = Math.min(minPrice, price);
    maxProfit = Math.max(maxProfit, price - minPrice);
  }

  return maxProfit;
};

// Example
console.log(maxProfit([7, 1, 5, 3, 6, 4])); // 5
console.log(maxProfit([7, 6, 4, 3, 1])); // 0
