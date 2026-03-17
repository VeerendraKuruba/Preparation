/**
 * 83. Remove Duplicates from Sorted List
 * Given the head of a sorted linked list, delete all duplicates so each
 * element appears only once. Return the linked list sorted as well.
 *
 * Example 1: head = [1,1,2] → [1,2]
 * Example 2: head = [1,1,2,3,3] → [1,2,3]
 *
 * Single pass: skip duplicate next nodes (list is sorted so dupes are adjacent). O(n), O(1).
 */

/**
 * @param {ListNode} head
 * @return {ListNode}
 */
function deleteDuplicates(head) {
  let curr = head;
  while (curr && curr.next) {
    if (curr.val === curr.next.val) {
      curr.next = curr.next.next;
    } else {
      curr = curr.next;
    }
  }
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
console.log(listToArray(deleteDuplicates(listFromArray([1, 1, 2])))); // [1, 2]
console.log(listToArray(deleteDuplicates(listFromArray([1, 1, 2, 3, 3])))); // [1, 2, 3]
console.log(listToArray(deleteDuplicates(listFromArray([1])))); // [1]
console.log(listToArray(deleteDuplicates(listFromArray([])))); // []
