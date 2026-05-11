// LeetCode 232: Implement Queue using Stacks
// Use two stacks: `inStack` for pushes, `outStack` for pops/peeks.
// When `outStack` is empty, drain `inStack` into it — this reverses the order
// so the oldest element ends up on top. Amortized O(1) per operation.

function createQueue() {
  const inStack = [];
  const outStack = [];

  function shiftIfNeeded() {
    if (outStack.length === 0) {
      while (inStack.length > 0) {
        outStack.push(inStack.pop());
      }
    }
  }

  return {
    push(x) {
      inStack.push(x);
    },
    pop() {
      shiftIfNeeded();
      return outStack.pop();
    },
    peek() {
      shiftIfNeeded();
      return outStack[outStack.length - 1];
    },
    empty() {
      return inStack.length === 0 && outStack.length === 0;
    },
  };
}

// Example
const q = createQueue();
q.push(1);
q.push(2);
console.log(q.peek());  // 1
console.log(q.pop());   // 1
console.log(q.empty()); // false
q.push(3);
console.log(q.pop());   // 2
console.log(q.pop());   // 3
console.log(q.empty()); // true

module.exports = createQueue;
