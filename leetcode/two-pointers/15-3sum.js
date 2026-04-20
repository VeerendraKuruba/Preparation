/**
 * 15. 3Sum — unique triplets that sum to 0. Sort + two pointers. O(n²), O(log n).
 */
var threeSum = function (nums) {
  const out = [];
  nums.sort((a, b) => a - b);

  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    if (nums[i] > 0) break; // rest are positive, no more triplets

    const target = -nums[i];
    let l = i + 1,
      r = nums.length - 1;

    while (l < r) {
      const sum = nums[l] + nums[r];
      if (sum === target) {
        out.push([nums[i], nums[l], nums[r]]);
        l++;
        r--;
        while (l < r && nums[l] === nums[l - 1]) l++;
        while (l < r && nums[r] === nums[r + 1]) r--;
      } else if (sum < target) l++;
      else r--;
    }
  }

  return out;
};

// Examples
console.log(threeSum([-1, 0, 1, 2, -1, -4])); // [[-1,-1,2],[-1,0,1]]
console.log(threeSum([0, 1, 1])); // []
console.log(threeSum([0, 0, 0])); // [[0,0,0]]
