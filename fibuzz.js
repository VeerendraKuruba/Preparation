// ─── Q1: Basic FiBuzz ────────────────────────────────────────────────────────
// Generate first n Fibonacci numbers applying FizzBuzz rules:
// Divisible by 3 → "Fizz", by 5 → "Buzz", by both → "FizzBuzz", else number.

function fibuzz(n) {
  const result = [];
  let a = 0, b = 1;

  for (let i = 0; i < n; i++) {
    const fib = a;
    [a, b] = [b, a + b];

    if (fib % 15 === 0) result.push("FizzBuzz");
    else if (fib % 3 === 0) result.push("Fizz");
    else if (fib % 5 === 0) result.push("Buzz");
    else result.push(fib);
  }

  return result;
}

// fibuzz(10) → [FizzBuzz, 1, 1, Fizz, Fizz, Buzz, 8, 13, Fizz, 34]


// ─── Q2: FiBuzz up to a limit ────────────────────────────────────────────────
// Generate FiBuzz values for all Fibonacci numbers <= limit.

function fibuzzUpTo(limit) {
  const result = [];
  let a = 0, b = 1;

  while (a <= limit) {
    if (a % 15 === 0) result.push("FizzBuzz");
    else if (a % 3 === 0) result.push("Fizz");
    else if (a % 5 === 0) result.push("Buzz");
    else result.push(a);
    [a, b] = [b, a + b];
  }

  return result;
}

// fibuzzUpTo(20) → [FizzBuzz, 1, 1, Fizz, Fizz, Buzz, 8, 13]


// ─── Q3: Nth FiBuzz value ────────────────────────────────────────────────────
// Return the nth FiBuzz value (1-indexed).

function nthFibuzz(n) {
  let a = 0, b = 1, count = 0;

  while (true) {
    const fib = a;
    [a, b] = [b, a + b];
    count++;

    if (count === n) {
      if (fib % 15 === 0) return "FizzBuzz";
      if (fib % 3 === 0) return "Fizz";
      if (fib % 5 === 0) return "Buzz";
      return fib;
    }
  }
}

// nthFibuzz(6) → "Buzz"  (6th Fibonacci is 5)


// ─── Q4: Count Fizz/Buzz/FizzBuzz in first n Fibonacci numbers ───────────────

function fibuzzCount(n) {
  const counts = { Fizz: 0, Buzz: 0, FizzBuzz: 0, number: 0 };
  let a = 0, b = 1;

  for (let i = 0; i < n; i++) {
    const fib = a;
    [a, b] = [b, a + b];

    if (fib % 15 === 0) counts.FizzBuzz++;
    else if (fib % 3 === 0) counts.Fizz++;
    else if (fib % 5 === 0) counts.Buzz++;
    else counts.number++;
  }

  return counts;
}

// fibuzzCount(10) → { Fizz: 3, Buzz: 1, FizzBuzz: 1, number: 5 }


// ─── Q5: FiBuzz with custom divisors ─────────────────────────────────────────
// Same as FiBuzz but with configurable divisors and labels.

function fibuzzCustom(n, rules = [{ div: 3, label: "Fizz" }, { div: 5, label: "Buzz" }]) {
  const result = [];
  let a = 0, b = 1;

  for (let i = 0; i < n; i++) {
    const fib = a;
    [a, b] = [b, a + b];

    const label = rules.reduce((acc, { div, label }) => {
      return fib % div === 0 ? acc + label : acc;
    }, "");

    result.push(label || fib);
  }

  return result;
}

// fibuzzCustom(10) → same as fibuzz(10)
// fibuzzCustom(10, [{ div: 2, label: "Even" }, { div: 7, label: "Seven" }])


// ─── Q6: Sum of numeric FiBuzz values in first n ─────────────────────────────
// Sum only the plain numbers (not Fizz/Buzz/FizzBuzz) in first n FiBuzz values.

function fibuzzSum(n) {
  let sum = 0;
  let a = 0, b = 1;

  for (let i = 0; i < n; i++) {
    const fib = a;
    [a, b] = [b, a + b];

    if (fib % 3 !== 0 && fib % 5 !== 0) sum += fib;
  }

  return sum;
}

// fibuzzSum(10) → 0+1+1+2+8+13 = ... (skips Fizz/Buzz/FizzBuzz values)


// ─── Q7: Is the number a "FiBuzz" number? ────────────────────────────────────
// Check if a given number is a Fibonacci number that maps to Fizz, Buzz, or FizzBuzz.

function isFibuzzSpecial(num) {
  const isFib = (n) => {
    const isPerfectSquare = (x) => Math.sqrt(x) % 1 === 0;
    return isPerfectSquare(5 * n * n + 4) || isPerfectSquare(5 * n * n - 4);
  };

  if (!isFib(num)) return false;
  if (num % 15 === 0) return "FizzBuzz";
  if (num % 3 === 0) return "Fizz";
  if (num % 5 === 0) return "Buzz";
  return false;
}

// isFibuzzSpecial(5)  → "Buzz"
// isFibuzzSpecial(3)  → "Fizz"
// isFibuzzSpecial(4)  → false (Fibonacci but no Fizz/Buzz)
// isFibuzzSpecial(6)  → false (not Fibonacci)
