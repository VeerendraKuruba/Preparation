# Linked List Basics

A **linked list** is a linear data structure where elements are stored in nodes. Each node contains a **value** and a **pointer** (reference) to the next node. Unlike arrays, linked list elements are not stored in contiguous memory.

### What does "contiguous memory" mean?

**Contiguous** = "next to each other, with no gaps."

- **Arrays:** The computer reserves one **block of consecutive memory addresses** for all elements. So if the array starts at address 1000 and each element is 4 bytes, the first element is at 1000, the second at 1004, the third at 1008, etc. They sit **side by side** in memory.

  ```
  Memory (array):   [ 1 ][ 2 ][ 3 ][ 4 ]   ← one continuous block
  Addresses:        1000 1004 1008 1012
  ```

- **Linked list:** Each node is allocated **separately** (e.g. with `new Node()`). The first node might be at 1000, the second at 5000, the third at 200. They are **not** next to each other—they can be anywhere in memory. The only "order" is the **pointers**: node₁ points to node₂, node₂ points to node₃.

  ```
  Memory (linked list):
  Address 1000: [ 1 | next ──────────────┐
  Address 5000: [ 2 | next ──────┐       │
  Address 200:  [ 3 | next → null       │
                 ▲                      │
                 └──────────────────────┘
  (Logical order: 1 → 2 → 3, but physically scattered)
  ```

So **"not stored in contiguous memory"** means: the elements of a linked list do **not** sit in one consecutive block; they can be scattered, and the list order is maintained only by following the `next` pointers.

**Code comparison:**

```javascript
// ARRAY: One block of memory. All elements are stored in sequence.
// When you create arr = [10, 20, 30], the engine allocates a contiguous block.
const arr = [10, 20, 30];
console.log(arr[1]);  // 20 — direct jump to (base + 1). O(1).

// LINKED LIST: Each node is a separate allocation. Order is only in pointers.
class Node {
  constructor(val, next = null) { this.val = val; this.next = next; }
}
const n3 = new Node(30);   // Could be at memory address 0x2000
const n2 = new Node(20, n3); // Could be at 0x5000
const n1 = new Node(10, n2); // Could be at 0x1000
// To get "index 1" you must: start at n1, follow n1.next → n2. O(n).
console.log(n1.next.val);  // 20 — had to follow one pointer.
```

---

## Why Linked Lists?

| Arrays | Linked Lists |
|--------|--------------|
| Fixed size (or costly resize) | Dynamic size, grow/shrink at runtime |
| Contiguous memory | Non-contiguous (nodes can be anywhere) |
| Fast random access by index O(1) | No index; must traverse O(n) |
| Insert/delete at middle is costly O(n) | Insert/delete at known node is O(1) |

**Code example illustrating the difference:**

```javascript
// ARRAY: Insert at beginning requires shifting all elements. O(n).
function insertAtHeadArray(arr, value) {
  arr.unshift(value);  // Internally shifts every element right
  return arr;
}
let a = [2, 3, 4];
insertAtHeadArray(a, 1);  // [1, 2, 3, 4] — all elements moved in memory

// LINKED LIST: Insert at head is just two pointer updates. O(1).
function insertAtHeadList(head, value) {
  const newNode = new Node(value, head);
  return newNode;  // New node points to old head; no shifting.
}
let head = new Node(2, new Node(3, new Node(4)));
head = insertAtHeadList(head, 1);  // (1)→(2)→(3)→(4)→null — only pointers changed
```

---

## 1. Node Structure

A single **node** is the building block of a linked list.

```
┌─────────────────┐
│  data  │  next  │
┌─────────────────┘
```

- **data** (often named `val` or `data`): the value stored (number, string, object, etc.)
- **next**: reference to the next node (or `null` if this is the last node)

**Definition in code (JavaScript):**

```javascript
class ListNode {
  constructor(val, next = null) {
    this.val = val;   // The data we store
    this.next = next; // Link to next node; default null = end of list
  }
}
```

**Creating nodes and linking them:**

