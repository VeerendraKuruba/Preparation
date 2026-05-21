/**
 * Simple function to print all values from a nested JSON object
 * Handles nested objects and arrays recursively
 */
function printJSON(obj) {
  // If it's a primitive value (string, number, boolean, null, undefined)
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    console.log(obj);
    return;
  }
  
  // If it's an array
  if (Array.isArray(obj)) {
    obj.forEach(item => printJSON(item));
    return;
  }
  
  // If it's an object
  for (const key in obj) {
    printJSON(obj[key]);
  }
}

// ============================================================================
// TEST EXAMPLES
// ============================================================================

// Example 1: Simple nested object
const data1 = {
  name: "John",
  age: 30,
  address: {
    city: "New York",
    zipCode: 10001
  },
  hobbies: ["reading", "coding"]
};

console.log("Example 1: Simple nested object");
console.log("================================");
printJSON(data1);

// Example 2: Array with nested objects
console.log("\nExample 2: Array with nested objects");
console.log("=====================================");
const data2 = [
  { id: 1, name: "Alice", skills: ["JavaScript", "Python"] },
  { id: 2, name: "Bob", skills: ["Java", "C++"] }
];
printJSON(data2);

// Example 3: Complex nested structure
console.log("\nExample 3: Complex nested structure");
console.log("====================================");
const data3 = {
  company: "Tech Corp",
  departments: [
    {
      name: "Engineering",
      employees: [
        { name: "Alice", age: 28 },
        { name: "Bob", age: 32 }
      ]
    }
  ],
  active: true
};
printJSON(data3);

// Export function for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { printJSON };
}

