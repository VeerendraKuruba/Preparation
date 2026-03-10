# TypeScript Interview Guide

Questions and answers commonly asked in frontend/TypeScript interviews.

---

## Interface vs Type

### Q: What is the difference between `interface` and `type` in TypeScript?

**Short answer:** Both describe object shapes, but **interfaces** are extensible and support declaration merging; **types** can represent unions, primitives, tuples, and complex mapped/conditional types.

| Aspect | `interface` | `type` |
|--------|-------------|--------|
| **Declaration merging** | ✅ Same name merges automatically | ❌ Duplicate name is an error |
| **Extends** | `extends` keyword | `&` (intersection) |
| **Unions** | ❌ Cannot do `A \| B` | ✅ `type U = A \| B` |
| **Primitives / tuples** | ❌ Only object-like shapes | ✅ `type ID = string \| number`, `type T = [string, number]` |
| **Mapped / conditional types** | ❌ Not supported | ✅ Full support |
| **Performance** | Slightly faster to check (cached by name) | Resolved each time in some cases |

**When to use interface:** Object shapes, public API contracts, when you might need declaration merging (e.g. extending library types).

**When to use type:** Unions, tuples, primitives, `Pick`/`Omit`/mapped/conditional types, or when you want a single named alias for a complex type.

---

### Q: Can you show declaration merging with interfaces?

**Answer:** Yes. If you declare the same interface name more than once, TypeScript merges them into one.

```ts
interface Window {
  title: string;
}
interface Window {
  ts: number;
}
// Result: Window has both title and ts
const w: Window = { title: "Hi", ts: 1 };
```

With `type`, a second declaration with the same name is an error.

```ts
type Window = { title: string };
type Window = { ts: number }; // Error: Duplicate identifier 'Window'
```

---

### Q: Can an interface extend a type, and can a type extend an interface?

**Answer:** Yes in both directions.

- **Interface extends type (intersection):**
  ```ts
  type Base = { id: number };
  interface User extends Base { name: string; }
  ```
- **Type extends interface (intersection):**
  ```ts
  interface Base { id: number; }
  type User = Base & { name: string };
  ```

---

### Q: Why might you prefer `type` for a union of object shapes?

**Answer:** Unions are only expressible with `type`. For example, a result that is either success or error:

```ts
type Success = { kind: "success"; data: string };
type Failure = { kind: "error"; message: string };
type Result = Success | Failure;  // Must use type
```

You cannot write `interface Result = Success | Failure`.

---

## Type narrowing & type guards

**Type narrowing** means TypeScript infers a **more specific type** inside a branch of code (e.g. after an `if` or `switch`), so you can safely use properties or methods that exist only on that type. **Type guards** are expressions or functions that trigger this narrowing.

---

### Q: What is type narrowing? Why do we need it?

**Answer:** When a variable has a union type (e.g. `string | number`), you can only use operations that are valid for **all** members of the union. To use string-only or number-only operations, you must **narrow** the type in a branch. TypeScript does this by analyzing control flow: after a check that rules out some cases, it narrows the type in the remaining branch.

**Without narrowing:** TypeScript will error because it doesn’t know which branch you’re in.

```ts
function printId(id: string | number) {
  console.log(id.toUpperCase());  // Error: number doesn't have toUpperCase
}
```

**With narrowing:** Inside the `if (typeof id === "string")` block, `id` is narrowed to `string`.

```ts
function printId(id: string | number) {
  if (typeof id === "string") {
    console.log(id.toUpperCase());  // OK — id is string here
  } else {
    console.log(id.toFixed(2));     // OK — id is number here
  }
}
```

---

### Q: What are the built-in ways to narrow types?

**Answer:** TypeScript narrows based on these patterns:

