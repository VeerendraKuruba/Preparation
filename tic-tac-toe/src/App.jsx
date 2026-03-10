import { useState } from 'react'
import './App.css'

/**
 * Board layout (indices 0–8):
 *   0 | 1 | 2
 *  ---+---+---
 *   3 | 4 | 5
 *  ---+---+---
 *   6 | 7 | 8
 *
 * WIN_LINES: every possible line of 3 cells that wins the game.
 * Each inner array is [index1, index2, index3] for a row, column, or diagonal.
 */
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows (top, middle, bottom)
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns (left, center, right)
  [0, 4, 8], [2, 4, 6],            // diagonals (top-left→bottom-right, top-right→bottom-left)
]

/**
 * Determines if there is a winner on the given board.
 * @param {Array<string|null>} board - Array of 9 cells: 'X', 'O', or null
 * @returns {'X'|'O'|null} - The winning player's symbol, or null if no winner
 */
function getWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    // Same non-null value in all three cells of this line → that player wins
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]
    }
  }
  return null
}

export default function App() {
  // Board: 9 cells, each is null (empty), 'X', or 'O'
  const [board, setBoard] = useState(Array(9).fill(null))
  // Who plays next: 'X' goes first
  const [currentPlayer, setCurrentPlayer] = useState('X')

  // Derived state: computed from board, not stored separately
  const winner = getWinner(board)
  const isDraw = !winner && board.every(Boolean)  // no winner and every cell filled
  const gameOver = !!winner || isDraw             // game ends on win or draw

  /**
   * Handles a click on a cell.
   * - Does nothing if game is over or cell is already taken.
   * - Otherwise places current player's symbol and switches turn (unless game just ended).
   */
  function handleCellClick(index) {
    if (gameOver || board[index]) return

    const nextBoard = [...board]
    nextBoard[index] = currentPlayer
    setBoard(nextBoard)

    // Switch to the other player only when the game continues (no win, and not a draw)
    const hasWinner = getWinner(nextBoard)
    const boardIsFull = nextBoard.every(Boolean)
    const gameContinues = !hasWinner && !boardIsFull
    if (gameContinues) {
      setCurrentPlayer((p) => (p === 'X' ? 'O' : 'X'))
    }
  }

  /** Resets board and current player for a new game. */
  function handleRestart() {
    setBoard(Array(9).fill(null))
    setCurrentPlayer('X')
  }

  // Message shown above the board
  const status = winner
    ? `Player ${winner} wins!`
    : isDraw
      ? "It's a draw!"
      : `Player ${currentPlayer}'s turn`

  return (
    <>
      <h1>Tic Tac Toe</h1>
      <div className="status">{status}</div>
      <div className="board">
        {board.map((value, index) => (
          <button
            key={index}
            type="button"
            className={`cell ${value ? `taken ${value.toLowerCase()}` : ''}`}
            onClick={() => handleCellClick(index)}
          >
            {value || ''}
          </button>
        ))}
      </div>
      <button className="restart" onClick={handleRestart}>
        Restart
      </button>
    </>
  )
}