```javascript
// Last node first (no next node)
const node3 = new ListNode(3);           // 3 → null
const node2 = new ListNode(2, node3);    // 2 → 3 → null
const node1 = new ListNode(1, node2);   // 1 → 2 → 3 → null

// head points to the first node
const head = node1;
console.log(head.val);        // 1
console.log(head.next.val);   // 2
console.log(head.next.next.val); // 3
console.log(head.next.next.next); // null
```

**Shorthand for same list:**

```javascript
const head = new ListNode(1, new ListNode(2, new ListNode(3)));
```

---

## 2. Singly Linked List

A **singly linked list** has one pointer per node: `next`. You can only move **forward** from head toward the end.

### Diagram: Empty list

```
head
  │
  ▼
 null
```

**Code:** An empty list is simply `head = null`.

```javascript
let head = null;
if (head === null) console.log("Empty list");
```

### Diagram: List with 3 nodes

```
head
  │
  ▼
┌───┐     ┌───┐     ┌───┐
│ 1 │ ──► │ 2 │ ──► │ 3 │ ──► null
└───┘     └───┘     └───┘
```

### Diagram: With labels

```
 head
   │
   ▼
┌─────┐      ┌─────┐      ┌─────┐
│  5  │ ───► │ 10  │ ───► │ 15  │ ───► null
└─────┘      └─────┘      └─────┘
  node1        node2        node3
```

**Full code: Singly Linked List class (with head only)**

```javascript
class SinglyLinkedList {
  constructor() {
    this.head = null;  // Empty list: head is null
  }

  // Check if list is empty
  isEmpty() {
    return this.head === null;
  }

  // Build list from array (for testing)
  static fromArray(arr) {
    const list = new SinglyLinkedList();
    for (let i = arr.length - 1; i >= 0; i--) {
      list.insertAtHead(arr[i]);
    }
    return list;
  }

  insertAtHead(val) {
    this.head = new ListNode(val, this.head);
  }

  // See insertion section for more methods
}

// Usage
const list = SinglyLinkedList.fromArray([1, 2, 3]);
console.log(list.head.val);           // 1
console.log(list.head.next.val);      // 2
console.log(list.isEmpty());          // false
```

---

## 3. Traversal

To visit every node, start at `head` and follow `next` until `null`. Never assume a length; the list ends when `current.next` is `null`.

```
Step 1: current = head
        ┌───┐     ┌───┐     ┌───┐
        │ 1 │ ──► │ 2 │ ──► │ 3 │ ──► null
        └───┘     └───┘     └───┘
          ▲
        current

Step 2: current = current.next
        ┌───┐     ┌───┐     ┌───┐
        │ 1 │ ──► │ 2 │ ──► │ 3 │ ──► null
        └───┘     └───┘     └───┘
                    ▲
                  current

Step 3: current = current.next
        ┌───┐     ┌───┐     ┌───┐
        │ 1 │ ──► │ 2 │ ──► │ 3 │ ──► null
        └───┘     └───┘     └───┘
                              ▲
                            current

Step 4: current = current.next  →  current is null → STOP
```

**Basic traversal (print each value):**

```javascript
function traverse(head) {
  let current = head;
  while (current !== null) {
    console.log(current.val);
    current = current.next;
  }
}

// Example: head = 1 → 2 → 3 → null
traverse(head);  // Logs: 1, 2, 3
```

**Get length (traverse and count):**

```javascript
function getLength(head) {
  let count = 0;
  let current = head;
  while (current !== null) {
    count++;
    current = current.next;
  }
  return count;
}
console.log(getLength(head));  // 3
```

**Convert list to array (useful for testing):**

```javascript
function listToArray(head) {
  const result = [];
  let current = head;
  while (current !== null) {
    result.push(current.val);
    current = current.next;
  }
  return result;
}
console.log(listToArray(head));  // [1, 2, 3]
```

**Access by "index" (no random access — must traverse):**

