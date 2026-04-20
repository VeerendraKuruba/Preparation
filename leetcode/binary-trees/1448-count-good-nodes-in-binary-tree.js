/**
 * 1448. Count Good Nodes in Binary Tree
 * A node X is "good" if in the path from root to X there are no nodes with value greater than X.
 * Return the number of good nodes.
 *
 * EXAMPLE: root = [3,1,4,3,null,1,5]
 *
 *           3
 *          / \
 *         1   4
 *        /   / \
 *       3   1   5
 *
 * Good: 3 (root), 4, 5, and the 3 under 1 → output 4.
 *
 * HOW IT WORKS:
 * - DFS from root, passing the maximum value seen so far on the current path.
 * - If node.val >= maxSoFar, this node is good: count it and pass node.val to children.
 * - Otherwise pass maxSoFar unchanged to children.
 */

/**
 * @param {TreeNode | null} root
 * @return {number}
 */
function goodNodes(root) {
  if (root === null) return 0;

  const dfs = (node, maxSoFar) => {
    if (node === null) return 0;

    const count = node.val >= maxSoFar ? 1 : 0;
    const newMax = Math.max(maxSoFar, node.val);

    return count + dfs(node.left, newMax) + dfs(node.right, newMax);
  };

  return dfs(root, root.val);
}

// --- TreeNode helper for local runs ---
function TreeNode(val, left, right) {
  this.val = val === undefined ? 0 : val;
  this.left = left === undefined ? null : left;
  this.right = right === undefined ? null : right;
}

// Example 1: root = [3,1,4,3,null,1,5] → 4 good nodes
// Good: 3 (root), 4, 5, and the 3 under 1
const root = new TreeNode(
  3,
  new TreeNode(1, new TreeNode(3), null),
  new TreeNode(4, new TreeNode(1), new TreeNode(5))
);
console.log(goodNodes(root)); // 4

// Single node
console.log(goodNodes(new TreeNode(1))); // 1

// All nodes in descending path: only root is good
const r2 = new TreeNode(3, new TreeNode(2, new TreeNode(1), null), null);
console.log(goodNodes(r2)); // 1
