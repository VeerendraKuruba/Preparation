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

---

## Why Linked Lists?

| Arrays | Linked Lists |
|--------|--------------|
| Fixed size (or costly resize) | Dynamic size, grow/shrink at runtime |
| Contiguous memory | Non-contiguous (nodes can be anywhere) |
| Fast random access by index O(1) | No index; must traverse O(n) |
| Insert/delete at middle is costly O(n) | Insert/delete at known node is O(1) |

---

## 1. Node Structure

A single **node** is the building block of a linked list.

```
┌─────────────────┐
│  data  │  next  │
┌─────────────────┘
```

- **data**: the value stored (number, string, object, etc.)
- **next**: reference to the next node (or `null` if last node)

**In code (JavaScript):**

```javascript
class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}
```

---

## 2. Singly Linked List

A **singly linked list** has one pointer per node: `next`. You can only move **forward**.

### Diagram: Empty list

```
head
  │
  ▼
 null
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

---

## 3. Traversal

To visit every node, start at `head` and follow `next` until `null`.

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

**Code:**

```javascript
function traverse(head) {
  let current = head;
  while (current !== null) {
    console.log(current.val);
    current = current.next;
  }
}
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

**Time:** O(1) if you have `prev`; O(n) to find `prev` by value.

---

## 6. Doubly Linked List

Each node has **two** pointers: `next` and `prev`. You can move forward and backward.

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

**Use case:** When you need to go backwards (e.g. browser history, undo).

---

## 7. Circular Linked List

The **last** node’s `next` points back to the **first** node (or head). No null at the end.

### Diagram

```
         ┌──────────────────────────────┐
         │                              │
         ▼                              │
        ┌───┐     ┌───┐     ┌───┐       │
        │ 1 │ ──► │ 2 │ ──► │ 3 │ ──────┘
        └───┘     └───┘     └───┘
```

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

---

## 9. Example 1: Building a list from an array

```javascript
function arrayToList(arr) {
  let head = null;
  for (let i = arr.length - 1; i >= 0; i--) {
    head = new ListNode(arr[i], head);
  }
  return head;
}
// [1, 2, 3]  →  (1) → (2) → (3) → null
```

---

## 10. Example 2: Reverse a linked list (classic)

**Idea:** Change each node’s `next` to point to the previous node.

```
Before:  (1) → (2) → (3) → null

After:   null ← (1) ← (2) ← (3)
```

```javascript
function reverseList(head) {
  let prev = null;
  let curr = head;
  while (curr !== null) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}
```

---

## 11. Example 3: Find middle node (slow/fast pointers)

**Idea:** `slow` moves 1 step, `fast` moves 2 steps. When `fast` reaches the end, `slow` is at the middle.

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
```

---

## 12. Example 4: Detect cycle (Floyd’s algorithm)

If a list has a cycle, slow and fast will eventually meet inside the cycle.

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
    if (slow === fast) return true;
  }
  return false;
}
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
