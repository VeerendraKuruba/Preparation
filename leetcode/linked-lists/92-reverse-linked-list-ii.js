/**
 * 92. Reverse Linked List II
 * https://leetcode.com/problems/reverse-linked-list-ii/
 * Difficulty: Medium
 *
 * Time: O(n), Space: O(1)
 */

var reverseBetween = function(head, left, right) {
    const dummy = new ListNode(0, head);
    let prev = dummy;

    for (let i = 1; i < left; i++) {
        prev = prev.next;
    }

    let curr = prev.next;

    for (let i = 0; i < right - left; i++) {
        const next = curr.next;
        curr.next = next.next;
        next.next = prev.next;
        prev.next = next;
    }

    return dummy.next;
};
