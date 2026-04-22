# Section 4 — TypeScript

---

### Q63. What is the difference between interface and type? When do you prefer each?

Both `interface` and `type` can describe the shape of an object, but they have meaningful differences.

**Key differences:**

| Feature | `interface` | `type` |
|---|---|---|
| Declaration merging | Yes | No |
| Extending | `extends` keyword | Intersection `&` |
| Can describe primitives/unions/tuples | No | Yes |
| Computed properties | Limited | Yes |
| Implements in classes | Yes | Yes (object types only) |

```typescript
// interface — extends another interface
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
}

// interface — declaration merging (augmentation)
interface Window {
  myCustomProp: string;
}
// Second declaration merges automatically — useful for augmenting third-party types

// type — can describe unions, intersections, primitives, tuples
type ID = string | number;
type Coordinates = [number, number];
type Nullable<T> = T | null;

// type — intersection
type Admin = { role: "admin" } & { name: string };

// Both can describe object shapes
interface UserInterface {
  id: number;
  email: string;
}

type UserType = {
  id: number;
  email: string;
};

// type — computed keys
type EventName = "click" | "focus" | "blur";
type EventHandlers = {
  [K in EventName as `on${Capitalize<K>}`]: () => void;
};
// => { onClick: () => void; onFocus: () => void; onBlur: () => void }
```

**When to prefer each:**

- Use `interface` for public API contracts, class shapes, and when you want declaration merging (e.g., augmenting library types in `*.d.ts` files).
- Use `type` for unions, intersections, tuples, mapped types, conditional types, and anything that `interface` cannot express.
- In a team codebase, pick one and be consistent — many teams default to `interface` for object shapes and `type` for everything else.

---

### Q64. Explain unknown vs any vs never. When do you use each?

These three types sit at opposite ends of the TypeScript type hierarchy.

```typescript
// ─── any ───────────────────────────────────────────────────────────────────
// Opts out of type checking entirely. Assignable to everything; everything
// is assignable to it. Use it only as a last resort or when migrating JS.
function parseConfig(raw: any) {
  return raw.settings.theme; // No error — TS trusts you completely
}

// ─── unknown ───────────────────────────────────────────────────────────────
// The type-safe counterpart of any. You MUST narrow before using the value.
function processInput(value: unknown) {
  // value.toUpperCase(); // ERROR — Object is of type 'unknown'

  if (typeof value === "string") {
    return value.toUpperCase(); // OK after narrowing
  }

  if (value instanceof Error) {
    return value.message; // OK after narrowing
  }

  return String(value);
}

// unknown is perfect for API responses, JSON.parse results, try/catch errors
async function fetchData(url: string): Promise<unknown> {
  const res = await fetch(url);
  return res.json(); // unknown forces callers to validate before use
}

// ─── never ─────────────────────────────────────────────────────────────────
// The bottom type — a value that never exists. A function returning never
// either throws unconditionally or loops forever.

function fail(message: string): never {
  throw new Error(message);
}

function infiniteLoop(): never {
  while (true) {}
}

// never in exhaustive checks — TypeScript narrows to never when all union
// members have been handled. Assigning to never triggers a compile error
// if a new union member is added without updating the switch.
type Shape = "circle" | "square" | "triangle";

function describeShape(shape: Shape): string {
  switch (shape) {
    case "circle":
      return "Round";
    case "square":
      return "Four equal sides";
    case "triangle":
      return "Three sides";
    default:
      const exhaustiveCheck: never = shape; // Error if Shape grows
      return exhaustiveCheck;
  }
}

// never is also the result of an impossible intersection
type ImpossibleType = string & number; // => never
```

**Summary:**
- `any` — escape hatch, disables type checking. Avoid.
- `unknown` — type-safe "I don't know yet." Use for external data; force narrowing before use.
- `never` — impossible type. Use for exhaustive checks and functions that never return.

---

### Q65. What is a union type vs intersection type? Give examples.

**Union type (`A | B`)** — a value that is **one of** several types. Think OR.

**Intersection type (`A & B`)** — a value that satisfies **all** of several types simultaneously. Think AND.

```typescript
// ─── Union ─────────────────────────────────────────────────────────────────
type StringOrNumber = string | number;

function format(value: StringOrNumber): string {
  if (typeof value === "string") return value.toUpperCase();
  return value.toFixed(2);
}

format("hello"); // "HELLO"
format(3.14159); // "3.14"

// Union of literal types (string enum alternative)
type Direction = "north" | "south" | "east" | "west";
type Status = "idle" | "loading" | "success" | "error";

// Discriminated union (see Q77 for full treatment)
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function handleResult(r: Result<number>) {
  if (r.ok) {
    console.log(r.value * 2); // TypeScript knows r.value exists here
  } else {
    console.error(r.error);   // TypeScript knows r.error exists here
  }
}

// ─── Intersection ──────────────────────────────────────────────────────────
type Serializable = { serialize: () => string };
type Loggable = { log: () => void };

type SerializableAndLoggable = Serializable & Loggable;

const obj: SerializableAndLoggable = {
  serialize: () => JSON.stringify({}),
  log: () => console.log("logging"),
};

// Common pattern: merge object shapes
type BaseEntity = { id: string; createdAt: Date };
type UserFields = { name: string; email: string };
type User = BaseEntity & UserFields;
// => { id: string; createdAt: Date; name: string; email: string }

// Intersection with conflicting types collapses to never
type Conflict = string & number; // => never

// Practical use: "mixin" pattern for React components
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: "primary" | "secondary";
  isLoading?: boolean;
};
```

---

### Q66. What is type narrowing? Explain type guards (typeof, instanceof, custom guards).

Type narrowing is TypeScript's ability to refine a broad type to a more specific one inside a conditional block. TypeScript performs **control flow analysis** to track the type at every point in the code.

