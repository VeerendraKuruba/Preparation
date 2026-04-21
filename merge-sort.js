// ════════════════════════════════════════════════════════════════════════════
// BUBBLE SORT
// ════════════════════════════════════════════════════════════════════════════
//
// Idea: Repeatedly compare adjacent elements and swap if out of order.
// After each pass, the largest unsorted element "bubbles up" to its correct
// position at the end. Repeat for remaining unsorted portion.
//
// Example: [5, 3, 8, 1]
//
//   Pass 1:
//     [5,3] → swap → [3,5,8,1]
//     [5,8] → ok   → [3,5,8,1]
//     [8,1] → swap → [3,5,1,8]   ← 8 settled at end
//
//   Pass 2:
//     [3,5] → ok   → [3,5,1,8]
//     [5,1] → swap → [3,1,5,8]   ← 5 settled
//
//   Pass 3:
//     [3,1] → swap → [1,3,5,8]   ← 3 settled
//
//   Result: [1,3,5,8]
//
// Time: O(n²) avg/worst | O(n) best (already sorted)
// Space: O(1) in-place
// ─────────────────────────────────────────────────────────────────────────────
function bubbleSort(arr) {
  arr = [...arr];
  for (let i = 0; i < arr.length - 1; i++) {
    for (let j = 0; j < arr.length - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}


// ════════════════════════════════════════════════════════════════════════════
// SELECTION SORT
// ════════════════════════════════════════════════════════════════════════════
//
// Idea: Divide array into sorted (left) and unsorted (right) portions.
// On each pass, find the MINIMUM element in the unsorted portion and
// swap it into the next sorted position.
//
// Example: [5, 3, 8, 1]
//
//   Pass 1: min in [5,3,8,1] = 1 → swap with index 0 → [1, 3, 8, 5]
//   Pass 2: min in [3,8,5]   = 3 → already at index 1 → [1, 3, 8, 5]
//   Pass 3: min in [8,5]     = 5 → swap with index 2 → [1, 3, 5, 8]
//
//   Result: [1,3,5,8]
//
// Key difference from Bubble: makes at most n-1 swaps (good when writes are costly).
//
// Time: O(n²) all cases (always scans full unsorted portion)
// Space: O(1) in-place
// ─────────────────────────────────────────────────────────────────────────────
function selectionSort(arr) {
  arr = [...arr];
  for (let i = 0; i < arr.length - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[j] < arr[minIdx]) minIdx = j;
    }
    if (minIdx !== i) [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
  }
  return arr;
}


// ════════════════════════════════════════════════════════════════════════════
// INSERTION SORT
// ════════════════════════════════════════════════════════════════════════════
//
// Idea: Like sorting playing cards in hand. Pick each element and insert it
// into its correct position among the already-sorted left portion by shifting
// larger elements one step right.
//
// Example: [5, 3, 8, 1]
//
//   i=1: key=3, shift 5 right → [5,5,8,1] → insert 3 → [3,5,8,1]
//   i=2: key=8, 5<8 no shift  → insert 8  → [3,5,8,1]
//   i=3: key=1, shift 8,5,3   → [3,3,5,8] → insert 1 → [1,3,5,8]
//
//   Result: [1,3,5,8]
//
// Best case: already sorted array — only O(n) comparisons, zero shifts.
// Great for small or nearly-sorted arrays (used inside Timsort).
//
// Time: O(n²) avg/worst | O(n) best
// Space: O(1) in-place
// ─────────────────────────────────────────────────────────────────────────────
function insertionSort(arr) {
  arr = [...arr];
  for (let i = 1; i < arr.length; i++) {
    const key = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = key;
  }
  return arr;
}


// ════════════════════════════════════════════════════════════════════════════
// MERGE SORT
// ════════════════════════════════════════════════════════════════════════════
//
// Idea: Divide & Conquer. Recursively split array into halves until single
// elements remain (always sorted), then merge pairs back together in order.
//
// Example: [5, 3, 8, 1]
//
//   Split:           [5,3,8,1]
//                   /          \
//               [5,3]          [8,1]
//              /    \          /   \
//            [5]    [3]      [8]   [1]
//
//   Merge up:
//     [5] + [3]  → compare 5>3  → [3,5]
//     [8] + [1]  → compare 8>1  → [1,8]
//     [3,5]+[1,8]→ 1<3→[1], 3<8→[1,3], 5<8→[1,3,5], leftover 8→[1,3,5,8]
//
//   Result: [1,3,5,8]
//
// Stable sort. Preferred when stability matters (e.g. sorting linked lists).
//
// Time: O(n log n) all cases
// Space: O(n) — extra arrays created during merge
// ─────────────────────────────────────────────────────────────────────────────
function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}

function merge(left, right) {
  const result = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) result.push(left[i++]);
    else result.push(right[j++]);
  }
  return [...result, ...left.slice(i), ...right.slice(j)];
}


