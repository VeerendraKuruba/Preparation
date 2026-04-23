# Section 1 — DocuSign-Specific Questions

---

### Q1. Find the intersection of two sorted arrays and return a new array of common elements.

**Approach:** Use the two-pointer technique. Since both arrays are sorted, advance the pointer of the smaller element. When values match, record the element and advance both pointers. This runs in O(n + m) time and O(min(n, m)) space.

```js
/**
 * Finds common elements between two sorted arrays.
 * @param {number[]} a - First sorted array
 * @param {number[]} b - Second sorted array
 * @returns {number[]} Array of common elements (no duplicates)
 */
function intersectSortedArrays(a, b) {
  const result = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      // Avoid duplicates in result
      if (result[result.length - 1] !== a[i]) {
        result.push(a[i]);
      }
      i++;
      j++;
    } else if (a[i] < b[j]) {
      i++;
    } else {
      j++;
    }
  }

  return result;
}

// --- Tests ---
console.log(intersectSortedArrays([1, 2, 4, 5, 6], [2, 3, 5, 7]));
// [2, 5]

console.log(intersectSortedArrays([1, 1, 2, 3], [1, 1, 4]));
// [1]  (deduplicated)

console.log(intersectSortedArrays([], [1, 2]));
// []

console.log(intersectSortedArrays([1, 2, 3], [4, 5, 6]));
// []
```

**Complexity:**
- Time: O(n + m) — single pass through both arrays
- Space: O(k) where k = number of common elements

**Alternative (Set-based, unsorted arrays):** If arrays were not sorted, build a Set from the smaller array and filter the larger. Two-pointer is preferred when both are sorted.

---

### Q2. Create a tic-tac-toe game that receives input from two players, checks input accuracy, and detects if the game has concluded.

**Key design decisions:**
- 3×3 board as a 2D array (3 rows × 3 columns)
- Input validation: check bounds and that the cell is empty
- Win detection: check all rows, columns, and both diagonals
- Draw detection: all cells filled with no winner

```js
class TicTacToe {
  constructor() {
    // 3x3 grid initialized with nulls
    this.board = [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ];
    this.currentPlayer = 'X';
    this.winner = null;
    this.isDraw = false;
    this.moveCount = 0;
  }

  /** Pretty-print the current board state */
  printBoard() {
    const display = this.board
      .map((row) => row.map((cell) => cell ?? '.').join(' | '))
      .join('\n--+---+--\n');
    console.log('\n' + display + '\n');
  }

  /**
   * Attempt to place the current player's mark.
   * @param {number} row - 0-indexed row
   * @param {number} col - 0-indexed column
   * @returns {{ valid: boolean, message: string }}
   */
  makeMove(row, col) {
    // --- Input validation ---
    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      return { valid: false, message: 'Row and column must be integers.' };
    }
    if (row < 0 || row > 2 || col < 0 || col > 2) {
      return { valid: false, message: 'Row and column must be between 0 and 2.' };
    }
    if (this.board[row][col] !== null) {
      return { valid: false, message: `Cell (${row}, ${col}) is already occupied.` };
    }
    if (this.winner || this.isDraw) {
      return { valid: false, message: 'Game is already over.' };
    }

    // --- Place the mark ---
    this.board[row][col] = this.currentPlayer;
    this.moveCount++;

    // --- Check for win or draw ---
    if (this._checkWin(this.currentPlayer)) {
      this.winner = this.currentPlayer;
      return { valid: true, message: `Player ${this.currentPlayer} wins!` };
    }

    if (this.moveCount === 9) {
      this.isDraw = true;
      return { valid: true, message: "It's a draw!" };
    }

    // --- Switch player ---
    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    return { valid: true, message: `Player ${this.currentPlayer}'s turn.` };
  }

  /**
   * Check if the given player has won.
   * @param {string} player - 'X' or 'O'
   * @returns {boolean}
   */
  _checkWin(player) {
    const b = this.board;

    // Check rows
    for (let r = 0; r < 3; r++) {
      if (b[r].every((cell) => cell === player)) return true;
    }

    // Check columns
    for (let c = 0; c < 3; c++) {
      if (b[0][c] === player && b[1][c] === player && b[2][c] === player) return true;
    }

    // Check main diagonal (top-left → bottom-right)
    if (b[0][0] === player && b[1][1] === player && b[2][2] === player) return true;

    // Check anti-diagonal (top-right → bottom-left)
    if (b[0][2] === player && b[1][1] === player && b[2][0] === player) return true;

    return false;
  }

  /** Reset the game for a new round */
  reset() {
    this.board = [[null, null, null], [null, null, null], [null, null, null]];
    this.currentPlayer = 'X';
    this.winner = null;
    this.isDraw = false;
    this.moveCount = 0;
  }
}

