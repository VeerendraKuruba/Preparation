import { useState } from 'react'
import './App.css'

/**
 * Board: 3×3 matrix — board[row][col] is null | 'X' | 'O'
 *
 *   col →  0     1     2
 * row 0  [ _ ] [ _ ] [ _ ]
 * row 1  [ _ ] [ _ ] [ _ ]
 * row 2  [ _ ] [ _ ] [ _ ]
 */
const EMPTY_BOARD = () => Array.from({ length: 3 }, () => Array(3).fill(null))

/** Returns false if out-of-bounds or the cell is already occupied. */
function isValidMove(board, row, col) {
  return row >= 0 && row < 3 && col >= 0 && col < 3 && board[row][col] === null
}

/** Checks all 3 rows, 3 columns, and 2 diagonals. Returns 'X', 'O', or null. */
function getWinner(board) {
  // Rows
  for (let r = 0; r < 3; r++) {
    if (board[r][0] && board[r][0] === board[r][1] && board[r][0] === board[r][2]) {
      return board[r][0]
    }
  }
  // Columns
  for (let c = 0; c < 3; c++) {
    if (board[0][c] && board[0][c] === board[1][c] && board[0][c] === board[2][c]) {
      return board[0][c]
    }
  }
  // Top-left → bottom-right diagonal
  if (board[0][0] && board[0][0] === board[1][1] && board[0][0] === board[2][2]) {
    return board[0][0]
  }
  // Top-right → bottom-left diagonal
  if (board[0][2] && board[0][2] === board[1][1] && board[0][2] === board[2][0]) {
    return board[0][2]
  }
  return null
}

/** Draw: every cell is filled and there is no winner. */
function isDraw(board, winner) {
  return !winner && board.every(row => row.every(Boolean))
}

export default function App() {
  const [board, setBoard] = useState(EMPTY_BOARD)
  const [currentPlayer, setCurrentPlayer] = useState('X')

  const winner = getWinner(board)
  const draw = isDraw(board, winner)
  const gameOver = !!winner || draw

  function handleCellClick(row, col) {
    if (gameOver || !isValidMove(board, row, col)) return

    const nextBoard = board.map((r, ri) =>
      r.map((cell, ci) => (ri === row && ci === col ? currentPlayer : cell))
    )
    setBoard(nextBoard)

    const nextWinner = getWinner(nextBoard)
    const boardFull = nextBoard.every(r => r.every(Boolean))
    if (!nextWinner && !boardFull) {
      setCurrentPlayer(p => (p === 'X' ? 'O' : 'X'))
    }
  }

  function handleRestart() {
    setBoard(EMPTY_BOARD())
    setCurrentPlayer('X')
  }

  const status = winner
    ? `Player ${winner} wins!`
    : draw
      ? "It's a draw!"
      : `Player ${currentPlayer}'s turn`

  return (
    <>
      <h1>Tic Tac Toe</h1>
      <div className="status">{status}</div>
      <div className="board">
        {board.map((row, ri) =>
          row.map((cell, ci) => (
            <button
              key={`${ri}-${ci}`}
              type="button"
              className={`cell ${cell ? `taken ${cell.toLowerCase()}` : ''}`}
              onClick={() => handleCellClick(ri, ci)}
            >
              {cell || ''}
            </button>
          ))
        )}
      </div>
      <button className="restart" onClick={handleRestart}>
        Restart
      </button>
    </>
  )
}