| Method | Example | What gets narrowed |
|--------|---------|--------------------|
| **`typeof`** | `typeof x === "string"` | Primitives: `string`, `number`, `boolean`, `symbol`, `undefined`, `function`, `object` (note: `typeof null === "object"`) |
| **`instanceof`** | `x instanceof Date` | Class instances (constructor in prototype chain) |
| **Equality** | `x === null`, `x === undefined`, `x == null` | `null` / `undefined` (use `== null` to catch both) |
| **Truthiness** | `if (x)` / `if (!x)` | Truthy/falsy; excludes `0`, `""`, `false`, `null`, `undefined`, `NaN` from truthy branch |
| **`in`** | `"swim" in animal` | Object types that have or lack a property |
| **Discriminated union** | `switch (obj.kind)` with literal `kind` | Union members by their discriminant property |

**Example — equality and truthiness:**

```ts
function format(str: string | null | undefined) {
  if (str == null) return "";   // narrows out null and undefined
  return str.toUpperCase();      // str is string here
}

function printLength(str: string | null) {
  if (!str) return;              // narrows out "", null, undefined
  console.log(str.length);       // str is string (non-empty in truthy branch)
}
```

**Example — `instanceof`:**

```ts
function handle(e: Date | Error) {
  if (e instanceof Date) {
    console.log(e.toISOString());
  } else {
    console.log(e.message);       // e is Error
  }
}
```

**Important:** Truthiness narrowing can be surprising: `if (x)` excludes `0` and `""` from the branch. For “is it null/undefined?” prefer `x == null` or `x === null || x === undefined`.

---

### Q: What is a type guard? How do you write a custom one?

**Answer:** A **type guard** is a function that returns a **boolean** and has a return type of the form **`arg is Type`** (a “type predicate”). If the function returns `true`, TypeScript narrows the argument to `Type` at the call site. This lets you reuse complex checks and keep narrowing in a type-safe way.

**Syntax:** `function guard(value: UnknownType): value is NarrowType { ... }`

```ts
function isString(val: unknown): val is string {
  return typeof val === "string";
}

function process(input: string | number) {
  if (isString(input)) {
    console.log(input.toUpperCase());  // input is string
  } else {
    console.log(input.toFixed(2));      // input is number
  }
}
```

**Type guards with `unknown`:** Very useful for parsing or API data. After the guard, you can use the value safely.

```ts
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

const data: unknown = getFromAPI();
if (isUser(data)) {
  console.log(data.name, data.id);  // data is { name: string; id: number }
}
```

**Common mistake:** The return type must be `value is Type`. If you write `boolean`, TypeScript will not narrow.

```ts
function isStringBad(val: unknown): boolean {
  return typeof val === "string";
}
let x: string | number = getValue();
if (isStringBad(x)) {
  console.log(x.toUpperCase());  // Error — x is still string | number
}
```

---

### Q: What is an assertion type guard (`asserts arg is Type`)?

**Answer:** An **assertion function** is one that returns `asserts arg is Type`. It doesn’t return a boolean; it tells TypeScript “if this function returns, then `arg` is of type `Type`.” If the condition fails, the function should throw (or never return). Useful for validation that throws on invalid input.

```ts
function assertIsString(val: unknown): asserts val is string {
  if (typeof val !== "string") {
    throw new Error("Expected a string");
  }
}

let x: string | number = getValue();
assertIsString(x);   // after this line, x is string (or we threw)
console.log(x.length);
```

---

### Q: How do you narrow with the `in` operator?

**Answer:** Use **`"property" in obj`** to discriminate between object types that have different properties. TypeScript narrows based on the presence or absence of that property.

```ts
type Fish = { swim: () => void };
type Bird = { fly: () => void };

function move(animal: Fish | Bird) {
  if ("swim" in animal) {
    animal.swim();   // animal is Fish
  } else {
    animal.fly();    // animal is Bird
  }
}
```

Use this when union members are object types with different keys. Prefer a **discriminated union** (a common literal property like `kind`) when you can, because it’s easier to extend and exhaust in a `switch`.

---

### Q: What is control flow analysis? Does narrowing work in all branches?

**Answer:** **Control flow analysis** is how TypeScript tracks the type of a variable as it flows through conditionals, returns, and throws. Narrowing applies in the branch where the condition is true (and the opposite in `else`). After a `return` or `throw`, TypeScript knows that code below doesn’t run, so it can narrow in the remaining branch.

