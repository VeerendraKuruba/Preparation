/**
 * @param {string[]} strs
 * @return {string}
 */
var longestCommonPrefix = function(strs) {
    let prefix = "";

    // go column by column through the first string's characters
    for (let col = 0; col < strs[0].length; col++) {
        const char = strs[0][col];

        // check if every string has the same character at this position
        for (let row = 1; row < strs.length; row++) {
            if (strs[row][col] !== char) {
                return prefix; // mismatch — stop here
            }
        }

        prefix += char; // all strings matched at this column
    }

    return prefix;
};
