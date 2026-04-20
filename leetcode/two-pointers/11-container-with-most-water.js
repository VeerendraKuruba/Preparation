/**
 * 11. Container With Most Water
 * Find two lines that with the x-axis form a container holding the most water.
 *
 * Approach: Two pointers
 * - Left at start, right at end.
 * - Area between (left, right) = min(height[left], height[right]) * (right - left).
 * - Update max area, then move the pointer at the *shorter* line inward.
 *   (The shorter line limits the area; moving it might find a taller line and improve.)
 *
 * Example: height = [1,8,6,2,5,4,8,3,7]
 *   left=0, right=8: area = min(1,7)*8 = 8, max=8, left++ (1 is shorter)
 *   left=1, right=8: area = min(8,7)*7 = 49, max=49, right--
 *   ... eventually max stays 49.
 *
 * Time: O(n), Space: O(1)
 *
 * @param {number[]} height
 * @return {number}
 */
var maxArea = function (height) {
  let left = 0;
  let right = height.length - 1;
  let maxArea = 0;

  while (left < right) {
    const width = right - left;
    const h = Math.min(height[left], height[right]);
    const area = h * width;
    maxArea = Math.max(maxArea, area);

    if (height[left] < height[right]) {
      left++;
    } else {
      right--;
    }
  }

  return maxArea;
};

// Example
console.log(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7])); // 49
console.log(maxArea([1, 1])); // 1
