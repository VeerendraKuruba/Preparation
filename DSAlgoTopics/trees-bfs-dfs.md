# Trees, BFS, DFS & Binary Search

---

## What is a Tree?

A **tree** is a data structure that looks like an upside-down real tree. It has a **root** at the top and **branches** going downward.

Think of it like a company org chart:

```
                     CEO
                    /   \
                  CTO   CFO
                 /   \     \
               Dev1  Dev2  Accountant
```

Or a file system:

```
              /  (root folder)
            /     \
         home/   etc/
          /  \
       user/  docs/
```

In code, a tree is made of **nodes** connected by **edges** (pointers).

---

## Tree Vocabulary (must know for interviews)

```
                    ┌─────┐
                    │  1  │   ← ROOT (top of tree, no parent)
                    └─────┘
                   /       \
              ┌─────┐     ┌─────┐
              │  2  │     │  3  │  ← CHILDREN of 1
              └─────┘     └─────┘
             /       \         \
        ┌─────┐   ┌─────┐   ┌─────┐
        │  4  │   │  5  │   │  6  │  ← LEAVES (no children)
        └─────┘   └─────┘   └─────┘
```

| Word        | Meaning |
|-------------|---------|
| **Root**    | The topmost node. The tree starts here. (node 1 above) |
| **Node**    | Any single element in the tree |
| **Edge**    | The link (arrow) between parent and child |
| **Parent**  | A node that has children (1 is parent of 2 and 3) |
| **Child**   | A node connected below a parent (2 and 3 are children of 1) |
| **Leaf**    | A node with NO children (4, 5, 6 are leaves) |
| **Siblings**| Nodes that share the same parent (2 and 3 are siblings) |
| **Subtree** | Any node plus all its descendants (node 2, 4, 5 form a subtree) |
| **Height**  | Number of edges on longest path from root to a leaf (height = 2 above) |
| **Depth**   | Number of edges from root to a specific node (depth of 4 = 2) |
| **Level**   | All nodes at same depth. Level 0 = root. Level 1 = children of root. |

### Visualizing Height and Depth

```
                    ┌─────┐
                    │  A  │   ← depth 0, level 0
                    └─────┘
                   /       \
              ┌─────┐     ┌─────┐
              │  B  │     │  C  │  ← depth 1, level 1
              └─────┘     └─────┘
             /
        ┌─────┐
        │  D  │                    ← depth 2, level 2
        └─────┘

Height of tree = 2  (longest path from root A → B → D = 2 edges)
Height of node C = 0  (it's a leaf)
Height of node B = 1  (B → D = 1 edge)
Depth of node D = 2   (A → B → D = 2 edges from root)
```

---

## Binary Tree

A **binary tree** is a special tree where each node has **at most 2 children**: a **left** child and a **right** child.

```
         ┌─────┐
         │  1  │
         └─────┘
        /         \
   ┌─────┐       ┌─────┐
   │  2  │       │  3  │
   └─────┘       └─────┘
  /       \
┌─────┐  ┌─────┐
│  4  │  │  5  │
└─────┘  └─────┘
```

### Node Structure in JavaScript

```javascript
class TreeNode {
  constructor(val) {
    this.val = val;
    this.left = null;   // left child
    this.right = null;  // right child
  }
}
```

### Building the tree above manually (step by step)

```javascript
// Step 1: Create each node separately
const node1 = new TreeNode(1);
const node2 = new TreeNode(2);
const node3 = new TreeNode(3);
const node4 = new TreeNode(4);
const node5 = new TreeNode(5);

// Step 2: Connect them (link parent → children)
node1.left  = node2;   // 1's left child is 2
node1.right = node3;   // 1's right child is 3
node2.left  = node4;   // 2's left child is 4
node2.right = node5;   // 2's right child is 5

// node1 is the root
const root = node1;

// Verify connections
console.log(root.val);              // 1
console.log(root.left.val);         // 2
console.log(root.right.val);        // 3
console.log(root.left.left.val);    // 4
console.log(root.left.right.val);   // 5
console.log(root.right.left);       // null (3 has no left child)
```

### Building a tree from an array (LeetCode style)

LeetCode gives trees as arrays like `[1, 2, 3, 4, 5, null, 6]`.
The rule: for a node at index `i`, left child is at `2*i+1`, right child is at `2*i+2`.