```typescript
// ─── typeof guard ─────────────────────────────────────────────────────────
function stringify(value: string | number | boolean): string {
  if (typeof value === "string") {
    return value.toUpperCase();         // string
  }
  if (typeof value === "number") {
    return value.toFixed(2);            // number
  }
  return value ? "yes" : "no";         // boolean
}

// ─── instanceof guard ─────────────────────────────────────────────────────
function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `Error: ${error.message}`;   // Error — .message is available
  }
  return "Unknown error";
}

class Cat { meow() { return "meow"; } }
class Dog { bark() { return "woof"; } }

function makeNoise(animal: Cat | Dog) {
  if (animal instanceof Cat) {
    return animal.meow();
  }
  return animal.bark(); // TypeScript knows it's Dog here
}

// ─── in operator guard ────────────────────────────────────────────────────
type Fish = { swim: () => void };
type Bird = { fly: () => void };

function move(animal: Fish | Bird) {
  if ("swim" in animal) {
    animal.swim();  // Fish
  } else {
    animal.fly();   // Bird
  }
}

// ─── Equality / literal narrowing ─────────────────────────────────────────
type Direction = "left" | "right" | "up" | "down";

function handle(dir: Direction | null) {
  if (dir === null) return;   // null eliminated below
  console.log(dir.toUpperCase()); // Direction only
}

// ─── Custom type guard (type predicate) ───────────────────────────────────
// Syntax: function name(param: WideType): param is NarrowType
interface Cat2 { kind: "cat"; meow(): void }
interface Dog2 { kind: "dog"; bark(): void }

function isCat(animal: Cat2 | Dog2): animal is Cat2 {
  return animal.kind === "cat";
}

function handle2(animal: Cat2 | Dog2) {
  if (isCat(animal)) {
    animal.meow(); // TypeScript knows it's Cat2
  } else {
    animal.bark(); // TypeScript knows it's Dog2
  }
}

// ─── Assertion function (throws if condition not met) ─────────────────────
function assertIsString(val: unknown): asserts val is string {
  if (typeof val !== "string") {
    throw new Error(`Expected string, got ${typeof val}`);
  }
}

function processValue(val: unknown) {
  assertIsString(val);
  console.log(val.toUpperCase()); // val is narrowed to string after assertion
}

// ─── Nullish narrowing ────────────────────────────────────────────────────
function greet(name: string | null | undefined) {
  if (name == null) {
    // Covers both null and undefined
    return "Hello, guest!";
  }
  return `Hello, ${name}!`; // string only
}
```

---

### Q67. What is the `as const` assertion and when is it useful?

`as const` freezes a value's type to its most literal, narrowest form and marks all properties as `readonly`. Without it, TypeScript widens literals to their base types (e.g., `"admin"` becomes `string`).

```typescript
// ─── Without as const ─────────────────────────────────────────────────────
const role = "admin";       // type: string (widened — let-like behavior)
// Actually for a const primitive, TypeScript does infer literal: "admin"
// But for objects and arrays, widening kicks in:

const config = {
  endpoint: "/api",
  retries: 3,
};
// config.endpoint: string  (not "/api")
// config.retries:  number  (not 3)
// Mutable — config.endpoint = "/something-else" is allowed

// ─── With as const ────────────────────────────────────────────────────────
const configConst = {
  endpoint: "/api",
  retries: 3,
} as const;
// configConst.endpoint: "/api"   (literal)
// configConst.retries:  3        (literal)
// All properties are readonly — reassignment is a compile error

// ─── Arrays as const ──────────────────────────────────────────────────────
const ROLES = ["admin", "editor", "viewer"] as const;
// type: readonly ["admin", "editor", "viewer"]  (tuple, not string[])

type Role = (typeof ROLES)[number]; // "admin" | "editor" | "viewer"

// ─── Discriminated union values ────────────────────────────────────────────
const Actions = {
  INCREMENT: "INCREMENT",
  DECREMENT: "DECREMENT",
  RESET: "RESET",
} as const;

type ActionType = (typeof Actions)[keyof typeof Actions];
// "INCREMENT" | "DECREMENT" | "RESET"

// ─── Practical React use case ─────────────────────────────────────────────
const THEME_COLORS = {
  primary: "#0066cc",
  danger: "#cc0000",
  success: "#009900",
} as const;

type ThemeColor = keyof typeof THEME_COLORS; // "primary" | "danger" | "success"
type ThemeColorValue = (typeof THEME_COLORS)[ThemeColor]; // "#0066cc" | "#cc0000" | "#009900"

function applyColor(color: ThemeColor) {
  return THEME_COLORS[color]; // TypeScript knows the exact literal return value
}

// ─── Function argument inference ──────────────────────────────────────────
function setAlignment(align: "left" | "center" | "right") {
  console.log(align);
}

const alignment = "left";             // inferred as string — ERROR below
// setAlignment(alignment);           // Argument of type 'string' not assignable

const alignmentConst = "left" as const; // inferred as "left"
setAlignment(alignmentConst);           // OK
```

**When to use:** enum-like constant objects, deriving union types from arrays/objects, preventing unintended mutation, passing literal arguments to functions expecting literal types.

---

### Q68. Explain `readonly` and `Readonly<T>`. How do they differ?

`readonly` is a modifier applied to individual properties or array/tuple types. `Readonly<T>` is a utility type that applies `readonly` to every property of a type `T` at once.

