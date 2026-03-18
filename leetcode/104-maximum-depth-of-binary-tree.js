/**
 * 104. Maximum Depth of Binary Tree
 * Return the number of nodes on the longest path from root to a leaf.
 *
 * EXAMPLE: root = [3, 9, 20, null, null, 15, 7]
 *
 *        3
 *       / \
 *      9  20
 *        /  \
 *       15   7
 *
 * Longest path: 3 → 20 → 15 (or 3 → 20 → 7) → depth = 3 nodes.
 *
 * HOW IT WORKS:
 * - At each node we ask: "How deep is my left subtree? How deep is my right?"
 * - Our depth = 1 (this node) + the larger of those two.
 * - A null node has depth 0 (base case).
 *
 * Call trace for the tree above:
 *   maxDepth(3)  → 1 + max(maxDepth(9), maxDepth(20))
 *   maxDepth(9)  → 1 + max(maxDepth(null), maxDepth(null)) = 1 + 0 = 1
 *   maxDepth(20) → 1 + max(maxDepth(15), maxDepth(7))
 *   maxDepth(15) → 1 + max(null, null) = 1
 *   maxDepth(7)  → 1 + max(null, null) = 1
 *   So maxDepth(20) = 1 + max(1, 1) = 2
 *   So maxDepth(3)  = 1 + max(1, 2) = 3  ✓
 */

/**
 * @param {TreeNode | null} root
 * @return {number}
 */
function maxDepth(root) {
  // Line 1: Base case — empty tree or we've passed a leaf. Depth = 0.
  if (root === null) return 0;

  // Line 2: Ask left subtree "what's your max depth?" (recursion goes down left)
  const leftDepth = maxDepth(root.left);
  // Line 3: Ask right subtree "what's your max depth?" (recursion goes down right)
  const rightDepth = maxDepth(root.right);

  // Line 4: This node adds 1 to the path. Take the longer of left or right.
  return 1 + Math.max(leftDepth, rightDepth);
}

// --- TreeNode helper for local runs ---
function TreeNode(val, left, right) {
  this.val = val === undefined ? 0 : val;
  this.left = left === undefined ? null : left;
  this.right = right === undefined ? null : right;
}

// Examples
const r1 = new TreeNode(3, new TreeNode(9), new TreeNode(20, new TreeNode(15), new TreeNode(7)));
console.log(maxDepth(r1)); // 3

const r2 = new TreeNode(1, null, new TreeNode(2));
console.log(maxDepth(r2)); // 2

console.log(maxDepth(null)); // 0
