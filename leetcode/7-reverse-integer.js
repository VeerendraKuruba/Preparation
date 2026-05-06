// 7. Reverse Integer
var reverse = function (x) {
    const sign = x < 0 ? -1 : 1;
    const reversed = parseInt(String(Math.abs(x)).split("").reverse().join("")) * sign;
    return reversed > 2 ** 31 - 1 || reversed < -(2 ** 31) ? 0 : reversed;
};

// Tests
console.log(reverse(123));        // 321
console.log(reverse(-123));       // -321
console.log(reverse(120));        // 21
console.log(reverse(1534236469)); // 0 (overflow)
