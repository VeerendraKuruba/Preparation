/**
 * 733. Flood Fill
 * Given a 2D image (grid of colors), a starting pixel (sr, sc), and a newColor,
 * replace the color of the starting pixel AND every 4-directionally connected
 * pixel that shares the same original color with newColor. Return the image.
 *
 * EXAMPLE:
 *   image = [[1,1,1],
 *            [1,1,0],
 *            [1,0,1]]
 *   sr = 1, sc = 1, newColor = 2
 *
 *   Starting color = image[1][1] = 1
 *   Flood-fill all connected 1s with 2:
 *
 *   [[2,2,2],
 *    [2,2,0],
 *    [2,0,1]]   ← bottom-right 1 stays (isolated by 0s)
 *
 * KEY EDGE CASE:
 * - If newColor === originalColor, return immediately. Otherwise the recursion
 *   never terminates (we keep "filling" cells that already match).
 *
 * COMPLEXITY (both solutions):
 *   Time:  O(m * n) — each cell visited at most once.
 *   Space: O(m * n) — recursion stack (DFS) or queue (BFS) in worst case.
 */

// ──────────────────────────────────────────────────────────────
// SOLUTION 1: DFS (recursive) — most common interview answer
// ──────────────────────────────────────────────────────────────
/**
 * @param {number[][]} image
 * @param {number} sr
 * @param {number} sc
 * @param {number} newColor
 * @return {number[][]}
 */
function floodFillDFS(image, sr, sc, newColor) {
  const originalColor = image[sr][sc];

  // Guard: nothing to do if the start pixel already has newColor.
  // Without this, dfs() would infinitely recurse on already-filled cells.
  if (originalColor === newColor) return image;

  const rows = image.length;
  const cols = image[0].length;

  function dfs(r, c) {
    // Base cases: out of bounds, OR not part of the connected region.
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    if (image[r][c] !== originalColor) return;

    // Paint this pixel — also acts as our "visited" marker
    // (it no longer matches originalColor, so it won't be revisited).
    image[r][c] = newColor;

    // Spread to 4 neighbors: up, down, left, right
    dfs(r - 1, c);
    dfs(r + 1, c);
    dfs(r, c - 1);
    dfs(r, c + 1);
  }

  dfs(sr, sc);
  return image;
}

// ──────────────────────────────────────────────────────────────
// SOLUTION 2: BFS (iterative with queue) — safer for huge grids
// ──────────────────────────────────────────────────────────────
/**
 * @param {number[][]} image
 * @param {number} sr
 * @param {number} sc
 * @param {number} newColor
 * @return {number[][]}
 */
function floodFillBFS(image, sr, sc, newColor) {
  const originalColor = image[sr][sc];
  if (originalColor === newColor) return image;

  const rows = image.length;
  const cols = image[0].length;
  const directions = [
    [-1, 0], // up
    [1, 0],  // down
    [0, -1], // left
    [0, 1],  // right
  ];

  const queue = [[sr, sc]];
  image[sr][sc] = newColor; // paint start before enqueueing neighbors

  while (queue.length > 0) {
    const [r, c] = queue.shift();

    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;

      // Skip if out of bounds OR not part of region OR already painted
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (image[nr][nc] !== originalColor) continue;

      image[nr][nc] = newColor; // paint BEFORE enqueueing — prevents duplicates
      queue.push([nr, nc]);
    }
  }

  return image;
}

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────
const clone = (g) => g.map((row) => [...row]);

const img1 = [
  [1, 1, 1],
  [1, 1, 0],
  [1, 0, 1],
];
console.log(floodFillDFS(clone(img1), 1, 1, 2));
// [[2,2,2],[2,2,0],[2,0,1]]

console.log(floodFillBFS(clone(img1), 1, 1, 2));
// [[2,2,2],[2,2,0],[2,0,1]]

// Edge case: newColor === originalColor → no change, no infinite loop
const img2 = [
  [0, 0, 0],
  [0, 0, 0],
];
console.log(floodFillDFS(clone(img2), 0, 0, 0));
// [[0,0,0],[0,0,0]]

// Edge case: single cell
console.log(floodFillDFS([[5]], 0, 0, 9));
// [[9]]