```javascript
function getAt(head, index) {
  let current = head;
  let i = 0;
  while (current !== null && i < index) {
    current = current.next;
    i++;
  }
  return current === null ? undefined : current.val;
}
console.log(getAt(head, 1));  // 2 (O(n) — we had to walk 1 step)
```

---

## 4. Insertion

### 4.1 Insert at head (front)

**Before:**

```
head
  │
  ▼
┌───┐     ┌───┐
│ 2 │ ──► │ 3 │ ──► null
└───┘     └───┘
```

**Steps:**  
1. Create new node with value `1`.  
2. Set `newNode.next = head`.  
3. Set `head = newNode`.

**After:**

```
head
  │
  ▼
┌───┐     ┌───┐     ┌───┐
│ 1 │ ──► │ 2 │ ──► │ 3 │ ──► null
└───┘     └───┘     └───┘
  new
```

**Code:**

```javascript
function insertAtHead(head, value) {
  const newNode = new ListNode(value, head);
  return newNode;  // New node becomes the new head
}

// Before: head = 2 → 3 → null
head = insertAtHead(head, 1);
// After:  head = 1 → 2 → 3 → null
```

**Time:** O(1).

---

### 4.2 Insert after a given node

**Before (insert after node with 2):**

```
        ┌───┐     ┌───┐     ┌───┐
        │ 1 │ ──► │ 2 │ ──► │ 3 │ ──► null
        └───┘     └───┘     └───┘
                    ▲
                 given
```

**Steps:**  
1. Create new node with value `X`.  
2. `newNode.next = given.next`.  
3. `given.next = newNode`.

**After:**

```
        ┌───┐     ┌───┐     ┌───┐     ┌───┐
        │ 1 │ ──► │ 2 │ ──► │ X │ ──► │ 3 │ ──► null
        └───┘     └───┘     └───┘     └───┘
                    ▲         ▲
                 given       new
```

**Code:**

```javascript
function insertAfter(givenNode, value) {
  // givenNode is a reference to the node after which we insert
  const newNode = new ListNode(value, givenNode.next);
  givenNode.next = newNode;
  return newNode;
}

// List: 1 → 2 → 3 → null, and we have reference to node with value 2
const node2 = head.next;
insertAfter(node2, 99);
// List: 1 → 2 → 99 → 3 → null
```

**If you only have the value and must find the node first (O(n)):**

```javascript
function insertAfterByValue(head, afterValue, newValue) {
  let current = head;
  while (current !== null && current.val !== afterValue) {
    current = current.next;
  }
  if (current === null) return head;  // Not found
  current.next = new ListNode(newValue, current.next);
  return head;
}
```

**Time:** O(1) if you already have the node; O(n) if you must find it by value.

---

### 4.3 Insert at tail (end)

**Before:**

```
head
  │
  ▼
┌───┐     ┌───┐
│ 1 │ ──► │ 2 │ ──► null
└───┘     └───┘
```

**Steps:**  
1. Traverse to last node (where `next === null`).  
2. Create new node with value `3`.  
3. `last.next = newNode`.

**After:**

```
head
  │
  ▼
┌───┐     ┌───┐     ┌───┐
│ 1 │ ──► │ 2 │ ──► │ 3 │ ──► null
└───┘     └───┘     └───┘
                        ▲
                       new
```

**Code (without tail — must traverse to find last node):**

```javascript
function insertAtTail(head, value) {
  const newNode = new ListNode(value);
  if (head === null) return newNode;  // Empty list: new node is the only node

  let current = head;
  while (current.next !== null) {
    current = current.next;
  }
  current.next = newNode;
  return head;
}

// Before: head = 1 → 2 → null
head = insertAtTail(head, 3);
// After:  head = 1 → 2 → 3 → null
```

**With a list class that keeps a `tail` pointer (O(1) append):**

```javascript
class LinkedListWithTail {
  constructor() {
    this.head = null;
    this.tail = null;
  }
  append(val) {
    const newNode = new ListNode(val);
    if (this.head === null) {
      this.head = this.tail = newNode;
      return;
    }
    this.tail.next = newNode;
    this.tail = newNode;
  }
}
```

