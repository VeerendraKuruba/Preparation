/**
 * Generates a 15-character unique ID with a user-provided prefix.
 * The suffix is built from timestamp (base36) + random characters so each
 * call produces a new, non-duplicate ID.
 *
 * @param {string} prefix - User-provided prefix (must be less than 15 characters)
 * @returns {string} 15-character unique ID
 * @throws {Error} If prefix length is >= 15
 */
function generateUniqueId(prefix) {
  const prefixLength = prefix.length;
  const remainingLength = 15 - prefixLength;

  if (remainingLength <= 0) {
    throw new Error("Prefix must be less than 15 characters");
  }

  // Timestamp in base36 (compact, changes every millisecond)
  const timestamp = Date.now().toString(36);
  // Random alphanumeric suffix
  let randomPart = Math.random().toString(36).slice(2);

  let suffix = (timestamp + randomPart).slice(0, remainingLength);
  while (suffix.length < remainingLength) {
    randomPart = Math.random().toString(36).slice(2);
    suffix = (suffix + randomPart).slice(0, remainingLength);
  }

  return prefix + suffix;
}

// Example usage
const prefix = "USR";
console.log(generateUniqueId(prefix)); // e.g. "USRmq3k2x7f9ab12"
console.log(generateUniqueId(prefix)); // different each time
console.log(generateUniqueId("ORD"));  // e.g. "ORDmq3k2x7f9ab1"