// --- Demo ---
const game = new TicTacToe();

const moves = [
  [0, 0], // X
  [1, 1], // O
  [0, 1], // X
  [2, 0], // O
  [0, 2], // X wins (top row)
];

for (const [r, c] of moves) {
  const result = game.makeMove(r, c);
  game.printBoard();
  console.log(result.message);
  if (game.winner || game.isDraw) break;
}

// Invalid input tests
console.log(game.makeMove(5, 0));   // out of bounds
console.log(game.makeMove(0, 0));   // game already over
```

**Complexity:**
- Time: O(1) per move — fixed 3×3 checks
- Space: O(1) — board size is constant

---

### Q3. Implement a JavaScript localStorage wrapper that automatically deletes items after a specific time period (TTL cache).

**Design decisions:**
- Store items as JSON objects containing `{ value, expiresAt }` with a key prefix to namespace the cache
- On `get`, check `Date.now()` against `expiresAt`; if expired, remove and return `null`
- Expose `set`, `get`, `delete`, `clear`, and `has` methods mirroring the localStorage API
- Optionally register a periodic cleanup to flush all stale keys proactively
- Implemented functionally — no class, returns a plain object of methods

```js
const createTTLCache = ({ prefix = 'ttl:', cleanupIntervalMs = 0 } = {}) => {
  const toKey = (key) => `${prefix}${key}`;

  const serialize = (value, ttlMs) => JSON.stringify({
    value,
    expiresAt: ttlMs > 0 ? Date.now() + ttlMs : null, // null = no expiry
  });

  const deserialize = (raw) => {
    try { return JSON.parse(raw); } catch { return null; }
  };

  const isExpired = (entry) => entry.expiresAt !== null && Date.now() > entry.expiresAt;

  // --- core methods ---

  const set = (key, value, ttlMs = 0) => {
    localStorage.setItem(toKey(key), serialize(value, ttlMs));
  };

  const get = (key) => {
    const raw = localStorage.getItem(toKey(key));
    if (raw === null) return null;

    const entry = deserialize(raw);
    if (!entry) return null;

    if (isExpired(entry)) {
      localStorage.removeItem(toKey(key));
      return null;
    }

    return entry.value;
  };

  const del = (key) => localStorage.removeItem(toKey(key));

  // has is derived from get — inherits lazy expiry automatically
  const has = (key) => get(key) !== null;

  // Removes only keys owned by this cache instance (respects prefix)
  const clear = () => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => localStorage.removeItem(k));
  };

  // Proactively evict all expired keys in this namespace
  const flush = () => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => {
        const entry = deserialize(localStorage.getItem(k));
        if (entry && isExpired(entry)) localStorage.removeItem(k);
      });
  };

  // Optional periodic cleanup — returns a stop function
  let intervalId = null;

  const startCleanup = (intervalMs = cleanupIntervalMs) => {
    if (intervalId !== null) return;
    intervalId = setInterval(flush, intervalMs);
  };

  const stopCleanup = () => {
    clearInterval(intervalId);
    intervalId = null;
  };

  if (cleanupIntervalMs > 0) startCleanup();

  return { set, get, delete: del, has, clear, flush, startCleanup, stopCleanup };
};

// --- Usage ---
const cache = createTTLCache({ prefix: 'app:', cleanupIntervalMs: 5000 });

cache.set('session', { userId: 42, role: 'admin' }, 2000); // expires in 2 s
cache.set('theme', 'dark');                                 // no expiry

console.log(cache.has('session'));    // true
console.log(cache.get('session'));    // { userId: 42, role: 'admin' }
console.log(cache.get('theme'));      // 'dark'