**Time:** O(n) without a tail pointer; O(1) if you maintain a `tail` reference.

---

## 5. Deletion

### 5.1 Delete head

**Before:**

```
head
  │
  ▼
┌───┐     ┌───┐     ┌───┐
│ 1 │ ──► │ 2 │ ──► │ 3 │ ──► null
└───┘     └───┘     └───┘
```

**Steps:**  
1. `head = head.next` (first node is no longer referenced).

**After:**

```
head
  │
  ▼
        ┌───┐     ┌───┐
        │ 2 │ ──► │ 3 │ ──► null
        └───┘     └───┘
```

**Code:**

```javascript
function deleteHead(head) {
  if (head === null) return null;
  return head.next;  // Second node becomes new head; first is unreferenced
}

// Before: head = 1 → 2 → 3 → null
head = deleteHead(head);
// After:  head = 2 → 3 → null
```

**Time:** O(1).

---

### 5.2 Delete a node given its predecessor

If you have pointer to the node **before** the one to delete:

**Before (delete node with 2):**

```
        ┌───┐     ┌───┐     ┌───┐
        │ 1 │ ──► │ 2 │ ──► │ 3 │ ──► null
        └───┘     └───┘     └───┘
          ▲         ▲
       prev      toDelete
```

**Step:**  
`prev.next = prev.next.next` (skip the node to delete).

**After:**

```
        ┌───┐     ┌───┐
        │ 1 │ ──► │ 3 │ ──► null
        └───┘     └───┘
```

**Code (when you have the previous node):**

```javascript
function deleteNext(prevNode) {
  if (prevNode === null || prevNode.next === null) return;
  prevNode.next = prevNode.next.next;  // Skip the node to delete
}

// List: 1 → 2 → 3 → null, prev = node with value 1
deleteNext(head);  // Now list is 1 → 3 → null
```

**Delete by value (must find previous node first — O(n)):**

```javascript
function deleteByValue(head, value) {
  if (head === null) return null;
  if (head.val === value) return head.next;  // Delete head

  let current = head;
  while (current.next !== null && current.next.val !== value) {
    current = current.next;
  }
  if (current.next !== null) {
    current.next = current.next.next;
  }
  return head;
}
```

**Time:** O(1) if you have `prev`; O(n) to find `prev` by value.

---

## 6. Doubly Linked List

Each node has **two** pointers: `next` and `prev`. You can move **forward** and **backward**. Deleting a node when you have a reference to it is O(1) because you can fix `prev.next` and `next.prev` without traversing.

### Node structure

```
┌─────────┬───────┬─────────┐
│  prev   │  data │  next   │
└─────────┴───────┴─────────┘
```

### Diagram

```
        null ◄──► ┌───┐ ◄──► ┌───┐ ◄──► ┌───┐ ◄──► null
                  │ 1 │     │ 2 │     │ 3 │
                  └───┘     └───┘     └───┘
                    ▲                   ▲
                  head                tail
```

**Definition and basic operations:**

```javascript
class DoublyListNode {
  constructor(val, prev = null, next = null) {
    this.val = val;
    this.prev = prev;
    this.next = next;
  }
}

class DoublyLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
  }

  insertAtHead(val) {
    const newNode = new DoublyListNode(val, null, this.head);
    if (this.head) this.head.prev = newNode;
    else this.tail = newNode;
    this.head = newNode;
  }

  insertAtTail(val) {
    const newNode = new DoublyListNode(val, this.tail, null);
    if (this.tail) this.tail.next = newNode;
    else this.head = newNode;
    this.tail = newNode;
  }

  // Delete node when we have reference — O(1)
  deleteNode(node) {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
  }

  // Traverse forward (same as singly)
  traverseForward() {
    let cur = this.head;
    while (cur) {
      console.log(cur.val);
      cur = cur.next;
    }
  }

  // Traverse backward (only doubly can do this easily)
  traverseBackward() {
    let cur = this.tail;
    while (cur) {
      console.log(cur.val);
      cur = cur.prev;
    }
  }
}

// Usage
const dlist = new DoublyLinkedList();
dlist.insertAtTail(1);
dlist.insertAtTail(2);
dlist.insertAtTail(3);
dlist.traverseForward();   // 1, 2, 3
dlist.traverseBackward(); // 3, 2, 1
```