```typescript
// ─── readonly on individual properties ───────────────────────────────────
interface Point {
  readonly x: number;
  readonly y: number;
  label: string;          // mutable
}

const p: Point = { x: 1, y: 2, label: "origin" };
p.label = "new label";   // OK
// p.x = 5;              // ERROR: Cannot assign to 'x' because it is a read-only property

// ─── readonly on arrays ───────────────────────────────────────────────────
const nums: readonly number[] = [1, 2, 3];
// nums.push(4);         // ERROR
// nums[0] = 99;         // ERROR
// nums.sort();          // ERROR — sort mutates

const nums2: ReadonlyArray<number> = [1, 2, 3]; // equivalent

// ─── readonly on tuples ───────────────────────────────────────────────────
const tuple: readonly [string, number] = ["hello", 42];
// tuple[0] = "world";   // ERROR

// ─── Readonly<T> utility type ─────────────────────────────────────────────
interface User {
  id: number;
  name: string;
  email: string;
}

type ReadonlyUser = Readonly<User>;
// Equivalent to:
// {
//   readonly id: number;
//   readonly name: string;
//   readonly email: string;
// }

function displayUser(user: Readonly<User>) {
  console.log(user.name);
  // user.name = "Hacker";  // ERROR — signals intent: don't mutate the param
}

// ─── Key difference: depth ────────────────────────────────────────────────
// Readonly<T> is SHALLOW — nested objects remain mutable
interface Config {
  database: {
    host: string;
    port: number;
  };
}

const config: Readonly<Config> = {
  database: { host: "localhost", port: 5432 },
};
// config.database = { host: "other", port: 1234 }; // ERROR — top-level is readonly
config.database.host = "remotehost";                 // OK — nested is still mutable!

// For deep readonly, use a recursive mapped type:
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

const deepConfig: DeepReadonly<Config> = {
  database: { host: "localhost", port: 5432 },
};
// deepConfig.database.host = "other"; // ERROR

// ─── readonly vs const ────────────────────────────────────────────────────
// const prevents reassignment of the variable binding.
// readonly prevents reassignment of the property value.
const obj = { x: 1 };
obj.x = 2;       // OK — const only locks the binding, not the content
// obj = {};     // ERROR — can't rebind obj

interface Locked { readonly x: number }
const locked: Locked = { x: 1 };
// locked.x = 2; // ERROR — property is readonly
```

---

### Q69. What are generics? Write a generic identity function and a generic `Stack<T>` class.

Generics let you write reusable, type-safe code that works with multiple types without sacrificing type information. Think of them as type parameters — placeholders filled in at call/instantiation time.

```typescript
// ─── Identity function ────────────────────────────────────────────────────
// Without generics — loses type information
function identityAny(value: any): any {
  return value; // return type is any, not the original type
}

// With generics — preserves the type
function identity<T>(value: T): T {
  return value;
}

const str = identity("hello");        // T inferred as string; str: string
const num = identity(42);             // T inferred as number; num: number
const arr = identity([1, 2, 3]);      // T inferred as number[]; arr: number[]
const explicit = identity<boolean>(true); // T explicitly provided

// ─── Generic arrow function (TSX files need the trailing comma) ────────────
const identityArrow = <T,>(value: T): T => value;

// ─── Generic Stack<T> class ───────────────────────────────────────────────
class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  get size(): number {
    return this.items.length;
  }

  toArray(): T[] {
    return [...this.items];
  }
}

// Usage — TypeScript infers T from first push, or you can annotate
const numStack = new Stack<number>();
numStack.push(1);
numStack.push(2);
numStack.push(3);
console.log(numStack.peek());   // 3
console.log(numStack.pop());    // 3
console.log(numStack.size);     // 2

const strStack = new Stack<string>();
strStack.push("a");
strStack.push("b");
// strStack.push(42); // ERROR: Argument of type 'number' is not assignable to type 'string'

// ─── Generic interfaces ───────────────────────────────────────────────────
interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
}

interface User { id: string; name: string }

class UserRepository implements Repository<User> {
  async findById(id: string): Promise<User | null> {
    // ...implementation
    return null;
  }
  async findAll(): Promise<User[]> { return []; }
  async save(entity: User): Promise<User> { return entity; }
  async delete(id: string): Promise<void> {}
}

// ─── Generic utility functions ────────────────────────────────────────────
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

function zip<A, B>(a: A[], b: B[]): Array<[A, B]> {
  return a.map((item, i) => [item, b[i]]);
}

const pairs = zip([1, 2, 3], ["a", "b", "c"]);
// Array<[number, string]>

function groupBy<T, K extends string | number | symbol>(
  arr: T[],
  getKey: (item: T) => K
): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const key = getKey(item);
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}
```

---

### Q70. What does `extends` mean in a generic constraint? Example: `function getLength<T extends { length: number }>(val: T): number`

In a generic constraint, `extends` does **not** mean inheritance — it means "T must be assignable to / must satisfy the shape of." It narrows what types are valid for a type parameter.

```typescript
// ─── Basic constraint ─────────────────────────────────────────────────────
function getLength<T extends { length: number }>(val: T): number {
  return val.length; // Safe: TypeScript knows T has .length
}

getLength("hello");            // OK — string has .length
getLength([1, 2, 3]);          // OK — array has .length
getLength({ length: 10, name: "foo" }); // OK — has .length + extra properties
// getLength(42);              // ERROR: number has no .length property

// ─── keyof constraint ─────────────────────────────────────────────────────
// Ensures K is a valid key of T
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 1, name: "Alice", email: "alice@example.com" };
const name = getProperty(user, "name");   // type: string
const id   = getProperty(user, "id");     // type: number
// getProperty(user, "age");              // ERROR: "age" is not a key of user

// ─── extends with type parameters ─────────────────────────────────────────
// T must extend another generic — common in higher-order types
function cloneAndMerge<T extends object, U extends object>(a: T, b: U): T & U {
  return { ...a, ...b };
}

const merged = cloneAndMerge({ x: 1 }, { y: 2 }); // { x: number; y: number }

// ─── Multiple constraints (intersection) ──────────────────────────────────
interface Identifiable { id: string }
interface Timestamped { createdAt: Date }

function logEntity<T extends Identifiable & Timestamped>(entity: T): void {
  console.log(`[${entity.createdAt.toISOString()}] Entity ${entity.id}`);
}

// ─── Conditional types with extends ───────────────────────────────────────
// In conditional types, extends checks assignability
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;  // true
type B = IsString<number>;  // false
type C = IsString<"hello">; // true — "hello" extends string

// Distributive conditional — applied to each union member
type ToArray<T> = T extends any ? T[] : never;
type StrOrNumArray = ToArray<string | number>; // string[] | number[]

// ─── extends in class hierarchies ─────────────────────────────────────────
class Animal {
  name: string;
  constructor(name: string) { this.name = name; }
}
class Dog extends Animal {
  breed: string;
  constructor(name: string, breed: string) {
    super(name);
    this.breed = breed;
  }
}

function printName<T extends Animal>(animal: T): void {
  console.log(animal.name);
}

printName(new Animal("Generic"));
printName(new Dog("Rex", "Labrador")); // Dog extends Animal, so OK

// ─── Default type parameters with extends ─────────────────────────────────
interface ApiOptions<TData = unknown, TError extends Error = Error> {
  onSuccess: (data: TData) => void;
  onError: (error: TError) => void;
}
```

