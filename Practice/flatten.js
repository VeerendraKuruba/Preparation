// =============================================================================
// METHOD 1: Native Array.flat() - Modern JavaScript (ES2019+)
// =============================================================================

/**
 * Using the native flat() method with Infinity depth
 * This is the simplest and most performant approach for modern JavaScript
 */
function flattenNative(array) {
  return array.flat(Infinity);
}

// =============================================================================
// METHOD 2: Recursive Approach
// =============================================================================

/**
 * Flattens a nested array recursively into a single level.
 * @param {Array} array - The array to flatten
 * @returns {Array} - A new flattened array
 */
function flatten(array) {
  const result = [];
  
  for (let i = 0; i < array.length; i++) {
    const element = array[i];
    
    // If the element is an array, recursively flatten it
    if (Array.isArray(element)) {
      const flattened = flatten(element);
      // Concatenate the flattened sub-array to the result
      result.push(...flattened);
    } else {
      // If it's not an array, just add it to the result
      result.push(element);
    }
  }
  
  return result;
}

// =============================================================================
// METHOD 3: Iterative Approach using Stack (No Recursion)
// =============================================================================

/**
 * Flattens array using iteration and a stack (avoids recursion depth issues)
 * Good for extremely deep nesting where recursion might cause stack overflow
 */
function flattenIterative(array) {
  const result = [];
  const stack = [...array]; // Copy the array to use as a stack
  
  while (stack.length) {
    const item = stack.pop();
    
    if (Array.isArray(item)) {
      // If it's an array, push all its elements back onto the stack
      stack.push(...item);
    } else {
      // If it's not an array, add to result at the beginning
      result.unshift(item);
    }
  }
  
  return result;
}

// =============================================================================
// METHOD 4: Using Array.reduce()
// =============================================================================

/**
 * Flattens using reduce - functional programming approach
 */
function flattenReduce(array) {
  return array.reduce((acc, item) => {
    return acc.concat(Array.isArray(item) ? flattenReduce(item) : item);
  }, []);
}

// =============================================================================
// METHOD 5: Generator Function Approach
// =============================================================================

/**
 * Generator function that yields flattened values
 * Memory efficient for large arrays
 */
function* flattenGenerator(array) {
  for (const item of array) {
    if (Array.isArray(item)) {
      yield* flattenGenerator(item);
    } else {
      yield item;
    }
  }
}

function flattenWithGenerator(array) {
  return [...flattenGenerator(array)];
}

// =============================================================================
// METHOD 6: Using toString() trick (Only for arrays of numbers)
// =============================================================================

/**
 * Clever trick using toString - ONLY works for arrays of numbers
 * Not recommended for production but interesting to know
 */
function flattenToString(array) {
  return array.toString().split(',').map(Number);
}

// =============================================================================
// METHOD 7: Custom Depth Control
// =============================================================================

/**
 * Flatten with controlled depth (similar to native flat())
 * @param {Array} array - The array to flatten
 * @param {number} depth - How many levels to flatten (Infinity for all)
 * @returns {Array} - Flattened array
 */
function flattenWithDepth(array, depth = 1) {
  if (depth < 1) return array.slice();
  
  return array.reduce((acc, item) => {
    return acc.concat(
      Array.isArray(item) ? flattenWithDepth(item, depth - 1) : item
    );
  }, []);
}

// =============================================================================
// COMPREHENSIVE TEST CASES
// =============================================================================

const testArray = [1, [2, [3, [4, [5, 6]]]], 7, [8, [9, 10]]];
const deepArray = [[[[[[1]]]]], [2, [3, [4]]], 5];
const mixedArray = [1, [2, 3], 4, [5, [6, 7]], 8];

console.log('='.repeat(70));
console.log('TESTING ALL FLATTEN METHODS WITH DEEP NESTED ARRAYS');
console.log('='.repeat(70));

console.log('\n📌 Test Array:', JSON.stringify(testArray));

console.log('\n1️⃣  NATIVE flat(Infinity):');
console.log(flattenNative(testArray));

console.log('\n2️⃣  RECURSIVE Approach:');
console.log(flatten(testArray));

console.log('\n3️⃣  ITERATIVE (Stack-based):');
console.log(flattenIterative(testArray));

console.log('\n4️⃣  REDUCE Method:');
console.log(flattenReduce(testArray));

console.log('\n5️⃣  GENERATOR Function:');
console.log(flattenWithGenerator(testArray));

console.log('\n6️⃣  toString() Trick (numbers only):');
console.log(flattenToString(testArray));

console.log('\n7️⃣  CONTROLLED DEPTH:');
console.log('   Depth 1:', flattenWithDepth(testArray, 1));
console.log('   Depth 2:', flattenWithDepth(testArray, 2));
console.log('   Depth ∞:', flattenWithDepth(testArray, Infinity));

console.log('\n' + '='.repeat(70));
console.log('DEEPLY NESTED TEST');
console.log('='.repeat(70));
console.log('Input:', JSON.stringify(deepArray));
console.log('Output:', flatten(deepArray));

console.log('\n' + '='.repeat(70));
console.log('EDGE CASES');
console.log('='.repeat(70));

console.log('\n✓ Empty array:');
console.log(flatten([])); // []

console.log('\n✓ Single level (no nesting):');
console.log(flatten([1, 2, 3, 4, 5])); // [1, 2, 3, 4, 5]

console.log('\n✓ Nested empty arrays:');
console.log(flatten([[], [[]], [[[]]]])); // []

console.log('\n✓ Mixed with empty arrays:');
console.log(flatten([1, [], 2, [3, []], 4])); // [1, 2, 3, 4]

console.log('\n✓ With strings and mixed types:');
console.log(flatten([1, ['a', ['b', 2]], [3, 'c']])); // [1, 'a', 'b', 2, 3, 'c']

console.log('\n' + '='.repeat(70));
console.log('PERFORMANCE COMPARISON (with very deep array)');
console.log('='.repeat(70));

const veryDeepArray = [1, [2, [3, [4, [5, [6, [7, [8, [9, [10]]]]]]]]]];

console.time('Native flat()');
flattenNative(veryDeepArray);
console.timeEnd('Native flat()');

console.time('Recursive');
flatten(veryDeepArray);
console.timeEnd('Recursive');

console.time('Iterative');
flattenIterative(veryDeepArray);
console.timeEnd('Iterative');

console.time('Reduce');
flattenReduce(veryDeepArray);
console.timeEnd('Reduce');

console.time('Generator');
flattenWithGenerator(veryDeepArray);
console.timeEnd('Generator');

console.log('\n' + '='.repeat(70));
console.log('💡 RECOMMENDATIONS:');
console.log('='.repeat(70));
console.log(`
• Best Overall: Use native flat(Infinity) - fastest and cleanest
• For older browsers: Use recursive or reduce approach with polyfill
• For extreme depth: Use iterative (avoids stack overflow)
• For memory efficiency: Use generator function
• Custom depth: Use flattenWithDepth() or native flat(depth)
`);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    flatten,
    flattenNative,
    flattenIterative,
    flattenReduce,
    flattenWithGenerator,
    flattenToString,
    flattenWithDepth
  };
}

