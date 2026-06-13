// --- Simple reduce polyfill (2 args: arr, fn) ---
function reduce(arr, fn) {
  if (arr.length === 0) throw new TypeError('Reduce of empty array with no initial value');
  let acc = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (i in arr) acc = fn(acc, arr[i], i, arr);
  }
  return acc;
}

// --- Array.prototype polyfills ---

Array.prototype.myMap = function (fn, thisArg) {
  const result = [];
  for (let i = 0; i < this.length; i++) {
    if (i in this) result[i] = fn.call(thisArg, this[i], i, this);
  }
  return result;
};

Array.prototype.myReduce = function (fn, initial) {
  let i = 0;
  let acc;

  if (arguments.length >= 2) {
    acc = initial;
  } else {
    if (this.length === 0) {
      throw new TypeError('Reduce of empty array with no initial value');
    }
    while (!(i in this)) i++;
    if (i === this.length) {
      throw new TypeError('Reduce of empty array with no initial value');
    }
    acc = this[i++];
  }

  for (; i < this.length; i++) {
    if (i in this) acc = fn(acc, this[i], i, this);
  }
  return acc;
};

// Examples and tests
console.log('--- Simple reduce(arr, fn) ---');
console.log(reduce([1, 2, 3, 4, 5], (a, b) => a + b));           // 15

console.log('\n--- Array.prototype.myMap Examples ---\n');
console.log([1, 2, 3].myMap((n) => n * 2)); // [2, 4, 6]
console.log([1, , 3].myMap((n) => n * 2)); // [2, empty, 6]

console.log('\n--- Array.prototype.myReduce Examples ---\n');

// Example 1: Sum of numbers
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.myReduce((acc, num) => acc + num, 0);
console.log('Sum:', sum); // 15

// Example 2: Product of numbers
const product = numbers.myReduce((acc, num) => acc * num, 1);
console.log('Product:', product); // 120

// Example 3: Without initial value
const sum2 = numbers.myReduce((acc, num) => acc + num);
console.log('Sum without initial value:', sum2); // 15

// Example 4: Flatten array
const nestedArray = [[1, 2], [3, 4], [5, 6]];
const flattened = nestedArray.myReduce((acc, arr) => acc.concat(arr), []);
console.log('Flattened:', flattened); // [1, 2, 3, 4, 5, 6]

// Example 5: Count occurrences
const fruits = ['apple', 'banana', 'apple', 'orange', 'banana', 'apple'];
const count = fruits.myReduce((acc, fruit) => {
  acc[fruit] = (acc[fruit] || 0) + 1;
  return acc;
}, {});
console.log('Count:', count); // { apple: 3, banana: 2, orange: 1 }

// Example 6: Find maximum value
const maxValue = numbers.myReduce((acc, num) => Math.max(acc, num));
console.log('Max value:', maxValue); // 5

// Example 7: Build object from array
const pairs = [['name', 'John'], ['age', 30], ['city', 'NYC']];
const obj = pairs.myReduce((acc, [key, value]) => {
  acc[key] = value;
  return acc;
}, {});
console.log('Object:', obj); // { name: 'John', age: 30, city: 'NYC' }

// Test: Sparse arrays
console.log('\n--- Sparse Array Test ---');
const sparseArray = [1, , 3, , 5]; // Array with holes at indices 1 and 3
console.log('Sparse array:', sparseArray);
console.log('Length:', sparseArray.length); // 5

const sparseSum = sparseArray.myReduce((acc, num) => {
  console.log(`  myReduce - acc: ${acc}, num: ${num}`);
  return acc + num;
}, 0);
console.log('Sum with myReduce:', sparseSum); // Should be 9 (1+3+5, skipping holes)

const nativeSum = sparseArray.reduce((acc, num) => {
  console.log(`  reduce - acc: ${acc}, num: ${num}`);
  return acc + num;
}, 0);
console.log('Sum with native reduce:', nativeSum); // Should be 9

console.log('\nBoth match:', sparseSum === nativeSum); // true

// Test: Empty array with no initial value
console.log('\n--- Empty Array Test ---');
try {
  [].myReduce((acc, num) => acc + num);
  console.log('ERROR: Should have thrown!');
} catch (error) {
  console.log('✓ myReduce correctly threw:', error.message);
}

try {
  [].reduce((acc, num) => acc + num);
  console.log('ERROR: Should have thrown!');
} catch (error) {
  console.log('✓ Native reduce correctly threw:', error.message);
}

// Test: Sparse array with only holes (no actual elements)
console.log('\n--- Sparse Array with Only Holes Test ---');
const onlyHoles = [, , ,]; // Array with length 3 but no actual elements
console.log('Array with only holes:', onlyHoles, 'length:', onlyHoles.length);

try {
  onlyHoles.myReduce((acc, num) => acc + num);
  console.log('ERROR: Should have thrown!');
} catch (error) {
  console.log('✓ myReduce correctly threw:', error.message);
}

try {
  onlyHoles.reduce((acc, num) => acc + num);
  console.log('ERROR: Should have thrown!');
} catch (error) {
  console.log('✓ Native reduce correctly threw:', error.message);
}