---

### Q71. Explain these utility types with examples: `Partial<T>`, `Required<T>`, `Pick<T,K>`, `Omit<T,K>`, `Record<K,V>`, `ReturnType<T>`, `Parameters<T>`.

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  age?: number;   // already optional
  role: "admin" | "editor" | "viewer";
}

// ─── Partial<T> ───────────────────────────────────────────────────────────
// Makes all properties optional. Useful for update/patch operations.
type PartialUser = Partial<User>;
// { id?: string; name?: string; email?: string; age?: number; role?: ... }

function updateUser(id: string, patch: Partial<User>): User {
  const existing = {} as User; // fetch from DB in real life
  return { ...existing, ...patch };
}

updateUser("1", { name: "Alice" }); // Only name provided — valid

// ─── Required<T> ──────────────────────────────────────────────────────────
// Makes all properties required (removes optional modifier). Opposite of Partial.
type RequiredUser = Required<User>;
// { id: string; name: string; email: string; age: number; role: ... }
// Note: age is now required

interface FormState {
  name?: string;
  email?: string;
  submitted?: boolean;
}
type SubmittedForm = Required<FormState>;
// { name: string; email: string; submitted: boolean }

// ─── Pick<T, K> ───────────────────────────────────────────────────────────
// Constructs a type with only the specified keys from T.
type UserPreview = Pick<User, "id" | "name">;
// { id: string; name: string }

type UserCredentials = Pick<User, "email" | "role">;

// Useful for DTOs / view models
function renderUserCard(user: Pick<User, "id" | "name" | "email">): string {
  return `${user.name} <${user.email}>`;
}

// ─── Omit<T, K> ───────────────────────────────────────────────────────────
// Constructs a type excluding the specified keys. Complement of Pick.
type UserWithoutId = Omit<User, "id">;
// { name: string; email: string; age?: number; role: ... }

type CreateUserPayload = Omit<User, "id">; // id generated server-side
type PublicUser = Omit<User, "email">;     // hide PII

// ─── Record<K, V> ─────────────────────────────────────────────────────────
// Constructs an object type with keys K and values V.
type RolePermissions = Record<User["role"], string[]>;
// { admin: string[]; editor: string[]; viewer: string[] }

const permissions: RolePermissions = {
  admin:  ["read", "write", "delete"],
  editor: ["read", "write"],
  viewer: ["read"],
};

// Lookup table pattern
type StatusCode = 200 | 201 | 400 | 401 | 403 | 404 | 500;
const httpMessages: Record<StatusCode, string> = {
  200: "OK",
  201: "Created",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  500: "Internal Server Error",
};

// ─── ReturnType<T> ────────────────────────────────────────────────────────
// Extracts the return type of a function type.
function createUser(name: string, email: string) {
  return { id: crypto.randomUUID(), name, email, createdAt: new Date() };
}

type CreatedUser = ReturnType<typeof createUser>;
// { id: string; name: string; email: string; createdAt: Date }

// Especially useful when you don't control the function definition:
type UseStateReturn<T> = ReturnType<typeof import("react").useState<T>>;

// With async functions — wraps in Promise
async function fetchUser(id: string) {
  return { id, name: "Alice" };
}
type FetchUserReturn = ReturnType<typeof fetchUser>; // Promise<{ id: string; name: string }>
type ResolvedUser = Awaited<ReturnType<typeof fetchUser>>; // { id: string; name: string }

// ─── Parameters<T> ────────────────────────────────────────────────────────
// Extracts the parameter types of a function type as a tuple.
function sendEmail(to: string, subject: string, body: string): void {}

type SendEmailParams = Parameters<typeof sendEmail>;
// [to: string, subject: string, body: string]

type FirstParam = Parameters<typeof sendEmail>[0]; // string

// Useful for wrapping/decorating functions
function withLogging<T extends (...args: any[]) => any>(fn: T) {
  return (...args: Parameters<T>): ReturnType<T> => {
    console.log("Calling with:", args);
    const result = fn(...args);
    console.log("Result:", result);
    return result;
  };
}

const loggedSend = withLogging(sendEmail);
// loggedSend is typed identically to sendEmail
```

---

### Q72. What is a mapped type? Write a mapped type that makes all properties of T optional.

A mapped type iterates over the keys of an existing type and transforms each property, allowing you to create new types programmatically. It uses the `[K in keyof T]` syntax.

```typescript
// ─── Basic mapped type (reimplementing Partial) ───────────────────────────
type MyPartial<T> = {
  [K in keyof T]?: T[K]; // The ? makes each property optional
};

interface User {
  id: string;
  name: string;
  email: string;
}

type PartialUser = MyPartial<User>;
// { id?: string; name?: string; email?: string }

// ─── Reimplementing other utility types ───────────────────────────────────

// Required — removes optional modifier with -?
type MyRequired<T> = {
  [K in keyof T]-?: T[K];
};

// Readonly
type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};

// Mutable — removes readonly with -readonly
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

// ─── Value transformation ─────────────────────────────────────────────────
// Make all values nullable
type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

// Wrap all values in a getter function
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<User>;
// { getId: () => string; getName: () => string; getEmail: () => string }

// ─── Key remapping (TypeScript 4.1+) ──────────────────────────────────────
// Filter properties by value type
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

interface Mixed {
  id: number;
  name: string;
  active: boolean;
  score: number;
}

type StringProps = PickByValue<Mixed, string>; // { name: string }
type NumberProps = PickByValue<Mixed, number>; // { id: number; score: number }

// ─── Practical React example: event handler map ────────────────────────────
type EventMap<T extends HTMLElement> = {
  [K in keyof React.DOMAttributes<T> as K extends `on${string}`
    ? K
    : never]: React.DOMAttributes<T>[K];
};

// ─── Flatten mapped type for form validation ───────────────────────────────
type FormErrors<T> = {
  [K in keyof T]?: string; // Each field has an optional error message
};

