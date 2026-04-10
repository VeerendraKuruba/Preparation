// Approach 1: push open brackets; on close, pop must match via pair map.
// Time O(n), space O(n) for the stack.
var isValid = function (s) {
    const stack = [];
    const pair = { ")": "(", "}": "{", "]": "[" };

    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (pair[c]) {
            if (stack.pop() !== pair[c]) return false;
        } else {
            stack.push(c);
        }
    }

    return stack.length === 0;
};

// Approach 2: on open, push the expected closing char; on close, pop must equal char.
var isValid2 = function (s) {
    const stack = [];
    const charMap = {
        "{": "}",
        "[": "]",
        "(": ")",
    };
    for (const char of s) {
        if (char in charMap) {
            stack.push(charMap[char]);
        } else {
            if (stack.pop() !== char) return false;
        }
    }
    return stack.length === 0;
};
