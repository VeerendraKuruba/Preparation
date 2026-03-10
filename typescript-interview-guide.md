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

### Q: What is type narrowing? Give examples.

**Answer:** Type narrowing is when TypeScript infers a more specific type inside a branch (e.g. after an `if`), so you can safely use that type.

Examples: `typeof`, `instanceof`, equality checks, truthiness, and custom type guards.

```ts
function example(value: string | number) {
  if (typeof value === "string") {
    return value.toUpperCase();  // narrowed to string
  }
  return value.toFixed(2);       // narrowed to number
}
```

---

### Q: What is a type guard? How do you write one?

**Answer:** A type guard is a function whose return type is `arg is Type`. If it returns `true`, TypeScript narrows the argument to that type.

```ts
function isString(val: unknown): val is string {
  return typeof val === "string";
}
function handle(val: string | number) {
  if (isString(val)) {
    console.log(val.length);  // val is string here
  }
}
```

---

### Q: How do you narrow with the `in` operator?

**Answer:** Use `"prop" in obj` to discriminate between object types that have different properties.

```ts
type Fish = { swim: () => void };
type Bird = { fly: () => void };
function move(animal: Fish | Bird) {
  if ("swim" in animal) animal.swim();
  else animal.fly();
}
```

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

## Quick reference

| Symbol / type | Meaning |
|---------------|--------|
| `keyof T` | Union of keys of `T` |
| `typeof x` | Type of value `x` |
| `T[K]` | Type of property `K` in `T` |
| `T extends U` | Constraint or conditional |
| `infer X` | Infer type in conditional |
| `as const` | Literal/readonly narrowing |
| `?.` | Optional chaining |
| `??` | Nullish coalescing |
| `never` | Unreachable / exhaustiveness |

---

*Use this guide alongside hands-on practice and your `typescript-generics-guide.ts` for deeper generic examples.*
