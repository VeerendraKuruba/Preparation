/**
 * 60. Permutation Sequence
 * The set [1, 2, 3, ..., n] has n! permutations. Return the kth in lexicographic order.
 *
 * @param {number} n - 1..n
 * @param {number} k - 1-based index (1 <= k <= n!)
 * @return {string} - kth permutation e.g. "2314"
 */

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * FOR BEGINNERS (with diagrams)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * WHAT WE WANT
 * ------------
 * All permutations of 1,2,...,n are listed in "dictionary order". We want the k-th one.
 * Example: n=4 → 24 permutations. k=9 → we want the 9th string in that list ("2314").
 *
 * SIMPLE IDEA (no math first)
 * --------------------------
 * • Think of the list as a long line: [1st] [2nd] [3rd] ... [kth] ... [24th].
 * • We don't build the whole list. We only ask: "What is the FIRST digit of the k-th one?"
 * • All permutations that start with "1" sit in a block (positions 1–6). All that start
 *   with "2" sit in the next block (7–12), then "3" (13–18), then "4" (19–24).
 * • So: if k is between 7 and 12, the first digit must be "2". Then we ask the same
 *   question inside that block for the second digit, and so on.
 *
 * DIAGRAM 1: The list split into blocks by first digit (n = 4)
 *
 *   k:     1    2    3    4    5    6  |  7    8    9   10   11   12  | 13 ... 18 | 19 ... 24
 *          └────────── block "1xxx" ──────────┘  └──── block "2xxx" ────┘
 *          "1234" "1243" ... "1432"     "2134" "2143" "2314" ... "2431"
 *                                                    ▲
 *                                                    k=9 lives here → first digit is "2"
 *
 * Each block has the same size (6 = 3! because 3 digits can be arranged in 6 ways).
 *
 * DIAGRAM 2: After picking "2", we zoom into the "2xxx" block (k becomes "3rd in this block")
 *
 *   Inside "2xxx":  1st      2nd      3rd
 *                   "2134"   "2143"   "2314"  ...
 *                             ▲
 *                   Now we ask: what's the SECOND digit of the 3rd one? Options: 1, 3, 4.
 *                   Same idea: split into 3 mini-blocks of size 2 each → 3rd is in 2nd mini-block → "3".
 *
 * DIAGRAM 3: Tree view (n = 4, we want k = 9)
 *
 *                           [1,2,3,4]  (all 24 perms)
 *                          /    |    \   \
 *                    1xxx/  2xxx| 3xxx \4xxx
 *                   (k1-6) (k7-12)(13-18)(19-24)
 *                         \     /
 *                    k=9 is here → first digit = 2
 *
 *                    Then inside 2xxx (6 perms), we have k0=2 (0-based "3rd"):
 *                        21xx  23xx  24xx
 *                    (0-1) (2-3) (4-5)  → k0=2 is in 23xx → second digit = 3
 *
 *                    Then inside 23xx (2 perms), k0=0 → 231x → third digit = 1, last = 4.
 *                    Result: "2314".
 *
 * IN SHORT
 * --------
 * 1. How many permutations start with the same digit? = (n-1)! (e.g. 6 for n=4).
 * 2. Which "box" does k sit in?  box index = (k-1) / 6  →  pick that digit.
 * 3. What's k inside that box?  new k = (k-1) % 6  + 1  (or keep 0-based: k0 = k0 % 6).
 * 4. Repeat with one digit fixed and n reduced by 1.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * IDEA (compact)
 * ═══════════════════════════════════════════════════════════════════════════════
 */
