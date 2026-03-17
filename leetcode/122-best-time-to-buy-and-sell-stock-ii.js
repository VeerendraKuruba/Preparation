/**
 * 122. Best Time to Buy and Sell Stock II
 * Maximize profit with multiple buys/sells; hold at most one share at a time.
 *
 * Approach: Sum every price increase
 * - We can "buy and sell" on every consecutive up move without holding overnight.
 * - For each i: if prices[i+1] > prices[i], add (prices[i+1] - prices[i]) to profit.
 * - Equivalent to buying at every local low and selling at the next local high.
 *
 * Example: [7,1,5,3,6,4]
 *   Increases: (5-1)=4, (6-3)=3 → total 7
 *
 * Time: O(n), Space: O(1)
 *
 * @param {number[]} prices
 * @return {number}
 */
var maxProfit = function (prices) {
  let profit = 0;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i - 1]) {
      profit += prices[i] - prices[i - 1];
    }
  }
  return profit;
};

// Example
console.log(maxProfit([7, 1, 5, 3, 6, 4])); // 7
console.log(maxProfit([1, 2, 3, 4, 5])); // 4
console.log(maxProfit([7, 6, 4, 3, 1])); // 0
