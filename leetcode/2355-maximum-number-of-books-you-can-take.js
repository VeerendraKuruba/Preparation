/**
 * 2355. Maximum Number of Books You Can Take
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHAT THE QUESTION IS ASKING (in plain English)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Imagine a row of shelves: shelf 0, shelf 1, shelf 2, ... Each shelf has some
 * number of books. You must pick ONE CONTIGUOUS BLOCK of shelves (e.g. shelves
 * 2, 3, 4 — you cannot skip shelf 3 and take from 2 and 4 only).
 *
 * From each shelf in that block you decide HOW MANY books to take (you don't
 * have to take all of them). But there are two rules:
 *
 *   Rule 1: From shelf i you can take at most books[i] books (you can't take
 *           more than what's on the shelf).
 *
 *   Rule 2: The counts must be STRICTLY INCREASING as you go left to right.
 *           So: (books taken from shelf i) < (books taken from shelf i+1).
 *
 * Your goal: choose a contiguous block and the number of books to take from each
 * shelf in that block (satisfying both rules) so that the TOTAL number of books
 * you take is as large as possible.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * RULES SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * • Contiguous: you pick indices L, L+1, ..., R (no gaps).
 * • From shelf i you take 0 to books[i] books (inclusive).
 * • If you take a from shelf i and b from shelf i+1, then a < b (strictly less).
 * • Maximize: (sum of books taken over your chosen block).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SIMPLE WORKED EXAMPLE: books = [10, 5, 8]
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   Shelf:           0    1    2
 *   Books on shelf: 10    5    8
 *
 * You can pick any contiguous block and decide how many to take from each shelf,
 * as long as: (1) from shelf i you take ≤ books[i], and (2) counts are strictly
 * increasing left to right.
 *
 * • Only shelf 0: take 10 → sum = 10.
 * • Only shelf 1: take 5 → sum = 5.
 * • Only shelf 2: take 8 → sum = 8.
 * • Shelves 0,1: need a < b, a≤10, b≤5. So b is at most 5, a at most 4. Best: 4+5=9.
 * • Shelves 1,2: need a < b, a≤5, b≤8. Best: 5+8=13.
 * • Shelves 0,1,2: need a < b < c with a≤10, b≤5, c≤8. So b≤5, c≤8, a<b so a≤4.
 *   Best: take 4, 5, 8 → sum = 17. (Or 3,5,8=16 or 4,5,6=15; 17 is best.)
 *
 * Answer for [10,5,8] is 17. So the idea: pick a contiguous segment, assign
 * strictly increasing "take" amounts under each shelf's cap, maximize the sum.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXAMPLE 2: books = [7, 0, 3, 4, 5]
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   Shelf 1 has 0 books — so you can only take 0 from it. That means any segment
 *   that includes shelf 1 can only have 0 there, so the "strictly increasing"
 *   chain cannot continue past shelf 1 (nothing is strictly greater than 0 in
 *   a useful way if we need to grow). So we look at segments that avoid or end at 0.
 *
 *   Best segment: shelves 2, 3, 4. Take 3, 4, 5 (each at cap). Sum = 12. ✓
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHY "STRICTLY INCREASING"?
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The problem wants the number of books you take to form an increasing sequence
 * as you move right. So from the first shelf in your block you take fewer books
 * than from the next, and so on. So the "take counts" look like: k, k+1, k+2, ...
 * (or some strictly increasing sequence) within the limits of each shelf. To
 * maximize the sum for a given segment, you want to take as many as possible
 * from the rightmost shelf (subject to cap), then work backwards with each
 * shelf taking 1 less than the next. That's what the formula in the solution
 * does: for a segment ending at i, we decide how many we take from i (at most
 * books[i]), then the previous shelf must take that minus 1, etc., and we
 * check if the leftmost shelf in the segment can support its required count.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOLUTIONS & TIME COMPLEXITIES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Solution 1 — Simple (maximumBooksSimple)
 *   Time:  O(n²) — for each of n right ends, scan left until invalid.
 *   Space: O(1)
 *
 * Solution 2 — Optimal (maximumBooks)
 *   Time:  O(n) — one pass; monotonic stack finds leftmost valid start per i.
 *   Space: O(n) — dp[] and stack.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Solution 1: Simple — O(n²) time, O(1) space
// ─────────────────────────────────────────────────────────────────────────────
/**
 * SIMPLE APPROACH (O(n²))
 *
 * 1. Fix the RIGHT end of the segment: "Suppose the segment ends at shelf i."
 *
 * 2. To maximize the sum, take as many as possible from the rightmost shelf (i),
 *    then one less from the next shelf left, and so on — but never more than
 *    what's on each shelf. So:
 *      - From shelf i   → take = books[i]
 *      - From shelf i-1 → take = min(books[i-1], books[i] - 1)  (strictly less than shelf i)
 *      - From shelf i-2 → take = min(books[i-2], previous_take - 1)
 *      - ... keep going left until we'd have to take 0 or less → then stop.
 *
 * 3. Add up all the "take" values in this segment. That's one candidate total.
 *
 * 4. Try every shelf as the right end (i = 0, 1, ..., n-1). The answer is the
 *    maximum of all those candidate totals.
 *
 * Example: books = [10, 5, 8], use shelf 2 as right end:
 *   Shelf 2: take 8. Shelf 1: min(5, 8-1)=5. Shelf 0: min(10, 5-1)=4.
 *   Sum = 8+5+4 = 17.
 *
 * @param {number[]} books
 * @return {number}
 */
