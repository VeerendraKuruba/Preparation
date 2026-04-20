/**
 * 206. Reverse Linked List
 * Given the head of a singly linked list, reverse the list and return the reversed list.
 *
 * Example 1: [1,2,3,4,5] → [5,4,3,2,1]
 */

/**
 * @param {ListNode} head
 * @return {ListNode}
 *
 * Approach: Iterative in-place reversal. We walk the list once, flipping each
 * node's .next to point backward. O(n) time, O(1) space.
 *
 * --- DIAGRAM: Initial list ---
 *
 *     head
 *       │
 *       ▼
 *    ┌───┐    ┌───┐    ┌───┐    ┌───┐    ┌───┐
 *    │ 1 │───▶│ 2 │───▶│ 3 │───▶│ 4 │───▶│ 5 │───▶ null
 *    └───┘    └───┘    └───┘    └───┘    └───┘
 *
 * --- DIAGRAM: One iteration (flip one link) ---
 *
 *   prev      curr      next
 *     │         │         │
 *     ▼         ▼         ▼
 *   null    ┌───┐      ┌───┐    ┌───┐    ...
 *           │ 1 │  ──▶ │ 2 │───▶│ 3 │
 *           └───┘      └───┘    └───┘
 *              │
 *              │  curr.next = prev  (break 1→2, point 1→null)
 *              ▼
 *   null    ┌───┐      ┌───┐    ┌───┐
 *      ◀─── │ 1 │      │ 2 │───▶│ 3 │
 *           └───┘      └───┘    └───┘
 *
 *   Then: prev = curr (prev now points to 1),  curr = next (curr now points to 2).
 *
 * --- DIAGRAM: After all iterations (result) ---
 *
 *    prev (new head)
 *       │
 *       ▼
 *    ┌───┐    ┌───┐    ┌───┐    ┌───┐    ┌───┐
 *    │ 5 │◀───│ 4 │◀───│ 3 │◀───│ 2 │◀───│ 1 │◀─── null
 *    └───┘    └───┘    └───┘    └───┘    └───┘
 *
 * --- Example walkthrough: head = [1 → 2 → 3 → 4 → 5 → null] ---
 *
 *   Start:  prev=null, curr=1→2→3→4→5
 *   Step 1: flip 1→null   → prev=1, curr=2→3→4→5
 *   Step 2: flip 2→1      → prev=2→1, curr=3→4→5
 *   Step 3: flip 3→2→1    → prev=3→2→1, curr=4→5
 *   Step 4: flip 4→3→2→1  → prev=4→3→2→1, curr=5
 *   Step 5: flip 5→4→3→2→1 → prev=5→4→3→2→1, curr=null
 *   Return prev → [5,4,3,2,1].
 */
function reverseList(head) {
  let prev = null;
  let curr = head;

  while (curr) {
    const next = curr.next; // rest of original list; we need it after overwriting curr.next
    curr.next = prev;       // point this node backward to the reversed list so far
    prev = curr;            // reversed list now has one more node at the front
    curr = next;            // move to the next node in the original list
  }

  return prev;
}

// --- Tests (ListNode helper and examples) ---

function ListNode(val, next) {
  this.val = val === undefined ? 0 : val;
  this.next = next === undefined ? null : next;
}

function arrayToList(arr) {
  if (!arr.length) return null;
  const head = new ListNode(arr[0]);
  let cur = head;
  for (let i = 1; i < arr.length; i++) {
    cur.next = new ListNode(arr[i]);
    cur = cur.next;
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

console.log(listToArray(reverseList(arrayToList([1, 2, 3, 4, 5])))); // [5, 4, 3, 2, 1]
console.log(listToArray(reverseList(arrayToList([1, 2]))));          // [2, 1]
console.log(listToArray(reverseList(arrayToList([1]))));            // [1]
console.log(listToArray(reverseList(arrayToList([]))));              // []
