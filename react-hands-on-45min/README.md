# React Hands-on — 45 Min Coding Round Prep

24 components organised as individual folders. Each folder has:
- `index.jsx` — clean solution code with inline comments explaining the WHY
- `README.md` — what to build, how to think about it, key concepts, interview Q&A

---

## How to use

1. Open a folder's `README.md` first — understand the problem before coding
2. Try to solve it yourself in 30–45 min
3. Compare with `index.jsx` and check the interview Q&A at the bottom of the README

---

## All 24 Components

### Basic UI (start here)

| # | Folder | What it tests |
|---|--------|---------------|
| 01 | [01-progress-bar](./01-progress-bar/) | Pure/stateless component, derived value, ARIA |
| 02 | [02-star-rating](./02-star-rating/) | Controlled component, hover vs committed state, `??` operator |
| 03 | [03-accordion](./03-accordion/) | Set for open state, single vs multi mode, conditional render |
| 04 | [04-tabs](./04-tabs/) | Roving tabIndex, keyboard navigation, ARIA tablist |
| 05 | [05-modal](./05-modal/) | Portal, focus management, scroll lock, Escape key |

### Forms

| # | Folder | What it tests |
|---|--------|---------------|
| 06 | [06-multi-step-form](./06-multi-step-form/) | Step index, spread to preserve data across steps |
| 07 | [07-form-builder](./07-form-builder/) | Data-driven UI, field config array, validate on submit |
| 08 | [08-searchable-dropdown](./08-searchable-dropdown/) | Keyboard nav, ARIA combobox, blur-before-click fix |
| 09 | [09-multi-step-form-validation](./09-multi-step-form-validation/) | Touched pattern, per-step validation, noValidate |

### Data & Lists

| # | Folder | What it tests |
|---|--------|---------------|
| 10 | [10-shopping-cart](./10-shopping-cart/) | CRUD, derived total with useMemo, Intl.NumberFormat |
| 11 | [11-todo-app](./11-todo-app/) | Full CRUD, derived filter, double-click edit, stable IDs |
| 12 | [12-data-table](./12-data-table/) | useMemo sort, spread before sort, cursor pagination |
| 13 | [13-infinite-scroll](./13-infinite-scroll/) | IntersectionObserver, sentinel div, useRef guard |
| 14 | [14-virtualized-list](./14-virtualized-list/) | Only render visible rows, translateY, total height spacer |

### Interaction & Media

| # | Folder | What it tests |
|---|--------|---------------|
| 15 | [15-image-carousel](./15-image-carousel/) | Circular modulo, ARIA live region, dot indicators |
| 16 | [16-drag-and-drop](./16-drag-and-drop/) | HTML5 drag API, onDragOver preventDefault, immutable reorder |
| 17 | [17-stopwatch-timer](./17-stopwatch-timer/) | requestAnimationFrame vs setInterval, useRef for timing |
| 18 | [18-search-debounce](./18-search-debounce/) | Debounce with useEffect, AbortController for stale requests |
| 19 | [19-dark-mode](./19-dark-mode/) | Context, localStorage, matchMedia, data-theme on root |

### Advanced Patterns

| # | Folder | What it tests |
|---|--------|---------------|
| 20 | [20-modal-system](./20-modal-system/) | Context for global state, modal stack, Portal |
| 21 | [21-toast-system](./21-toast-system/) | Auto-dismiss, useRef for timers, ARIA live region |
| 22 | [22-file-upload](./22-file-upload/) | XHR (not fetch) for upload progress, FormData |
| 23 | [23-tabs-lazy](./23-tabs-lazy/) | React.lazy, dynamic import, Suspense, code splitting |
| 24 | [24-file-explorer](./24-file-explorer/) | Recursive component, centralised Set state |

---

## Bonus

| Project | What it is |
|---------|-----------|
| [tic-tac-toe](./tic-tac-toe/) | Complete Vite + React app — game logic, derived winner, restart |

---

## Quick concept lookup

| Concept | Where to see it |
|---------|----------------|
| `useRef` (not useState) for non-rendering values | 17, 21, 13 |
| Derived state with `useMemo` | 10, 11, 12, 08 |
| Context API | 19, 20, 21 |
| Portal (`createPortal`) | 05, 20, 21 |
| ARIA accessibility | 01, 02, 03, 04, 05, 08, 15, 22 |
| AbortController | 18 |
| IntersectionObserver | 13 |
| requestAnimationFrame | 17 |
| Recursive component | 24 |
| React.lazy + Suspense | 23 |
| HTML5 Drag API | 16 |
| Controlled component | 02, 06, 07, 08, 09 |
| Optimistic UI / CRUD | 10, 11 |
