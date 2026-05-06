/**
 * 2. Add Two Numbers
 * https://leetcode.com/problems/add-two-numbers/
 *
 * Digits stored in reverse order. Add and return sum as linked list.
 * Time: O(max(m, n))  Space: O(max(m, n))
 */

function ListNode(val, next) {
  this.val = val === undefined ? 0 : val;
  this.next = next === undefined ? null : next;
}

/**
 * @param {ListNode} l1
 * @param {ListNode} l2
 * @return {ListNode}
 */
var addTwoNumbers = function (l1, l2) {
  const dummy = new ListNode(0);
  let curr = dummy;
  let carry = 0;

  while (l1 !== null || l2 !== null || carry !== 0) {
    const v1 = l1 ? l1.val : 0;
    const v2 = l2 ? l2.val : 0;

    const sum = v1 + v2 + carry;
    carry = Math.floor(sum / 10);

    curr.next = new ListNode(sum % 10);
    curr = curr.next;

    if (l1) l1 = l1.next;
    if (l2) l2 = l2.next;
  }

  return dummy.next;
};

// --- helpers for testing ---
function toList(arr) {
  const dummy = new ListNode(0);
  let curr = dummy;
  for (const v of arr) {
    curr.next = new ListNode(v);
    curr = curr.next;
  }
  return dummy.next;
}

function toArray(node) {
  const res = [];
  while (node) {
    res.push(node.val);
    node = node.next;
  }
  return res;
}

// Tests
console.log(toArray(addTwoNumbers(toList([2, 4, 3]), toList([5, 6, 4])))); // [7, 0, 8]
console.log(toArray(addTwoNumbers(toList([0]), toList([0]))));             // [0]
console.log(toArray(addTwoNumbers(toList([9, 9, 9, 9, 9, 9, 9]), toList([9, 9, 9, 9])))); // [8,9,9,9,0,0,0,1]