```
Array:   [1, 2, 3, 4, 5, null, 6]
Index:    0  1  2  3  4   5    6

               ┌─────┐
               │  1  │   (index 0)
               └─────┘
              /         \
         ┌─────┐       ┌─────┐
         │  2  │       │  3  │   (index 1, 2)
         └─────┘       └─────┘
        /       \           \
   ┌─────┐   ┌─────┐     ┌─────┐
   │  4  │   │  5  │     │  6  │  (index 3, 4, 6)
   └─────┘   └─────┘     └─────┘
```

```javascript
function buildTreeFromArray(arr) {
  if (!arr || arr.length === 0) return null;

  // Create all nodes (null stays null)
  const nodes = arr.map(val => val !== null ? new TreeNode(val) : null);

  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i] === null) continue;     // skip null slots

    const leftIdx  = 2 * i + 1;
    const rightIdx = 2 * i + 2;

    if (leftIdx < nodes.length)  nodes[i].left  = nodes[leftIdx];
    if (rightIdx < nodes.length) nodes[i].right = nodes[rightIdx];
  }

  return nodes[0]; // root is always index 0
}

const root = buildTreeFromArray([1, 2, 3, 4, 5, null, 6]);
console.log(root.val);              // 1
console.log(root.left.val);         // 2
console.log(root.right.val);        // 3
console.log(root.right.right.val);  // 6
```

---

## Types of Binary Trees

```
FULL Binary Tree             COMPLETE Binary Tree         PERFECT Binary Tree
(every node has 0 or 2      (all levels filled except    (all levels completely
 children, never 1)          last, last fills left→right)  filled)

      ┌─┐                         ┌─┐                        ┌─┐
      │1│                         │1│                        │1│
      └─┘                         └─┘                        └─┘
     /   \                       /   \                      /   \
   ┌─┐   ┌─┐                  ┌─┐   ┌─┐                  ┌─┐   ┌─┐
   │2│   │3│                  │2│   │3│                  │2│   │3│
   └─┘   └─┘                  └─┘   └─┘                  └─┘   └─┘
  /  \                        /  \  /                   / \   / \
┌─┐  ┌─┐                   ┌─┐ ┌─┐┌─┐                ┌─┐┌─┐┌─┐┌─┐
│4│  │5│                   │4│ │5││6│                 │4││5││6││7│
└─┘  └─┘                   └─┘ └─┘└─┘                └─┘└─┘└─┘└─┘
```

**SKEWED tree (worst case — acts like a linked list):**

```
┌─┐
│1│
└─┘
  \
  ┌─┐
  │2│
  └─┘
    \
    ┌─┐
    │3│
    └─┘
      \
      ┌─┐
      │4│
      └─┘
(All nodes go to the right — height = n-1, not log n)
```

---

## DFS — Depth First Search

**DFS** means: go as **deep as possible** down one branch before coming back and exploring other branches. Like going into a maze — you keep going forward until a dead end, then backtrack.

There are 3 types of DFS, based on **when you visit the root node**:

```
         ┌─────┐
         │  A  │
         └─────┘
        /         \
   ┌─────┐       ┌─────┐
   │  B  │       │  C  │
   └─────┘       └─────┘
  /       \
┌─────┐  ┌─────┐
│  D  │  │  E  │
└─────┘  └─────┘
```

| Type        | Order                     | Visit sequence for tree above |
|-------------|---------------------------|-------------------------------|
| **Inorder** | Left → Root → Right       | D, B, E, A, C                 |
| **Preorder**| Root → Left → Right       | A, B, D, E, C                 |
| **Postorder**| Left → Right → Root      | D, E, B, C, A                 |

---

### DFS 1 — Inorder (Left → Root → Right)

**Mental model:** Think of reading a book left-to-right. You go as far left as possible, then read the current node, then explore right.

```
Tree:          A
              / \
             B   C
            / \
           D   E

Walk:
1. Go left from A → reach B → go left from B → reach D
2. D has no left → VISIT D ← (first visit)
3. Back to B → VISIT B ← (second visit)
4. Go right from B → reach E
5. E has no left → VISIT E ← (third visit)
6. Back to A → VISIT A ← (fourth visit)
7. Go right from A → reach C
8. C has no left → VISIT C ← (fifth visit)

Result: D → B → E → A → C
```

