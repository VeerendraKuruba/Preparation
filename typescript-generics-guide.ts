/**
 * ============================================
 * TYPESCRIPT GENERICS - BEGINNER'S GUIDE
 * ============================================
 * Generics let you write reusable code that works with many types
 * while keeping full type safety. Think of them as "type parameters"
 * (placeholders) that get filled in when you use the code.
 */

// ============================================
// 1. WHY GENERICS?
// ============================================

// Without generics - loses type info
function identityAny(value: unknown): unknown {
  return value;
}
const numAny = identityAny(42);    // typed as unknown
const strAny = identityAny("hi");  // typed as unknown

// With generics - one function, full type safety
function identity<T>(value: T): T {
  return value;
}
const num = identity(42);    // num is number
const str = identity("hi");  // str is string

// ============================================
// 2. BASIC SYNTAX
// ============================================

// ----- Generic function -----
function identityFn<T>(value: T): T {
  return value;
}
identityFn(10);        // T = number
identityFn("hello");   // T = string
identityFn<number>(10); // explicit T

// ----- Multiple type parameters -----
function pair<T, U>(first: T, second: U): [T, U] {
  return [first, second];
}
pair("age", 25);            // [string, number]
pair(true, [1, 2, 3]);      // [boolean, number[]]

// ----- Generic interface -----
interface Box<T> {
  value: T;
}
const numberBox: Box<number> = { value: 42 };
const stringBox: Box<string> = { value: "hello" };

// ----- Generic class -----
class Container<T> {
  private item: T;

  constructor(item: T) {
    this.item = item;
  }

  getItem(): T {
    return this.item;
  }
}
const numContainer = new Container(100);   // Container<number>
const strContainer = new Container("hi");  // Container<string>

// ============================================
// 3. CONSTRAINTS - Limiting T
// ============================================

// T must have a 'length' property
function logLength<T extends { length: number }>(arg: T): T {
  console.log(arg.length);
  return arg;
}
logLength("hello");           // string has .length
logLength([1, 2, 3]);         // array has .length
logLength({ length: 5 });     // object with length
// logLength(123);            // Error: number has no .length

// T must be an object (for merging)
function merge<T extends object, U extends object>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}
merge({ name: "Alice" }, { age: 30 }); // { name: string; age: number }

// ============================================
// 4. GENERIC ARRAYS
// ============================================

function getFirst<T>(arr: T[]): T | undefined {
  return arr[0];
}
getFirst([1, 2, 3]);                    // number | undefined
getFirst(["a", "b"]);                   // string | undefined
getFirst([{ id: 1 }, { id: 2 }]);      // { id: number } | undefined

// ============================================
// 5. DEFAULT TYPE PARAMETERS
// ============================================

interface ApiResponse<T = unknown> {
  data: T;
  status: number;
}
const res: ApiResponse = { data: "something", status: 200 };
const userRes: ApiResponse<{ name: string }> = {
  data: { name: "Alice" },
  status: 200,
};

// ============================================
// 6. REAL-WORLD STYLE EXAMPLES
// ============================================

// API result wrapper
interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}
function fetchUser(): Result<{ name: string; email: string }> {
  return {
    success: true,
    data: { name: "Alice", email: "alice@example.com" },
  };
}

// Generic "useState" style
function useState<T>(initial: T): [T, (value: T) => void] {
  let state = initial;
  return [
    state,
    (value: T) => {
      state = value;
    },
  ];
}
const [count, setCount] = useState(0);   // number
const [name, setName] = useState("");    // string

// Pick a key from an object (keyof)
function getValue<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const person = { name: "Bob", age: 25 };
getValue(person, "name");  // string
getValue(person, "age");   // number

// ============================================
// QUICK REFERENCE
// ============================================
// T, U, V          = Type parameters (convention)
// function fn<T>   = "For any type T..."
// Box<T>           = "A Box that holds type T"
// T extends X      = "T must be assignable to X"
// T[] / Array<T>   = Array of T

export {};
