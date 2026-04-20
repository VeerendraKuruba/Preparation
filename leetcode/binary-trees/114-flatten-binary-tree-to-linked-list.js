/**
 * 114. Flatten Binary Tree to Linked List
 * Simulate preorder with a stack: push right then left (so left pops first),
 * wire each popped node as prev.right, null out prev.left.
 * O(n) time, O(n) space.
 */
var flatten = function (root) {
  if (!root) return; // nothing to flatten

  const stack = [root]; // iterative preorder: start at root
  let prev = null; // last node we placed on the right-spine "linked list"

  while (stack.length) {
    const node = stack.pop(); // next node in preorder (root before subtrees)

    // Preorder is root, left, right → we want left popped before right, so push right first.
    if (node.right) stack.push(node.right);
    if (node.left) stack.push(node.left);

    if (prev) {
      prev.right = node; // continue the flattened chain along .right
      prev.left = null; // list shape: no left children on the spine
    }
    prev = node; // this node is now the tail of the chain so far
  }

  prev.left = null; // tail of list must not keep a stray left pointer
};
