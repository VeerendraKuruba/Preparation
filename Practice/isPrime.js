/**
 * Optimized isPrime - check if n is prime (trial division).
 * - Early exit for n < 2 and even numbers (except 2)
 * - Check only odd divisors
 * - Loop only up to √n
 */
function isPrime(n) {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;

  const limit = Math.sqrt(n);
  for (let d = 3; d <= limit; d += 2) {
    if (n % d === 0) return false;
  }
  return true;
}

// Examples
console.log(isPrime(1));   // false
console.log(isPrime(2));   // true
console.log(isPrime(17));  // true
console.log(isPrime(18));  // false
console.log(isPrime(97));  // true