```ts
function example(x: string | null) {
  if (x === null) return;
  // x is string here — we returned in the null case
  console.log(x.toUpperCase());
}
```

Narrowing is **block-scoped**: inside an `if` block the variable is narrowed; after the block, it goes back to the original union unless you assigned a new value. TypeScript also tracks narrowing for **assignments** (e.g. after `x = "hello"`, it may narrow `x` to a literal in some cases).

---

### Q: How do discriminated unions improve narrowing?

**Answer:** A **discriminated union** has a common property (the “discriminant”) with a **literal type** (e.g. `kind: "success" | "error"`). When you `switch` (or `if`) on that property, TypeScript narrows the whole object to the corresponding union member, so you get full type safety and autocomplete for each case.

```ts
type Success = { kind: "success"; data: string };
type Failure = { kind: "error"; message: string };
type Result = Success | Failure;

function handle(r: Result) {
  switch (r.kind) {
    case "success":
      console.log(r.data);    // r is Success
      break;
    case "error":
      console.log(r.message); // r is Failure
      break;
  }
}
```

You can add exhaustiveness checking with `never`: if you add a new variant and forget a `case`, the `default` branch will show a type error.

```ts
function handleExhaustive(r: Result) {
  switch (r.kind) {
    case "success": return r.data;
    case "error":   return r.message;
    default: {
      const _: never = r;  // Error if you add a new variant and don't handle it
      return _;
    }
  }
}
```

---

### Q: What pitfalls should you watch with type narrowing?

**Answer:**

1. **Truthiness and `0` / `""`:** `if (x)` narrows out `0`, `""`, and `false`. If those are valid values, use explicit checks (`x !== null && x !== undefined`) or equality (`x != null`).
2. **`typeof null === "object"`:** So `typeof x === "object"` does not exclude `null`. Check `x !== null` (or use `in`/discriminated unions for objects).
3. **Type guard must return `arg is Type`:** Returning `boolean` does not narrow.
4. **Narrowing is per variable:** If you narrow `a` and then assign `a` to `b`, `b` might not get the same narrow type unless the compiler can track it.
5. **Mutable aliases:** If you narrow `x` and then pass `x` to a function that might mutate it or if another reference is mutated, the type can be “stale”; TypeScript assumes you don’t mutate in between. Keep narrowing local and avoid mutating narrowed values in tricky ways.

---

### Quick reference: narrowing and guards

| Pattern | Purpose |
|--------|---------|
| `typeof x === "string"` | Narrow primitives |
| `x instanceof Date` | Narrow class instances |
| `x == null` / `x === undefined` | Narrow out null/undefined |
| `"key" in x` | Narrow object types by property |
| `if (x)` / `if (!x)` | Truthiness (watch out for 0 and "") |
| `switch (obj.kind)` on literal | Discriminated union narrowing |
| `function f(x): x is T` | Custom type guard |
| `function f(x): asserts x is T` | Assertion guard (throws on failure) |

---

## Union & intersection

### Q: Explain union (`|`) vs intersection (`&`) types.

**Answer:**

- **Union `A | B`:** A value can be **either** A **or** B. You can only safely use members that exist on both (or narrow first).
- **Intersection `A & B`:** A value must satisfy **both** A **and** B (has all properties of both).

```ts
type A = { a: number };
type B = { b: string };
const u: A | B = { a: 1 };           // ok — only A
const i: A & B = { a: 1, b: "x" };   // must have both
```

---

### Q: What is a discriminated union (tagged union)? Why is it useful?

**Answer:** A discriminated union is a union of object types that share a common literal property (the “discriminant”). Switching on that property narrows the type so you can safely use the rest.

```ts
type Success = { kind: "success"; data: string };
type Failure = { kind: "error"; message: string };
type Result = Success | Failure;

function handle(r: Result) {
  switch (r.kind) {
    case "success": return r.data;
    case "error":   return r.message;
  }
}
```