**Use case:** When you need to go backwards (e.g. browser history, undo).

---

## 7. Circular Linked List

The **last** node’s `next` points back to the **first** node (or head). There is **no** `null` at the end — traversal must stop when you reach `head` again (if starting from head).

### Diagram

```
         ┌──────────────────────────────┐
         │                              │
         ▼                              │
        ┌───┐     ┌───┐     ┌───┐       │
        │ 1 │ ──► │ 2 │ ──► │ 3 │ ──────┘
        └───┘     └───┘     └───┘
```

**Definition and traversal (stop when we come back to start):**

```javascript
// Build circular list: 1 → 2 → 3 → back to 1
const n3 = new ListNode(3);
const n2 = new ListNode(2, n3);
const n1 = new ListNode(1, n2);
n3.next = n1;  // Close the cycle
const circularHead = n1;

function traverseCircular(head, maxSteps = 10) {
  if (head === null) return;
  let current = head;
  let steps = 0;
  do {
    console.log(current.val);
    current = current.next;
    steps++;
  } while (current !== head && steps < maxSteps);  // Prevent infinite loop in demo
}
traverseCircular(circularHead);  // 1, 2, 3, 1, 2, 3, ...
```

**Check if a list is circular (has cycle):** use slow/fast pointers; see Example 4 below.

**Use case:** Round-robin scheduling, repeated cycles.

---

## 8. Complexity Summary

| Operation        | Singly LL     | Doubly LL     |
|-----------------|---------------|----------------|
| Access by index | O(n)          | O(n)          |
| Search by value | O(n)          | O(n)          |
| Insert at head  | O(1)          | O(1)          |
| Insert at tail  | O(n)* or O(1) | O(n)* or O(1) |
| Delete head     | O(1)          | O(1)          |
| Delete node**  | O(n)          | O(1)          |

\* O(1) if you keep a `tail` pointer.  
\** Delete by reference: singly needs to find previous node; doubly has `prev`.

**Code illustrating each complexity:**

```javascript
// Access by index — O(n): must step through list
function getAt(head, index) {
  let cur = head;
  for (let i = 0; i < index && cur; i++) cur = cur.next;
  return cur?.val;
}

// Search by value — O(n): must traverse until found
function search(head, value) {
  let cur = head;
  while (cur && cur.val !== value) cur = cur.next;
  return cur !== null;
}

// Insert at head — O(1): only two pointer assignments
function insertHead(head, val) {
  return new ListNode(val, head);
}

// Insert at tail — O(n) without tail; O(1) with tail (see LinkedListWithTail above)

// Delete head — O(1)
function deleteHead(head) {
  return head?.next ?? null;
}

// Delete node by reference: Singly O(n) — must find prev; Doubly O(1) — use node.prev
```

---

## 9. Example 1: Building a list from an array

**Definition:** Given an array, create a singly linked list with the same elements in the same order.

**Idea:** Build from the end. Start with `head = null` (empty list). For each element from **last to first**, create a new node whose `next` is the current `head`, then set `head` to that new node. So the last array element becomes the last node (next = null), and the first array element ends up at head.

```javascript
function arrayToList(arr) {
  let head = null;
  for (let i = arr.length - 1; i >= 0; i--) {
    head = new ListNode(arr[i], head);
  }
  return head;
}

// Step-by-step for [1, 2, 3]:
// i=2: head = (3, null)           → 3 → null
// i=1: head = (2, head)           → 2 → 3 → null
// i=0: head = (1, head)           → 1 → 2 → 3 → null
const head = arrayToList([1, 2, 3]);
console.log(head.val, head.next.val, head.next.next.val);  // 1 2 3
```