type UserFormErrors = FormErrors<User>;
// { id?: string; name?: string; email?: string }

// ─── Two-level mapped type (for nested objects) ────────────────────────────
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
```

---

### Q73. What is a conditional type? Write `IsArray<T>` that returns `true` if T is an array.

A conditional type uses the `T extends U ? TrueType : FalseType` syntax — it's a ternary for types, evaluated at compile time based on assignability.

```typescript
// ─── IsArray<T> ───────────────────────────────────────────────────────────
type IsArray<T> = T extends any[] ? true : false;

type A = IsArray<number[]>;        // true
type B = IsArray<string[]>;        // true
type C = IsArray<string>;          // false
type D = IsArray<[number, string]>;// true  — tuples extend any[]
type E = IsArray<never>;           // never (special case)

// ─── Common conditional types ─────────────────────────────────────────────

// NonNullable removes null and undefined
type MyNonNullable<T> = T extends null | undefined ? never : T;
type Safe = MyNonNullable<string | null | undefined>; // string

// Flatten — if T is an array, extract element type
type Flatten<T> = T extends (infer Item)[] ? Item : T;
type FlatStr = Flatten<string[]>;  // string
type FlatNum = Flatten<number>;    // number (unchanged)

// Promise unwrap
type Awaited2<T> = T extends Promise<infer U> ? Awaited2<U> : T;
type Resolved = Awaited2<Promise<Promise<string>>>; // string

// ─── Distributive conditional types ───────────────────────────────────────
// When T is a naked type parameter, the condition distributes over union members
type ToArray<T> = T extends any ? T[] : never;

type Result = ToArray<string | number>; // string[] | number[]
// Distributed: ToArray<string> | ToArray<number>
// =>           string[]        | number[]

// To prevent distribution, wrap T in a tuple:
type ToArrayNonDistributive<T> = [T] extends [any] ? T[] : never;
type Result2 = ToArrayNonDistributive<string | number>; // (string | number)[]

// ─── Exclude and Extract (built-in conditional types) ─────────────────────
type MyExclude<T, U> = T extends U ? never : T;
type MyExtract<T, U> = T extends U ? T : never;

type Animals = "cat" | "dog" | "fish" | "bird";
type NoFish = MyExclude<Animals, "fish">;         // "cat" | "dog" | "bird"
type OnlyPets = MyExtract<Animals, "cat" | "dog">; // "cat" | "dog"

// ─── Checking specific structures ─────────────────────────────────────────
type IsString<T> = T extends string ? true : false;
type IsFunction<T> = T extends (...args: any[]) => any ? true : false;
type IsPromise<T> = T extends Promise<any> ? true : false;
type IsNever<T> = [T] extends [never] ? true : false; // must wrap to avoid distribution

type CheckFn = IsFunction<() => void>; // true
type CheckProm = IsPromise<Promise<string>>; // true
type CheckNever = IsNever<never>; // true
```

---

### Q74. What is `infer` in TypeScript? Write a type that extracts the return type of a function.

`infer` introduces a type variable within the `extends` clause of a conditional type, allowing TypeScript to **infer** (capture) a type from a structural pattern. It can only be used inside conditional types.

```typescript
// ─── Extracting return type (reimplementing ReturnType) ───────────────────
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function getUser() {
  return { id: "1", name: "Alice", active: true };
}

type UserShape = MyReturnType<typeof getUser>;
// { id: string; name: string; active: boolean }

type StringReturn = MyReturnType<() => string>; // string
type VoidReturn = MyReturnType<() => void>;      // void
type NonFn = MyReturnType<string>;               // never

// ─── Extracting parameter types ───────────────────────────────────────────
type FirstParameter<T> = T extends (first: infer P, ...rest: any[]) => any ? P : never;

function submit(event: MouseEvent, userId: string): void {}

type FirstArg = FirstParameter<typeof submit>; // MouseEvent

// ─── Extracting Promise value ──────────────────────────────────────────────
type UnpackPromise<T> = T extends Promise<infer V> ? V : T;

type Unpacked = UnpackPromise<Promise<string[]>>; // string[]
type NotWrapped = UnpackPromise<number>;           // number

// Recursive unwrap (handles Promise<Promise<T>>)
type DeepAwaited<T> = T extends Promise<infer U> ? DeepAwaited<U> : T;
type Deep = DeepAwaited<Promise<Promise<Promise<string>>>>; // string

// ─── Extracting array element type ────────────────────────────────────────
type ElementType<T> = T extends (infer E)[] ? E : never;

type StrEl = ElementType<string[]>;            // string
type NumEl = ElementType<Array<number>>;       // number
type TupleEl = ElementType<[string, number]>;  // string | number

// ─── Extracting constructor parameter types ────────────────────────────────
type ConstructorParams<T> = T extends new (...args: infer P) => any ? P : never;

class HttpClient {
  constructor(baseUrl: string, timeout: number) {}
}

type ClientParams = ConstructorParams<typeof HttpClient>; // [string, number]

// ─── Inferring from object shapes ─────────────────────────────────────────
// Extract the type of a specific property name
type PropType<T, K extends keyof T> = T extends { [P in K]: infer V } ? V : never;

interface Config { host: string; port: number }
type HostType = PropType<Config, "host">; // string
type PortType = PropType<Config, "port">; // number

// ─── Practical: infer inside React hooks ──────────────────────────────────
// Extract the value type returned by useState
import type { useState } from "react";
type StateValue<T extends (...args: any[]) => any> =
  ReturnType<T> extends [infer V, any] ? V : never;

// ─── Template literal + infer (TS 4.5+) ───────────────────────────────────
type EventName<T extends string> =
  T extends `on${infer E}` ? Lowercase<E> : never;

type Click = EventName<"onClick">;  // "click"
type Focus = EventName<"onFocus">;  // "focus"
type None  = EventName<"visible">;  // never
```

---

### Q75. What is `keyof T` and `typeof`? Write a `getProperty<T, K extends keyof T>(obj: T, key: K)` function.

`keyof T` produces a union of the **keys** of type `T` at the type level. `typeof` captures the type of a **value** at the type level (can also be used in expression position for runtime type checking).

```typescript
// ─── keyof ────────────────────────────────────────────────────────────────
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

