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
// Type narrowing = TypeScript infers a more specific type inside a branch.
// Type guards = expressions or functions that trigger that narrowing.

// ----- 2.1 typeof narrowing -----
function process(value: string | number) {
  if (typeof value === "string") {
    return value.toUpperCase(); // narrowed to string
  }
  return value.toFixed(2); // narrowed to number
}

// typeof with multiple primitives
function handlePrimitive(value: string | number | boolean) {
  if (typeof value === "string") return value.padStart(2);
  if (typeof value === "number") return value.toFixed(2);
  return value.valueOf(); // boolean
}

// CAUTION: typeof null === "object" — use === null to exclude null
function badNullCheck(x: string | null) {
  if (typeof x === "object") return; // x is still string | null!
  // console.log(x.length); // Error
}
function goodNullCheck(x: string | null) {
  if (x === null) return;
  console.log(x.length); // x is string
}

// Literal narrowing via equality
function theme(mode: "light" | "dark" | "auto") {
  if (mode === "auto") return getSystemTheme();
  return mode; // "light" | "dark"
}
declare function getSystemTheme(): string;

// ----- 2.2 Equality narrowing -----
function equalityExample(x: string | null | undefined) {
  if (x === null) return "null";
  if (x === undefined) return "undefined";
  return x.toUpperCase(); // x is string
}

// == null catches both null and undefined
function nullishCheck(x: string | null | undefined) {
  if (x == null) return "";
  return x.toUpperCase();
}

// Literal union narrowing
function direction(x: "up" | "down" | "left" | "right") {
  if (x === "up" || x === "down") return "vertical";
  return "horizontal"; // "left" | "right"
}

// ----- 2.3 Truthiness narrowing (watch out for 0 and "") -----
function printLength(str: string | null | undefined) {
  if (!str) return; // narrows out "", null, undefined
  console.log(str.length);
}

// Prefer explicit check when 0 is valid
function count(value: number | null) {
  if (value === null) return 0;
  return value + 1; // 0 is still valid here
}

// ----- 2.4 Custom type guard: "arg is Type" (type predicate) -----
// Return type must be "val is string", not boolean — otherwise no narrowing!
function isString(val: unknown): val is string {
  return typeof val === "string";
}
function handle(val: string | number) {
  if (isString(val)) {
    console.log(val.length); // string
  } else {
    console.log(val.toFixed(2)); // number
  }
}

// ----- 2.5 Type guard for unknown (e.g. API / parsed data) -----
function isUser(obj: unknown): obj is { name: string; id: number } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "name" in obj &&
    "id" in obj &&
    typeof (obj as { name: unknown }).name === "string" &&
    typeof (obj as { id: unknown }).id === "number"
  );
}
declare function getFromAPI(): unknown;
const apiData = getFromAPI();
if (isUser(apiData)) {
  console.log(apiData.name, apiData.id); // apiData narrowed to { name: string; id: number }
}

// Type predicate for array of numbers
function isNumberArray(val: unknown): val is number[] {
  return Array.isArray(val) && val.every((e) => typeof e === "number");
}
const raw: unknown = [1, 2, 3];
if (isNumberArray(raw)) {
  const sum = raw.reduce((a, b) => a + b, 0); // raw is number[]
}

// ----- 2.6 Assertion type guard: "asserts arg is Type" -----
// If function returns, arg is Type; otherwise it should throw.
function assertIsString(val: unknown): asserts val is string {
  if (typeof val !== "string") throw new Error("Expected string");
}
let mixed: string | number = 42;
assertIsString(mixed); // after this, mixed is string (or we threw)
// console.log(mixed.length); // would be valid if we didn't throw above

// ----- 2.7 "in" narrowing -----
type Fish = { swim: () => void };
type Bird = { fly: () => void };
function move(animal: Fish | Bird) {
  if ("swim" in animal) {
    animal.swim();
  } else {
    animal.fly();
  }
}

// in with optional property
type WithOptional = { required: number; optional?: string };
type WithoutOptional = { required: number };
function useInOptional(x: WithOptional | WithoutOptional) {
  if ("optional" in x) {
    console.log(x.optional ?? ""); // x narrowed by presence of optional
  }
}

// ----- 2.8 Equality and truthiness (see 2.2, 2.3 for more) -----
function format(str: string | null | undefined): string {
  if (str == null) return ""; // narrows out null and undefined
  return str.toUpperCase();
}

// ----- 2.9 instanceof narrowing -----
function handleEvent(e: Date | Error) {
  if (e instanceof Date) {
    console.log(e.toISOString());
  } else {
    console.log(e.message);
  }
}

// Multiple instanceof
function handleErr(err: Error | TypeError | RangeError) {
  if (err instanceof RangeError) return "range";
  if (err instanceof TypeError) return "type";
  return "generic"; // Error
}

// ----- 2.10 Array.isArray narrowing -----
function flatten(input: string | string[]) {
  if (Array.isArray(input)) {
    return input.join(""); // input is string[]
  }
  return input; // input is string
}

// ----- 2.11 Control flow: early return narrows in remaining branch -----
function example(x: string | null) {
  if (x === null) return;
  console.log(x.toUpperCase()); // x is string here
}

function processId(id: string | number) {
  if (typeof id === "number") return id.toFixed(0);
  return id.toUpperCase(); // id is string
}

// ----- 2.12 Discriminated union (tagged union) + exhaustiveness -----
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

// Nested discriminant (Result<T> pattern)
type ResultT<T> = { ok: true; value: T } | { ok: false; error: string };
function unwrap<T>(r: ResultT<T>): T {
  if (r.ok) return r.value;
  throw new Error(r.error);
}

// Exhaustiveness check: default with never fails if you add a new variant
function handleExhaustive(r: Result): string {
  switch (r.kind) {
    case "success":
      return r.data;
    case "error":
      return r.message;
    default: {
      const _: never = r;
      return _;
    }
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

// Discriminated union example — see section 2.9 for full narrowing + exhaustiveness

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
