/**
 * 106. Construct Binary Tree from Inorder and Postorder Traversal
 * https://leetcode.com/problems/construct-binary-tree-from-inorder-and-postorder-traversal/
 *
 * Time: O(n), Space: O(n)
 */

function buildTree(inorder, postorder) {
  const inorderMap = new Map();
  for (let i = 0; i < inorder.length; i++) {
    inorderMap.set(inorder[i], i);
  }

  let postIndex = postorder.length - 1;

  // `build` builds the subtree whose inorder values lie at indices [left, right].
  // `postIndex` walks `postorder` globally from the end: each call consumes the next postorder node as root.
  function build(left, right) {
    if (left > right) return null;

    const rootVal = postorder[postIndex--];
    const node = { val: rootVal, left: null, right: null };

    // In inorder, everything left of the root is the left subtree; everything right is the right subtree.
    const mid = inorderMap.get(rootVal);
    // Postorder is left→right→root, so right subtree comes just before root — build right first.
    node.right = build(mid + 1, right);
    node.left = build(left, mid - 1);

    return node;
  }

  return build(0, inorder.length - 1);
}

// Tests
const t1 = buildTree([9, 3, 15, 20, 7], [9, 15, 7, 20, 3]);
console.log(JSON.stringify(t1)); // {val:3,left:{val:9,...},right:{val:20,...}}

const t2 = buildTree([-1], [-1]);
console.log(t2.val); // -1