```javascript
function inorder(root) {
  if (root === null) return;   // base case: empty node, stop

  inorder(root.left);          // 1. Go LEFT first (recurse down)
  console.log(root.val);       // 2. VISIT current node
  inorder(root.right);         // 3. Go RIGHT last (recurse down)
}

// Build: A=1, B=2, C=3, D=4, E=5
const root = buildTreeFromArray([1, 2, 3, 4, 5]);
inorder(root);  // 4, 2, 5, 1, 3

// Collect into array (more useful):
function inorderArray(root) {
  const result = [];
  function dfs(node) {
    if (node === null) return;
    dfs(node.left);
    result.push(node.val);
    dfs(node.right);
  }
  dfs(root);
  return result;
}
console.log(inorderArray(root));  // [4, 2, 5, 1, 3]
```

**Why inorder matters:** On a Binary Search Tree (BST), inorder traversal gives you the values in **sorted order**. That's a superpower.

---

### DFS 2 — Preorder (Root → Left → Right)

**Mental model:** Visit the node BEFORE going into children. Great for copying a tree or printing a directory structure.

```
Tree:          A
              / \
             B   C
            / \
           D   E

Walk:
1. VISIT A ← (immediately when we arrive)
2. Go left to B → VISIT B ←
3. Go left to D → VISIT D ←
4. D has no children, go back to B
5. Go right to E → VISIT E ←
6. E has no children, go back to A
7. Go right to C → VISIT C ←

Result: A → B → D → E → C
```

```javascript
function preorder(root) {
  if (root === null) return;

  console.log(root.val);       // 1. VISIT current node FIRST
  preorder(root.left);         // 2. Then go LEFT
  preorder(root.right);        // 3. Then go RIGHT
}

preorder(root);  // 1, 2, 4, 5, 3

function preorderArray(root) {
  const result = [];
  function dfs(node) {
    if (node === null) return;
    result.push(node.val);   // visit first
    dfs(node.left);
    dfs(node.right);
  }
  dfs(root);
  return result;
}
console.log(preorderArray(root));  // [1, 2, 4, 5, 3]
```

---

### DFS 3 — Postorder (Left → Right → Root)

**Mental model:** Visit the node AFTER both children. Great for deleting a tree (delete children before parent) or calculating sizes bottom-up.

```
Tree:          A
              / \
             B   C
            / \
           D   E

Walk:
1. Go all the way left to D
2. D has no children → VISIT D ←
3. Back to B, go right to E
4. E has no children → VISIT E ←
5. Both children of B done → VISIT B ←
6. Back to A, go right to C
7. C has no children → VISIT C ←
8. Both children of A done → VISIT A ←

Result: D → E → B → C → A
```

```javascript
function postorder(root) {
  if (root === null) return;

  postorder(root.left);        // 1. Go LEFT
  postorder(root.right);       // 2. Go RIGHT
  console.log(root.val);       // 3. VISIT current node LAST
}

postorder(root);  // 4, 5, 2, 3, 1

function postorderArray(root) {
  const result = [];
  function dfs(node) {
    if (node === null) return;
    dfs(node.left);
    dfs(node.right);
    result.push(node.val);   // visit last
  }
  dfs(root);
  return result;
}
console.log(postorderArray(root));  // [4, 5, 2, 3, 1]
```

---

### DFS Cheat Sheet

```
Remember the position of "ROOT" in the name:

PRE-order  = ROOT comes PRE (before) left and right  → Root, Left, Right
IN-order   = ROOT comes IN the middle of left, right  → Left, Root, Right
POST-order = ROOT comes POST (after) left and right   → Left, Right, Root
```

### DFS Iterative version (using a Stack)

Recursion uses the call stack. You can do the same with your own explicit stack.

```javascript
// Iterative Preorder using Stack
function preorderIterative(root) {
  if (root === null) return [];

  const result = [];
  const stack = [root];   // Start with root in stack

  while (stack.length > 0) {
    const node = stack.pop();    // Take top of stack
    result.push(node.val);       // Visit it

    // Push RIGHT first so LEFT is processed first (LIFO)
    if (node.right) stack.push(node.right);
    if (node.left)  stack.push(node.left);
  }

  return result;
}

console.log(preorderIterative(root));  // [1, 2, 4, 5, 3]
```

---

## BFS — Breadth First Search (Level Order)

**BFS** means: visit nodes **level by level**, left to right. Like filling a bathtub — water fills one level completely before going deeper.

