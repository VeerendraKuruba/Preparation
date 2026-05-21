// ============================================
// MEMOIZATION EXAMPLES
// ============================================
// Memoization is an optimization technique that stores the results 
// of expensive function calls and returns the cached result when 
// the same inputs occur again.

// ============================================
// Example 1: Fibonacci Sequence (Classic Example)
// ============================================

// WITHOUT Memoization - Slow (exponential time complexity O(2^n))
function fibonacciSlow(n) {
    if (n <= 1) return n;
    return fibonacciSlow(n - 1) + fibonacciSlow(n - 2);
}

// WITH Memoization - Fast (linear time complexity O(n))
function fibonacciMemoized() {
    const cache = {};
    
    return function fib(n) {
        // Check if result is already in cache
        if (n in cache) {
            return cache[n];
        }
        
        // Base cases
        if (n <= 1) {
            return n;
        }
        
        // Calculate and store in cache
        cache[n] = fib(n - 1) + fib(n - 2);
        return cache[n];
    };
}

// ============================================
// Example 2: Generic Memoization Function
// ============================================

// A reusable memoization wrapper that can memoize any function
function memoize(fn) {
    const cache = {};
    
    return function(...args) {
        // Create a unique key from arguments
        const key = JSON.stringify(args);
        
        // Return cached result if available
        if (key in cache) {
            console.log(`Returning cached result for: ${key}`);
            return cache[key];
        }
        
        // Calculate and cache the result
        console.log(`Calculating result for: ${key}`);
        const result = fn.apply(this, args);
        cache[key] = result;
        return result;
    };
}

// ============================================
// Example 3: Factorial with Memoization
// ============================================

function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

const memoizedFactorial = memoize(factorial);

// ============================================
// Example 4: Expensive API Call Simulation
// ============================================

// Simulating an expensive operation (like an API call)
function expensiveOperation(id) {
    console.log(`Performing expensive operation for ID: ${id}`);
    // Simulate delay
    let result = 0;
    for (let i = 0; i < 100000000; i++) {
        result += i;
    }
    return `Data for ID: ${id}`;
}

const memoizedExpensiveOperation = memoize(expensiveOperation);

// ============================================
// Example 5: Grid Traveler Problem
// ============================================

// How many ways can you travel in a grid from top-left to bottom-right?
// You can only move down or right
function gridTraveler(m, n, memo = {}) {
    // Create a key for the memo
    const key = m + ',' + n;
    
    // Check memo
    if (key in memo) return memo[key];
    
    // Base cases
    if (m === 1 && n === 1) return 1;
    if (m === 0 || n === 0) return 0;
    
    // Store in memo and return
    memo[key] = gridTraveler(m - 1, n, memo) + gridTraveler(m, n - 1, memo);
    return memo[key];
}

// ============================================
// TESTING AND DEMONSTRATIONS
// ============================================

console.log('========================================');
console.log('MEMOIZATION EXAMPLES');
console.log('========================================\n');

// Test 1: Fibonacci Performance Comparison
console.log('1. FIBONACCI PERFORMANCE COMPARISON:');
console.log('------------------------------------');

const fibMemo = fibonacciMemoized();

console.time('Fibonacci WITHOUT memoization (n=35)');
console.log('Result:', fibonacciSlow(35));
console.timeEnd('Fibonacci WITHOUT memoization (n=35)');

console.log();

console.time('Fibonacci WITH memoization (n=35)');
console.log('Result:', fibMemo(35));
console.timeEnd('Fibonacci WITH memoization (n=35)');

console.log();

// Test with larger number (only possible with memoization)
console.time('Fibonacci WITH memoization (n=100)');
console.log('Result:', fibMemo(100));
console.timeEnd('Fibonacci WITH memoization (n=100)');

console.log('\n========================================\n');

// Test 2: Generic Memoization
console.log('2. GENERIC MEMOIZATION WITH FACTORIAL:');
console.log('------------------------------------');
console.log('First call (will calculate):');
console.log('5! =', memoizedFactorial(5));

console.log('\nSecond call (will use cache):');
console.log('5! =', memoizedFactorial(5));

console.log('\nNew value (will calculate):');
console.log('6! =', memoizedFactorial(6));

console.log('\n========================================\n');

// Test 3: Expensive Operation
console.log('3. EXPENSIVE OPERATION CACHING:');
console.log('------------------------------------');
console.time('First call with ID 123');
console.log(memoizedExpensiveOperation(123));
console.timeEnd('First call with ID 123');

console.log();

console.time('Second call with ID 123 (cached)');
console.log(memoizedExpensiveOperation(123));
console.timeEnd('Second call with ID 123 (cached)');

console.log('\n========================================\n');

// Test 4: Grid Traveler
console.log('4. GRID TRAVELER PROBLEM:');
console.log('------------------------------------');
console.log('Ways to travel in 2x3 grid:', gridTraveler(2, 3));
console.log('Ways to travel in 3x3 grid:', gridTraveler(3, 3));
console.log('Ways to travel in 18x18 grid:', gridTraveler(18, 18));

console.log('\n========================================\n');

// ============================================
// EXPORTS (if using modules)
// ============================================

// Uncomment if you want to use these in other files
// module.exports = {
//     fibonacciMemoized,
//     memoize,
//     memoizedFactorial,
//     gridTraveler
// };