setTimeout(() => {
  console.log(cache.get('session')); // null — expired + auto-deleted
  console.log(cache.has('theme'));   // true — no expiry
  cache.stopCleanup();
}, 2100);
```

**Key points:**
- `expiresAt: null` means no expiry — safe to use as a plain persistent cache
- `has` delegates to `get` so expired items evict themselves on any access path
- `clear` is namespace-scoped — won't nuke unrelated localStorage keys
- `flush` can be called manually (e.g. on `visibilitychange`) or driven by the optional interval
- `startCleanup` / `stopCleanup` give the caller full lifecycle control

---

### Q4. Design a modal dialog with HTML, CSS, and JavaScript.

**Features:** accessible (`role="dialog"`, `aria-modal`, focus trap, Escape key close), backdrop click to dismiss, open/close animation.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Modal Dialog</title>
  <style>
    /* ── Reset ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 100vh; }

    /* ── Backdrop ── */
    .modal-backdrop {
      position: fixed;
      inset: 0;                          /* top/right/bottom/left: 0 */
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: opacity 200ms ease, visibility 200ms ease;
      z-index: 1000;
    }

    .modal-backdrop.is-open {
      opacity: 1;
      visibility: visible;
    }

    /* ── Dialog box ── */
    .modal {
      background: #fff;
      border-radius: 8px;
      width: min(480px, 90vw);
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      transform: translateY(-16px) scale(0.98);
      transition: transform 200ms ease;
      outline: none;
    }

    .modal-backdrop.is-open .modal {
      transform: translateY(0) scale(1);
    }

    /* ── Sections ── */
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 16px;
      border-bottom: 1px solid #e5e7eb;
    }

    .modal-header h2 { font-size: 1.125rem; font-weight: 600; }

    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      color: #6b7280;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .modal-close:hover { background: #f3f4f6; color: #111; }
    .modal-close:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }

    .modal-body { padding: 24px; line-height: 1.6; color: #374151; }

    .modal-footer {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 16px 24px 20px;
      border-top: 1px solid #e5e7eb;
    }

    /* ── Buttons ── */
    .btn {
      padding: 8px 20px;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 150ms;
    }
    .btn-secondary { background: #f3f4f6; border: 1px solid #d1d5db; color: #374151; }
    .btn-secondary:hover { background: #e5e7eb; }
    .btn-primary { background: #2563eb; border: 1px solid #2563eb; color: #fff; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
  </style>
</head>
<body>

  <button class="btn btn-primary" id="openModal">Open Modal</button>

  <!-- Backdrop -->
  <div
    class="modal-backdrop"
    id="backdrop"
    role="presentation"
    aria-hidden="true"
  >
    <!-- Dialog -->
    <div
      class="modal"
      id="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalTitle"
      tabindex="-1"
    >
      <div class="modal-header">
        <h2 id="modalTitle">Confirm Action</h2>
        <button class="modal-close" id="closeModal" aria-label="Close dialog">&times;</button>
      </div>

      <div class="modal-body">
        <p>Are you sure you want to proceed? This action cannot be undone.</p>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
        <button class="btn btn-primary" id="confirmBtn">Confirm</button>
      </div>
    </div>
  </div>

  <script>
    const backdrop  = document.getElementById('backdrop');
    const modal     = document.getElementById('modal');
    const openBtn   = document.getElementById('openModal');
    const closeBtn  = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const confirmBtn = document.getElementById('confirmBtn');

    // All focusable elements inside the dialog for focus trapping
    const FOCUSABLE = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';

    let lastFocus = null; // element that opened the modal

    function openModal() {
      lastFocus = document.activeElement;
      backdrop.classList.add('is-open');
      backdrop.removeAttribute('aria-hidden');
      // Move focus into the dialog after the transition starts
      requestAnimationFrame(() => modal.focus());
      document.addEventListener('keydown', handleKeyDown);
    }

    function closeModal() {
      backdrop.classList.remove('is-open');
      backdrop.setAttribute('aria-hidden', 'true');
      document.removeEventListener('keydown', handleKeyDown);
      lastFocus?.focus(); // return focus to the trigger
    }

    /** Focus trap + Escape key handler */
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = [...modal.querySelectorAll(FOCUSABLE)];
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    // Backdrop click closes (but not clicks inside the dialog)
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    confirmBtn.addEventListener('click', () => {
      console.log('Confirmed!');
      closeModal();
    });
  </script>
</body>
</html>
```

