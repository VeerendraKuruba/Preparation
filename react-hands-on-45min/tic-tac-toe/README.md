# Tic Tac Toe (React – Interview)

Simple Tic Tac Toe built with React and Vite.

**Parent:** [React hands-on exercises](../README.md) · [Repository root](../../README.md)

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Structure

Single file: **`App.jsx`** – state (`board`, `currentPlayer`), `getWinner`, board grid (9 buttons), `handleCellClick`, `handleRestart`. `gameOver` and status are derived from `board`.

## Interview talking points

- **State**: `useState` for board (array of 9), currentPlayer, gameOver
- **Lifting state**: Game state in App; Board and Cell receive props and callbacks
- **Immutability**: `setBoard([...board])` when updating a cell
- **Win check**: 8 lines (3 rows, 3 cols, 2 diagonals); same value in all three → winner
- **Draw**: All 9 cells filled and no winner
