/**
 * 2095. Delete the Middle Node of a Linked List
 * Given the head of a linked list, delete the middle node and return the head.
 * Middle = ⌊n/2⌋th node (0-based). For n=1,2,3,4,5 → indices 0,1,1,2,2.
 *
 * Example 1: [1,3,4,7,1,2,6] → [1,3,4,1,2,6] (n=7, delete index 3)
 * Example 2: [1,2,3,4] → [1,2,4] (n=4, delete index 2)
 *
 * One pass: prevOfMiddle + runner. When runner reaches end, prevOfMiddle is before middle. O(n), O(1).
 */

/**
 * @param {ListNode} head
 * @return {ListNode}
 *
 * --- EXPLANATION (example: list [1,3,4,7,1,2,6], length n=7) ---
 *
 * 1. WHAT WE WANT
 *    Middle node = index floor(n/2) = 3 → the node with value 7.
 *    To delete it we must change the previous node's .next (skip 7). So we need a pointer
 *    to the node BEFORE the middle — call it prevOfMiddle.
 *
 *    List:  [1]→[3]→[4]→[7]→[1]→[2]→[6]→null
 *            idx 0  1  2  3   4  5  6     ← delete idx 3 (value 7)
 *
 * 2. HOW WE FIND "NODE BEFORE MIDDLE" IN ONE PASS
 *    Use two pointers on the same list (no extra input):
 *    • runner: starts at head, each loop does runner = runner.next.next (moves 2 steps).
 *    • prevOfMiddle: starts at a dummy node before head, each loop does prevOfMiddle = prevOfMiddle.next (moves 1 step).
 *
 *    When runner reaches the last node (or past it), runner has moved 2x as far as prevOfMiddle.
 *    So prevOfMiddle is exactly at the node before the middle. Then we set prevOfMiddle.next = prevOfMiddle.next.next to remove the middle node.
 *
 * 3. DIAGRAM — SAME LIST, POSITIONS AFTER EACH LOOP
 *
 *    List (fixed):  dummy→[1]→[3]→[4]→[7]→[1]→[2]→[6]→null
 *                    idx:  -   0   1   2   3   4   5   6
 *
 *    Before loop:   prevOfMiddle = dummy,  runner = [1] (idx 0)
 *    After loop 1:  prevOfMiddle = [1],    runner = [4] (idx 2)   — runner did .next.next from 1→3→4
 *    After loop 2:  prevOfMiddle = [3],    runner = [1] (idx 4)   — runner did .next.next from 4→7→1
 *    After loop 3:  prevOfMiddle = [4],    runner = [6] (idx 6)   — runner did .next.next from 1→2→6
 *
 *    Now runner.next is null → stop. prevOfMiddle is [4]; prevOfMiddle.next is [7] (middle). Delete [7].
 *
 * 4. DELETE THE MIDDLE NODE
 *
 *    Before:  ...→[4]→[7]→[1]→...    (prevOfMiddle points to [4]; [4].next is [7])
 *    Code:    prevOfMiddle.next = prevOfMiddle.next.next;
 *    After:   ...→[4]→[1]→...        ([7] skipped, list is [1,3,4,1,2,6])
 *
 * 5. WHY "return head" GIVES THE FULL RESULT (graph)
 *
 *    head is a reference to the first node. The list is one chain: each node's .next points to the next.
 *    We only changed ONE link: [4].next now points to [1] instead of [7]. We never changed head nor the
 *    first node's .next. So the chain starting at head is still connected; it just skips [7].
 *
 *    BEFORE unlink:
 *
 *       head
 *         │
 *         ▼
 *       [1]→[3]→[4]→[7]→[1]→[2]→[6]→null
 *         └─────────────────────────────┘
 *              one chain (follow .next from head)
 *
 *    AFTER unlink (prevOfMiddle.next = prevOfMiddle.next.next):
 *
 *       head
 *         │
 *         ▼
 *       [1]→[3]→[4]  [7]  [1]→[2]→[6]→null
 *         └─────┼────┘     └───────────────┘
 *               └──────────────→  (we rewired [4].next to [1]; [7] is no longer in the chain)
 *
 *    So from head, following .next each time:  head → [1] → [3] → [4] → [1] → [2] → [6] → null.
 *    That is exactly the result [1,3,4,1,2,6]. So return head is correct.
 */
function deleteMiddle(head) {
  // Empty list or single node (n=1): delete the only node → return null (empty list)
  if (!head || !head.next) return null;

  const dummy = new ListNode(0, head);  // dummy → head (prevOfMiddle starts here)
  let prevOfMiddle = dummy;
  let runner = head;
  while (runner && runner.next) {
    runner = runner.next.next;
    prevOfMiddle = prevOfMiddle.next;
  }
  prevOfMiddle.next = prevOfMiddle.next.next;
  return head;
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
console.log(listToArray(deleteMiddle(listFromArray([1, 3, 4, 7, 1, 2, 6])))); // [1, 3, 4, 1, 2, 6]
console.log(listToArray(deleteMiddle(listFromArray([1, 2, 3, 4])))); // [1, 2, 4]
console.log(listToArray(deleteMiddle(listFromArray([1])))); // []
console.log(listToArray(deleteMiddle(listFromArray([1, 2])))); // [1]
