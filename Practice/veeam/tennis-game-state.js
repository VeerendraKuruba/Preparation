/**
 * Tennis Game State - CoderPad Question 6/6
 * computeGameState(nameP1, nameP2, wins) - Returns the current state of a tennis game.
 *
 * Tennis rules:
 * - First score = 15, Second = 30, Third = 40
 * - DEUCE when both have 40 (3+ points each, tied)
 * - ADVANTAGE when both scored 3+ times and one is ahead by 1
 * - WIN when 4+ points and 2 more than opponent (or from advantage, one more point)
 * - Tied scores before 40: "15a", "30a"
 */

const POINTS_MAP = { 0: '0', 1: '15', 2: '30', 3: '40' };

function computeGameState(nameP1, nameP2, wins) {
  let p1Score = 0, p2Score = 0;
  for (const winner of wins) {
    if (winner === nameP1) p1Score++;
    else if (winner === nameP2) p2Score++;
  }

  // Game won? (4+ points and lead by 2)
  if (p1Score >= 4 && p1Score - p2Score >= 2) return `${nameP1} WINS`;
  if (p2Score >= 4 && p2Score - p1Score >= 2) return `${nameP2} WINS`;

  // Both at 40+ → deuce or advantage
  if (p1Score >= 3 && p2Score >= 3) {
    const diff = p1Score - p2Score;
    if (diff === 1) return `${nameP1} ADVANTAGE`;
    if (diff === -1) return `${nameP2} ADVANTAGE`;
    return 'DEUCE';
  }

  // Regular score
  const p1 = POINTS_MAP[p1Score] ?? '40', p2 = POINTS_MAP[p2Score] ?? '40';
  // tied at 15 or 30 → "15a" or "30a"
  if (p1Score === p2Score && p1Score >= 1 && p1Score < 3) return `${p1}a`;
  // normal score → "nameP1 points - nameP2 points"
  return `${nameP1} ${p1} - ${nameP2} ${p2}`;
}

// Example from problem:
// computeGameState("Bob", "Anna", ["Bob", "Anna", "Bob"]) => "Bob 30 - Anna 15"

// Examples for line 36 (tied 15 or 30 → "Xa") and line 37 (normal "name score - name score"):
//   Line 36: wins = ['P1','P2']           → 1-1 → "15a"
//   Line 36: wins = ['P1','P2','P1','P2'] → 2-2 → "30a"
//   Line 37: wins = []                    → 0-0 → "Bob 0 - Anna 0"
//   Line 37: wins = ['P1']                → 1-0 → "P1 15 - P2 0"
//   Line 37: wins = ['Bob','Anna','Bob']  → 2-1 → "Bob 30 - Anna 15"

// Run examples when executed directly
if (require.main === module) {
  console.log(computeGameState('Bob', 'Anna', ['Bob', 'Anna', 'Bob'])); // "Bob 30 - Anna 15" (line 37)
  console.log(computeGameState('Bob', 'Anna', []));                        // "Bob 0 - Anna 0" (line 37)
  console.log(computeGameState('P1', 'P2', ['P1']));                      // "P1 15 - P2 0" (line 37)
  console.log(computeGameState('P1', 'P2', ['P1', 'P2']));                // "15a" (line 36: 1-1)
  console.log(computeGameState('P1', 'P2', ['P1', 'P2', 'P1', 'P2']));    // "30a" (line 36: 2-2)
  console.log(computeGameState('P1', 'P2', ['P1', 'P1', 'P1', 'P2', 'P2', 'P2'])); // "DEUCE"
  console.log(computeGameState('P1', 'P2', ['P1', 'P1', 'P1', 'P2', 'P2', 'P2', 'P1'])); // "P1 ADVANTAGE"

  // Win examples: 4+ points and lead by 2
  console.log(computeGameState('Bob', 'Anna', ['Bob', 'Bob', 'Bob', 'Bob'])); // "Bob WINS" (4-0)
  console.log(computeGameState('P1', 'P2', ['P2', 'P2', 'P1', 'P2', 'P1', 'P2'])); // "P2 WINS" (4-2)
}

module.exports = { computeGameState };