It’s useful for state machines, API responses, and event payloads so every case is type-safe and exhaustive.

---

## Generics

### Q: What are generics and why use them?

**Answer:** Generics are type parameters (e.g. `<T>`) that let you write one implementation that works for many types while keeping type safety. The type is “filled in” when you call the function or use the class/type.

```ts
function identity<T>(value: T): T {
  return value;
}
identity(42);    // T = number
identity("hi"); // T = string
```

Without generics you’d use `any`/`unknown` and lose type information.

---

### Q: What does `T extends K` mean in generics?

**Answer:** It constrains the type parameter: `T` must be assignable to `K`. So you can use properties/methods of `K` on values of type `T`.

```ts
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length;
}
getLength("hello");
getLength([1, 2, 3]);
// getLength(123);  // Error: number has no length
```

---

### Q: What is `keyof T` and how is it used with generics?

**Answer:** `keyof T` is the union of all keys of `T`. It’s often used to ensure a parameter is a valid key and to type the return value from that key.

```ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { name: "Alice", age: 30 };
getProp(user, "name");  // string
getProp(user, "age");   // number
getProp(user, "id");    // Error
```

---

## Utility types

### Q: Explain `Partial<T>`, `Required<T>`, `Pick<T, K>`, and `Omit<T, K>`.

**Answer:**

- **`Partial<T>`** — Makes every property of `T` optional.
- **`Required<T>`** — Makes every property of `T` required.
- **`Pick<T, K>`** — Keeps only keys in `K` from `T` (subset of keys).
- **`Omit<T, K>`** — Drops keys in `K` from `T` (opposite of Pick).

```ts
interface Todo { title: string; description: string; }
type PartialTodo = Partial<Todo>;      // { title?: string; description?: string }
type TodoPreview = Pick<Todo, "title">; // { title: string }
type TodoWithoutDesc = Omit<Todo, "description">; // { title: string }
```

---

### Q: What does `Record<K, V>` do? Give an example.

**Answer:** `Record<K, V>` defines an object type whose keys are of type `K` and values are of type `V`. Often used when `K` is a union of string literals.

```ts
type Page = "home" | "about" | "contact";
type PageInfo = Record<Page, { title: string }>;
// { home: { title: string }; about: { title: string }; contact: { title: string }; }
```

---

### Q: How do you get the return type of a function without calling it?

**Answer:** Use `ReturnType<typeof fn>`.

```ts
function createUser() {
  return { name: "Alice", id: 1 };
}
type User = ReturnType<typeof createUser>;  // { name: string; id: number }
```

---

## keyof, typeof, and indexed access

### Q: What is `typeof` in TypeScript (type context)?

**Answer:** In type position, `typeof` gets the **type** of a value (variable, function, etc.), not the runtime value.

```ts
const config = { host: "localhost", port: 3000 };
type Config = typeof config;  // { host: string; port: number }
```

---

### Q: What is indexed access type `T[K]`?

**Answer:** It’s the type of the property of `T` at key `K`. `K` is usually a key of `T` (e.g. from `keyof T`).

```ts
interface User { name: string; age: number; }
type Name = User["name"];  // string
type UserKeys = keyof User;  // "name" | "age"
type UserValue = User[UserKeys];  // string | number
```

---

## Mapped & conditional types

### Q: What is a mapped type? Give an example.

**Answer:** A mapped type iterates over the keys of another type and builds a new type. Syntax: `[K in keyof T]: ...`

```ts
type OptionalNullable<T> = {
  [K in keyof T]?: T[K] | null;
};
type ReadonlyCopy<T> = {
  readonly [K in keyof T]: T[K];
};
```

---

### Q: What are conditional types? What is `infer`?

**Answer:** Conditional types have the form `T extends U ? X : Y`. If `T` is assignable to `U`, the result is `X`, else `Y`. `infer` introduces a type variable inside the “extends” side and lets you pull out a type.

