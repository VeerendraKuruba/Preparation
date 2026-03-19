/**
 * JavaScript Tricky Interview Questions — Q&A with diagrams
 * Run: node js-tricky-questions-answers.js
 */

console.log(`
═══════════════════════════════════════════════════════════════════════════════
  JAVASCRIPT TRICKY Q&A
═══════════════════════════════════════════════════════════════════════════════

─────────────────────────────────────────────────────────────────────────────
 1️⃣  TYPE COERCION: [] and {} with +
─────────────────────────────────────────────────────────────────────────────

Q. What gets printed?
   console.log([] + []);
   console.log([] + {});
   console.log({} + []);
   console.log({} + {});

   + with objects/arrays → ToPrimitive → toString()
   [] + []  →  "" + ""  →  ""
   [] + {}  →  "" + "[object Object]"  →  "[object Object]"
   {} + []  →  "[object Object]" + ""  →  "[object Object]"  (in expression)
   {} + {}  →  "[object Object]" + "[object Object]"  →  "[object Object][object Object]"

A. ""  |  "[object Object]"  |  "[object Object]"  |  "[object Object][object Object]"

   Why: + triggers string concat when one side becomes string. [].toString() = "",
   {}.toString() = "[object Object]". In console.log(...) both {} are object literals.


─────────────────────────────────────────────────────────────────────────────
 2️⃣  EVENT LOOP
─────────────────────────────────────────────────────────────────────────────

Q. What is the exact output order?
   console.log("start");
   setTimeout(() => console.log("timeout"));
   Promise.resolve().then(() => console.log("promise"));
   queueMicrotask(() => console.log("microtask"));
   console.log("end");

   Call stack (sync) → Microtask queue → Macrotask queue
        "start", "end"  →  "promise", "microtask"  →  "timeout"

A. start → end → promise → microtask → timeout

   Why: Sync runs first. Then all microtasks (Promise.then, queueMicrotask) run.
   setTimeout is a macrotask, so it runs after microtasks.


─────────────────────────────────────────────────────────────────────────────
 3️⃣  CLOSURES + LOOP TRAP
─────────────────────────────────────────────────────────────────────────────

Q. What will be printed?
   for (var i = 0; i < 3; i++) {
     setTimeout(() => console.log(i), 100);
   }

   var i = one shared variable. When callbacks run, loop is done → i is 3.

A. 3
   3
   3

   Why: var is function-scoped; all three callbacks close over the same i. By the
   time they run, i === 3. Fix: use let i for block scope per iteration.


─────────────────────────────────────────────────────────────────────────────
 4️⃣  this BINDING
─────────────────────────────────────────────────────────────────────────────

Q. What will this print?
   const obj = { value: 10, getValue() { return this.value; } };
   const getValue = obj.getValue;
   console.log(getValue());

   getValue is just a function reference; called with no receiver → this is undefined.

A. undefined

   Why: this is set by how the function is called. getValue() has no object to the
   left of the dot, so this is undefined (strict) or global; this.value is undefined.


─────────────────────────────────────────────────────────────────────────────
 5️⃣  OBJECT REFERENCE TRAP
─────────────────────────────────────────────────────────────────────────────

Q. Why does this happen?
   const a = { name: "JS" };
   const b = a;
   b.name = "React";
   console.log(a.name);

   a ──┐     same object     ┌── b   →  mutating b mutates the same object
       └──► { name: "?" } ◄──┘

A. "React"

   Why: b = a copies the reference, not the object. a and b point to the same
   object; changing b.name changes that object, so a.name is "React" too.


─────────────────────────────────────────────────────────────────────────────
 6️⃣  ARRAY MUTATION TRICK
─────────────────────────────────────────────────────────────────────────────

Q. What does the array actually look like?
   const arr = [1, 2, 3];
   arr[10] = 99;
   console.log(arr.length);
   console.log(arr);

   [1,2,3] → set index 10 → length = 11, indices 3–9 are empty (holes).

A. arr.length → 11
   arr → [ 1, 2, 3, <7 empty items>, 99 ]

   Why: Setting arr[10] updates length to 11 and leaves slots 3–9 empty (sparse array).


─────────────────────────────────────────────────────────────────────────────
 7️⃣  DESTRUCTURING EDGE CASE
─────────────────────────────────────────────────────────────────────────────

Q. Does the original object change?
   const obj = { a: 1, b: 2 };
   const { a, ...rest } = obj;
   rest.b = 5;
   console.log(obj.b);

   rest is a NEW object { b: 2 }. rest.b = 5 only changes rest, not obj.

A. 2  (original obj.b is unchanged)

   Why: ...rest creates a new object with the rest of properties. It's not the same
   reference as obj, so rest.b = 5 does not change obj.b.


─────────────────────────────────────────────────────────────────────────────
 8️⃣  PROMISE CHAIN TRAP
─────────────────────────────────────────────────────────────────────────────

Q. What is the final output?
   Promise.resolve(1)
     .then(x => x + 1)
     .then(x => { throw new Error("boom"); })
     .catch(() => 10)
     .then(x => console.log(x));

   1 → +1 → 2 → throw → catch returns 10 → next then gets 10 → log(10)

A. 10

   Why: catch handles the rejection and returns 10, which resolves the chain. The
   following .then receives 10 and logs it.


─────────────────────────────────────────────────────────────────────────────
 9️⃣  typeof WEIRDNESS
─────────────────────────────────────────────────────────────────────────────

Q. Why do these results exist?
   console.log(typeof NaN);   // "number"
   console.log(typeof null);  // "object"
   console.log(typeof []);     // "object"

A. typeof NaN   → "number"   (NaN is the number type’s “invalid number” value)
   typeof null  → "object"   (historical bug; use x === null)
   typeof []    → "object"   (arrays are objects; use Array.isArray(x))


─────────────────────────────────────────────────────────────────────────────
 🔟  IMPLICIT TYPE COERCION
─────────────────────────────────────────────────────────────────────────────

Q. Explain how JavaScript converts the types internally.
   console.log("5" - 3);      // 2
   console.log("5" + 3);      // "53"
   console.log(true + false); // 1
   console.log([] == false);  // true

A. "5" - 3      →  2    (− is numeric: "5" → 5)
   "5" + 3      →  "53" (+ with string: concat, 3 → "3")
   true + false →  1    (both to number: 1 + 0)
   [] == false  →  true ([] → "" → 0, false → 0, 0 == 0)

   Why: - forces number; + with string concatenates; booleans become 0/1;
   [] becomes "" then 0 for == comparison.

═══════════════════════════════════════════════════════════════════════════════
  END
═══════════════════════════════════════════════════════════════════════════════
`);
