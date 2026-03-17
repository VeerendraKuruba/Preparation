/**
 * 66. Plus One
 * Large integer as array of digits (MSB left). Increment by one, return result array.
 * Turn trailing 9s into 0s; add 1 to the digit before them, or prepend 1 if all 9s.
 */

/**
 * @param {number[]} digits
 * @return {number[]}
 */
function plusOne(digits) {
  let i = digits.length - 1;
  while (i >= 0 && digits[i] === 9) {
    digits[i] = 0;
    i--;
  }
  if (i >= 0) {
    digits[i]++;
    return digits;
  }
  return [1, ...digits];
}

// Examples
console.log(plusOne([1, 2, 3])); // [1, 2, 4]
console.log(plusOne([4, 3, 2, 1])); // [4, 3, 2, 2]
console.log(plusOne([9])); // [1, 0]
console.log(plusOne([9, 9, 9])); // [1, 0, 0, 0]
