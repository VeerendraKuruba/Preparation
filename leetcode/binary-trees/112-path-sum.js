/**
 * 112. Path Sum
 * https://leetcode.com/problems/path-sum/
 *
 * @param {TreeNode} root
 * @param {number} targetSum
 * @return {boolean}
 */
var hasPathSum = function (root, targetSum) {
  if (!root) return false;
  if (!root.left && !root.right) return root.val === targetSum;
  return (
    hasPathSum(root.left, targetSum - root.val) ||
    hasPathSum(root.right, targetSum - root.val)
  );
};

var hasPathSumIterative = function (root, targetSum) {
  if (!root) return false;

  const stack = [[root, targetSum - root.val]];

  while (stack.length) {
    const [node, remaining] = stack.pop();

    if (!node.left && !node.right && remaining === 0) return true;

    if (node.right) stack.push([node.right, remaining - node.right.val]);
    if (node.left) stack.push([node.left, remaining - node.left.val]);
  }

  return false;
};
