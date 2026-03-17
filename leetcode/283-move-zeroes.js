/**
 * 283. Move Zeroes
 * Move all 0's to the end while maintaining relative order of non-zero elements.
 * In-place.
 *
 * @param {number[]} nums
 * @return {void} Do not return anything, modify nums in-place.
 */
var moveZeroes = function (nums) {
  let write = 0; // next index to place a non-zero

  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== 0) {
      [nums[write], nums[i]] = [nums[i], nums[write]];
      write++;
    }
  }
};

// --- tests ---

function test(name, nums, expected) {
  moveZeroes(nums);
  const ok = JSON.stringify(nums) === JSON.stringify(expected);
  console.log(ok ? "✓" : "✗", name, ok ? "" : `got ${JSON.stringify(nums)}`);
}

test("Example 1", [0, 1, 0, 3, 12], [1, 3, 12, 0, 0]);
test("Example 2", [0], [0]);
test("No zeros", [1, 2, 3], [1, 2, 3]);
test("All zeros", [0, 0, 0], [0, 0, 0]);
