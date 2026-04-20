/**
 * 69. Sqrt(x)
 * Return floor(sqrt(x)) without using pow or **.
 */

// --- Method 1: Linear search (easiest to understand) ---
// Just try k = 0, 1, 2, ... until (k+1)*(k+1) > x, then k is the answer.
var mySqrt = function (x) {
  let k = 0;
  while ((k + 1) * (k + 1) <= x) k++;
  return k;
};

// --- Method 2: Binary search (faster, O(log x)) ---
// Search for largest k where k*k <= x.
function mySqrtBinary(x) {
  if (x < 2) return x;
  let left = 1;
  let right = Math.floor(x / 2) + 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const square = mid * mid;
    if (square === x) return mid;
    if (square < x) left = mid + 1;
    else right = mid - 1;
  }
  return right;
}

// --- Method 3: Newton's method (fast, easy formula) ---
//
// SIMPLE IDEA:
// - We want a number g such that g * g = x (that's the definition of sqrt!).
// - If our guess is too BIG, then x/guess is too SMALL. So the real sqrt is between them.
// - So take the AVERAGE: newGuess = (guess + x/guess) / 2. That's a better guess!
// - Keep improving until guess is no longer bigger than x/guess. Then guess is our answer.
//
// Example for x = 8:
//   guess = 8  → 8 > 8/8 (1)? Yes → guess = (8+1)/2 = 4
//   guess = 4  → 4 > 8/4 (2)? Yes → guess = (4+2)/2 = 3
//   guess = 3  → 3 > 8/3 (2.67)? Yes → guess = (3+2.67)/2 ≈ 2
//   guess = 2  → 2 > 8/2 (4)? No → stop. Answer = 2 ✓
//
function mySqrtNewton(x) {
  if (x < 2) return x;

  let guess = x; // start with any guess (x or x/2 both work)

  // while our guess is too big (guess > x/guess means guess² > x)
  while (guess > x / guess) {
    guess = Math.floor((guess + x / guess) / 2); // better guess = average
  }

  return guess;
}
