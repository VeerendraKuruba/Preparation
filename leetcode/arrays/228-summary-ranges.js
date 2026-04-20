// Approach 1: while loop
var summaryRanges = function(nums) {
    const result = [];
    let i = 0;

    while (i < nums.length) {
        let start = nums[i];
        while (i + 1 < nums.length && nums[i + 1] === nums[i] + 1) {
            i++;
        }
        result.push(start === nums[i] ? `${start}` : `${start}->${nums[i]}`);
        i++;
    }

    return result;
};

// Approach 2: for loop with start tracking
var summaryRanges2 = function(nums) {
    const result = [];
    let start = nums[0];

    for (let i = 1; i <= nums.length; i++) {
        if (i < nums.length && nums[i] === nums[i - 1] + 1) continue;

        if (nums[i - 1] !== start) {
            result.push(start + "->" + nums[i - 1]);
        } else {
            result.push("" + start);
        }
        start = nums[i];
    }

    return result;
};