type UserKeys = keyof User; // "id" | "name" | "email" | "age"

// keyof with index signatures
type StringMap = { [key: string]: number };
type StringMapKeys = keyof StringMap; // string | number (number because obj[0] === obj["0"])

// keyof with union types
type UnionKeys = keyof (User & { role: string }); // "id" | "name" | "email" | "age" | "role"

// ─── typeof ───────────────────────────────────────────────────────────────
const palette = {
  red:   "#ff0000",
  green: "#00ff00",
  blue:  "#0000ff",
} as const;

type Palette = typeof palette;
// { readonly red: "#ff0000"; readonly green: "#00ff00"; readonly blue: "#0000ff" }

type Color = keyof typeof palette; // "red" | "green" | "blue"
type ColorValue = (typeof palette)[Color]; // "#ff0000" | "#00ff00" | "#0000ff"

// typeof on a function
function add(a: number, b: number): number { return a + b; }
type AddFn = typeof add; // (a: number, b: number) => number

// typeof on a class — gives the constructor type (not instance type)
class Animal { name: string = ""; }
type AnimalConstructor = typeof Animal; // new () => Animal
type AnimalInstance = InstanceType<typeof Animal>; // Animal

// ─── getProperty — type-safe property accessor ────────────────────────────
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]; // T[K] is an indexed access type — the type of obj[key]
}

const user: User = { id: "1", name: "Alice", email: "alice@example.com", age: 30 };

const name  = getProperty(user, "name");   // type: string
const age   = getProperty(user, "age");    // type: number
const id    = getProperty(user, "id");     // type: string

// TypeScript prevents invalid keys at compile time:
// getProperty(user, "phone"); // ERROR: Argument of type '"phone"' is not assignable to type 'keyof User'

// ─── setProperty — type-safe property setter ──────────────────────────────
function setProperty<T, K extends keyof T>(obj: T, key: K, value: T[K]): void {
  obj[key] = value;
}

setProperty(user, "name", "Bob");        // OK
// setProperty(user, "name", 42);        // ERROR: number is not assignable to string
// setProperty(user, "name", undefined); // ERROR: undefined is not assignable to string

// ─── pick utility using keyof ──────────────────────────────────────────────
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(k => { result[k] = obj[k]; });
  return result;
}

const preview = pick(user, ["id", "name"]);
// type: Pick<User, "id" | "name"> => { id: string; name: string }

// ─── keyof in mapped types ─────────────────────────────────────────────────
type Setters<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};

type UserSetters = Setters<User>;
// {
//   setId:    (value: string) => void;
//   setName:  (value: string) => void;
//   setEmail: (value: string) => void;
//   setAge:   (value: number) => void;
// }
```

---

### Q76. What is declaration merging? When does it happen?

Declaration merging is when TypeScript **merges two or more declarations with the same name** in the same scope into a single definition. It only works with certain declaration types.

```typescript
// ─── Interface merging ─────────────────────────────────────────────────────
// TypeScript merges multiple interface declarations with the same name.
// This is the most common form.
interface Window {
  myAnalytics: { track(event: string): void };
}
// Now window.myAnalytics is valid everywhere — even though the global Window
// type lives in lib.dom.d.ts, TypeScript merges our augmentation in.

// ─── Module augmentation ───────────────────────────────────────────────────
// Augment a third-party module's types
declare module "react-router-dom" {
  interface Location {
    state: { from?: string; redirectUrl?: string };
  }
}
// Now useLocation().state.from is typed correctly.

// Augmenting Express Request (very common):
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string };
    }
  }
}

// ─── Namespace merging ─────────────────────────────────────────────────────
// Namespaces merge with other namespaces, classes, functions, or enums.

// Merging namespace with function
function createComponent(name: string): void { /* ... */ }
namespace createComponent {
  export function fromTemplate(template: string): void { /* ... */ }
  export const version = "1.0.0";
}

createComponent("Button");
createComponent.fromTemplate("<div/>");
console.log(createComponent.version);

// ─── Merging namespace with class (static members) ─────────────────────────
class Validator {
  isValid(value: string): boolean { return true; }
}
namespace Validator {
  export interface Rule {
    test: (value: string) => boolean;
    message: string;
  }
  export const emailRule: Rule = {
    test: v => v.includes("@"),
    message: "Invalid email",
  };
}

const v = new Validator();
v.isValid("test");
console.log(Validator.emailRule);

// ─── Enum merging ─────────────────────────────────────────────────────────
// Enums can be merged with namespaces to add static methods
enum Direction { Up, Down, Left, Right }
namespace Direction {
  export function isVertical(d: Direction): boolean {
    return d === Direction.Up || d === Direction.Down;
  }
}

Direction.isVertical(Direction.Up); // true

// ─── What does NOT merge ───────────────────────────────────────────────────
// type aliases NEVER merge — duplicate type aliases are an error:
// type Foo = string;
// type Foo = number; // ERROR: Duplicate identifier 'Foo'

// Classes do not merge with other classes — only with namespaces.

// ─── Practical use: extending third-party component props ──────────────────
// Augmenting a library's module to add missing props:
declare module "some-ui-library" {
  interface ButtonProps {
    analyticsId?: string;
  }
}
```

**When it happens:**
1. Multiple `interface` declarations with the same name in the same scope
2. Module augmentation (`declare module "..."`)
3. Global augmentation (`declare global { ... }`)
4. Namespace merged with a class, function, or enum of the same name

`type` aliases and `class` declarations (with each other) do **not** merge.

---

### Q77. Explain discriminated unions. Build a type-safe API response type using them.

A discriminated union (also called a tagged union) is a union of types that each have a **common literal property** (the discriminant/tag). TypeScript narrows the union to the correct member based on that property.

```typescript
// ─── The pattern: each variant has a literal discriminant field ────────────
type ApiResponse<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: { code: number; message: string } };

