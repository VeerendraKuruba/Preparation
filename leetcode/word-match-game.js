/**
 * Word Match Game (Basic)
 *
 * You are given two strings of equal length:
 * - `secret`: target word
 * - `guess`: player's guess
 *
 * Return an object:
 * - `exact`: same character at same position
 * - `partial`: character exists in secret but at different position
 *
 * Example:
 * secret = "apple", guess = "alley"
 * exact = 1 ('a')
 * partial = 2 ('l', 'e')
 */
function wordMatchGame(secret, guess) {
  if (secret.length !== guess.length) {
    throw new Error("secret and guess must have the same length");
  }

  let exact = 0;
  const secretFreq = {};
  const guessFreq = {};

  // First pass: count exact matches and store unmatched chars
  for (let i = 0; i < secret.length; i++) {
    if (secret[i] === guess[i]) {
      exact++;
    } else {
      secretFreq[secret[i]] = (secretFreq[secret[i]] || 0) + 1;
      guessFreq[guess[i]] = (guessFreq[guess[i]] || 0) + 1;
    }
  }

  // Second pass: partial matches from frequency overlap
  let partial = 0;
  for (const ch in guessFreq) {
    if (secretFreq[ch]) {
      partial += Math.min(secretFreq[ch], guessFreq[ch]);
    }
  }

  return { exact, partial };
}

// Quick examples:
console.log(wordMatchGame("apple", "alley")); // { exact: 1, partial: 2 }
console.log(wordMatchGame("coded", "decoy")); // { exact: 0, partial: 4 }
console.log(wordMatchGame("hello", "hello")); // { exact: 5, partial: 0 }

