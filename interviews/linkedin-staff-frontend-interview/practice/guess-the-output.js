/**
 * LinkedIn Phone Screen — Guess the Output Drills
 * Run: node practice/guess-the-output.js
 *
 * Cover answers AFTER attempting each question without running.
 */

const drills = [
  {
    id: 1,
    code: `
console.log(typeof typeof 1);
console.log(typeof null);`,
    answer: "undefined, object",
    why: "typeof 1 is 'string'; typeof 'string' is 'undefined'. typeof null is historical bug → 'object'.",
  },
  {
    id: 2,
    code: `
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}`,
    answer: "3, 3, 3",
    why: "var is function-scoped; one shared i equals 3 after loop.",
  },
  {
    id: 3,
    code: `
console.log([] + []);
console.log([] + {});`,
    answer: '"" then "[object Object]"',
    why: "+ with objects triggers ToPrimitive/toString.",
  },
  {
    id: 4,
    code: `
console.log("start");
Promise.resolve().then(() => console.log("micro"));
setTimeout(() => console.log("macro"), 0);
console.log("end");`,
    answer: "start, end, micro, macro",
    why: "Sync first, microtasks before macrotasks.",
  },
  {
    id: 5,
    code: `
function make() {
  let x = 1;
  return () => x++;
}
const a = make();
const b = make();
console.log(a()); console.log(a()); console.log(b());`,
    answer: "1, 2, 1",
    why: "Separate closures — independent x bindings.",
  },
  {
    id: 6,
    code: `
const obj = { n: 1 };
(function (o) {
  o = { n: 2 };
})(obj);
console.log(obj.n);`,
    answer: "1",
    why: "Reassigning parameter o doesn't change outer obj reference.",
  },
  {
    id: 7,
    code: `
console.log(0.1 + 0.2 === 0.3);
console.log(0.1 + 0.2);`,
    answer: "false, 0.30000000000000004",
    why: "IEEE 754 floating point precision.",
  },
  {
    id: 8,
    code: `
function Foo() {}
Foo.prototype.bar = 1;
const f = new Foo();
Foo.prototype = { bar: 2 };
console.log(f.bar);`,
    answer: "1",
    why: "f.__proto__ still points to old prototype object.",
  },
  {
    id: 9,
    code: `
let a = { x: 1 };
let b = a;
b.x = 2;
console.log(a.x);`,
    answer: "2",
    why: "Objects assigned by reference.",
  },
  {
    id: 10,
    code: `
async function f() {
  return 1;
}
console.log(f());`,
    answer: "Promise { 1 }",
    why: "async functions always return a Promise.",
  },
];

console.log(`
═══════════════════════════════════════════════════════════════
  LINKEDIN PHONE SCREEN — GUESS THE OUTPUT (10 drills)
  Attempt each WITHOUT running, then scroll to answers below.
═══════════════════════════════════════════════════════════════
`);

drills.forEach(({ id, code }) => {
  console.log(`\n── Q${id} ──${code}`);
});

console.log(`
═══════════════════════════════════════════════════════════════
  ANSWERS
═══════════════════════════════════════════════════════════════
`);

drills.forEach(({ id, answer, why }) => {
  console.log(`Q${id}: ${answer}\n   → ${why}\n`);
});

export { drills };