// ─── Type-safe handler ────────────────────────────────────────────────────
function handleResponse<T>(response: ApiResponse<T>): void {
  switch (response.status) {
    case "idle":
      console.log("Not yet started");
      break;

    case "loading":
      console.log("Loading...");
      break;

    case "success":
      // TypeScript knows response.data exists and is type T
      console.log("Data:", response.data);
      break;

    case "error":
      // TypeScript knows response.error.code and response.error.message exist
      console.error(`Error ${response.error.code}: ${response.error.message}`);
      break;

    default:
      // Exhaustive check — errors at compile time if a new status is added
      const _exhaustive: never = response;
  }
}

// ─── React hook using discriminated union ─────────────────────────────────
import { useState, useEffect } from "react";

type FetchState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T; timestamp: number }
  | { status: "error"; error: string; retryCount: number };

function useFetch<T>(url: string) {
  const [state, setState] = useState<FetchState<T>>({ status: "idle" });

  useEffect(() => {
    setState({ status: "loading" });

    fetch(url)
      .then(res => res.json())
      .then((data: T) =>
        setState({ status: "success", data, timestamp: Date.now() })
      )
      .catch((err: Error) =>
        setState({ status: "error", error: err.message, retryCount: 0 })
      );
  }, [url]);

  return state;
}

// Component using the hook — exhaustive rendering
interface User { id: string; name: string }

function UserCard({ userId }: { userId: string }) {
  const state = useFetch<User>(`/api/users/${userId}`);

  if (state.status === "idle") return <p>Waiting...</p>;
  if (state.status === "loading") return <p>Loading...</p>;
  if (state.status === "error") return <p>Error: {state.error}</p>;

  // TypeScript knows state.data: User here
  return <div>{state.data.name}</div>;
}

// ─── Action types in a reducer (Redux-style) ──────────────────────────────
type CounterAction =
  | { type: "INCREMENT"; amount: number }
  | { type: "DECREMENT"; amount: number }
  | { type: "RESET" }
  | { type: "SET"; value: number };

function counterReducer(state: number, action: CounterAction): number {
  switch (action.type) {
    case "INCREMENT": return state + action.amount;
    case "DECREMENT": return state - action.amount;
    case "RESET":     return 0;
    case "SET":       return action.value;
    // No default needed — TypeScript knows all cases are covered
  }
}

// ─── Geometric shapes example ─────────────────────────────────────────────
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "rectangle":
      return shape.width * shape.height;
    case "triangle":
      return 0.5 * shape.base * shape.height;
  }
}
```

---

### Q78. What is the `satisfies` operator (TypeScript 4.9+)?

`satisfies` validates that a value matches a type **without widening the inferred type**. Unlike a type annotation (which widens) or `as` (which overrides), `satisfies` checks conformance while preserving the most specific inferred type.

```typescript
// ─── The problem satisfies solves ─────────────────────────────────────────

// Option 1: Type annotation — validates but WIDENS the type
const palette1: Record<string, string> = {
  red: "#ff0000",
  green: "#00ff00",
};
// palette1.red is: string  — we've lost the literal "#ff0000"
// palette1.typo is allowed at runtime — TS only knows keys are strings

// Option 2: as const — preserves literals but DOES NOT validate
const palette2 = {
  red: "#ff0000",
  green: "not-a-color-but-no-error",
} as const;
// Inferred correctly, but no validation against a schema

// Option 3: satisfies — validates AND preserves
type ColorMap = Record<"red" | "green" | "blue", string>;

const palette3 = {
  red: "#ff0000",
  green: "#00ff00",
  blue: "#0000ff",
} satisfies ColorMap;

// palette3.red is: "#ff0000" (literal), not string
// palette3.typo would be a compile error
// palette3.missingBlue would be a compile error (all 3 keys required)

// ─── Mixed value types ────────────────────────────────────────────────────
type Theme = {
  colors: Record<string, string | [number, number, number]>;
};

const theme = {
  colors: {
    primary: "#0066cc",
    secondary: [0, 102, 204],
  },
} satisfies Theme;

// Without satisfies:
// theme.colors.primary would be string | [number, number, number]
// TypeScript can't tell which branch

// With satisfies — TypeScript preserves the actual inferred type:
theme.colors.primary.toUpperCase();    // OK — string
theme.colors.secondary.map(n => n * 2); // OK — [number, number, number]

// ─── Route config validation ───────────────────────────────────────────────
type RouteConfig = {
  path: string;
  exact?: boolean;
  component: () => JSX.Element;
};

const routes = [
  { path: "/", exact: true, component: () => <div>Home</div> },
  { path: "/about",         component: () => <div>About</div> },
] satisfies RouteConfig[];

// routes[0].path is "/", not string (literal preserved)
// Missing component would be a compile error

// ─── API handler registry ─────────────────────────────────────────────────
type Handler = (req: Request) => Response;

const handlers = {
  getUser:    (req: Request) => new Response("user"),
  createUser: (req: Request) => new Response("created"),
} satisfies Record<string, Handler>;

// handlers.getUser is (req: Request) => Response  (fully typed)
// handlers.nonExistentKey would NOT be autocompleted / would error

// ─── satisfies vs as vs annotation summary ────────────────────────────────
type Config = { env: "dev" | "prod"; port: number };

// Annotation — validates, but inferred type is Config (widened)
const c1: Config = { env: "dev", port: 3000 };
// c1.env is: "dev" | "prod"

// as — no validation, overrides
const c2 = { env: "dev", port: 3000 } as Config;
// c2.env is: "dev" | "prod"  — and typos slip through!

// satisfies — validates AND preserves
const c3 = { env: "dev", port: 3000 } satisfies Config;
// c3.env is: "dev"  (literal preserved)
// Missing field or wrong type = compile error
```

---

### Q79. How do you type React props including children, ref, event handlers?

```typescript
import React, {
  ReactNode,
  ReactElement,
  PropsWithChildren,
  forwardRef,
  useRef,
  useImperativeHandle,
  MouseEvent,
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
} from "react";

// ─── Children ─────────────────────────────────────────────────────────────

// ReactNode — anything React can render: JSX, string, number, null, array, fragment
interface ContainerProps {
  children: ReactNode;        // most permissive — use this most of the time
}

