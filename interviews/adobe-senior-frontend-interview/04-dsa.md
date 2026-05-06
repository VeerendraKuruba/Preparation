# DSA — Adobe Confirmed Questions

> Adobe DSA focus: stacks, queues, trees, graphs, flood fill, LRU cache, chess OOP design, intervals.
> Difficulty: Medium LeetCode. You MUST explain your approach BEFORE coding.

---

## Confirmed Adobe Interview Questions

From candidate reports (2024–2025):
- Implement LRU Cache
- Flood Fill algorithm
- Design classes for a Chess game (OOP)
- Queue using two stacks
- Two Sum
- Valid Parentheses
- Design a file system (OOP)
- Serialize/Deserialize binary tree

---

## 1. Valid Parentheses + Extensions

```js
// Basic: check if brackets are balanced
function isValid(s) {
  const stack = [];
  const pairs = { ')': '(', '}': '{', ']': '[' };

  for (const char of s) {
    if ('({['.includes(char)) {
      stack.push(char);
    } else {
      if (stack.pop() !== pairs[char]) return false;
    }
  }
  return stack.length === 0;
}

isValid('()[]{}'); // true
isValid('([)]');   // false
isValid('{[]}');   // true

// Extension: minimum removals to make valid
function minRemoveToMakeValid(s) {
  const stack = []; // stores indices of unmatched '('
  const toRemove = new Set();

  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') {
      stack.push(i);
    } else if (s[i] === ')') {
      if (stack.length) stack.pop(); // matched
      else toRemove.add(i);          // unmatched ')'
    }
  }

  // Remaining in stack are unmatched '('
  stack.forEach(i => toRemove.add(i));

  return s.split('').filter((_, i) => !toRemove.has(i)).join('');
}

minRemoveToMakeValid('lee(t(c)o)de)'); // 'lee(t(c)o)de'
minRemoveToMakeValid('a)b(c)d');       // 'ab(c)d'
```

---

## 2. Queue Using Two Stacks

**Q: Implement a queue (FIFO) using two stacks (LIFO).**

```js
class MyQueue {
  constructor() {
    this.inStack = [];   // for push operations
    this.outStack = [];  // for pop/peek operations
  }

  // O(1) amortized
  push(x) {
    this.inStack.push(x);
  }

  // O(1) amortized — each element moves at most once
  pop() {
    this._transfer();
    return this.outStack.pop();
  }

  peek() {
    this._transfer();
    return this.outStack[this.outStack.length - 1];
  }

  empty() {
    return this.inStack.length === 0 && this.outStack.length === 0;
  }

  _transfer() {
    // Only transfer when outStack is empty — amortized O(1)
    if (!this.outStack.length) {
      while (this.inStack.length) {
        this.outStack.push(this.inStack.pop());
      }
    }
  }
}

// Test
const q = new MyQueue();
q.push(1); q.push(2); q.push(3);
q.peek(); // 1
q.pop();  // 1
q.pop();  // 2
```

---

## 3. Flood Fill (Confirmed at Adobe)

**Q: Given an image (2D grid of pixels), a start position, and a new color — fill the connected region.**

```js
// Time: O(n*m) | Space: O(n*m) call stack
function floodFill(image, sr, sc, newColor) {
  const originalColor = image[sr][sc];

  // No-op if same color (prevents infinite recursion)
  if (originalColor === newColor) return image;

  fill(image, sr, sc, originalColor, newColor);
  return image;
}

function fill(image, r, c, originalColor, newColor) {
  const rows = image.length, cols = image[0].length;

  // Bounds check and color match check
  if (r < 0 || r >= rows || c < 0 || c >= cols) return;
  if (image[r][c] !== originalColor) return;

  image[r][c] = newColor; // paint current cell

  // Flood fill in 4 directions
  fill(image, r + 1, c, originalColor, newColor);
  fill(image, r - 1, c, originalColor, newColor);
  fill(image, r, c + 1, originalColor, newColor);
  fill(image, r, c - 1, originalColor, newColor);
}

// Test
const image = [[1,1,1],[1,1,0],[1,0,1]];
floodFill(image, 1, 1, 2);
// [[2,2,2],[2,2,0],[2,0,1]] — 0 and isolated 1 not filled

// Iterative version (avoids stack overflow for large grids)
function floodFillIterative(image, sr, sc, newColor) {
  const originalColor = image[sr][sc];
  if (originalColor === newColor) return image;

  const queue = [[sr, sc]];
  const rows = image.length, cols = image[0].length;

  while (queue.length) {
    const [r, c] = queue.shift();
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
    if (image[r][c] !== originalColor) continue;

    image[r][c] = newColor;
    queue.push([r+1,c], [r-1,c], [r,c+1], [r,c-1]);
  }
  return image;
}
```

