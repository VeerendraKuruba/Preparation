/**
 * PayPay Japan SSE Frontend Interview
 *
 * Max path sum in a binary tree
 *   Q:  Find maximum path sum on a downward path (root → leaf direction only)
 *   FU: What if the path can go in any direction (not necessarily downwards)?
 *
 * Tree node shape:
 *   { val, left, right }
 */

function TreeNode(val, left = null, right = null) {
  this.val = val;
  this.left = left;
  this.right = right;
}

// =============================================================================
// Q. Maximum path sum — downward only
// =============================================================================
/**
 * A "downward" path starts at any node and only moves to children
 * (parent → child → …). It cannot go up.
 *
 * Idea:
 *   At each node, the best downward sum starting here is:
 *     node.val + max(0, bestDown(left), bestDown(right))
 *   (We take at most one child — a path is a single chain.)
 *   Track the global max across all starting nodes.
 *
 * Time: O(n)  |  Space: O(h) recursion stack
 */

function maxDownwardPathSum(root) {
  let maxSum = -Infinity;

  function bestDown(node) {
    if (!node) return 0;

    const left = bestDown(node.left);
    const right = bestDown(node.right);

    // Best chain starting at this node (pick the better child, or none if both negative)
    const startingHere = node.val + Math.max(0, left, right);
    maxSum = Math.max(maxSum, startingHere);

    return startingHere;
  }

  bestDown(root);
  return maxSum === -Infinity ? 0 : maxSum;
}

// =============================================================================
// Follow-up. Maximum path sum — any direction
// =============================================================================
/**
 * Path can bend: left-child → node → right-child (or any contiguous path).
 * Classic LeetCode 124 — Binary Tree Maximum Path Sum.
 *
 * Idea:
 *   For each node, consider a path that uses this node as the "highest" bend:
 *     leftGain + node.val + rightGain
 *   where gain from a child is max(0, best downward chain from that child).
 *
 *   But when returning to the parent, you may only contribute ONE side
 *   (a path through parent cannot take both children):
 *     return node.val + max(leftGain, rightGain)
 *
 * Time: O(n)  |  Space: O(h)
 */

function maxPathSumAnyDirection(root) {
  let maxSum = -Infinity;

  function gain(node) {
    if (!node) return 0;

    // Negative child paths are useless — treat as 0 (don't take them)
    const leftGain = Math.max(0, gain(node.left));
    const rightGain = Math.max(0, gain(node.right));

    // Path that bends at this node (can use both children)
    const pathThroughNode = node.val + leftGain + rightGain;
    maxSum = Math.max(maxSum, pathThroughNode);

    // Contribution upward: only one child side
    return node.val + Math.max(leftGain, rightGain);
  }

  gain(root);
  return maxSum === -Infinity ? 0 : maxSum;
}

// =============================================================================
// Examples
// =============================================================================
/**
 * Tree:
 *         1
 *        / \
 *       2   3
 *      / \
 *     4   5
 *
 * Downward only:
 *   1→2→5 = 8, 1→2→4 = 7, 1→3 = 4, 2→5 = 7, … → max = 8
 *
 * Any direction:
 *   4→2→5 = 11, or 4→2→1→3 = 10, … → max = 11
 */
const tree1 = new TreeNode(
  1,
  new TreeNode(2, new TreeNode(4), new TreeNode(5)),
  new TreeNode(3)
);

console.log("Downward:", maxDownwardPathSum(tree1)); // 8
console.log("Any direction:", maxPathSumAnyDirection(tree1)); // 11

/**
 * Tree with negatives:
 *        -10
 *        /  \
 *       9    20
 *           /  \
 *          15   7
 *
 * Downward: 20→15 = 35
 * Any direction: 15→20→7 = 42
 */
const tree2 = new TreeNode(
  -10,
  new TreeNode(9),
  new TreeNode(20, new TreeNode(15), new TreeNode(7))
);

console.log("Downward:", maxDownwardPathSum(tree2)); // 35
console.log("Any direction:", maxPathSumAnyDirection(tree2)); // 42

/**
 * Single negative node — path must include at least one node
 */
const tree3 = new TreeNode(-3);
console.log("Downward:", maxDownwardPathSum(tree3)); // -3
console.log("Any direction:", maxPathSumAnyDirection(tree3)); // -3

module.exports = {
  TreeNode,
  maxDownwardPathSum,
  maxPathSumAnyDirection,
};