```
Tree:
              ┌─────┐
              │  1  │        ← Level 0: visit 1
              └─────┘
             /         \
        ┌─────┐       ┌─────┐
        │  2  │       │  3  │  ← Level 1: visit 2, 3
        └─────┘       └─────┘
       /       \           \
  ┌─────┐   ┌─────┐     ┌─────┐
  │  4  │   │  5  │     │  6  │  ← Level 2: visit 4, 5, 6
  └─────┘   └─────┘     └─────┘

BFS order: 1, 2, 3, 4, 5, 6
```

BFS uses a **Queue** (first in, first out — like a line at a store):

```
Step 1: Queue = [1]
        Dequeue 1, visit it, enqueue its children (2, 3)
        Queue = [2, 3]

Step 2: Queue = [2, 3]
        Dequeue 2, visit it, enqueue its children (4, 5)
        Queue = [3, 4, 5]

Step 3: Queue = [3, 4, 5]
        Dequeue 3, visit it, enqueue its children (6)
        Queue = [4, 5, 6]

Step 4: Queue = [4, 5, 6]
        Dequeue 4, visit it, no children to enqueue
        Queue = [5, 6]

Step 5: Queue = [5, 6]
        Dequeue 5, visit it, no children
        Queue = [6]

Step 6: Queue = [6]
        Dequeue 6, visit it, no children
        Queue = []  ← DONE
```

```javascript
function bfs(root) {
  if (root === null) return [];

  const result = [];
  const queue = [root];    // Start: put root in queue

  while (queue.length > 0) {
    const node = queue.shift();   // Dequeue from FRONT
    result.push(node.val);        // Visit it

    if (node.left)  queue.push(node.left);   // Enqueue left child
    if (node.right) queue.push(node.right);  // Enqueue right child
  }

  return result;
}

const root = buildTreeFromArray([1, 2, 3, 4, 5, null, 6]);
console.log(bfs(root));  // [1, 2, 3, 4, 5, 6]
```

### BFS Level by Level (grouped by level)

Very common interview question: return `[[1], [2,3], [4,5,6]]` instead of `[1,2,3,4,5,6]`.

```
Level 0: [1]
Level 1: [2, 3]
Level 2: [4, 5, 6]
```

```javascript
function bfsLevelOrder(root) {
  if (root === null) return [];

  const result = [];
  const queue = [root];

  while (queue.length > 0) {
    const levelSize = queue.length;  // How many nodes are in THIS level
    const level = [];

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      level.push(node.val);

      if (node.left)  queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    result.push(level);   // Add this whole level as an array
  }

  return result;
}

console.log(bfsLevelOrder(root));
// [[1], [2, 3], [4, 5, 6]]
```

---

## DFS vs BFS — When to use which?

```
DFS (goes deep)                    BFS (goes wide)
──────────────────────────────     ──────────────────────────────
Uses: recursion or a Stack         Uses: a Queue
Memory: O(height of tree)          Memory: O(width of tree)

Use DFS when:                      Use BFS when:
✓ Find a path from root to leaf    ✓ Find SHORTEST path
✓ Check if value exists            ✓ Level-by-level processing
✓ Calculate height/depth           ✓ Find closest node to root
✓ Inorder/Preorder/Postorder       ✓ Level order traversal

Example: "Does path sum = target?" Example: "What is minimum depth?"
```

---

## Binary Search Tree (BST)

A **BST** is a binary tree with a special rule:

```
For every node:
  ┌──────────────────────────────────────────────────────┐
  │  ALL values in LEFT subtree < current node's value   │
  │  ALL values in RIGHT subtree > current node's value  │
  └──────────────────────────────────────────────────────┘
```

```
Valid BST:

              ┌─────┐
              │  8  │
              └─────┘
             /         \
        ┌─────┐       ┌─────┐
        │  3  │       │ 10  │
        └─────┘       └─────┘
       /       \           \
  ┌─────┐   ┌─────┐     ┌─────┐
  │  1  │   │  6  │     │ 14  │
  └─────┘   └─────┘     └─────┘
            /    \       /
         ┌───┐ ┌───┐  ┌───┐
         │ 4 │ │ 7 │  │13 │
         └───┘ └───┘  └───┘

Check:
  - 3 < 8 ✓ (left of 8)
  - 10 > 8 ✓ (right of 8)
  - 1 < 3 ✓ (left of 3)
  - 6 > 3 ✓ (right of 3)
  - 4 < 6 ✓ (left of 6)
  - 7 > 6 ✓ (right of 6)
```

