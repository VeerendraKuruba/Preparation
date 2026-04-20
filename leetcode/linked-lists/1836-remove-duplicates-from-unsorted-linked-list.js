/**
 * Remove Duplicates from an Unsorted Linked List
 * Given the head of a linked list, remove all nodes that have duplicate values.
 * Keep only the first occurrence of each value.
 *
 * Example 1: head = [1,2,1,2,3] → [1,2,3]
 * Example 2: head = [2,1,1,2]   → [2,1]
 *
 * Approach: Use a Set to track seen values. Single pass, remove node if val already seen.
 * Time O(n), Space O(n).
 */

/**
 * @param {ListNode} head
 * @return {ListNode}
 */
function deleteDuplicates(head) {
  if (!head) return null;
  const seen = new Set();
  seen.add(head.val);

  let curr = head;
  while (curr && curr.next) {
    if (seen.has(curr.next.val)) {
      curr.next = curr.next.next;
    } else {
      seen.add(curr.next.val);
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
console.log(listToArray(deleteDuplicates(listFromArray([1, 2, 1, 2, 3])))); // [1, 2, 3]
console.log(listToArray(deleteDuplicates(listFromArray([2, 1, 1, 2])))); // [2, 1]
console.log(listToArray(deleteDuplicates(listFromArray([1])))); // [1]
console.log(listToArray(deleteDuplicates(listFromArray([])))); // []
