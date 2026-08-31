/**
 * Veeam CoderPad — all solutions in one place
 *
 * Q1 CSS class description (MCQ)
 * Q2 MyClass / prototype (MCQ)
 * Q3 convertToIntegers
 * Q4–Q5 ListUsers (React)
 * Q6 computeGameState (tennis)
 */

// =============================================================================
// Q1 — Describe an element with this CSS class (multiple answers)
// =============================================================================
/*
.example {
  display: block;
  width: 50%;
  background: blue;
  margin: 10px auto;
  border: solid 3px rgba(255, 100, 100, 0);
  background-color: #A00;
}
*/

const cssClassAnswers = [
  'red background', // background-color: #A00 overrides background: blue
  'invisible border', // rgba(..., 0) → alpha 0, transparent
  'horizontally centered', // margin: 10px auto on block + width
];

// Wrong: light-red border, blue background, blue text, vertically centered, invalid rules

// =============================================================================
// Q2 — MyClass prototype: which are true? (multiple answers)
// =============================================================================
/*
MyClass = function () {
  this.a = 'hello';
  this.b = 'world';
};
MyClass.prototype.a = 2;
MyClass.prototype.c = 12;
obj = new MyClass();
*/

const prototypeAnswers = [
  'obj.b returns "world"', // own property from constructor
  'obj.c returns 12', // looked up on MyClass.prototype
  'obj.a returns "hello"', // own property shadows prototype.a (= 2)
];

// Wrong: obj.a returns 2, obj.c returns undefined, obj.b returns undefined
// Note: missing props are undefined (not null)

// =============================================================================
// Q3 — convertToIntegers (keep Array.map)
// Bug: strings.map(parseInt) passes (value, index) → index becomes radix
// =============================================================================

function convertToIntegers(strings) {
  if (strings == null) return null;
  return strings.map((s) => parseInt(s, 10));
}

// =============================================================================
// Q4 / Q5 — ListUsers React component
// - Users: N in data-testid="user-count"
// - ul data-testid="user-list" with li "FirstName LastName" only if users.length > 0
// - Q5: sort alphabetically by lastName (case-insensitive); key={lastName}
// =============================================================================

// Paste this JSX into CoderPad:
/*
function ListUsers({ users = [] }) {
  const sortedUsers = [...users].sort((a, b) =>
    a.lastName.toLowerCase().localeCompare(b.lastName.toLowerCase())
  );

  return (
    <div>
      <div data-testid="user-count">Users: {users.length}</div>
      {sortedUsers.length > 0 && (
        <ul data-testid="user-list">
          {sortedUsers.map((user) => (
            <li key={user.lastName}>
              {user.firstName} {user.lastName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ListUsers;
*/

/** Reference implementation notes (see JSX comment above for CoderPad paste). */
function listUsersNotes() {
  return {
    defaultUsers: [],
    countTestId: 'user-count',
    listTestId: 'user-list',
    sortBy: 'lastName (case-insensitive)',
    empty: 'no ul/li when users.length === 0',
    key: 'lastName',
  };
}

// =============================================================================
// Q6 — Tennis game state
// =============================================================================

const POINTS_MAP = { 0: '0', 1: '15', 2: '30', 3: '40' };

function computeGameState(nameP1, nameP2, wins) {
  let p1Score = 0;
  let p2Score = 0;
  for (const winner of wins) {
    if (winner === nameP1) p1Score++;
    else if (winner === nameP2) p2Score++;
  }

  if (p1Score >= 4 && p1Score - p2Score >= 2) return `${nameP1} WINS`;
  if (p2Score >= 4 && p2Score - p1Score >= 2) return `${nameP2} WINS`;

  if (p1Score >= 3 && p2Score >= 3) {
    const diff = p1Score - p2Score;
    if (diff === 1) return `${nameP1} ADVANTAGE`;
    if (diff === -1) return `${nameP2} ADVANTAGE`;
    return 'DEUCE';
  }

  const p1 = POINTS_MAP[p1Score] ?? '40';
  const p2 = POINTS_MAP[p2Score] ?? '40';
  if (p1Score === p2Score && p1Score >= 1 && p1Score < 3) return `${p1}a`;
  return `${nameP1} ${p1} - ${nameP2} ${p2}`;
}

// =============================================================================
// Quick checks (Node — skip ListUsers; needs JSX/React)
// =============================================================================

if (typeof require !== 'undefined' && require.main === module) {
  console.log('Q1 CSS:', cssClassAnswers);
  console.log('Q2 prototype:', prototypeAnswers);
  console.log('Q3:', convertToIntegers(['4', '7', '12'])); // [4, 7, 12]
  console.log('Q6:', computeGameState('Bob', 'Anna', ['Bob', 'Anna', 'Bob'])); // Bob 30 - Anna 15
}

module.exports = {
  cssClassAnswers,
  prototypeAnswers,
  convertToIntegers,
  listUsersNotes,
  computeGameState,
};