---

## 4. LRU Cache (High-priority at Adobe)

*Full implementation covered in Commvault 04-dsa.md — replicated here with Adobe context:*

```js
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map(); // Map preserves insertion order — O(1) access + order

    // Dummy head and tail nodes for O(1) insertion/deletion
    this.head = { key: null, val: null };
    this.tail = { key: null, val: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    this._moveToFront(node);
    return node.val;
  }

  put(key, value) {
    if (this.map.has(key)) {
      const node = this.map.get(key);
      node.val = value;
      this._moveToFront(node);
    } else {
      if (this.map.size >= this.capacity) {
        // Evict least recently used (node just before tail)
        const lru = this.tail.prev;
        this._remove(lru);
        this.map.delete(lru.key);
      }
      const node = { key, val: value };
      this._addFront(node);
      this.map.set(key, node);
    }
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _addFront(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  _moveToFront(node) {
    this._remove(node);
    this._addFront(node);
  }
}
```

---

## 5. Design Chess Game (OOP — Confirmed at Adobe)

**Q: Design classes and interfaces for a chess game.**

```js
// Enums
const Color = { WHITE: 'white', BLACK: 'black' };
const PieceType = { KING: 'K', QUEEN: 'Q', ROOK: 'R', BISHOP: 'B', KNIGHT: 'N', PAWN: 'P' };

// Position value object
class Position {
  constructor(row, col) {
    this.row = row; // 0-7
    this.col = col; // 0-7
  }
  isValid() {
    return this.row >= 0 && this.row < 8 && this.col >= 0 && this.col < 8;
  }
  equals(other) {
    return this.row === other.row && this.col === other.col;
  }
  toString() {
    return `${'abcdefgh'[this.col]}${this.row + 1}`; // e.g., 'e4'
  }
}

// Abstract piece
class Piece {
  constructor(color, type) {
    this.color = color;
    this.type = type;
    this.hasMoved = false;
  }

  // Abstract — each piece defines its own move validation
  isValidMove(from, to, board) {
    throw new Error('isValidMove must be implemented by subclass');
  }

  // Helper: is there a clear path between from and to?
  isPathClear(from, to, board) {
    const dRow = Math.sign(to.row - from.row);
    const dCol = Math.sign(to.col - from.col);
    let r = from.row + dRow, c = from.col + dCol;
    while (r !== to.row || c !== to.col) {
      if (board.getPiece(r, c)) return false;
      r += dRow; c += dCol;
    }
    return true;
  }
}

class Rook extends Piece {
  constructor(color) { super(color, PieceType.ROOK); }

  isValidMove(from, to, board) {
    // Must move in straight line
    if (from.row !== to.row && from.col !== to.col) return false;
    // Path must be clear
    if (!this.isPathClear(from, to, board)) return false;
    // Can't capture own piece
    const target = board.getPiece(to.row, to.col);
    return !target || target.color !== this.color;
  }
}

class Bishop extends Piece {
  constructor(color) { super(color, PieceType.BISHOP); }

  isValidMove(from, to, board) {
    // Must move diagonally
    if (Math.abs(to.row - from.row) !== Math.abs(to.col - from.col)) return false;
    if (!this.isPathClear(from, to, board)) return false;
    const target = board.getPiece(to.row, to.col);
    return !target || target.color !== this.color;
  }
}

class Knight extends Piece {
  constructor(color) { super(color, PieceType.KNIGHT); }

  isValidMove(from, to, board) {
    // L-shape: 2+1 or 1+2
    const dr = Math.abs(to.row - from.row);
    const dc = Math.abs(to.col - from.col);
    if (!((dr === 2 && dc === 1) || (dr === 1 && dc === 2))) return false;
    // Knights jump — path doesn't matter
    const target = board.getPiece(to.row, to.col);
    return !target || target.color !== this.color;
  }
}

class Pawn extends Piece {
  constructor(color) { super(color, PieceType.PAWN); }

  isValidMove(from, to, board) {
    const dir = this.color === Color.WHITE ? 1 : -1;
    const dr = to.row - from.row;
    const dc = to.col - from.col;
    const target = board.getPiece(to.row, to.col);

    // Forward 1
    if (dc === 0 && dr === dir && !target) return true;
    // Forward 2 (first move only)
    if (dc === 0 && dr === 2 * dir && !this.hasMoved && !target &&
        !board.getPiece(from.row + dir, from.col)) return true;
    // Diagonal capture
    if (Math.abs(dc) === 1 && dr === dir && target && target.color !== this.color) return true;

    return false;
  }
}

// Board
class Board {
  constructor() {
    this.grid = Array.from({ length: 8 }, () => new Array(8).fill(null));
    this._setup();
  }

  _setup() {
    // Place pieces (simplified — just rooks and pawns for brevity)
    [[0, Color.WHITE], [7, Color.BLACK]].forEach(([row, color]) => {
      this.grid[row][0] = new Rook(color);
      this.grid[row][7] = new Rook(color);
      // Add other pieces...
    });
    [1, 6].forEach(row => {
      const color = row === 1 ? Color.WHITE : Color.BLACK;
      for (let c = 0; c < 8; c++) this.grid[row][c] = new Pawn(color);
    });
  }

  getPiece(row, col) { return this.grid[row]?.[col] ?? null; }

  movePiece(from, to) {
    const piece = this.getPiece(from.row, from.col);
    if (!piece) throw new Error('No piece at source position');
    if (!piece.isValidMove(from, to, this)) throw new Error('Invalid move');

    this.grid[to.row][to.col] = piece;
    this.grid[from.row][from.col] = null;
    piece.hasMoved = true;
  }
}

// Game controller
class ChessGame {
  constructor() {
    this.board = new Board();
    this.currentTurn = Color.WHITE;
    this.moves = [];
    this.status = 'active'; // 'active' | 'checkmate' | 'stalemate' | 'draw'
  }

  makeMove(from, to) {
    const piece = this.board.getPiece(from.row, from.col);
    if (!piece) throw new Error('No piece at position');
    if (piece.color !== this.currentTurn) throw new Error('Not your turn');

    this.board.movePiece(from, to);
    this.moves.push({ from, to, piece: piece.type });
    this.currentTurn = this.currentTurn === Color.WHITE ? Color.BLACK : Color.WHITE;
  }
}

// Key design principles to mention:
// 1. Inheritance for shared behavior (Piece base class)
// 2. Polymorphism: each piece overrides isValidMove
// 3. Single Responsibility: Board manages grid, Game manages turns/rules
// 4. Open/Closed: add new piece types without changing Board
```