function maximumBooksSimple(books) {
  const n = books.length;
  let best = 0;

  for (let i = 0; i < n; i++) {
    // Right end of segment is shelf i. Take all from shelf i.
    let take = books[i];
    let sum = take;

    // Extend left: each shelf must take strictly less than the one to its right.
    for (let j = i - 1; j >= 0; j--) {
      take = Math.min(books[j], take - 1); // cap by shelf, and must be < previous
      if (take < 1) break;                  // can't take 0 and keep increasing
      sum += take;
    }

    best = Math.max(best, sum);
  }
  return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// Solution 2: Optimal — O(n) time, O(n) space
// ─────────────────────────────────────────────────────────────────────────────
/**
 * LINE-BY-LINE EXPLANATION (example: books = [10, 5, 8])
 *
 * We process each index i as the RIGHT END of a segment. For each i we need:
 *   - "left" = index of the shelf just BEFORE our segment (or -1 if we start at 0).
 *   - On segment [left+1 .. i] we take: first, first+1, ..., books[i] (strictly increasing).
 *   - "first" = books we take from shelf (left+1). To fit: first, first+1, ..., books[i]
 *     we need first = books[i] - (number of shelves) + 1 = books[i] - len + 1.
 *
 * The rule for "left": we can extend our segment back to include shelf "left" only if
 * the amount we'd assign to shelf left (which is first - 1) is ≤ books[left], and
 * we want left to be the RIGHTMOST index we cannot include (so our segment starts at left+1).
 * So we need: (amount at left) = first - 1 = books[i] - len = books[i] - (i - left).
 * We cannot include left if that would require taking more than books[left] at left,
 * i.e. if books[left] >= books[i] - (i - left). So we pop until we find left with
 * books[left] < books[i] - (i - left).
 *
 * ─── i = 0 ───
 *   stack = []. After while: stack still []. left = -1, len = 0 - (-1) = 1.
 *   first = books[0] - 1 + 1 = 10. first > 1 → segmentSum = (10+10)*1/2 = 10.
 *   dp[0] = 10 + 0 = 10. stack = [0].
 *
 * ─── i = 1 ───
 *   Top = 0. books[0]=10 >= books[1]-(1-0)=5? 10 >= 5 → pop. stack = [].
 *   left = -1, len = 1 - (-1) = 2. first = 5 - 2 + 1 = 4. segmentSum = (4+5)*2/2 = 9.
 *   dp[1] = 9. stack = [1].
 *
 * ─── i = 2 ───
 *   Top = 1. books[1]=5 >= books[2]-(2-1)=7? 5 >= 7? No → break. left = 1, len = 2-1 = 1.
 *   first = 8 - 1 + 1 = 8. segmentSum = (8+8)*1/2 = 8. dp[2] = 8 + dp[1] = 8 + 9 = 17.
 *   stack = [1, 2]. Answer = max(10, 9, 17) = 17.
 */
function maximumBooks(books) {
  const n = books.length;
  // dp[i] = max total books we can take from shelves 0..i when we MUST take all of books[i] at shelf i
  const dp = new Array(n).fill(0);
  // Stack holds indices that are valid "left" boundaries. When we process i, we pop indices
  // that cannot be the shelf just before our segment (they'd force us to take too many at that shelf).
  const stack = [];

  for (let i = 0; i < n; i++) {
    // Find left = rightmost index we CANNOT include in our segment. Our segment will be (left+1)..i.
    // We can include shelf "left" only if the books we'd take there (books[i] - (i - left)) are
    // at most books[left], i.e. books[left] >= books[i] - (i - left) means we CANNOT extend
    // past left (we'd need to take more than books[left] at left). So we pop while
    // books[top] >= books[i] - (i - top). When we stop, top is our "left" (or stack is empty → left = -1).
    while (stack.length > 0) {
      const left = stack[stack.length - 1];
      if (books[left] < books[i] - (i - left)) break;
      stack.pop();
    }

    const left = stack.length > 0 ? stack[stack.length - 1] : -1;
    // Segment has shelves from (left+1) to i inclusive → len = i - left
    const len = i - left;

    // On this segment we take: first, first+1, ..., books[i] (len terms). first = books[i] - len + 1.
    const first = books[i] - len + 1;
    // Sum = first + (first+1) + ... + books[i] = (first + books[i]) * len / 2. If first <= 1 we use 1+2+...+books[i].
    const segmentSum = first > 1
      ? ((first + books[i]) * len) / 2
      : (books[i] * (books[i] + 1)) / 2;

    // Best total ending at i = books from this segment + best total ending at "left" (if any).
    dp[i] = segmentSum + (left >= 0 ? dp[left] : 0);
    stack.push(i);
  }

  return Math.max(...dp);
}

// Tests (simple O(n²) and optimal O(n) match)
const examples = [
  [8, 5, 2, 7, 9],
  [7, 0, 3, 4, 5],
  [8, 2, 3, 7, 3, 4, 0, 1, 4, 3],
];
examples.forEach((arr) => {
  console.log(maximumBooksSimple(arr), maximumBooks(arr));
});
// 19 19, 12 12, 13 13
