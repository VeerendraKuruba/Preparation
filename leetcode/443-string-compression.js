/**
 * 443. String Compression
 *
 * Example walkthrough: chars = ["a","a","b","b","c","c","c"]
 *
 * Start: read = 0, write = 0. Array unchanged.
 *
 * --- Outer loop 1 (run of "a") ---
 * letter = "a". Inner loop: read advances 0→1→2, runLength = 2 (both a's).
 * read is now 2 (points at first "b"). Write "a" at write 0 → write = 1.
 * runLength > 1 → write digit "2" at index 1 → write = 2.
 * Prefix so far: [ "a", "2", ... ] (indices 0–1 are final; rest still old input).
 *
 * --- Outer loop 2 (run of "b") ---
 * letter = "b" at chars[2]. Inner loop: read 2→3→4, runLength = 2.
 * Write "b" at write 2 → write = 3. Write "2" at index 3 → write = 4.
 * Prefix: [ "a", "2", "b", "2", ... ].
 *
 * --- Outer loop 3 (run of "c") ---
 * letter = "c" at chars[4]. Inner loop: read 4→5→6→7, runLength = 3.
 * Write "c" at write 4 → write = 5. runLength > 1 → write "3" at index 5 → write = 6.
 * Prefix: [ "a", "2", "b", "2", "c", "3" ]. read === n → exit.
 *
 * Return write = 6 (new length). Cells after index 5 are ignored.
 *
 * @param {character[]} chars
 * @return {number}
 */
var compress = function (chars) {
  const n = chars.length;
  let write = 0; // next index in chars where we write the compressed result
  let read = 0; // next index to read from the original (unconsumed) suffix

  while (read < n) {
    // First cell of this consecutive group (e.g. the first "a" in "aa")
    const letter = chars[read];
    let runLength = 0;
    // Consume the whole run: same letter repeated in a row
    while (read < n && chars[read] === letter) {
      read++;
      runLength++;
    }

    // Every group outputs the letter once
    chars[write++] = letter;
    // Problem rule: length 1 → letter only; length 2+ → letter then count digits
    if (runLength > 1) {
      for (const digit of String(runLength)) {
        chars[write++] = digit;
      }
    }
  }

  return write;
};
