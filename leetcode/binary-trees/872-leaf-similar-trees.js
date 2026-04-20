/**
 * 872. Leaf-Similar Trees
 * Two binary trees are leaf-similar if their leaf value sequences (left to right) are the same.
 *
 * EXAMPLE: root1 = [3,5,1,6,2,9,8,null,null,7,4], root2 = [3,5,1,6,7,4,2,null,null,null,null,null,null,9,8]
 * Output: true
 *
 * HOW IT WORKS:
 * - Do DFS on each tree, visiting left before right.
 * - When we hit a leaf (no left and no right child), push its value to an array.
 * - Compare the two leaf sequences: same length and same values in order → true.
 */

/**
 * @param {TreeNode | null} root1
 * @param {TreeNode | null} root2
 * @return {boolean}
 */
function leafSimilar(root1, root2) {
  const getLeaves = (root) => {
    const leaves = [];
    const dfs = (node) => {
      if (!node) return;
      if (!node.left && !node.right) {
        leaves.push(node.val);
        return;
      }
      dfs(node.left);
      dfs(node.right);
    };
    dfs(root);
    return leaves;
  };

  const leaves1 = getLeaves(root1);
  const leaves2 = getLeaves(root2);

  if (leaves1.length !== leaves2.length) return false;
  for (let i = 0; i < leaves1.length; i++) {
    if (leaves1[i] !== leaves2[i]) return false;
  }
  return true;
}

// --- TreeNode helper for local runs ---
function TreeNode(val, left, right) {
  this.val = val === undefined ? 0 : val;
  this.left = left === undefined ? null : left;
  this.right = right === undefined ? null : right;
}

// Example 1: both trees have leaf sequence [6, 7, 4, 9, 8]
// root1: 3(5(6,2(7,4)), 1(9,8))  → leaves: 6,7,4,9,8
// root2: 3(5(6,7), 1(4,2(9,8)))   → leaves: 6,7,4,9,8
const root1 = new TreeNode(
  3,
  new TreeNode(5, new TreeNode(6), new TreeNode(2, new TreeNode(7), new TreeNode(4))),
  new TreeNode(1, new TreeNode(9), new TreeNode(8))
);
const root2 = new TreeNode(
  3,
  new TreeNode(5, new TreeNode(6), new TreeNode(7)),
  new TreeNode(1, new TreeNode(4), new TreeNode(2, new TreeNode(9), new TreeNode(8)))
);
console.log(leafSimilar(root1, root2)); // true

// Example: different leaves
const r3 = new TreeNode(1, new TreeNode(2), new TreeNode(3));
const r4 = new TreeNode(1, new TreeNode(3), new TreeNode(2));
console.log(leafSimilar(r3, r4)); // false (leaf order 2,3 vs 3,2)
