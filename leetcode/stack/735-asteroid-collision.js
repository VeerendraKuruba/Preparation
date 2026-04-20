/**
 * 735. Asteroid Collision
 *
 * Approach: Stack (easy to follow)
 * - Positive number = asteroid moving right →
 * - Negative number = asteroid moving left ←
 * - They only collide when → meets ← (positive on left, negative on right)
 *
 * We use a stack to build the final result. For each asteroid:
 * 1. If it's moving right (positive) → just push it.
 * 2. If it's moving left (negative) → it might hit the ones we've seen (on the stack).
 *    - Keep popping from stack while the top is a smaller right-moving asteroid (it explodes).
 *    - Then: same size? both explode (pop, don't push). Bigger on stack? this one explodes (don't push).
 *    - Stack empty or top is left-moving? this one survives (push).
 *
 * Time: O(n), Space: O(n)
 *
 * @param {number[]} asteroids
 * @return {number[]}
 */
var asteroidCollision = function (asteroids) {
  const stack = [];

  for (const curr of asteroids) {
    if (curr > 0) {
      // Moving right → no collision yet, add to stack
      stack.push(curr);
      continue;
    }

    // curr is negative (moving left ←). It can only hit positives on the stack (moving right).
    const size = -curr; // absolute size of current asteroid

    // Pop every right-moving asteroid that is smaller (they explode)
    while (stack.length > 0 && stack[stack.length - 1] > 0 && stack[stack.length - 1] < size) {
      stack.pop();
    }

    const top = stack[stack.length - 1];

    if (stack.length > 0 && top === size) {
      // Same size → both explode (pop the top, don't push curr)
      stack.pop();
    } else if (stack.length === 0 || top < 0) {
      // Nothing to hit, or top is also left-moving → curr survives
      stack.push(curr);
    }
    // else top > size → curr explodes, do nothing
  }

  return stack;
};
