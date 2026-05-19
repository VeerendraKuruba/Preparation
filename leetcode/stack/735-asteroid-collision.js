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

  for (let i = 0, n = asteroids.length; i < n; i++) {
    const curr = asteroids[i];

    if (curr > 0) {
      stack.push(curr);
      continue;
    }

    const size = -curr;

    // Resolve curr against stack: pop smaller rights; equal → both gone; bigger right → curr gone
    while (true) {
      const len = stack.length;
      if (len === 0) {
        stack.push(curr);
        break;
      }
      const top = stack[len - 1];
      if (top < 0) {
        stack.push(curr);
        break;
      }
      if (top < size) {
        stack.pop();
        continue;
      }
      if (top === size) stack.pop();
      break;
    }
  }

  return stack;
};
