// 82. Remove Duplicates from Sorted List II
// Time: O(n)  Space: O(1)
//
// One-pass in-place: dummyHead points at the list; prevNode is always the last
// node we trust. If the next two values match, skip the whole value run by
// moving prevNode.next forward; otherwise step prevNode onto that unique node.
function deleteDuplicates(head) {
  const dummyHead = new ListNode(0, head);
  let prevNode = dummyHead;

  while (prevNode.next && prevNode.next.next) {
    if (prevNode.next.val === prevNode.next.next.val) {
      const duplicateValue = prevNode.next.val;
      while (prevNode.next && prevNode.next.val === duplicateValue) {
        prevNode.next = prevNode.next.next;
      }
    } else {
      prevNode = prevNode.next;
    }
  }

  return dummyHead.next;
}

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

console.log(listToArray(deleteDuplicates(listFromArray([1, 2, 3, 3, 4, 4, 5])))); // [1, 2, 5]
console.log(listToArray(deleteDuplicates(listFromArray([1, 1, 2])))); // [2]
console.log(listToArray(deleteDuplicates(listFromArray([1, 1, 2, 3, 3])))); // [2]
console.log(listToArray(deleteDuplicates(listFromArray([1])))); // [1]
console.log(listToArray(deleteDuplicates(listFromArray([1, 1])))); // []
console.log(listToArray(deleteDuplicates(listFromArray([])))); // []
