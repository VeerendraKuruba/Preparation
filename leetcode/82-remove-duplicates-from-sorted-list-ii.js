/**
 * 82. Remove Duplicates from Sorted List II
 *
 * Rule: Remove every node whose value appears more than once. Keep only values
 *       that appear exactly once. Example: [1,2,3,3,4,4,5] → [1,2,5].
 *
 * Idea: Walk with p. For each value, find runEnd (last node with same value).
 *       If p === runEnd → run length 1 → append to result. Else skip run. Save
 *       next = runEnd.next before changing links so we don't lose the list.
 *
 * Example [1,2,3,3,4,4,5] — p and runEnd each iteration:
 *   p = current node (start of run); runEnd = after inner loop, last node with same value as p.
 *   "first [3]" = first node with value 3 in the list; "last [3]" = last node with value 3 in that run.
 *   iter1: p=[1], runEnd=[1]  → run length 1 → append 1
 *   iter2: p=[2], runEnd=[2]  → run length 1 → append 2
 *   iter3: p=first [3], runEnd=last [3]  → run length 2 → skip   (list has 3→3, so first 3 and last 3 are two different nodes)
 *   iter4: p=first [4], runEnd=last [4]  → run length 2 → skip   (list has 4→4, same idea)
 *   iter5: p=[5], runEnd=[5]  → run length 1 → append 5
 */

/**
 * @param {ListNode} head
 * @return {ListNode}
 */
function deleteDuplicates(head) {
  const dummy = new ListNode(0);
  let tail = dummy;
  let p = head;

  while (p) {
    const val = p.val;
    let runEnd = p;
    while (runEnd.next && runEnd.next.val === val) runEnd = runEnd.next;

    const next = runEnd.next;
    // runEnd === p means the run has length 1 (no duplicate with same value after p), so keep this node
    if (runEnd === p) {
      tail.next = p;
      tail = p;
      tail.next = null;
    }
    p = next;
  }

  tail.next = null;
  return dummy.next;
}

// --- ListNode helper (LeetCode standard) ---
function ListNode(val, next) {
  this.val = val === undefined ? 0 : val;
  this.next = next === undefined ? null : next;
}

function listFromArray(arr) {
  if (!arr.length) return null;
  const head = new ListNode(arr[0]);
  let curr = head;
  for (let i = 1; i < arr.length; i++) {
    curr.next = new ListNode(arr[i]);
    curr = curr.next;
  }
  return head;
}

function listToArray(head) {
  const out = [];
  while (head) {
    out.push(head.val);
    head = head.next;
  }
  return out;
}

// --- Examples ---
console.log(listToArray(deleteDuplicates(listFromArray([1, 2, 3, 3, 4, 4, 5])))); // [1, 2, 5]
console.log(listToArray(deleteDuplicates(listFromArray([1, 1, 2])))); // [2]
console.log(listToArray(deleteDuplicates(listFromArray([1, 1, 2, 3, 3])))); // [2]
console.log(listToArray(deleteDuplicates(listFromArray([1])))); // [1]
console.log(listToArray(deleteDuplicates(listFromArray([1, 1])))); // []
console.log(listToArray(deleteDuplicates(listFromArray([])))); // []
