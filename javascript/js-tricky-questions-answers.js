/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║     JAVASCRIPT TRICKY INTERVIEW QUESTIONS — Q&A WITH DIAGRAMS              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Structure: Each section has QUESTION → DIAGRAM → ANSWER → EXPLANATION
 */

const sep = "────────────────────────────────────────────────────────────────────────";
const sepThick = "════════════════════════════════════════════════════════════════════════════";

function section(num, title) {
  console.log("\n" + sepThick);
  console.log(`  ${num}  ${title}`);
  console.log(sepThick + "\n");
}

function question(code) {
  console.log("📌 QUESTION");
  console.log(sep);
  console.log(code);
  console.log(sep + "\n");
}

function diagram(diag) {
  console.log("📐 DIAGRAM");
  console.log(sep);
  console.log(diag);
  console.log(sep + "\n");
}

function answer(text) {
  console.log("✅ ANSWER");
  console.log(sep);
  console.log(text);
  console.log(sep + "\n");
}

function explanation(text) {
  console.log("💡 EXPLANATION");
  console.log(sep);
  console.log(text);
  console.log(sep + "\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
//  1️⃣  TYPE COERCION: [] and {} with +
// ═══════════════════════════════════════════════════════════════════════════════

section("1️⃣", "Type Coercion: Arrays and Objects with +");

question(`  console.log([] + []);
  console.log([] + {});
  console.log({} + []);
  console.log({} + {});`);

diagram(`  + operator with objects/arrays → ToPrimitive → toString()
  
  [] + []
     │
     ├─ [].toString()  →  ""
     └─ [].toString()  →  ""
              │
              └── "" + ""  →  "" (empty string)

  [] + {}
     │
     ├─ [].toString()  →  ""
     └─ ({}).toString()  →  "[object Object]"
              │
              └── "" + "[object Object]"  →  "[object Object]"

  {} + []  (inside console.log: both are expressions)
     │
     ├─ ({}).toString()  →  "[object Object]"
     └─ [].toString()  →  ""
              │
              └── "[object Object]" + ""  →  "[object Object]"

  {} + {}
     │
     ├─ ({}).toString()  →  "[object Object]"
     └─ ({}).toString()  →  "[object Object]"
              │
              └── "[object Object]" + "[object Object]"  →  "[object Object][object Object]"`);

answer(`  [] + []   →  ""   (empty string)
  [] + {}   →  "[object Object]"
  {} + []   →  "[object Object]"   (in expression context)
  {} + {}   →  "[object Object][object Object]"`);

explanation(`  • + with non-numbers triggers string concatenation when one side becomes a string.
  • Arrays/objects use .toString(): [] → "", {} → "[object Object]".
  • Inside console.log(...) the whole thing is one expression, so both {} are object literals.
  • As a standalone statement (e.g. REPL), {} can be parsed as empty block: {} + [] → +[] → 0.`);

console.log("  Live output:");
console.log("  [] + []  =", [] + []);
console.log("  [] + {}  =", [] + {});
console.log("  {} + []  =", {} + []);
console.log("  {} + {}  =", {} + {});

// ═══════════════════════════════════════════════════════════════════════════════
//  2️⃣  EVENT LOOP
// ═══════════════════════════════════════════════════════════════════════════════

section("2️⃣", "Event Loop Deep Dive");

question(`  console.log("start");
  setTimeout(() => console.log("timeout"));
  Promise.resolve().then(() => console.log("promise"));
  queueMicrotask(() => console.log("microtask"));
  console.log("end");`);

diagram(`  Execution order:

   ┌─────────────────────────────────────────────────────────────────┐
   │  CALL STACK (synchronous)                                       │
   │    1. "start"    2. "end"                                       │
   └─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │  MICROTASK QUEUE (drained after stack, before next macrotask)   │
   │    3. "promise"    4. "microtask"   (order of registration)      │
   └─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │  MACROTASK QUEUE (setTimeout, setInterval, I/O)                 │
   │    5. "timeout"                                                  │
   └─────────────────────────────────────────────────────────────────┘

   Flow:  Stack empty → run all microtasks → run one macrotask → repeat`);

answer(`  start
  end
  promise
  microtask
  timeout`);

explanation(`  • Sync code runs first: "start", then "end".
  • Promise.then and queueMicrotask both enqueue in the microtask queue.
  • Microtasks run in registration order before the next macrotask.
  • setTimeout is a macrotask, so "timeout" runs last.`);

console.log("  Live run:");
console.log("  start");
setTimeout(() => console.log("  timeout"));
Promise.resolve().then(() => console.log("  promise"));
queueMicrotask(() => console.log("  microtask"));
console.log("  end");

// ═══════════════════════════════════════════════════════════════════════════════
//  3️⃣  CLOSURES + LOOP TRAP
// ═══════════════════════════════════════════════════════════════════════════════

section("3️⃣", "Closures + Loop Trap");

question(`  for (var i = 0; i < 3; i++) {
    setTimeout(() => {
      console.log(i);
    }, 100);
  }`);

diagram(`  var i is ONE variable (function/global scope), shared by all callbacks:

   Time ─────────────────────────────────────────────────────────────►

   i = 0        i = 1        i = 2        i = 3 (loop exits)
     │             │             │             │
     │  setTimeout(cb1)          │             │
     │             │  setTimeout(cb2)          │
     │             │             │  setTimeout(cb3)
     │             │             │             │
     │             │             │             │   ← 100ms later: cb1, cb2, cb3 run
     │             │             │             │      all read same i → 3
     └─────────────┴─────────────┴─────────────┘
                         single "i" in closure

   Output:  3  3  3

   Fix: use let i → each iteration gets its own block-scoped i.`);

answer(`  3
  3
  3`);

explanation(`  • var i is not block-scoped; there is only one i for the whole loop.
  • All three callbacks close over that same i.
  • When they run (~100ms later), the loop has finished and i === 3.
  • Fix: for (let i = 0; ...) so each iteration has its own i.`);

// ═══════════════════════════════════════════════════════════════════════════════
//  4️⃣  this BINDING
// ═══════════════════════════════════════════════════════════════════════════════

section("4️⃣", "this Binding Confusion");

question(`  const obj = {
    value: 10,
    getValue() { return this.value; }
  };
  const getValue = obj.getValue;
  console.log(getValue());`);

diagram(`  this is set by HOW the function is called (call site), not where it's defined:

   obj.getValue()  →  this = obj        ✅  getValue()  →  this = undefined (strict) / global

        obj                    getValue (standalone)
   ┌──────────┐               ┌──────────┐
   │ value:10 │               │  (no receiver)
   │ getValue │──copy ref──►  │  this ?  │  →  undefined in strict mode
   └──────────┘               └──────────┘
        │                            │
        └── this = obj               └── this = undefined
            → 10                         → undefined`);

answer(`  undefined`);

explanation(`  • getValue is only a reference to the function; the link to obj is lost.
  • getValue() is called with no object to the left of the dot.
  • So this is undefined (strict) or global (sloppy); this.value is undefined.`);

const obj = { value: 10, getValue() { return this.value; } };
const getValue = obj.getValue;
console.log("  getValue() =", getValue());

// ═══════════════════════════════════════════════════════════════════════════════
//  5️⃣  OBJECT REFERENCE TRAP
// ═══════════════════════════════════════════════════════════════════════════════

section("5️⃣", "Object Reference Trap");

question(`  const a = { name: "JS" };
  const b = a;
  b.name = "React";
  console.log(a.name);`);

diagram(`  a and b point to the SAME object in memory (reference, not copy):

   Before:                    After b.name = "React":

   a ──────┐                  a ──────┐
           │   ┌─────────────┐         │   ┌─────────────┐
           └──►│ name: "JS"  │         └──►│ name:"React"│
           ┌──►│             │         ┌──►│             │
   b ──────┘   └─────────────┘   b ────┘   └─────────────┘
                  one object                  same object, mutated`);

answer(`  "React"`);

explanation(`  • Objects are assigned by reference. b = a does not copy the object.
  • a and b both reference the same heap object.
  • Mutating b.name changes that single object, so a.name is "React" too.`);

const a = { name: "JS" };
const b = a;
b.name = "React";
console.log("  a.name =", a.name);

// ═══════════════════════════════════════════════════════════════════════════════
//  6️⃣  ARRAY MUTATION TRICK
// ═══════════════════════════════════════════════════════════════════════════════

section("6️⃣", "Array Mutation Trick");

question(`  const arr = [1, 2, 3];
  arr[10] = 99;
  console.log(arr.length);
  console.log(arr);`);

diagram(`  Setting a sparse index updates length and creates empty slots:

   arr = [1, 2, 3]     →    arr[10] = 99

   index:  0  1  2                   0  1  2  3  4  5  6  7  8  9  10
   value: [1, 2, 3]                  [1, 2, 3, -, -, -, -, -, -, -, 99]
   length: 3                         length: 11   (empty slots 3–9)`);

answer(`  arr.length  →  11
  arr        →  [ 1, 2, 3, <7 empty items>, 99 ]`);

explanation(`  • arr[10] = 99 assigns index 10 and sets length to 11.
  • Indices 3–9 are empty (holes); they show as empty in the array.
  • This is a "sparse" array.`);

const arr = [1, 2, 3];
arr[10] = 99;
console.log("  arr.length =", arr.length);
console.log("  arr =", arr);

// ═══════════════════════════════════════════════════════════════════════════════
//  7️⃣  DESTRUCTURING EDGE CASE
// ═══════════════════════════════════════════════════════════════════════════════

section("7️⃣", "Destructuring Edge Case");

question(`  const obj = { a: 1, b: 2 };
  const { a, ...rest } = obj;
  rest.b = 5;
  console.log(obj.b);`);

diagram(`  ...rest creates a NEW object with a copy of the rest of properties:

   obj = { a: 1, b: 2 }
            │
            ├── a  →  1  (primitive, copied)
            └── ...rest  →  { b: 2 }  (new object, not same reference as obj)

   rest.b = 5   →   only rest changes

   obj    ┌─────────────┐         rest   ┌─────────────┐
          │ a: 1        │                │ b: 5        │  ← modified
          │ b: 2        │   (unchanged)  └─────────────┘
          └─────────────┘`);

answer(`  2`);

explanation(`  • const { a, ...rest } = obj makes rest a new object with the remaining keys.
  • rest gets its own copy of the properties; it is not the same reference as obj.
  • So rest.b = 5 only changes rest; obj.b stays 2.`);

const objForDestructure = { a: 1, b: 2 };
const { a: aVal, ...rest } = objForDestructure;
rest.b = 5;
console.log("  obj.b =", objForDestructure.b);

// ═══════════════════════════════════════════════════════════════════════════════
//  8️⃣  PROMISE CHAIN TRAP
// ═══════════════════════════════════════════════════════════════════════════════

section("8️⃣", "Promise Chain Trap");

question(`  Promise.resolve(1)
    .then(x => x + 1)
    .then(x => { throw new Error("boom"); })
    .catch(() => 10)
    .then(x => console.log(x));`);

diagram(`  Promise chain flow (rejection is handled by catch, then chain continues):

   resolve(1)  ──►  then(+1)  ──►  then(throw)  ──►  catch(→10)  ──►  then(log)
       │                │               │                  │                │
       1                2            reject               10            log(10)
                                                                             │
                                                                        OUTPUT: 10`);

answer(`  10`);

explanation(`  • 1 → then gives 2 → next then throws → catch catches and returns 10.
  • Returning from catch resolves the chain, so the next then receives 10.
  • So the final then logs 10.`);

Promise.resolve(1)
  .then((x) => x + 1)
  .then((x) => {
    throw new Error("boom");
  })
  .catch(() => 10)
  .then((x) => console.log("  Promise chain output:", x));

// ═══════════════════════════════════════════════════════════════════════════════
//  9️⃣  typeof WEIRDNESS
// ═══════════════════════════════════════════════════════════════════════════════

section("9️⃣", "typeof Weirdness");

question(`  console.log(typeof NaN);
  console.log(typeof null);
  console.log(typeof []);`);

diagram(`  typeof return values (and why they're surprising):

   typeof NaN    →  "number"    NaN is the number type's "invalid number" value
        ┌────────────────────────────────────────┐
        │  Number type includes NaN, Infinity    │
        └────────────────────────────────────────┘

   typeof null  →  "object"     Historical bug (type tag 0 was used for null)
        ┌────────────────────────────────────────┐
        │  Should be "null"; never fixed (BC)    │  Use:  x === null
        └────────────────────────────────────────┘

   typeof []    →  "object"     Arrays are objects
        ┌────────────────────────────────────────┐
        │  Use Array.isArray([]) to detect array  │
        └────────────────────────────────────────┘`);

answer(`  typeof NaN   →  "number"
  typeof null  →  "object"
  typeof []    →  "object"`);

explanation(`  • NaN is of type number (invalid numeric result).
  • typeof null === "object" is a known language bug; use x === null.
  • Arrays are objects; use Array.isArray(x) to check for arrays.`);

console.log("  typeof NaN  =", typeof NaN);
console.log("  typeof null =", typeof null);
console.log("  typeof []   =", typeof []);

// ═══════════════════════════════════════════════════════════════════════════════
//  🔟  IMPLICIT TYPE COERCION
// ═══════════════════════════════════════════════════════════════════════════════

section("🔟", "Implicit Type Coercion");

question(`  console.log("5" - 3);
  console.log("5" + 3);
  console.log(true + false);
  console.log([] == false);`);

diagram(`  Coercion rules:

   "5" - 3     →  - is numeric  →  ToNumber("5") - 3  →  5 - 3  →  2

   "5" + 3     →  + with string →  concatenate  →  "5" + "3"  →  "53"

   true + false  →  + (no string)  →  ToNumber  →  1 + 0  →  1

   [] == false
     →  ToPrimitive([])  →  ""  →  ToNumber("")  →  0
     →  ToNumber(false)  →  0
     →  0 == 0  →  true`);

answer(`  "5" - 3      →  2
  "5" + 3      →  "53"
  true + false →  1
  [] == false  →  true`);

explanation(`  • - forces numeric conversion; "5" becomes 5.
  • + with a string does string concatenation; 3 becomes "3".
  • true → 1, false → 0 in numeric context.
  • [] → "" → 0; false → 0; so [] == false is 0 == 0 → true.`);

console.log('  "5" - 3     =', "5" - 3);
console.log('  "5" + 3     =', "5" + 3);
console.log("  true+false =", true + false);
console.log("  []==false  =", [] == false);

console.log("\n" + sepThick);
console.log("  END OF Q&A");
console.log(sepThick + "\n");
