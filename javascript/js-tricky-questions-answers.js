/**
 * JavaScript Tricky Interview Questions - Answers & Explanations
 * ==============================================================
 */

// =============================================================================
// 1️⃣ Type Coercion: Arrays and Objects with + operator
// =============================================================================

console.log("=== 1️⃣ Type Coercion: [] and {} with + ===\n");

console.log("[] + []");
console.log("Output:", [] + []);
console.log("Explanation: Both operands are arrays. The + operator triggers string concatenation when one operand is a string. Arrays use .toString() which joins elements with commas. [].toString() = ''. So '' + '' = '' (empty string).\n");

console.log("[] + {}");
console.log("Output:", [] + {});
console.log("Explanation: [] becomes '' via .toString(). {} becomes '[object Object]' (default Object.prototype.toString()). So '' + '[object Object]' = '[object Object]'.\n");

console.log("{} + []");
console.log("Output:", {} + []);
console.log("Explanation: Inside console.log(...) the whole thing is one expression, so both {} and [] are values. {} is an empty object → '[object Object]', [] → ''. So '[object Object]' + '' = '[object Object]'. Note: If you run {} + [] as a standalone statement (e.g. in REPL), the first {} can be parsed as an empty block, so you get +[] = 0. Context matters!\n");

console.log("{} + {}");
console.log("Output:", {} + {});
console.log("Explanation: Same expression context: both {} are object literals. Each becomes '[object Object]', so '[object Object]' + '[object Object]' = '[object Object][object Object]'.\n");

// =============================================================================
// 2️⃣ Event Loop Deep Dive
// =============================================================================

console.log("=== 2️⃣ Event Loop ===\n");

console.log("Code:");
console.log('  console.log("start");');
console.log('  setTimeout(() => console.log("timeout"));');
console.log('  Promise.resolve().then(() => console.log("promise"));');
console.log('  queueMicrotask(() => console.log("microtask"));');
console.log('  console.log("end");\n');

console.log("Exact output order: start → end → promise → microtask → timeout\n");

console.log("Explanation:");
console.log("- Synchronous code runs first: 'start', then 'end'.");
console.log("- Then the microtask queue is drained. Both Promise.then and queueMicrotask add callbacks to the microtask queue.");
console.log("- They run in order of registration: 'promise' then 'microtask'.");
console.log("- setTimeout goes to the macrotask (task) queue and runs after the current call stack and microtasks are done: 'timeout'.\n");

// Run it to show output:
console.log("Live run:");
console.log("start");
setTimeout(() => console.log("timeout"));
Promise.resolve().then(() => console.log("promise"));
queueMicrotask(() => console.log("microtask"));
console.log("end");

// =============================================================================
// 3️⃣ Closures + Loop Trap (var)
// =============================================================================

console.log("\n=== 3️⃣ Closures + Loop Trap ===\n");

console.log("Code: for (var i = 0; i < 3; i++) { setTimeout(() => console.log(i), 100); }\n");

console.log("Output: 3, 3, 3 (printed three times)\n");

console.log("Explanation:");
console.log("- var i is function-scoped (or global here), not block-scoped. There is only one i.");
console.log("- All three setTimeout callbacks close over the same i.");
console.log("- By the time the callbacks run (~100ms later), the loop has finished and i is 3.");
console.log("- So each callback logs 3. Fix: use let i (block-scoped) so each iteration gets its own i.\n");

// =============================================================================
// 4️⃣ this Binding Confusion
// =============================================================================

console.log("=== 4️⃣ this Binding ===\n");

const obj = {
  value: 10,
  getValue() {
    return this.value;
  },
};

const getValue = obj.getValue;

console.log("getValue() called without obj context:");
console.log("Output:", getValue());
console.log("Explanation: getValue is just a reference to the function. When you call getValue(), there is no object to the left of the dot, so this is undefined (strict mode) or the global object (sloppy mode). this.value is therefore undefined. Result: undefined.\n");

// =============================================================================
// 5️⃣ Object Reference Trap
// =============================================================================

console.log("=== 5️⃣ Object Reference ===\n");

const a = { name: "JS" };
const b = a;
b.name = "React";

console.log("a.name after b.name = 'React':", a.name);
console.log("Explanation: a and b point to the same object in memory. Objects are assigned by reference. Changing b.name mutates that single object, so a.name is also 'React'.\n");

// =============================================================================
// 6️⃣ Array Mutation Trick
// =============================================================================

console.log("=== 6️⃣ Array Mutation ===\n");

const arr = [1, 2, 3];
arr[10] = 99;

console.log("arr.length:", arr.length);
console.log("arr:", arr);
console.log("Explanation: Setting arr[10] = 99 creates a new index 10. JavaScript sets length to 11. Indices 3–9 are empty (holes). So you get length 11 and [1, 2, 3, <7 empty>, 99].\n");

// =============================================================================
// 7️⃣ Destructuring Edge Case
// =============================================================================

console.log("=== 7️⃣ Destructuring ===\n");

const objForDestructure = { a: 1, b: 2 };
const { a: aVal, ...rest } = objForDestructure; // same as: const { a, ...rest } = obj
rest.b = 5;

console.log("objForDestructure.b after rest.b = 5:", objForDestructure.b);
console.log("Explanation: const { a, ...rest } = obj copies the rest of properties into a new object rest. So rest = { b: 2 } is a new object. Assigning rest.b = 5 only changes rest, not the original object. So the original obj.b stays 2. The original object does NOT change.\n");

// =============================================================================
// 8️⃣ Promise Chain Trap
// =============================================================================

console.log("=== 8️⃣ Promise Chain ===\n");

console.log("Promise chain: resolve(1) → then +1 → then throw → catch return 10 → then log");
Promise.resolve(1)
  .then((x) => x + 1)
  .then((x) => {
    throw new Error("boom");
  })
  .catch(() => 10)
  .then((x) => console.log("Promise chain output:", x));

console.log("Explanation: 1 → 2 → throw → catch returns 10 → next .then receives 10. Final output: 10.\n");

// =============================================================================
// 9️⃣ typeof Weirdness
// =============================================================================

console.log("=== 9️⃣ typeof ===\n");

console.log("typeof NaN:", typeof NaN);
console.log("typeof null:", typeof null);
console.log("typeof []:", typeof []);

console.log("\nExplanation:");
console.log("- typeof NaN is 'number': NaN is the value for “not a number” but is of type number (invalid numeric result).");
console.log("- typeof null is 'object': Historical bug. null was implemented with a type tag for objects; it was never fixed for backward compatibility.");
console.log("- typeof [] is 'object': Arrays are objects. Use Array.isArray([]) to detect arrays.\n");

// =============================================================================
// 🔟 Implicit Type Coercion
// =============================================================================

console.log("=== 🔟 Implicit Coercion ===\n");

console.log("'5' - 3:", "5" - 3);
console.log("  → The - operator is numeric. Both sides are coerced to number: 5 - 3 = 2.\n");

console.log("'5' + 3:", "5" + 3);
console.log("  → + with a string does string concatenation. 3 is coerced to '3', so '5' + '3' = '53'.\n");

console.log("true + false:", true + false);
console.log("  → + with two numbers (or when no string): true → 1, false → 0. 1 + 0 = 1.\n");

console.log("[] == false:", [] == false);
console.log("  → == triggers coercion. [] → .toString() → ''. '' == false → ToNumber('') = 0, ToNumber(false) = 0. So 0 == 0 → true.\n");
