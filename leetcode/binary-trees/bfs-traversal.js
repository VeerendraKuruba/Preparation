/**
 * Binary Tree BFS (Level-Order) Traversal
 *
 * Interview constraints:
 *  - Build TreeNode from scratch (no imports)
 *  - Implement BFS
 *  - Write test cases with assertions
 *
 *        1
 *       / \
 *      2   3
 *     / \    \
 *    4   5    6
 *
 * BFS visits level by level: [[1], [2,3], [4,5,6]]
 *
 * HOW IT WORKS:
 *  - Use a queue (array). Enqueue root.
 *  - Each iteration: dequeue the whole current level, record values,
 *    enqueue children of each node for the next level.
 *  - Repeat until queue is empty.
 */

// ── 1. Build TreeNode from scratch ───────────────────────────────────────────

class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// ── 2. Build tree from LeetCode array ────────────────────────────────────────

/**
 * Converts a level-order array (nulls mark missing nodes) into a TreeNode tree.
 * e.g. [1, 2, 3, null, null, 4, 5]  →  the tree drawn above
 *
 * @param {(number|null)[]} arr
 * @return {TreeNode | null}
 */
function buildTree(arr) {
  if (!arr || arr.length === 0 || arr[0] === null) return null;

  const root = new TreeNode(arr[0]);
  const queue = [root];
  let i = 1;

  while (queue.length > 0 && i < arr.length) {
    const node = queue.shift();

    if (i < arr.length && arr[i] !== null) {
      node.left = new TreeNode(arr[i]);
      queue.push(node.left);
    }
    i++;

    if (i < arr.length && arr[i] !== null) {
      node.right = new TreeNode(arr[i]);
      queue.push(node.right);
    }
    i++;
  }

  return root;
}

// ── 3. BFS traversal ─────────────────────────────────────────────────────────

/**
 * @param {TreeNode | null} root
 * @return {number[][]}  values grouped by level
 */
function levelOrder(root) {
  if (!root) return [];

  const result = [];
  const queue = [root];         // queue always holds nodes for the current level

  while (queue.length > 0) {
    const levelSize = queue.length;  // snapshot: how many nodes are on this level
    const level = [];

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();    // dequeue front
      level.push(node.val);

      if (node.left)  queue.push(node.left);   // enqueue children for next level
      if (node.right) queue.push(node.right);
    }

    result.push(level);
  }

  return result;
}

// ── 3. Test helper ────────────────────────────────────────────────────────────

function assertEqual(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`PASS  ${label}`);
  } else {
    console.error(`FAIL  ${label}`);
    console.error(`      expected: ${e}`);
    console.error(`      actual:   ${a}`);
  }
}

// ── 4. Test cases ─────────────────────────────────────────────────────────────

//        1
//       / \
//      2   3
//     / \    \
//    4   5    6
assertEqual("balanced-ish tree", levelOrder(buildTree([1, 2, 3, 4, 5, null, 6])), [[1], [2, 3], [4, 5, 6]]);

// Single node
assertEqual("single node", levelOrder(buildTree([42])), [[42]]);

// Null root
assertEqual("null root", levelOrder(buildTree([])), []);

// Left-skewed: 1 → 2 → 3
assertEqual("left-skewed",  levelOrder(buildTree([1, 2, null, 3])), [[1], [2], [3]]);

// Right-skewed: 1 → 2 → 3
assertEqual("right-skewed", levelOrder(buildTree([1, null, 2, null, 3])), [[1], [2], [3]]);
