/**
 * 328. Odd Even Linked List
 * Given the head of a singly linked list, group all nodes with odd indices
 * together followed by nodes with even indices. First node = odd, second = even, etc.
 * Preserve relative order within each group. O(1) space, O(n) time.
 *
 * Example 1: [1,2,3,4,5] → [1,3,5,2,4]
 */

/**
 * @param {ListNode} head
 * @return {ListNode}
 *
 * Approach: Build two in-place sublists (odd-indexed and even-indexed), then
 * connect odd tail to even head. Use two pointers `odd` and `even`; each step
 * advance by rewiring .next to skip one node, so we never allocate new nodes.
 */
function oddEvenList(head) {
  if (!head || !head.next) return head;

  let odd = head;
  let even = head.next;
  const evenHead = even; // remember start of even list

  // Same "skip" idea as delete-middle: .next = .next.next skips one node.
  // Here we skip to build two chains (odd chain skips evens; even chain skips odds).
  while (even && even.next) {
    odd.next = odd.next.next;  // skip the even node → next odd
    even.next = even.next.next; // skip the odd node  → next even
    odd = odd.next;
    even = even.next;
  }

  odd.next = evenHead; // attach even list after odd list
  return head;
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

console.log(listToArray(oddEvenList(arrayToList([1, 2, 3, 4, 5])))); // [1, 3, 5, 2, 4]
console.log(listToArray(oddEvenList(arrayToList([2, 1, 3, 5, 6, 4, 7])))); // [2, 3, 6, 7, 1, 5, 4]
console.log(listToArray(oddEvenList(arrayToList([1])))); // [1]
console.log(listToArray(oddEvenList(arrayToList([1, 2])))); // [1, 2]