---

## 6. Serialize / Deserialize Binary Tree

**Q: Convert a binary tree to a string and back. (Adobe Confirmed)**

```js
class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// BFS serialization (level order)
function serialize(root) {
  if (!root) return 'null';
  const result = [];
  const queue = [root];

  while (queue.length) {
    const node = queue.shift();
    if (node) {
      result.push(node.val);
      queue.push(node.left);
      queue.push(node.right);
    } else {
      result.push('null');
    }
  }
  return result.join(',');
}

function deserialize(data) {
  if (data === 'null') return null;
  const values = data.split(',');
  const root = new TreeNode(parseInt(values[0]));
  const queue = [root];
  let i = 1;

  while (queue.length && i < values.length) {
    const node = queue.shift();

    if (values[i] !== 'null') {
      node.left = new TreeNode(parseInt(values[i]));
      queue.push(node.left);
    }
    i++;

    if (i < values.length && values[i] !== 'null') {
      node.right = new TreeNode(parseInt(values[i]));
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

// Test
const tree = new TreeNode(1,
  new TreeNode(2),
  new TreeNode(3, new TreeNode(4), new TreeNode(5))
);
const serialized = serialize(tree); // '1,2,3,null,null,4,5'
const deserialized = deserialize(serialized);
serialize(deserialized); // '1,2,3,null,null,4,5' ✓
```