**Accessibility checklist:**
- `role="dialog"` + `aria-modal="true"` signals screen readers to restrict virtual cursor
- `aria-labelledby` links the visible heading to the dialog
- Focus trap prevents Tab from escaping the dialog
- Escape closes the dialog and returns focus to the trigger element
- Smooth CSS transition gives visual feedback without `setTimeout` hacks

---

### Q5. Create an HTML/CSS prototype to display information over an image on mouse hover.

**Technique:** Absolutely position an overlay inside a `position: relative` container. Use CSS transitions on `opacity` and `transform` for a polished reveal. No JavaScript required.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Image Hover Overlay</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f1f5f9;
      font-family: system-ui, sans-serif;
    }

    /* ── Card container ── */
    .card {
      position: relative;          /* anchor for the overlay */
      width: 320px;
      border-radius: 12px;
      overflow: hidden;            /* clip overlay to card edges */
      cursor: pointer;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    }

    /* ── Base image ── */
    .card img {
      display: block;
      width: 100%;
      height: 220px;
      object-fit: cover;
      transition: transform 400ms ease;
    }

    /* Subtle zoom on hover */
    .card:hover img {
      transform: scale(1.06);
    }

    /* ── Overlay ── */
    .card-overlay {
      position: absolute;
      inset: 0;                    /* covers the entire card */
      background: linear-gradient(
        to top,
        rgba(0, 0, 0, 0.75) 0%,
        rgba(0, 0, 0, 0.1) 60%,
        transparent 100%
      );
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 20px;

      /* Hidden by default */
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 300ms ease, transform 300ms ease;
    }

    /* Reveal on hover */
    .card:hover .card-overlay,
    .card:focus-within .card-overlay {   /* keyboard accessible */
      opacity: 1;
      transform: translateY(0);
    }

    /* ── Overlay text ── */
    .card-overlay h3 {
      color: #fff;
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .card-overlay p {
      color: rgba(255, 255, 255, 0.85);
      font-size: 0.85rem;
      line-height: 1.4;
    }

    .card-overlay .tag {
      display: inline-block;
      margin-top: 10px;
      padding: 3px 10px;
      background: #2563eb;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 999px;
    }
  </style>
</head>
<body>

  <div class="card" tabindex="0" role="img" aria-label="Golden Gate Bridge — San Francisco">
    <!-- Use any publicly available image or local asset -->
    <img
      src="https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=640&q=80"
      alt="Golden Gate Bridge at sunset"
    />
    <div class="card-overlay" aria-hidden="true">
      <h3>Golden Gate Bridge</h3>
      <p>An iconic suspension bridge spanning the Golden Gate strait, San Francisco.</p>
      <span class="tag">Landmark</span>
    </div>
  </div>

</body>
</html>
```

**Key points:**
- `position: relative` on the container + `position: absolute; inset: 0` on the overlay is the canonical centering/covering pattern
- `overflow: hidden` clips the zoom and the overlay to the card boundary
- `:focus-within` ensures the overlay is also accessible via keyboard tab
- `aria-hidden="true"` on the overlay avoids duplicate screen-reader announcements (the `aria-label` on the card already describes it)

---

### Q6. How would you ensure an element is perfectly centered over an image?

There are several reliable CSS-only methods. The recommended approach depends on context:

#### Method 1 — Flexbox (recommended, most versatile)

```html
<div class="image-wrapper">
  <img src="photo.jpg" alt="" />
  <div class="centered-overlay">Centered Text</div>
</div>
```

```css
.image-wrapper {
  position: relative;
  display: inline-flex;   /* shrinks to image width */
}

.image-wrapper img {
  display: block;
  width: 100%;
}

.centered-overlay {
  position: absolute;
  inset: 0;               /* stretch to all edges */
  display: flex;
  align-items: center;    /* vertical center */
  justify-content: center; /* horizontal center */
  /* text or child element is now perfectly centered */
}
```

The overlay occupies the exact same bounding box as the image. `align-items` and `justify-content` center the child in both axes simultaneously.

#### Method 2 — CSS Grid (single element, no extra flex context)

```css
.image-wrapper {
  display: grid;
}

/* Stack image and overlay in the same grid cell */
.image-wrapper > * {
  grid-area: 1 / 1;
}

.centered-overlay {
  place-self: center;   /* shorthand for align-self + justify-self */
}
```

#### Method 3 — Classic absolute + transform (when you must support older layouts)

```css
.centered-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

This works regardless of the overlay's dimensions because `top/left` are relative to the parent, while `transform` is relative to the element itself.

#### Comparison table

| Method | Centering axes | Overlay dimensions needed? | Browser support |
|---|---|---|---|
| Flexbox (inset: 0 + flex) | Both | No | IE11+ (with prefix) |
| CSS Grid (place-self) | Both | No | Modern browsers |
| absolute + transform | Both | No | All |
| absolute top/left 50% (no transform) | Both | Yes (margin offsets) | All |

**Best practice for image overlays:** Use `position: relative` on a wrapper `<div>`, set the `<img>` to `display: block; width: 100%`, and use `position: absolute; inset: 0; display: flex; align-items: center; justify-content: center` on the overlay. This is robust, readable, and requires no magic numbers.

---

### Q7. How do you perceive the role and advantages of hash maps in data structures, and what features make them unique?

#### What is a hash map?

A hash map (also called a hash table, dictionary, or object) is a data structure that stores key-value pairs. It uses a **hash function** to compute an index (bucket) in an internal array where the value is stored. This makes retrieval by key nearly instantaneous regardless of the collection size.

#### Core mechanism

```
key  →  hash function  →  bucket index  →  value
"name"  →  hashCode()  →  42            →  "Alice"
```

When two keys produce the same index (**hash collision**), the map resolves it via:
- **Chaining** — each bucket holds a linked list of entries
- **Open addressing** — probe adjacent buckets until an empty slot is found

#### Time complexity

| Operation | Average | Worst case (many collisions) |
|---|---|---|
| get | O(1) | O(n) |
| set | O(1) | O(n) |
| delete | O(1) | O(n) |
| has | O(1) | O(n) |
| Iteration | O(n) | O(n) |

A well-designed hash function keeps collisions rare, so average-case O(1) is the practical reality.

#### Unique features

1. **O(1) key lookup** — Unlike arrays (O(n) search) or binary search trees (O(log n)), hash maps return a value by key in constant time.
2. **Arbitrary key types** — Keys can be strings, numbers, or (with `Map`) any object reference, not just integer indices.
3. **No ordering guarantee** (plain objects) — `Map` preserves insertion order; plain `{}` does not guarantee order across all engines.
4. **Flexible size** — Dynamically resizes (rehashing) as entries grow, unlike fixed-size arrays.
5. **Deduplication** — Sets (a hash map variant) naturally enforce key uniqueness.

#### JavaScript-specific: Object vs Map

```js
// Plain object — keys coerced to strings
const obj = {};
obj[1]      = 'a';  // key stored as "1"
obj["1"]    = 'b';  // overwrites!
obj[{}]     = 'c';  // key stored as "[object Object]"

// Map — preserves key type and insertion order
const map = new Map();
map.set(1,   'number key');
map.set('1', 'string key');  // different keys!
map.set({},  'object key');
console.log(map.size);       // 3

// Performance check
console.log(map.has('1'));   // true — O(1)
```

**Prefer `Map` over `{}` when:**
- Keys are not strings/symbols
- Insertion order matters
- You frequently add and remove keys (Map has better worst-case performance for large, dynamic sets)
- You need `.size` without `Object.keys().length`

#### Common interview use cases

```js
// 1. Frequency counter — O(n)
function charFrequency(str) {
  const freq = new Map();
  for (const ch of str) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  return freq;
}

// 2. Two-sum — O(n) vs O(n²) brute force
function twoSum(nums, target) {
  const seen = new Map(); // value → index
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement), i];
    }
    seen.set(nums[i], i);
  }
  return null;
}

// 3. Caching / memoisation
function memoize(fn) {
  const cache = new Map();
  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}
```

---

### Q8. Define and elaborate on the SOLID principles in software engineering.

SOLID is an acronym for five object-oriented design principles that make software more understandable, flexible, and maintainable. They were popularised by Robert C. Martin ("Uncle Bob").

---

#### S — Single Responsibility Principle (SRP)

> "A class (or module) should have only one reason to change."

Each unit of code should own a single, well-defined concern. When a class handles multiple unrelated responsibilities, a change to one concern risks breaking the other.

```js
// BAD — one class does too much
class UserManager {
  createUser(data) { /* ... */ }
  sendWelcomeEmail(user) { /* mixes email logic */ }
  saveToDatabase(user) { /* mixes persistence */ }
}

// GOOD — each class owns one concern
class UserService    { createUser(data) { /* business logic */ } }
class EmailService   { sendWelcomeEmail(user) { /* email only */ } }
class UserRepository { save(user) { /* persistence only */ } }
```

---

#### O — Open/Closed Principle (OCP)

> "Software entities should be open for extension but closed for modification."

Add new behaviour by extending (subclassing, composing, injecting), not by editing existing, tested code.

```js
// BAD — adding a new shape requires modifying AreaCalculator
class AreaCalculator {
  calculate(shape) {
    if (shape.type === 'circle') return Math.PI * shape.r ** 2;
    if (shape.type === 'rect')   return shape.w * shape.h;
    // adding 'triangle' means editing this method
  }
}

// GOOD — each shape knows its own area; calculator never changes
class Circle    { area() { return Math.PI * this.r ** 2; } }
class Rectangle { area() { return this.w * this.h; } }
class Triangle  { area() { return 0.5 * this.base * this.height; } }

class AreaCalculator {
  calculate(shape) { return shape.area(); }
}
```

---

#### L — Liskov Substitution Principle (LSP)

> "Objects of a subclass should be substitutable for objects of the superclass without breaking the program."

If `S` is a subtype of `T`, code that works with `T` must work correctly with `S`. Subclasses must not weaken preconditions or strengthen postconditions.

```js
// BAD — Square breaking Rectangle's contract
class Rectangle {
  setWidth(w)  { this.w = w; }
  setHeight(h) { this.h = h; }
  area() { return this.w * this.h; }
}

class Square extends Rectangle {
  setWidth(n)  { this.w = this.h = n; } // side effect violates contract!
  setHeight(n) { this.w = this.h = n; }
}

// Code expecting Rectangle is broken when given a Square:
function resize(rect) {
  rect.setWidth(5);
  rect.setHeight(10);
  console.log(rect.area()); // Expects 50, Square gives 100
}

// GOOD — model them independently or use a shared interface
class Shape { area() { throw new Error('Not implemented'); } }
class Rectangle extends Shape { /* ... */ }
class Square    extends Shape { /* ... */ }
```

---

#### I — Interface Segregation Principle (ISP)

> "Clients should not be forced to depend on interfaces they do not use."

Split large, general interfaces into smaller, specific ones so that implementing classes only need to know about the methods relevant to them.

```js
// BAD — a Printer is forced to implement fax/scan
class MultiFunctionDevice {
  print()  { throw new Error('Not implemented'); }
  scan()   { throw new Error('Not implemented'); }
  fax()    { throw new Error('Not implemented'); }
}

class SimplePrinter extends MultiFunctionDevice {
  print()  { /* ok */ }
  scan()   { throw new Error('Not supported'); }  // forced stub!
  fax()    { throw new Error('Not supported'); }  // forced stub!
}

// GOOD — segregated interfaces (simulated with composition in JS)
const Printable = { print() {} };
const Scannable = { scan()  {} };
const Faxable   = { fax()   {} };

// A simple printer only composes what it needs
class SimplePrinter {
  print() { console.log('Printing…'); }
}

// An all-in-one device composes all three
class AllInOne {
  print() { /* … */ }
  scan()  { /* … */ }
  fax()   { /* … */ }
}
```

---

#### D — Dependency Inversion Principle (DIP)

> "High-level modules should not depend on low-level modules. Both should depend on abstractions."

Inject dependencies rather than hardcoding them, and program to interfaces/contracts rather than concrete implementations.

```js
// BAD — high-level service hardcodes a specific low-level database
class UserService {
  constructor() {
    this.db = new MySQLDatabase(); // tightly coupled
  }
  getUser(id) { return this.db.query(`SELECT * FROM users WHERE id = ${id}`); }
}

// GOOD — inject the dependency; swap implementations freely
class UserService {
  constructor(database) {
    this.db = database; // depends on the abstraction, not the implementation
  }
  getUser(id) { return this.db.findById(id); }
}

// Any store that implements { findById } can be injected
class MySQLDatabase { findById(id) { /* … */ } }
class InMemoryDatabase { findById(id) { return this.store.get(id); } }

const service = new UserService(new InMemoryDatabase()); // easy to test!
```

#### Summary table

| Letter | Principle | Core idea |
|---|---|---|
| S | Single Responsibility | One reason to change |
| O | Open/Closed | Extend, don't modify |
| L | Liskov Substitution | Subtypes must honour parent contracts |
| I | Interface Segregation | Small, focused interfaces |
| D | Dependency Inversion | Depend on abstractions, inject concretions |

---

### Q9. Describe an experience where you led a team.

> Behavioral question — use the **STAR framework** (Situation, Task, Action, Result).

#### STAR Template

**Situation:** Set the scene. What was the project, company stage, or team context? What challenge or opportunity existed?

> *Example: "At [Company], our team of four engineers was tasked with migrating a legacy dashboard from AngularJS to React. The deadline was Q3, but there was no clear ownership or plan when I was assigned as tech lead."*

**Task:** Describe your specific responsibility. Were you a formal or informal leader? What was expected of you?

> *Example: "I was responsible for defining the migration strategy, unblocking team members, and ensuring we met the delivery deadline without regressing any existing functionality."*

**Action:** Explain what YOU did — be specific about decisions and leadership behaviours.

- How did you plan the work (roadmap, milestones)?
- How did you communicate with the team and stakeholders?
- How did you handle conflict, blockers, or skill gaps?
- What technical decisions did you own?

> *Example: "I ran a kick-off workshop to align on a strangler-fig pattern — migrating feature by feature rather than a big-bang rewrite. I set up weekly syncs, created a shared Notion board with clearly owned tickets, and paired with our junior engineer on React patterns. When we hit a performance issue mid-sprint, I drove the investigation and proposed a virtualized list solution."*

**Result:** Quantify the outcome where possible.

> *Example: "We delivered the migration two weeks ahead of schedule with zero regressions. Page load time improved by 40%. The junior engineer went on to lead the next project independently."*

#### Tips for DocuSign (or any senior-engineer interview)

- Choose a story where you influenced outcomes without formal authority if possible — it shows leadership maturity
- Mention cross-functional collaboration (product, design, QA)
- Include a moment of ambiguity or adversity — interviewers want to see how you navigate uncertainty
- Keep the Action section detailed (70 % of your time); Situation/Task can be brief
- Avoid saying "we" exclusively — make your individual contribution clear

---

### Q10. Tell us about unpleasant feedback you received and how you handled it.

> Behavioral question — demonstrates self-awareness, growth mindset, and emotional maturity. Use STAR.

#### STAR Template

**Situation:** Describe the context in which the feedback was delivered. Who gave it, and when?

> *Example: "During my mid-year review at [Company], my manager told me that my pull requests were consistently too large and were slowing down the team's review cycle, which I found surprising and uncomfortable to hear."*

**Task:** Clarify what you needed to do in response — both emotionally and professionally.

> *Example: "I needed to genuinely understand the concern, not get defensive, and make a concrete change."*

**Action:** Detail the steps you took — listening, reflection, investigation, behavioural change.

- Did you seek clarification or examples?
- Did you reflect privately before reacting?
- Did you create a plan to change the behaviour?
- Did you follow up with the person who gave feedback?

> *Example: "I thanked my manager and asked for two or three specific examples so I could understand the pattern. After reviewing them, I realised my PRs were 600–900 lines on average. I researched best practices, adopted a rule of keeping PRs under 400 lines with a clear description, and started breaking features into preparatory and functional commits. I also started requesting early feedback on design docs before writing code, which caught scope issues earlier."*

**Result:** Show the impact of your change.

> *Example: "Within two months, PR review turnaround time dropped from 2.5 days to under 1 day for my work. My manager acknowledged the improvement at the next review and cited it as an example of growth to the wider team."*

#### Tips

- **Do not choose trivial or fake-humble feedback** ("I was told I work too hard"). Pick something real and substantive
- Show the emotional arc: initial discomfort → reflection → acceptance → action
- Emphasise what you learned, not just what you changed — interviewers want to see metacognition
- If the feedback was later proved wrong or partially wrong, still show that you engaged with it respectfully and extracted what was useful
- Avoid blaming the feedback-giver; stay solutions-focused throughout
