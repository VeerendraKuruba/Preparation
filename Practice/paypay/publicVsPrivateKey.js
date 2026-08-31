/**
 * PayPay Japan SSE Frontend Interview
 * Public key vs private key encryption (asymmetric crypto)
 *
 * Quick mental model:
 *   - Public key  → anyone can have it; used to ENCRYPT or VERIFY
 *   - Private key → kept secret; used to DECRYPT or SIGN
 */

// =============================================================================
// Symmetric vs Asymmetric (context)
// =============================================================================
/**
 * Symmetric (AES, etc.):
 *   One shared secret key encrypts AND decrypts.
 *   Fast, but key distribution is hard — both sides need the same key safely.
 *
 * Asymmetric / Public-key (RSA, ECC):
 *   Key PAIR: public + private.
 *   What one key does, only the other undoes.
 *   Slower → often used to exchange a symmetric session key, then AES for data.
 */

// =============================================================================
// Public key vs Private key
// =============================================================================
/**
 * |                     | Public key              | Private key                |
 * |---------------------|-------------------------|----------------------------|
 * | Who has it?         | Anyone (shared freely)  | Only the owner             |
 * | Encrypt messages TO | Yes — encrypt with      | No                         |
 * | someone             |   their public key      |                            |
 * | Decrypt messages    | No                      | Yes — decrypt with private |
 * | Digital signature   | Verify with public key  | Sign with private key      |
 * | If leaked           | OK (expected)           | Compromised — revoke/rotate|
 */

// =============================================================================
// Two main flows interviewers expect
// =============================================================================
/**
 * 1) Confidentiality (encrypt a message for Bob)
 *    Alice encrypts with Bob's PUBLIC key
 *    → only Bob can decrypt with his PRIVATE key
 *
 *    Anyone can encrypt TO Bob; only Bob can read it.
 *
 * 2) Authenticity / integrity (digital signature)
 *    Alice signs with her PRIVATE key
 *    → anyone verifies with Alice's PUBLIC key
 *
 *    Proves "Alice wrote this" (assuming her private key is safe).
 *
 * HTTPS / TLS combines both:
 *   - Server proves identity via certificate (public key + CA signature)
 *   - Client & server negotiate a symmetric session key
 *   - Actual traffic encrypted with that symmetric key (speed)
 */

// =============================================================================
// Tiny analogy
// =============================================================================
/**
 * Public key  = open padlock anyone can snap shut on a box
 * Private key = the only key that opens that padlock
 *
 * Signature:
 *   Private key = unique wax seal only you own
 *   Public key  = stamp verifier anyone can use to check the seal is yours
 */

// =============================================================================
// Common pitfalls
// =============================================================================
/**
 * - Never encrypt large payloads with RSA directly — encrypt a random AES key
 *   with the public key, then encrypt data with AES (hybrid encryption).
 * - Public key encryption ≠ "more secure than private"; they serve different roles.
 * - "Private key encryption" in casual speech often means signing, not encrypting.
 * - Frontend: you may embed a public key; NEVER ship a private key in the browser.
 */

module.exports = {};