// ReactElement — only a JSX element (no strings, no null)
interface WrapperProps {
  children: ReactElement;     // stricter — requires a single JSX element
}

// PropsWithChildren<P> — utility that adds children?: ReactNode to P
interface CardProps {
  title: string;
}
type CardWithChildren = PropsWithChildren<CardProps>;
// { title: string; children?: ReactNode }

function Card({ title, children }: PropsWithChildren<CardProps>) {
  return <div><h2>{title}</h2>{children}</div>;
}

// ─── Event handlers ───────────────────────────────────────────────────────
interface FormProps {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClick:  (event: MouseEvent<HTMLButtonElement>) => void;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

// Inline — TypeScript infers the event type from the element
function LoginForm() {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    console.log(data.get("email"));
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value, e.target.checked);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" onChange={handleChange} />
    </form>
  );
}

// Handler type alias — reusable
type InputChangeHandler = React.ChangeEventHandler<HTMLInputElement>;
// Equivalent to: (event: ChangeEvent<HTMLInputElement>) => void

// ─── ref ──────────────────────────────────────────────────────────────────

// useRef — for DOM elements
function TextInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  const focus = () => inputRef.current?.focus();

  return <input ref={inputRef} />;
}

// forwardRef — exposing a ref to parent components
interface InputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ placeholder, value, onChange }, ref) => {
    return (
      <input
        ref={ref}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    );
  }
);

// Usage
function Parent() {
  const ref = useRef<HTMLInputElement>(null);
  return <Input ref={ref} value="" onChange={() => {}} />;
}

// Exposing an imperative handle (not the raw DOM node)
interface ModalHandle {
  open: () => void;
  close: () => void;
}

const Modal = forwardRef<ModalHandle, { title: string }>(
  ({ title }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);

    useImperativeHandle(ref, () => ({
      open:  () => setIsOpen(true),
      close: () => setIsOpen(false),
    }));

    return isOpen ? <div>{title}</div> : null;
  }
);

// ─── Complete component with all prop types ────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  isLoading?: boolean;
  leftIcon?: ReactElement;
  children: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", isLoading, leftIcon, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        data-variant={variant}
        {...rest}
      >
        {isLoading ? <span>Loading...</span> : leftIcon}
        {children}
      </button>
    );
  }
);
```

---

### Q80. What is `React.FC` vs function component type — why do many prefer the latter?

`React.FC` (also `React.FunctionComponent`) is a generic type alias that was historically the standard way to type React components. Over time, the community has largely moved away from it in favor of plain typed function signatures.

```typescript
import React, { FC, ReactNode } from "react";

// ─── React.FC style ───────────────────────────────────────────────────────
interface GreetingProps {
  name: string;
}

const Greeting: React.FC<GreetingProps> = ({ name }) => {
  return <p>Hello, {name}!</p>;
};

// ─── Plain function component style ───────────────────────────────────────
function Greeting2({ name }: GreetingProps): JSX.Element {
  return <p>Hello, {name}!</p>;
}

// Or with arrow function
const Greeting3 = ({ name }: GreetingProps): JSX.Element => {
  return <p>Hello, {name}!</p>;
};

// ─── Why React.FC fell out of favor ───────────────────────────────────────

// Problem 1: React.FC included implicit children (removed in React 18's @types/react)
// In older @types/react (pre-18):
// React.FC automatically added: children?: ReactNode
// This meant any component could silently accept children even if not intended.

// With React.FC (old behavior — sneaky bug):
const Badge: React.FC<{ label: string }> = ({ label }) => <span>{label}</span>;
// <Badge label="Admin"><div>Unexpected child</div></Badge>  — no TS error in old types!

// With explicit function (always correct):
function Badge2({ label }: { label: string }): JSX.Element {
  return <span>{label}</span>;
}
// <Badge2 label="Admin"><div>Unexpected</div></Badge2> — TS error: no children prop

// Problem 2: React.FC doesn't support generics naturally
// This doesn't work:
// const List: React.FC<{ items: T[] }> = ... // T is undefined

// Plain function — generics work fine:
function List<T extends { id: string }>({ items }: { items: T[] }) {
  return <ul>{items.map(item => <li key={item.id}>{JSON.stringify(item)}</li>)}</ul>;
}

// Problem 3: React.FC obscures the return type
// React.FC always returns ReactElement | null
// But you might want to signal a component always returns an element (never null)

// Explicit return type — more expressive:
function AlwaysRenders({ text }: { text: string }): JSX.Element {
  return <p>{text}</p>; // TypeScript enforces this returns JSX, not null
}

// Problem 4: Heavier type — React.FC adds defaultProps, propTypes, displayName etc.
// These are rarely used, and defaultProps is being deprecated for function components.

// ─── The modern recommended pattern (React 18+) ───────────────────────────

// Explicit props type + explicit return type
interface CardProps {
  title: string;
  children: ReactNode;         // explicit — opt-in, not implicit
  className?: string;
}

function Card({ title, children, className }: CardProps): JSX.Element {
  return (
    <div className={className}>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

// For components that may render nothing:
function ConditionalBanner({ show }: { show: boolean }): JSX.Element | null {
  if (!show) return null;
  return <div>Important announcement!</div>;
}

// ─── When React.FC is still fine ──────────────────────────────────────────
// - Legacy codebases already using it consistently
// - @types/react v18+ fixes the children issue, so it's no longer harmful
// - Preference — both styles are valid; the team should pick one and stick to it

// ─── Summary comparison ───────────────────────────────────────────────────
/*
  React.FC<Props>                    | Explicit typed function
  -----------------------------------|-----------------------------------------
  Implicitly added children (old)    | Children must be explicit
  Harder to use generics             | Generics work naturally
  Adds unnecessary type members      | Clean, minimal type
  Return type hidden (ReactElement)  | Return type is explicit
  Consistent with older codebase     | Preferred by most modern guides
*/
```

**Bottom line:** Both work in React 18+ with updated types. The community prefers explicit function signatures because they are more readable, support generics easily, make children explicit (opt-in), and give you full control over the return type.