// ════════════════════════════════════════════════════════════════════════════
// QUICK SORT
// ════════════════════════════════════════════════════════════════════════════
//
// Idea: Pick a pivot element. Partition the array so all elements <= pivot
// go left, all > pivot go right. Recursively sort each side.
// (Pivot ends up in its final sorted position after each partition.)
//
// Example: [5, 3, 8, 1]  pivot = last element = 1
//
//   Partition around 1:
//     j=0: arr[0]=5 > 1, skip
//     j=1: arr[1]=3 > 1, skip
//     j=2: arr[2]=8 > 1, skip
//     → swap pivot(1) with arr[i+1=0] → [1, 3, 8, 5]
//     pivot 1 is now at index 0 (final position)
//
//   Left  of 1: [] (empty, done)
//   Right of 1: [3,8,5], pivot=5
//     j=0: 3<=5, i=0, swap arr[0],arr[0] → [3,8,5]
//     j=1: 8>5,  skip
//     → swap pivot(5) with arr[i+1=1]=8 → [3,5,8]
//     pivot 5 at index 1
//
//   Left of 5:  [3] (done)
//   Right of 5: [8] (done)
//
//   Result: [1,3,5,8]
//
// Worst case (already sorted + last-element pivot) degrades to O(n²).
// Randomized pivot selection avoids this in practice.
//
// Time: O(n log n) avg | O(n²) worst
// Space: O(log n) recursive call stack
// ─────────────────────────────────────────────────────────────────────────────
function quickSort(arr, low = 0, high = arr.length - 1) {
  arr = low === 0 && high === arr.length - 1 ? [...arr] : arr;
  if (low < high) {
    const pi = partition(arr, low, high);
    quickSort(arr, low, pi - 1);
    quickSort(arr, pi + 1, high);
  }
  return arr;
}

function partition(arr, low, high) {
  const pivot = arr[high];
  let i = low - 1;
  for (let j = low; j < high; j++) {
    if (arr[j] <= pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
  return i + 1;
}


// ════════════════════════════════════════════════════════════════════════════
// HEAP SORT
// ════════════════════════════════════════════════════════════════════════════
//
// Idea: Two phases.
//   Phase 1 — Build a Max-Heap: rearrange array so parent >= children.
//   Phase 2 — Extract: repeatedly swap root (max) with last element,
//             shrink heap size by 1, then restore heap property (heapify).
//
// Example: [5, 3, 8, 1]
//
//   Phase 1 — Build Max-Heap:
//     Start from last non-leaf: index 1 (value 3)
//     heapify(1): children are 8(idx 3)? No, children of idx 1 = idx 3 only
//       arr[3]=1 < arr[1]=3, no swap → [5,3,8,1]
//     heapify(0): children are arr[1]=3, arr[2]=8 → largest=8(idx 2)
//       swap arr[0] and arr[2] → [8,3,5,1]
//     Max-Heap: [8,3,5,1]
//                    8
//                  /   \
//                 3     5
//                /
//               1
//
//   Phase 2 — Extract max repeatedly:
//     i=3: swap root(8) with arr[3]=1 → [1,3,5,8], heapify size 3
//           heapify: 1's children are 3,5 → swap with 5 → [5,3,1,8]
//     i=2: swap root(5) with arr[2]=1 → [1,3,5,8], heapify size 2
//           heapify: 1's child is 3 → swap → [3,1,5,8]
//     i=1: swap root(3) with arr[1]=1 → [1,3,5,8], heapify size 1 (done)
//
//   Result: [1,3,5,8]
//
// Not stable (equal elements may change relative order).
// O(1) space makes it better than Merge Sort when memory is constrained.
//
// Time: O(n log n) all cases
// Space: O(1) in-place
// ─────────────────────────────────────────────────────────────────────────────
function heapSort(arr) {
  arr = [...arr];
  const n = arr.length;

  // Build max-heap
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(arr, n, i);

  // Extract elements from heap one by one
  for (let i = n - 1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]];
    heapify(arr, i, 0);
  }
  return arr;
}

function heapify(arr, n, i) {
  let largest = i;
  const l = 2 * i + 1, r = 2 * i + 2;
  if (l < n && arr[l] > arr[largest]) largest = l;
  if (r < n && arr[r] > arr[largest]) largest = r;
  if (largest !== i) {
    [arr[i], arr[largest]] = [arr[largest], arr[i]];
    heapify(arr, n, largest);
  }
}


// ════════════════════════════════════════════════════════════════════════════
// COMPARISON TABLE
// ════════════════════════════════════════════════════════════════════════════
//
//  Algorithm   │ Best     │ Average  │ Worst    │ Space    │ Stable
//  ────────────┼──────────┼──────────┼──────────┼──────────┼────────
//  Bubble      │ O(n)     │ O(n²)    │ O(n²)    │ O(1)     │ Yes
//  Selection   │ O(n²)    │ O(n²)    │ O(n²)    │ O(1)     │ No
//  Insertion   │ O(n)     │ O(n²)    │ O(n²)    │ O(1)     │ Yes
//  Merge       │ O(nlogn) │ O(nlogn) │ O(nlogn) │ O(n)     │ Yes
//  Quick       │ O(nlogn) │ O(nlogn) │ O(n²)    │ O(log n) │ No
//  Heap        │ O(nlogn) │ O(nlogn) │ O(nlogn) │ O(1)     │ No
//
// ════════════════════════════════════════════════════════════════════════════

// Tests
const input = [38, 27, 43, 3, 9, 82, 10];

console.log("Bubble:    ", bubbleSort(input));
console.log("Selection: ", selectionSort(input));
console.log("Insertion: ", insertionSort(input));
console.log("Merge:     ", mergeSort(input));
console.log("Quick:     ", quickSort(input));
console.log("Heap:      ", heapSort(input));
// All output: [3, 9, 10, 27, 38, 43, 82]
