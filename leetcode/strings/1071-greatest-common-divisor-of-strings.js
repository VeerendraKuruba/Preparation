/**
 * 1071. Greatest Common Divisor of Strings
 *
 * @param {string} str1
 * @param {string} str2
 * @return {string}
 */
var gcdOfStrings = function (str1, str2) {
  if (str1 + str2 !== str2 + str1) return "";
  let a = str1.length;
  let b = str2.length;
  while (b) {
    const r = a % b;
    a = b;
    b = r;
  }
  return str1.slice(0, a);
};
