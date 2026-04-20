/**
 * 105. Construct Binary Tree from Preorder and Inorder Traversal
 * https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/
 *
 * Time: O(n), Space: O(n)
 */

function buildTree(preorder, inorder) {
  const inorderMap = new Map();
  for (let i = 0; i < inorder.length; i++) {
    inorderMap.set(inorder[i], i);
  }

  let preIndex = 0;

  // `build` builds the subtree whose inorder values lie at indices [left, right].
  // `preIndex` walks `preorder` globally: each call consumes the next preorder node as root.
  function build(left, right) {
    if (left > right) return null;

    const rootVal = preorder[preIndex++];
    const node = { val: rootVal, left: null, right: null };

    // In inorder, everything left of the root is the left subtree; everything right is the right subtree.
    const mid = inorderMap.get(rootVal);
    // Left child: nodes that appear before `rootVal` in inorder (indices left .. mid-1).
    node.left = build(left, mid - 1);
    // Right child: nodes that appear after `rootVal` in inorder (indices mid+1 .. right).
    node.right = build(mid + 1, right);

    return node;
  }

  return build(0, inorder.length - 1);
}

// Tests
const t1 = buildTree([3, 9, 20, 15, 7], [9, 3, 15, 20, 7]);
console.log(JSON.stringify(t1)); // {val:3,left:{val:9,...},right:{val:20,...}}

const t2 = buildTree([-1], [-1]);
console.log(t2.val); // -1