**Alternative: build from front (need tail pointer for O(1) append):**

```javascript
function arrayToListFront(arr) {
  const dummy = new ListNode(0);
  let tail = dummy;
  for (const val of arr) {
    tail.next = new ListNode(val);
    tail = tail.next;
  }
  return dummy.next;
}
```

---

## 10. Example 2: Reverse a linked list (classic)

**Definition:** Modify the list so that the last node becomes the head and every `next` pointer points backward. Return the new head.

**Idea:** Change each node’s `next` to point to the **previous** node. Use three pointers: `prev`, `curr`, and a temporary `next` so we don’t lose the rest of the list.

```
Before:  (1) → (2) → (3) → null

After:   null ← (1) ← (2) ← (3)
                        new head
```

**Code with comments:**

```javascript
function reverseList(head) {
  let prev = null;
  let curr = head;
  while (curr !== null) {
    const next = curr.next;  // Save next node before we overwrite curr.next
    curr.next = prev;        // Reverse the link
    prev = curr;             // Move prev forward
    curr = next;             // Move curr forward
  }
  return prev;  // prev is the new head (old last node)
}

// Example
const head = arrayToList([1, 2, 3]);
const reversed = reverseList(head);
console.log(listToArray(reversed));  // [3, 2, 1]
```

---

## 11. Example 3: Find middle node (slow/fast pointers)

**Definition:** Return the middle node of a singly linked list. If there are two middles (even length), return the second one (e.g. [1,2,3,4] → node with 3).

**Idea:** **Slow-fast pointers:** `slow` moves 1 step, `fast` moves 2 steps per iteration. When `fast` reaches the end (null or last node), `slow` is at the middle. One pass, O(n) time, O(1) space.

```
Step 1:  (1) → (2) → (3) → (4) → (5) → null
          S     F

Step 2:  (1) → (2) → (3) → (4) → (5) → null
                 S          F

Step 3:  (1) → (2) → (3) → (4) → (5) → null
                        S               F (null)
         Middle = 3
```

```javascript
function middleNode(head) {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
}

// Odd length: [1,2,3] → middle is 2
console.log(middleNode(arrayToList([1,2,3])).val);  // 2
// Even length: [1,2,3,4] → second middle is 3
console.log(middleNode(arrayToList([1,2,3,4])).val);  // 3
```

---

## 12. Example 4: Detect cycle (Floyd’s algorithm)

**Definition:** A cycle exists when some node’s `next` points to an earlier node, so traversal never reaches `null`. Return `true` if the list has a cycle, `false` otherwise.

**Idea (Floyd’s cycle-finding):** Use slow (1 step) and fast (2 steps) pointers. If there is a cycle, they will eventually meet inside the cycle. If there is no cycle, `fast` will hit `null`.

```
        ┌─────────────────┐
        │                 ▼
  (1) → (2) → (3) → (4) → (5)
        ▲                 │
        └─────────────────┘
```

```javascript
function hasCycle(head) {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;  // Met inside cycle
  }
  return false;
}

// Build list with cycle: 1 → 2 → 3 → 4 → 5 → back to 2
const n5 = new ListNode(5);
const n4 = new ListNode(4, n5);
const n3 = new ListNode(3, n4);
const n2 = new ListNode(2, n3);
const n1 = new ListNode(1, n2);
n5.next = n2;
console.log(hasCycle(n1));  // true

// List without cycle
console.log(hasCycle(arrayToList([1,2,3])));  // false
```

---

## Quick reference

- **Singly linked list:** One pointer per node (`next`); traverse forward only.
- **Doubly linked list:** `prev` and `next`; traverse both ways.
- **Circular:** Last node points to first; no null at end.
- **Head:** First node; always keep a reference.
- **Tail:** Last node; optional pointer for O(1) append.
- **Dummy node:** Extra node before head to simplify edge cases (empty list, insert/delete at head).

Use this as a reference while solving linked list problems (e.g. on LeetCode).
