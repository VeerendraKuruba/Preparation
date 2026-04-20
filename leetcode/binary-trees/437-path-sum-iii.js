/**
 * 437. Path Sum III
 * Count paths that sum to targetSum. Path goes downward (parent → child); may not start at root or end at leaf.
 *
 * SIMPLE IDEA:
 * - Every path starts at some node. So: total = paths starting at root + paths in left subtree + paths in right subtree.
 * - "Paths starting at root" = paths that begin at root and sum to targetSum (can end at any descendant).
 * - We use a helper: "From this node, how many paths going downward sum to targetSum?"
 */

/**
 * Total paths in tree that sum to targetSum.
 * = paths starting at root + paths entirely in left + paths entirely in right.
 * Helper countPathsFrom is defined inside so it's always in scope when submitting.
 */
function pathSum(root, targetSum) {
  /** Paths that start at `node` and go downward with sum equal to `targetSum`. */
  function countPathsFrom(node, need) {
    if (node === null) return 0;
    const remaining = need - node.val;
    const finishHere = remaining === 0 ? 1 : 0;
    return (
      finishHere +
      countPathsFrom(node.left, remaining) +
      countPathsFrom(node.right, remaining)
    );
  }

  if (root === null) return 0;
  return (
    countPathsFrom(root, targetSum) +
    pathSum(root.left, targetSum) +
    pathSum(root.right, targetSum)
  );
}

// --- TreeNode for local testing (LeetCode provides it) ---
function TreeNode(val, left, right) {
  this.val = val === undefined ? 0 : val;
  this.left = left === undefined ? null : left;
  this.right = right === undefined ? null : right;
}

// --- Tests ---
function test() {
  // Example 1: [10,5,-3,3,2,null,11,3,-2,null,1], targetSum = 8 → 3
  const r1 = new TreeNode(10);
  r1.left = new TreeNode(5);
  r1.right = new TreeNode(-3);
  r1.left.left = new TreeNode(3);
  r1.left.right = new TreeNode(2);
  r1.right.right = new TreeNode(11);
  r1.left.left.left = new TreeNode(3);
  r1.left.left.right = new TreeNode(-2);
  r1.left.right.right = new TreeNode(1);
  console.log(pathSum(r1, 8)); // 3

  // Example 2: [5,4,8,11,null,13,4,7,2,null,null,5,1], targetSum = 22 → 3
  const r2 = new TreeNode(5);
  r2.left = new TreeNode(4);
  r2.right = new TreeNode(8);
  r2.left.left = new TreeNode(11);
  r2.left.left.left = new TreeNode(7);
  r2.left.left.right = new TreeNode(2);
  r2.right.left = new TreeNode(13);
  r2.right.right = new TreeNode(4);
  r2.right.right.left = new TreeNode(5);
  r2.right.right.right = new TreeNode(1);
  console.log(pathSum(r2, 22)); // 3

  // Failing case: [1,null,2,null,3,null,4,null,5], targetSum = 3 → expected 2 (paths [1,2] and [3])
  const r3 = new TreeNode(1);
  r3.right = new TreeNode(2);
  r3.right.right = new TreeNode(3);
  r3.right.right.right = new TreeNode(4);
  r3.right.right.right.right = new TreeNode(5);
  console.log(pathSum(r3, 3)); // expect 2
}
test();
