/**
 * Conditionally join CSS class names together
 * @param {...(string|Object|Array)} args - Variable arguments of strings, objects, or arrays
 * @returns {string} - Space-separated string of class names
 */
function classNames(...args) {
  const classes = [];

  args.forEach(arg => {
    // Skip falsy values (null, undefined, false, 0, '')
    if (!arg) return;

    const argType = typeof arg;

    // Handle string arguments
    if (argType === 'string' || argType === 'number') {
      classes.push(arg);
    }
    // Handle array arguments - recursively flatten
    else if (Array.isArray(arg)) {
      const result = classNames(...arg);
      if (result) {
        classes.push(result);
      }
    }
    // Handle object arguments
    else if (argType === 'object') {
      for (const key in arg) {
        // Only include keys with truthy values
        if (arg.hasOwnProperty(key) && arg[key]) {
          classes.push(key);
        }
      }
    }
  });

  return classes.join(' ');
}

// Test cases
console.log('Test 1:', classNames('foo', 'bar')); // 'foo bar'
console.log('Test 2:', classNames('foo', { bar: true })); // 'foo bar'
console.log('Test 3:', classNames({ 'foo-bar': true })); // 'foo-bar'
console.log('Test 4:', classNames({ 'foo-bar': false })); // ''
console.log('Test 5:', classNames({ foo: true }, { bar: true })); // 'foo bar'
console.log('Test 6:', classNames({ foo: true, bar: true })); // 'foo bar'
console.log('Test 7:', classNames({ foo: true, bar: false, qux: true })); // 'foo qux'
console.log('Test 8:', classNames('a', ['b', { c: true, d: false }])); // 'a b c'

// Additional edge cases
console.log('Test 9:', classNames()); // ''
console.log('Test 10:', classNames('', null, undefined, false, 0)); // ''
console.log('Test 11:', classNames('a', ['b', ['c', { d: true }]])); // 'a b c d' (nested arrays)
console.log('Test 12:', classNames('foo', { bar: true, baz: false }, 'qux')); // 'foo bar qux'

module.exports = classNames;

