/**
 * ============================================
 * TYPESCRIPT INTERVIEW GUIDE
 * ============================================
 * Key concepts and patterns commonly asked in frontend/TypeScript interviews.
 */

// ============================================
// 1. TYPES vs INTERFACES
// ============================================

// Interface: extensible, can be merged (declaration merging)
interface User {
  name: string;
  age: number;
}
interface User {
  email?: string; // merges with above
}

// Type: union/intersection, mapped types, primitives
type ID = string | number;
type Admin = User & { role: "admin" };

// When to use:
// - Interface: object shapes, OOP, declaration merging
// - Type: unions, tuples, primitives, complex mapped/conditional types

// ============================================
// 2. TYPE NARROWING & TYPE GUARDS
// ============================================

function process(value: string | number) {
  if (typeof value === "string") {
    return value.toUpperCase(); // narrowed to string
  }
  return value.toFixed(2); // narrowed to number
}

// Custom type guard: function that returns "arg is Type"
function isString(val: unknown): val is string {
  return typeof val === "string";
}
function handle(val: string | number) {
  if (isString(val)) {
    console.log(val.length); // string
  }
}

// "in" narrowing
type Fish = { swim: () => void };
type Bird = { fly: () => void };
function move(animal: Fish | Bird) {
  if ("swim" in animal) {
    animal.swim();
  } else {
    animal.fly();
  }
}

// Truthiness / null checks
function print(str: string | null) {
  if (str) {
    console.log(str.toUpperCase());
  }
}

// ============================================
// 3. UNION & INTERSECTION TYPES
// ============================================

type A = { a: number };
type B = { b: string };
type AorB = A | B;   // has a OR b
type AandB = A & B;  // has a AND b

const u: AorB = { a: 1 };      // ok
const i: AandB = { a: 1, b: "x" }; // ok

// Discriminated union (tagged union) — great for state/events
type Success = { kind: "success"; data: string };
type Err = { kind: "error"; message: string };
type Result = Success | Err;

function handleResult(r: Result) {
  switch (r.kind) {
    case "success":
      console.log(r.data);
      break;
    case "error":
      console.log(r.message);
      break;
  }
}

// ============================================
// 4. GENERICS (Quick recap — see typescript-generics-guide.ts for full)
// ============================================

function identity<T>(value: T): T {
  return value;
}

// Constraints
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// ============================================
// 5. UTILITY TYPES (Must know for interviews)
// ============================================

interface Todo {
  title: string;
  description: string;
}

// Partial<T> — all properties optional
type PartialTodo = Partial<Todo>;
// { title?: string; description?: string; }

// Required<T> — all required
type RequiredTodo = Required<PartialTodo>;

// Pick<T, K> — subset of keys
type TodoPreview = Pick<Todo, "title">;
// { title: string; }

// Omit<T, K> — exclude keys
type TodoWithoutDesc = Omit<Todo, "description">;
// { title: string; }

// Record<K, V> — map keys to type
type Page = "home" | "about" | "contact";
type PageInfo = Record<Page, { title: string }>;
// { home: { title: string }; about: { title: string }; contact: { title: string }; }

// ReturnType<F> — return type of function
function createUser() {
  return { name: "Alice", id: 1 };
}
type UserType = ReturnType<typeof createUser>;
// { name: string; id: number }

// Parameters<F> — tuple of function parameters
type CreateUserParams = Parameters<typeof createUser>;
// [] (no params in this example)

// ============================================
// 6. KEYOF & TYPEOF
// ============================================

const config = { host: "localhost", port: 3000 };
type ConfigKeys = keyof typeof config;  // "host" | "port"
type ConfigValues = (typeof config)[ConfigKeys]; // string | number

interface Person {
  name: string;
  age: number;
}
type PersonKey = keyof Person;  // "name" | "age"
type PersonValue = Person["name"]; // string

// ============================================
// 7. MAPPED TYPES
// ============================================

// Make all properties optional and nullable
type OptionalNullable<T> = {
  [K in keyof T]?: T[K] | null;
};

// Getters pattern
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number; }

// ============================================
// 8. CONDITIONAL TYPES
// ============================================

// T extends U ? X : Y
type IsString<T> = T extends string ? true : false;
type A1 = IsString<"hi">;   // true
type A2 = IsString<number>; // false

// Infer — extract a type from within a type
type GetReturnType<T> = T extends (...args: unknown[]) => infer R ? R : never;
type R = GetReturnType<() => number>; // number

// Flatten array type
type Flatten<T> = T extends (infer U)[] ? U : T;
type F1 = Flatten<string[]>;  // string
type F2 = Flatten<number>;   // number

// ============================================
// 9. CONST ASSERTIONS & LITERAL TYPES
// ============================================

const obj = { a: 1, b: 2 } as const;
// obj.a = 2;  // Error: readonly
type ObjType = typeof obj;  // { readonly a: 1; readonly b: 2 }

const tuple = [1, "hello"] as const;  // readonly [1, "hello"]
type First = (typeof tuple)[0];  // 1 (literal)

// ============================================
// 10. OPTIONAL CHAINING & NULLISH COALESCING
// ============================================

interface Data {
  user?: { name?: string };
}
const data: Data = {};
const name = data.user?.name ?? "Guest";  // "Guest"
// ?. stops at undefined/null; ?? only for null/undefined (not "" or 0)

// ============================================
// 11. FUNCTION OVERLOADS
// ============================================

function makeDate(timestamp: number): Date;
function makeDate(y: number, m: number, d: number): Date;
function makeDate(yOrTs: number, m?: number, d?: number): Date {
  if (m !== undefined && d !== undefined) {
    return new Date(yOrTs, m - 1, d);
  }
  return new Date(yOrTs);
}
makeDate(1234567890);
makeDate(2025, 3, 10);

// ============================================
// 12. READONLY & IMMUTABILITY
// ============================================

interface State {
  count: number;
}
const state: Readonly<State> = { count: 0 };
// state.count = 1;  // Error

// ReadonlyArray
const arr: ReadonlyArray<number> = [1, 2, 3];
// arr.push(4);  // Error

// ============================================
// 13. COMMON GOTCHAS / INTERVIEW TRAPS
// ============================================

// Empty object {} is not the same as "any object"
const o: {} = 1;  // ok — everything is assignable to {}
// const o2: object = 1;  // Error — only non-primitives

// Excess property check (only for object literals)
interface Point { x: number; y: number; }
// const p: Point = { x: 1, y: 2, z: 3 };  // Error
const extra = { x: 1, y: 2, z: 3 };
const p: Point = extra;  // ok — extra is assignable to Point

// any vs unknown
// any: opt-out of type checking. Avoid in production.
// unknown: must narrow before use (type-safe).
function safeParse(json: string): unknown {
  return JSON.parse(json);
}
const parsed = safeParse('{"a":1}');
// parsed.a;  // Error — use type guard or assertion after check

// ============================================
// 14. QUICK REFERENCE CHEAT SHEET
// ============================================
/*
  keyof T          → union of keys of T
  typeof x         → type of value x
  T[K]             → type of property K in T
  T extends U      → constraint or conditional
  infer X          → infer type in conditional
  as const         → narrow to literal/readonly
  ?.               → optional chaining
  ??               → nullish coalescing
  Partial / Required / Pick / Omit / Record / ReturnType / Parameters
  never            → unreachable / exhaustiveness
*/
export {};
