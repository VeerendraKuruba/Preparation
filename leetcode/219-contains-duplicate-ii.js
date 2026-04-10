/**
 * 219. Contains Duplicate II
 *
 * Given an integer array nums and an integer k, return true if there are
 * two distinct indices i and j such that nums[i] == nums[j] and abs(i - j) <= k.
 *
 * Approach: Sliding Window using a Map
 * - Use a Map to store the last seen index of each number.
 * - For each number, check if it was seen before AND was within k distance.
 * - If yes, return true. Otherwise, update its latest index in the map.
 *
 * Time Complexity: O(n) — single pass through the array
 * Space Complexity: O(min(n, k)) — map holds at most k+1 entries at a time
 */

var containsNearbyDuplicate = function (nums, k) {
    // Map stores: number -> last index where it was seen
    const lastSeen = new Map();

    for (let i = 0; i < nums.length; i++) {
        const num = nums[i];

        if (lastSeen.has(num)) {
            // We've seen this number before — check if it was within k distance
            const prevIndex = lastSeen.get(num);

            if (i - prevIndex <= k) {
                // Found two same numbers within k index distance
                return true;
            }
        }

        // Update (or set for the first time) the latest index of this number.
        // We always store the most recent index so the next duplicate check
        // uses the closest possible previous occurrence.
        lastSeen.set(num, i);
    }

    // No valid duplicate pair found
    return false;
};

// --- Test Cases ---
console.log(containsNearbyDuplicate([1, 2, 3, 1], 3));       // true  — 1 at idx 0 and 3, diff = 3 <= 3
console.log(containsNearbyDuplicate([1, 0, 1, 1], 1));       // true  — 1 at idx 2 and 3, diff = 1 <= 1
console.log(containsNearbyDuplicate([1, 2, 3, 1, 2, 3], 2)); // false — 1 at idx 0 and 3, diff = 3 > 2