```ts
type IsString<T> = T extends string ? true : false;
type GetReturnType<T> = T extends (...args: unknown[]) => infer R ? R : never;
type R = GetReturnType<() => number>;  // number
```

---

## any, unknown, never

### Q: What is the difference between `any` and `unknown`?

**Answer:**

- **`any`** — Disables type checking. You can read/write any property and call it like a function. Avoid in production.
- **`unknown`** — Type-safe “anything”. You must narrow (type guard, assertion, or checks) before using it.

```ts
const a: any = getData();
a.foo();  // No error, but may throw at runtime

const u: unknown = getData();
u.foo();           // Error
if (typeof u === "object" && u !== null && "foo" in u) {
  (u as { foo: () => void }).foo();  // ok after narrow
}
```

---

### Q: When is the `never` type used?

**Answer:** `never` means “no value” or “never happens.” Use it for:

1. **Exhaustiveness** — In a switch, the `default` branch can be `default: const _: never = x` so you get a compile error if you add a new variant and forget to handle it.
2. **Functions that never return** — e.g. `throw new Error()` or infinite loop.
3. **Conditional types** — Branches that shouldn’t be reached often resolve to `never`.

---

## Optional chaining & nullish coalescing

### Q: What is optional chaining (`?.`)? How is it different from `??`?

**Answer:**

- **`?.`** — If the value before it is `null` or `undefined`, the whole expression short-circuits to `undefined` instead of throwing. Used for safe property/method access.
- **`??`** — Nullish coalescing: use the right-hand side only when the left is `null` or `undefined` (not for `0`, `""`, or `false`).

```ts
const name = data.user?.profile?.name ?? "Guest";
```

---

## Function overloads

### Q: What are function overloads? When are they useful?

**Answer:** Overloads are multiple call signatures for one function, with one implementation that handles all cases. They’re useful when the return type or allowed arguments depend on the inputs in a way that’s hard to express with a single signature.

```ts
function makeDate(timestamp: number): Date;
function makeDate(y: number, m: number, d: number): Date;
function makeDate(yOrTs: number, m?: number, d?: number): Date {
  if (m !== undefined && d !== undefined) {
    return new Date(yOrTs, m - 1, d);
  }
  return new Date(yOrTs);
}
```

---

## Readonly & immutability

### Q: How do you make an object or array read-only in the type system?

**Answer:** Use `Readonly<T>` for objects and `ReadonlyArray<T>` (or `readonly T[]`) for arrays. Properties/elements can’t be reassigned.

```ts
const state: Readonly<{ count: number }> = { count: 0 };
// state.count = 1;  // Error

const arr: ReadonlyArray<number> = [1, 2, 3];
// arr.push(4);  // Error
```

---

## Gotchas & tricky questions

### Q: Is `const x: {} = 1` valid? What about `const x: object = 1`?

**Answer:** `const x: {} = 1` is valid — `{}` means “any non-nullish value,” so primitives are allowed. `const x: object = 1` is invalid — `object` means “any non-primitive” (no string, number, boolean, etc.).

---

### Q: Why does `const p: Point = { x: 1, y: 2, z: 3 }` error but assigning from a variable with `z` is OK?

**Answer:** TypeScript does **excess property checking** only for **object literals** directly assigned to a type. Extra properties are rejected there. When you assign from another variable, only assignability is checked (does it have at least `x` and `y`?), so extra properties are allowed. So:

```ts
const p: Point = { x: 1, y: 2, z: 3 };  // Error
const obj = { x: 1, y: 2, z: 3 };
const p2: Point = obj;  // OK
```

---

### Q: What does `as const` do?

**Answer:** It makes the type as narrow as possible: literals stay literal, and arrays become readonly tuples. Useful for configs and ensuring exact literal types.

```ts
const obj = { a: 1, b: 2 } as const;
// Type: { readonly a: 1; readonly b: 2 }
const tuple = [1, "hello"] as const;
// Type: readonly [1, "hello"]
```

---

## Up-to-date & modern questions (TS 4.9–5.x)

### Q: What is the `satisfies` operator (TS 4.9+)? How is it different from `as`?

