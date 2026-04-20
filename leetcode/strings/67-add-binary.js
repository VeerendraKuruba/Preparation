/**
 * 67. Add Binary
 * Given two binary strings a and b, return their sum as a binary string.
 *
 * Method 1 (BigInt): Parse '0b'+a and '0b'+b, add, then .toString(2).
 *   e.g. '1010' + '1011' → 10 + 11 = 21 → "10101"
 *
 * Method 2 (Manual): Add from right to left, bit by bit, with carry.
 *   Each step: sum = bitA + bitB + carry; digit = sum % 2; carry = sum >> 1.
 *   e.g. '11' + '1': (1+1=2→0,carry1), (1+0+1=2→0,carry1), (0+0+1=1→1) → "100"
 */

// Method 1: BigInt (simplest)
function addBinary(a, b) {
  return (BigInt('0b' + a) + BigInt('0b' + b)).toString(2);
}

// Method 2: Add digit-by-digit from right with carry (no BigInt, works in any language)
function addBinaryManual(a, b) {
  const out = [];
  let i = a.length - 1;
  let j = b.length - 1;
  let carry = 0;

  while (i >= 0 || j >= 0 || carry) {
    const bitA = i >= 0 ? +a[i] : 0;
    const bitB = j >= 0 ? +b[j] : 0;
    const sum = bitA + bitB + carry;
    out.push(sum % 2);
    carry = sum >> 1; // same as Math.floor(sum / 2)
    i--;
    j--;
  }

  return out.reverse().join('');
}

// Examples
console.log(addBinary('11', '1')); // "100"
console.log(addBinary('1010', '1011')); // "10101"
console.log(addBinaryManual('11', '1')); // "100"
console.log(addBinaryManual('1010', '1011')); // "10101"
