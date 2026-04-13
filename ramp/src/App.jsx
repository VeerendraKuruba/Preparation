import { useState } from 'react';

const SECRET = 'SPEND';

/** Simplified Wordle coloring: exact position → green; else if letter appears in SECRET → yellow; else red. */
function cellBackground(letter, index) {
  if (letter === SECRET[index]) return 'green';
  if (SECRET.includes(letter)) return 'yellow';
  return 'red';
}

export default function App() {
  const [guesses, setGuesses] = useState([]);
  const [value, setValue] = useState('');
  const [outcome, setOutcome] = useState(null); // null | 'won' | 'lost'

  const playing = outcome === null;

  function submitGuess(e) {
    e.preventDefault();
    if (!playing) return;

    const guess = value.trim().toUpperCase();
    if (guess.length !== 5) return;

    const nextGuesses = [...guesses, guess];
    setGuesses(nextGuesses);
    setValue('');

    if (guess === SECRET) {
      setOutcome('won');
    } else if (nextGuesses.length === 5) {
      setOutcome('lost');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {Array.from({ length: 5 }, (_, row) => (
          <div key={row} style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: 5 }, (_, col) => {
              const word = guesses[row];
              const letter = word ? word[col] : '';
              const bg = letter ? cellBackground(letter, col) : '#e0e0e0';

              return (
                <div
                  key={col}
                  style={{
                    width: 36,
                    height: 36,
                    border: '1px solid #999',
                    backgroundColor: bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <form onSubmit={submitGuess} style={{ marginTop: 12 }}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          maxLength={5}
          disabled={!playing}
          aria-label="Guess"
        />
      </form>

      {outcome === 'won' && <p>You've won!</p>}
      {outcome === 'lost' && <p>You've lost!</p>}
    </div>
  );
}