**Answer:** `satisfies` checks that a value **matches** a type (so you get errors if it doesn’t), but the **inferred type stays the narrow one** (e.g. literal types). With `as Type` you assert and the expression’s type becomes `Type`, which can widen and lose literals.

```ts
type Theme = "light" | "dark";
type Config = { theme: Theme; size: number };

const config = {
  theme: "dark",
  size: 12,
} satisfies Config;
// config.theme is "dark" (literal), not Theme — autocomplete and narrowing work

const config2 = {
  theme: "dark",
  size: 12,
} as Config;
// config2.theme is Theme ("light" | "dark") — widened
```

Use `satisfies` when you want validation without losing narrow types (e.g. in config objects or maps with literal keys).

---

### Q: What is strict mode? Name two important flags and why they matter.

**Answer:** Strict mode (`"strict": true` in tsconfig) turns on a set of stricter checks. Two that come up often:

- **`strictNullChecks`** — `null` and `undefined` are separate; you must handle them explicitly (e.g. `string | null`). Catches “cannot read property of null” at compile time.
- **`noImplicitAny`** — Parameters and expressions must have a known type; implicit `any` is an error. Pushes you to add types or fix inference.

Enabling strict mode is standard for production TypeScript; it surfaces bugs early and keeps the type system meaningful.

---

### Q: What are template literal types? Give an example.

**Answer:** Template literal types build string types from literals and other string types, similar to template strings at runtime.

```ts
type EventName = "click" | "scroll";
type HandlerName = `on${Capitalize<EventName>}`;
// "onClick" | "onScroll"

type CSSValue = "left" | "right";
type CssProp = `margin-${CSSValue}`;
// "margin-left" | "margin-right"
```

Useful for type-safe event handlers, CSS props, API routes, or any pattern where names follow a string pattern.

---

### Q: What does the `Awaited<T>` utility type do (TS 4.5+)?

**Answer:** `Awaited<T>` unwraps Promise-like types. If `T` is `Promise<X>`, it resolves to `X`; it also unwraps nested promises (`Promise<Promise<X>>` → `X`). Handy for typing async return values without manual unwrapping.

```ts
type A = Awaited<Promise<number>>;           // number
type B = Awaited<Promise<Promise<string>>>;  // string
async function fetchUser() {
  return { id: 1, name: "Alice" };
}
type User = Awaited<ReturnType<typeof fetchUser>>;  // { id: number; name: string }
```

---

### Q: What is `NoInfer<T>` (TS 5.4)? When would you use it?

**Answer:** `NoInfer<T>` is a utility that **stops TypeScript from inferring** a generic from that position. The type is still checked against `T`, but it won’t contribute to the inferred type parameters. Use it when one argument would otherwise “pull” a generic into a too-wide union.

```ts
function createPicker<C extends string>(choices: C[], defaultChoice?: C) {
  return { choices, default: defaultChoice };
}
createPicker(["red", "green"], "blue");  // No error without NoInfer — C becomes "red" | "green" | "blue"

function createPickerStrict<C extends string>(
  choices: C[],
  defaultChoice?: NoInfer<C>
) {
  return { choices, default: defaultChoice };
}
createPickerStrict(["red", "green"], "blue");  // Error — "blue" is not in choices
```

---

### Q: What are “const” type parameters (TS 5.0)?

**Answer:** You can add `const` before a type parameter (e.g. `function fn<const T>(...)`) so that inference prefers **narrower**, more literal types instead of widening (e.g. `readonly ["a", "b"]` instead of `string[]`). Useful for functions that need to preserve literal tuples or object shapes from arguments.

```ts
function makePair<T extends readonly string[]>(args: T): T {
  return args;
}
const pair = makePair(["a", "b"]);  // Without const: string[]
// With <const T>: readonly ["a", "b"]
```

---

### Q: How does TypeScript’s compilation differ from JavaScript? What does `tsc` emit?

