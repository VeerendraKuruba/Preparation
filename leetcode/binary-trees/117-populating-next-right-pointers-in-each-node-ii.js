/**
 * 117. Populating Next Right Pointers in Each Node II
 * https://leetcode.com/problems/populating-next-right-pointers-in-each-node-ii/
 *
 * O(n) time, O(1) space — uses dummy node to build next level's linked list
 * while traversing current level via next pointers.
 *
 * @param {Node} root
 * @return {Node}
 */
var connect = function (root) {
    let curr = root;

    while (curr) {
        const dummy = new Node(0);
        let tail = dummy;

        while (curr) {
            if (curr.left) { tail.next = curr.left; tail = tail.next; }
            if (curr.right) { tail.next = curr.right; tail = tail.next; }
            curr = curr.next;
        }

        curr = dummy.next;
    }

    return root;
};