The BST rule lets you **search in O(log n)** instead of O(n) — at each step you eliminate half the tree.

### BST — Search

```
Search for 6 in the BST above:

Start at root 8:
  Is 6 == 8? No.
  Is 6 < 8? Yes → go LEFT to 3

At node 3:
  Is 6 == 3? No.
  Is 6 > 3? Yes → go RIGHT to 6

At node 6:
  Is 6 == 6? YES → FOUND!

Only visited 3 nodes out of 9. That's O(log n).
```

```javascript
function searchBST(root, target) {
  if (root === null) return null;    // Not found
  if (root.val === target) return root;  // Found!

  if (target < root.val) {
    return searchBST(root.left, target);   // Go left
  } else {
    return searchBST(root.right, target);  // Go right
  }
}

// Iterative version (no recursion):
function searchBSTIterative(root, target) {
  let current = root;
  while (current !== null) {
    if (target === current.val) return current;
    if (target < current.val)  current = current.left;
    else                       current = current.right;
  }
  return null;  // Not found
}
```

### BST — Insert

```
Insert 5 into BST:

Start at root 8:  5 < 8 → go left
At 3:             5 > 3 → go right
At 6:             5 < 6 → go left
At 4:             5 > 4 → go right
4.right is null → INSERT 5 here!

              ┌─────┐
              │  8  │
              └─────┘
             /         \
        ┌─────┐       ┌─────┐
        │  3  │       │ 10  │
        └─────┘       └─────┘
               \
             ┌─────┐
             │  6  │
             └─────┘
             /
          ┌─────┐
          │  4  │
          └─────┘
               \
             ┌─────┐
             │  5  │  ← inserted here
             └─────┘
```

```javascript
function insertBST(root, val) {
  if (root === null) return new TreeNode(val);  // Found the spot!

  if (val < root.val) {
    root.left = insertBST(root.left, val);   // Go left, assign result back
  } else {
    root.right = insertBST(root.right, val); // Go right, assign result back
  }

  return root;  // Return current node (unchanged, just connected subtree)
}

// Build BST by inserting values one by one
function buildBST(values) {
  let root = null;
  for (const val of values) {
    root = insertBST(root, val);
  }
  return root;
}

const bst = buildBST([8, 3, 10, 1, 6, 14, 4, 7, 13]);
console.log(searchBST(bst, 7)?.val);   // 7
console.log(searchBST(bst, 99));        // null
```

### BST — Inorder gives sorted order

```javascript
// BST built from [8, 3, 10, 1, 6, 14, 4, 7, 13]
console.log(inorderArray(bst));
// [1, 3, 4, 6, 7, 8, 10, 13, 14]  ← SORTED! This is the magic of BST.
```

---

## Binary Search (on a sorted array)

**Binary Search** is an algorithm to find a target in a **sorted array** in O(log n) time.

**The idea:** Each time, look at the **middle element**. If it's the target, done. If target is smaller, search the left half. If larger, search the right half. Repeat.

```
Array: [1, 3, 5, 7, 9, 11, 13, 15, 17]
Target: 7

Step 1: left=0, right=8, mid=4 → arr[4] = 9
         [1, 3, 5, 7, 9, 11, 13, 15, 17]
                         ▲
                        mid
        9 > 7 → search left half: right = mid - 1 = 3

Step 2: left=0, right=3, mid=1 → arr[1] = 3
         [1, 3, 5, 7]
              ▲
             mid
        3 < 7 → search right half: left = mid + 1 = 2

Step 3: left=2, right=3, mid=2 → arr[2] = 5
         [5, 7]
          ▲
         mid
        5 < 7 → search right half: left = mid + 1 = 3

Step 4: left=3, right=3, mid=3 → arr[3] = 7
         [7]
          ▲
         mid
        7 == 7 → FOUND at index 3!

Only 4 steps for 9 elements instead of 9. That's O(log n).
```

```javascript
function binarySearch(arr, target) {
  let left  = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);  // Find middle index

    if (arr[mid] === target) return mid;          // Found!
    if (arr[mid] < target)  left  = mid + 1;     // Target is to the right
    else                    right = mid - 1;     // Target is to the left
  }

  return -1;  // Not found
}

const arr = [1, 3, 5, 7, 9, 11, 13, 15, 17];
console.log(binarySearch(arr, 7));    // 3 (index)
console.log(binarySearch(arr, 10));   // -1 (not found)
console.log(binarySearch(arr, 1));    // 0
console.log(binarySearch(arr, 17));   // 8
```