**Answer:** TypeScript is a typed superset of JavaScript. The compiler (`tsc`) **strips types** and emits JavaScript (and optionally source maps). It does not change runtime behavior by default; it only checks types and outputs JS (ES3–ESNext depending on `target`). Types are erased and are not present at runtime.

---

### Q: What is type inference? When does TypeScript infer types?

**Answer:** Type inference is when the compiler deduces types from context instead of you writing them explicitly. Common cases: variable initialization (e.g. `const x = 5` → `number`), function return types, generic type arguments from call arguments, and `satisfies` (shape checked, type still inferred). Relying on inference keeps code concise; add annotations for public APIs or when inference is wrong or too loose.

---

### Q: For Node.js ESM projects, what are recommended `module` and `moduleResolution` settings?

**Answer:** For Node 16+ with ESM, use **`"module": "NodeNext"`** and **`"moduleResolution": "NodeNext"`**. This aligns with Node’s ESM rules: relative imports need `./` or `../`, and you must use **file extensions** (e.g. `.js` for the emitted file). Set `"type": "module"` in package.json. Using NodeNext avoids subtle runtime vs compile-time resolution mismatches.

---

### Q: How can you simulate “nominal” or branded types in TypeScript?

**Answer:** TypeScript’s types are structural (same shape = compatible). To distinguish two types with the same shape (e.g. `UserId` vs `OrderId`), add a **brand** property that exists only in the type system (e.g. `__brand`), and use a helper to create branded values so you don’t accidentally mix them.

```ts
type UserId = string & { readonly __brand: "UserId" };
type OrderId = string & { readonly __brand: "OrderId" };
function toUserId(id: string): UserId {
  return id as UserId;
}
function getOrder(id: OrderId) { }
getOrder(toUserId("u-1"));  // Error — UserId not assignable to OrderId
```

---

### Q: What are TypeScript decorators (TS 5.0)? What are they used for?

**Answer:** Decorators are a stabilized ECMAScript feature supported by TypeScript 5.0. They are functions that customize classes, methods, accessors, or parameters. They receive the decorated element and a **context object** (with metadata like kind, name, static/private, and `addInitializer`). Common uses: dependency injection, validation, logging, and frameworks (e.g. Angular, NestJS). They run at class definition/initialization time.

---

### Q: What is the difference between `interface` and `type` for extending?

**Answer:** An **interface** uses `extends` (single or multiple); a **type** uses intersection `&`. Both can extend the other: `interface A extends B {}` or `type A = B & { ... }`. Interfaces can be extended again by name (declaration merging); types cannot be merged.

---

### Q: What tsconfig options do you commonly use for production? What does `skipLibCheck` do?

**Answer:** Common production-related options:

- **`strict: true`** — Enables strict null checks, noImplicitAny, etc.
- **`skipLibCheck: true`** — Skip type checking of `.d.ts` files (e.g. in node_modules). Speeds up builds; usually safe.
- **`noEmit: true`** — Type-check only when a bundler does the emit.
- **`moduleResolution: "Bundler"` or `"NodeNext"`** — Match your runtime/bundler (Vite/Webpack vs Node ESM).

`skipLibCheck` avoids errors from third-party type definitions and reduces compile time; many projects enable it.

---

## Quick reference

| Symbol / type | Meaning |
|---------------|--------|
| `keyof T` | Union of keys of `T` |
| `typeof x` | Type of value `x` |
| `T[K]` | Type of property `K` in `T` |
| `T extends U` | Constraint or conditional |
| `infer X` | Infer type in conditional |
| `as const` | Literal/readonly narrowing |
| `satisfies T` | Check shape, keep narrow type (TS 4.9+) |
| `?.` | Optional chaining |
| `??` | Nullish coalescing |
| `never` | Unreachable / exhaustiveness |
| `Awaited<T>` | Unwrap Promise (TS 4.5+) |
| `NoInfer<T>` | Block inference for this position (TS 5.4) |

---

*Use this guide alongside hands-on practice and your `typescript-generics-guide.ts` for deeper generic examples. Covers TypeScript 4.9–5.x features as of 2025.*
