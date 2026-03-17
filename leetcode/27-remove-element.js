/**
 * 27. Remove Element
 * Remove all occurrences of val in-place. Return count of elements != val.
 * First k elements of nums must be the elements not equal to val.
 *
 * @param {number[]} nums
 * @param {number} val
 * @return {number}
 */
var removeElement = function (nums, val) {
  let k = 0;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== val) {
      nums[k++] = nums[i];
    }
  }
  return k;
};