**Why `Math.floor((left + right) / 2)` and not `(left + right) / 2`?**
In other languages, `left + right` can overflow if numbers are huge. Safe version: `left + Math.floor((right - left) / 2)`.

---

## Common Tree Examples

### Example 1: Maximum Depth of Binary Tree

**Problem:** Find the height (max depth) of a tree.

```
        ┌─────┐
        │  3  │      Height = 3
        └─────┘      (longest path: 3 → 9 → 15 or 3 → 20 → 15)
       /       \
  ┌─────┐   ┌─────┐
  │  9  │   │ 20  │
  └─────┘   └─────┘
            /     \
         ┌───┐   ┌───┐
         │15 │   │ 7 │
         └───┘   └───┘
```

**Idea:** Height of a node = 1 + max(height of left, height of right).
A null node has height 0.

```javascript
function maxDepth(root) {
  if (root === null) return 0;   // Base case: empty = depth 0

  const leftDepth  = maxDepth(root.left);
  const rightDepth = maxDepth(root.right);

  return 1 + Math.max(leftDepth, rightDepth);
}

// Tree: [3, 9, 20, null, null, 15, 7]
const root = buildTreeFromArray([3, 9, 20, null, null, 15, 7]);
console.log(maxDepth(root));  // 3
```

---

### Example 2: Check if two trees are identical

```javascript
function isSameTree(p, q) {
  if (p === null && q === null) return true;  // Both empty = same
  if (p === null || q === null) return false; // One empty = not same
  if (p.val !== q.val)         return false; // Different values

  return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}
```

---

### Example 3: Find all values at a given level using BFS

```javascript
function getLevel(root, targetLevel) {
  if (root === null) return [];

  const queue = [root];
  let level = 0;

  while (queue.length > 0) {
    const size = queue.length;

    if (level === targetLevel) {
      return queue.map(node => node.val);  // Return values at this level
    }

    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      if (node.left)  queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    level++;
  }

  return [];
}

const root = buildTreeFromArray([1, 2, 3, 4, 5, null, 6]);
console.log(getLevel(root, 0));  // [1]
console.log(getLevel(root, 1));  // [2, 3]
console.log(getLevel(root, 2));  // [4, 5, 6]
```

---

### Example 4: Validate a BST

**Problem:** Check if a binary tree satisfies BST property everywhere.

**Common mistake:** Only checking left < root < right at each node locally is NOT enough.

```
INVALID BST (looks valid locally but isn't):

        ┌─────┐
        │  5  │
        └─────┘
       /         \
  ┌─────┐       ┌─────┐
  │  4  │       │  6  │
  └─────┘       └─────┘
 /
┌─────┐
│  7  │   ← 7 > 5! This violates BST even though 7 > 4 locally.
└─────┘

7 is in the LEFT subtree of 5, but 7 > 5. INVALID.
```

```javascript
function isValidBST(root, min = -Infinity, max = Infinity) {
  if (root === null) return true;  // Empty tree is valid

  if (root.val <= min || root.val >= max) return false;  // Out of allowed range

  return (
    isValidBST(root.left,  min, root.val) &&  // Left must be < current val
    isValidBST(root.right, root.val, max)     // Right must be > current val
  );
}

const validBST   = buildBST([5, 3, 7, 1, 4, 6, 8]);
const invalidBST = buildTreeFromArray([5, 4, 6, null, null, 3, 7]);

console.log(isValidBST(validBST));    // true
console.log(isValidBST(invalidBST));  // false
```

---

## Complexity Summary

| Operation          | Binary Tree (no order) | BST (balanced) | BST (skewed) |
|--------------------|------------------------|----------------|--------------|
| Search             | O(n)                   | O(log n)       | O(n)         |
| Insert             | O(n)                   | O(log n)       | O(n)         |
| Delete             | O(n)                   | O(log n)       | O(n)         |
| Inorder / DFS      | O(n)                   | O(n)           | O(n)         |
| BFS (level order)  | O(n)                   | O(n)           | O(n)         |
| Max Depth          | O(n)                   | O(n)           | O(n)         |

**Binary Search (sorted array):**

