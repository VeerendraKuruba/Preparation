/**
 * 26. Remove Duplicates from Sorted Array
 * Remove duplicates in-place so each unique element appears once.
 * First k elements of nums = unique elements in sorted order. Return k.
 *
 * Example: nums = [1, 1, 2, 2, 3]
 *
 *   k = 1 (first element 1 is unique; "unique region" is nums[0..0])
 *
 *   i=1: nums[1]=1, nums[k-1]=nums[0]=1 → same, skip
 *   i=2: nums[2]=2, nums[k-1]=1 → different → nums[1]=2, k=2
 *   i=3: nums[3]=2, nums[k-1]=2 → same, skip
 *   i=4: nums[4]=3, nums[k-1]=2 → different → nums[2]=3, k=3
 *
 *   First k=3 elements: [1, 2, 3]. Return 3.
 *
 * @param {number[]} nums - Sorted in non-decreasing order
 * @return {number}
 */
var removeDuplicates = function (nums) {
  if (nums.length === 0) return 0;
  let k = 1; // first element is always unique
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== nums[k - 1]) {
      nums[k++] = nums[i];
    }
  }
  return k;
};


// Using Set: collect uniques (insertion order = first-seen order, so sorted for sorted input)
// Then write back into nums. O(n) time, O(n) extra space.
var removeDuplicatesSet = function (nums) {
  const unique = new Set(nums);
  let i = 0;
  for (const val of unique) {
    nums[i++] = val;
  }
  return unique.size;
};