/*
 * IDEA
 * -----
 * We build the answer one digit at a time, left to right, without generating all permutations.
 *
 * Key: If we have r digits left to place, then each choice for the "next" digit covers exactly r!
 * permutations. So we can ask: "Which block of r! does k fall into?" That block index tells us
 * which remaining digit to pick (in sorted order). Then we set k = position inside that block and repeat.
 *
 * Formula (using 0-based k0 = k - 1):
 *   blockSize = (remaining digits)! = fact[r]
 *   index     = k0 / blockSize   → which digit to pick from the list of remaining digits
 *   k0        = k0 % blockSize   → new k for the next step
 *
 * HOW SLOTS ARE FORMED (mathematical view)
 * ---------------------------------------
 * Total permutations in order: n!.
 * At slot i we have already placed i digits; r = n - 1 - i digits remain to place.
 *
 * • Block size: Fixing the next digit fixes the next (r) positions in all possible ways,
 *   so each choice of "next digit" corresponds to exactly r! permutations:
 *     blockSize = r! = (n - 1 - i)! = fact[n - 1 - i].
 *
 * • Number of blocks: We have (number of remaining digits) choices for the next slot.
 *   So we partition the k-axis into that many blocks of size r! each.
 *
 * • 1-based k: Block j (j = 0, 1, ...) contains permutations with ranks
 *     k ∈ [ j·r! + 1,  (j+1)·r! ].
 *   So: 1xxx → k∈[1,6],  2xxx → k∈[7,12],  3xxx → k∈[13,18],  4xxx → k∈[19,24].
 *
 * • 0-based k0 = k - 1: Block j contains
 *     k0 ∈ [ j·r!,  (j+1)·r! − 1 ].
 *   So which block?  index = j = ⌊ k0 / r! ⌋ = ⌊ k0 / blockSize ⌋.
 *   Position inside that block:  k0' = k0 mod r!  (for the next slot, with r' = r−1).
 *
 * So at each slot:  index = ⌊ k0 / (r!) ⌋,  then  k0 := k0 mod (r!),  r := r−1.
 *
 * EXAMPLE: n = 4, k = 9  →  we want the 9th permutation of [1,2,3,4].
 *
 * Lex order for n=4 (first 9): 1="1234", 2="1243", 3="1324", 4="1342", 5="1423", 6="1432",
 *                            7="2134", 8="2143", 9="2314", ...  So answer = "2314".
 *
 * Step-by-step:
 *   fact[] = [1, 1, 2, 6]   (0!, 1!, 2!, 3!)
 *   digits = [1, 2, 3, 4]
 *   k0     = k - 1 = 8
 *
 *   Slot 0: r = 3 digits left. blockSize = r! = 3! = 6. Blocks: j=0 → k0∈[0,5] (1xxx), j=1 → [6,11] (2xxx), ...
 *     index = ⌊ k0 / 6 ⌋ = ⌊ 8/6 ⌋ = 1  →  pick digits[1] = 2.  Result: "2"
 *     k0' = 8 mod 6 = 2  (position inside block "2xxx": 2134=0, 2143=1, 2314=2)
 *     digits = [1, 3, 4]
 *
 *   Slot 1 (second digit): 2 digits left → blockSize = fact[2] = 2
 *     index = 2/2 = 1  →  pick digits[1] = 3.  Result: "23"
 *     k0 = 2 % 2 = 0
 *     digits = [1, 4]
 *
 *   Slot 2 (third digit): 1 left → blockSize = fact[1] = 1
 *     index = 0/1 = 0  →  pick digits[0] = 1.  Result: "231"
 *     k0 = 0 % 1 = 0
 *     digits = [4]
 *
 *   Slot 3 (last digit): only 4 left → pick 4.  Result: "2314"  ✓
 */
function getPermutation(n, k) {
  // fact[i] = i!. At slot i we have (n-1-i) digits left → block size = fact[n-1-i]. Example n=4: [1,1,2,6].
  const fact = [1];
  for (let i = 1; i < n; i++) fact[i] = fact[i - 1] * i;

  // Sorted digits we can still use. Example n=4,k=9: [1,2,3,4] → after "2" → [1,3,4] → after "3" → [1,4] → after "1" → [4].
  const digits = Array.from({ length: n }, (_, i) => i + 1);

  // 0-based rank: k=9 → k0=8.
  let k0 = k - 1;
  let out = '';

  for (let i = 0; i < n; i++) {
    // (remaining digits)!  Example n=4: i=0→fact[3]=6, i=1→fact[2]=2, i=2→fact[1]=1, i=3→fact[0]=1.
    const size = fact[n - 1 - i];

    // Which block is k0 in? Example k=9: i=0 → idx=8/6=1→"2", i=1 → idx=2/2=1→"3", i=2 → idx=0→"1", i=3 → "4".
    const idx = Math.floor(k0 / size);

    out += digits[idx];

    digits.splice(idx, 1);

    // Position inside the block. Example k=9: 8%6=2 → 2%2=0 → 0%1=0.
    k0 %= size;
  }
  return out;
}

// Example: n=4, k=9 → "2314"
console.log(getPermutation(4, 9));   // "2314"