| Operation      | Time      | Space |
|----------------|-----------|-------|
| Binary Search  | O(log n)  | O(1)  |
| Linear Search  | O(n)      | O(1)  |

**Space complexity for traversals:**
- DFS recursive: O(h) where h = height (call stack depth)
- BFS: O(w) where w = max width of tree

---

## Interview Q&A — Frontend Engineers

---

**Q1: What is a tree? Give a real-world example from the web.**

**A:** A tree is a hierarchical data structure where each node has a parent (except the root) and zero or more children. In the browser, the **DOM (Document Object Model) is a tree** — `<html>` is the root, `<head>` and `<body>` are children, and so on. React's virtual DOM is also a tree. File system paths are trees too.

---

**Q2: What is the difference between BFS and DFS?**

**A:** BFS visits nodes **level by level** using a Queue. DFS goes **as deep as possible** down one branch before backtracking, using a Stack (or recursion). BFS finds the shortest path. DFS uses less memory when the tree is wide, more when it's deep. In DOM traversal, BFS processes all siblings before children; DFS processes descendants first.

---

**Q3: When would you use BFS vs DFS?**

**A:**
- **BFS:** Find nodes closest to root, shortest path, level-by-level processing (e.g. find nearest ancestor in DOM).
- **DFS:** Check if a path exists, calculate subtree properties, clone/compare trees, search through the whole tree.

---

**Q4: What is inorder traversal and why does it matter?**

**A:** Inorder = Left → Root → Right. On a Binary Search Tree, inorder always produces values in **ascending sorted order**. It's how you can extract a sorted list from a BST in O(n).

---

**Q5: What is a Binary Search Tree and what is its advantage?**

**A:** A BST is a binary tree where every left child is smaller than its parent and every right child is greater. This lets you search, insert, and delete in **O(log n)** time on a balanced BST, versus O(n) for a plain array. It's like a sorted phonebook where you always open to the middle.

---

**Q6: What is binary search? How is it different from BST?**

**A:** Binary Search is an **algorithm** that searches a **sorted array** by repeatedly halving the search space — O(log n). A BST is a **data structure** (tree of nodes) that applies the same halving idea during traversal. Binary search works on flat sorted arrays. BST is a tree that maintains sorted order dynamically.

---

**Q7: What is the time complexity of searching in a BST?**

**A:** O(log n) for a **balanced** BST. But if the BST is **skewed** (all nodes go one direction, like a sorted list inserted in order), it degrades to O(n). Balanced BSTs like AVL or Red-Black trees guarantee O(log n) always.

---

**Q8: How do you find the height of a binary tree?**

**A:** Recursively: height = 1 + max(height(left), height(right)). Base case: null node has height 0. Time: O(n) since we visit every node.

---

**Q9: You have a deeply nested React component tree. You want to find the nearest parent with a specific prop. Would you use BFS or DFS?**

**A:** DFS — you're walking upward from a specific child through parent references. In React you'd typically use Context or look at the fiber tree. But if you had to traverse a component tree structure manually looking for the nearest matching ancestor, DFS would be more natural.

---

**Q10: What happens to BST performance when you insert already-sorted data?**

**A:** It degrades to a **skewed tree** (like a linked list), making all operations O(n) instead of O(log n). For example inserting [1, 2, 3, 4, 5] into a BST produces a chain going all right. This is why self-balancing trees (AVL, Red-Black) exist.

---

**Q11: What is the difference between tree height and tree depth?**

**A:** **Depth** of a node = distance from root to that node. **Height** of a node = distance from that node to its deepest leaf. The height of the entire tree = height of the root = max depth of any leaf.

---

**Q12: Can you do BFS without a queue?**

**A:** Not easily — BFS inherently needs a FIFO structure to process nodes in order. You could simulate it with two arrays (current level and next level) but that's still queue-like. DFS can be done with a stack (iteratively) or recursion.

---

## Quick Reference Card

```
DFS Types — remember the ROOT position:
  PRE-order:  ROOT, left, right  → [visit first, then explore]
  IN-order:   left, ROOT, right  → [gives sorted order in BST]
  POST-order: left, right, ROOT  → [visit last, after children]

BFS: uses Queue (FIFO) — level by level

BST rule: left < node < right  →  search O(log n)

Binary Search: sorted array + two pointers (left, right, mid)

Tree height: 1 + max(left height, right height)
Null node height: 0
```