---

## 7. File System Design (OOP — Adobe Confirmed)

```js
class FileSystemNode {
  constructor(name, isDirectory = false) {
    this.name = name;
    this.isDirectory = isDirectory;
    this.children = isDirectory ? new Map() : null; // name → node
    this.content = isDirectory ? null : '';
    this.createdAt = new Date();
    this.modifiedAt = new Date();
    this.size = 0;
  }
}

class FileSystem {
  constructor() {
    this.root = new FileSystemNode('/', true);
  }

  _traverse(path) {
    const parts = path.split('/').filter(Boolean);
    let node = this.root;
    for (const part of parts) {
      if (!node.isDirectory || !node.children.has(part)) return null;
      node = node.children.get(part);
    }
    return node;
  }

  mkdir(path) {
    const parts = path.split('/').filter(Boolean);
    let node = this.root;
    for (const part of parts) {
      if (!node.children.has(part)) {
        node.children.set(part, new FileSystemNode(part, true));
      }
      node = node.children.get(part);
      if (!node.isDirectory) throw new Error(`${part} is not a directory`);
    }
    return true;
  }

  writeFile(path, content) {
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop();
    const dirPath = '/' + parts.join('/');
    const dir = this._traverse(dirPath);
    if (!dir || !dir.isDirectory) throw new Error('Parent directory not found');

    if (!dir.children.has(fileName)) {
      dir.children.set(fileName, new FileSystemNode(fileName, false));
    }
    const file = dir.children.get(fileName);
    if (file.isDirectory) throw new Error('Cannot write to directory');
    file.content = content;
    file.size = content.length;
    file.modifiedAt = new Date();
  }

  readFile(path) {
    const node = this._traverse(path);
    if (!node) throw new Error(`File not found: ${path}`);
    if (node.isDirectory) throw new Error(`${path} is a directory`);
    return node.content;
  }

  ls(path = '/') {
    const node = this._traverse(path);
    if (!node) throw new Error(`Path not found: ${path}`);
    if (!node.isDirectory) return [node.name];
    return [...node.children.keys()].sort();
  }

  delete(path) {
    const parts = path.split('/').filter(Boolean);
    const name = parts.pop();
    const parentPath = '/' + parts.join('/');
    const parent = this._traverse(parentPath);
    if (!parent?.children.has(name)) throw new Error(`Not found: ${path}`);
    parent.children.delete(name);
  }
}

// Test
const fs = new FileSystem();
fs.mkdir('/user/docs');
fs.writeFile('/user/docs/notes.txt', 'Hello Adobe!');
fs.readFile('/user/docs/notes.txt'); // 'Hello Adobe!'
fs.ls('/user/docs'); // ['notes.txt']
```

---

## 8. Merge Intervals

```js
function merge(intervals) {
  if (!intervals.length) return [];

  // Sort by start time
  intervals.sort((a, b) => a[0] - b[0]);

  const result = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const current = intervals[i];
    const last = result[result.length - 1];

    if (current[0] <= last[1]) {
      // Overlapping: extend the last interval
      last[1] = Math.max(last[1], current[1]);
    } else {
      // Non-overlapping: add new interval
      result.push(current);
    }
  }
  return result;
}

merge([[1,3],[2,6],[8,10],[15,18]]); // [[1,6],[8,10],[15,18]]
merge([[1,4],[4,5]]);               // [[1,5]] — touching intervals merge
```

---

## Complexity Cheat Sheet

| Problem | Time | Space | Key Insight |
|---------|------|-------|-------------|
| Two Sum | O(n) | O(n) | Hash map for complement lookup |
| Valid Parentheses | O(n) | O(n) | Stack — match open/close |
| Queue from 2 stacks | O(1) amortized | O(n) | Transfer only when out-stack empty |
| Flood Fill (DFS) | O(n*m) | O(n*m) | Mark visited by painting immediately |
| LRU Cache | O(1) | O(capacity) | HashMap + Doubly Linked List |
| Serialize/Deserialize Tree | O(n) | O(n) | BFS level-order with null markers |
| Merge Intervals | O(n log n) | O(n) | Sort first, then sweep |
| File System (ls, write, read) | O(depth) | O(total nodes) | Trie-like structure |
