/**
 * 202. Happy Number
 * https://leetcode.com/problems/happy-number/
 *
 * Detect cycle using a Set. If we reach 1 → happy. If we see a repeated
 * number → cycle, not happy.
 *
 * Time:  O(log n) per step, bounded number of unique values before cycle
 * Space: O(log n) for the seen set
 */

/**
 * @param {number} n
 * @return {boolean}
 */
var isHappy = function (n) {
    const seen = new Set();

    while (n !== 1) {
        if (seen.has(n)) return false;
        seen.add(n);
        n = sumOfSquares(n);
    }

    return true;
};

function sumOfSquares(n) {
    let sum = 0;
    while (n > 0) {
        const digit = n % 10;
        sum += digit * digit;
        n = Math.floor(n / 10);
    }
    return sum;
}

// ------- tests -------
console.log(isHappy(19)); // true  (1² + 9² → 82 → 68 → 100 → 1)
console.log(isHappy(2));  // false
console.log(isHappy(1));  // true
