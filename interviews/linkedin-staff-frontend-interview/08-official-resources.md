# Official LinkedIn Prep Resources — Mapped Study Guide

> LinkedIn sends candidates three resource categories. This file maps each to **concrete sections and repo exercises**.

---

## 1. Front End Interview Questions

**Primary URL:** [Frontend Interview Handbook](https://www.frontendinterviewhandbook.com/)

**LinkedIn-specific page:** [LinkedIn Front End Interview Questions](https://www.frontendinterviewhandbook.com/companies/linkedin-front-end-interview-questions)

### High-priority sections for Round 1

| Handbook section | LinkedIn relevance | Local practice |
|------------------|-------------------|----------------|
| JavaScript coding | `getElementsByClassName`, DOM utilities | [practice/getElementsByClassName.js](./practice/getElementsByClassName.js) |
| Quiz questions | Event delegation, closures, bubbling/capturing | [01-javascript-internals.md](./01-javascript-internals.md), [02-html-css-a11y.md](./02-html-css-a11y.md) |
| UI coding | Tooltip, top nav bar | [practice/ui-module-from-mockup.html](./practice/ui-module-from-mockup.html) |
| Algorithms | Reverse doubly-linked list, easy LC | [03-coding-practice.md](./03-coding-practice.md) |

### Confirmed insider tips (Handbook community)

- FE quiz: event delegation, closures, memoize I+II
- Infinite scroll with fetch/pagination — plain JS, throttle optimization
- JS/HTML trivia + **LeetCode easy** for phone screen
- Study: tic-tac-toe, autocomplete patterns

---

## 2. Frontend Interview Cheatsheet

**Primary URL:** [github.com/tmdautov/frontend-interview-cheatsheet](https://github.com/tmdautov/frontend-interview-cheatsheet)

> LinkedIn note: "These quizzes are much more fussy than the interview — but concepts behind correct answers are valuable."

### JS theory — drill daily

| Cheatsheet topic | Local file |
|------------------|------------|
| Hoisting, closure, event loop | [01-javascript-internals.md](./01-javascript-internals.md) |
| var / let / const | [practice/guess-the-output.js](./practice/guess-the-output.js) |
| Browser render pipeline | [02-html-css-a11y.md](./02-html-css-a11y.md) |

### JS problems — implement from memory

| Cheatsheet problem | Repo solution |
|--------------------|---------------|
| Debounce | [javascript-machine-coding/01-debounce-throttle.js](../../javascript-machine-coding/01-debounce-throttle.js) |
| Throttle | Same file |
| Flatten array | [Practice/flatten.js](../../Practice/) — or implement fresh |
| Implement `map` / `forEach` | Implement in CoderPad practice |
| Spy decorator | Closure pattern — [01-javascript-internals.md](./01-javascript-internals.md) |

### HTML & CSS — quick fire

| Cheatsheet topic | Answer location |
|------------------|-----------------|
| Center a div | [02-html-css-a11y.md](./02-html-css-a11y.md) |
| px vs rem vs em | [02-html-css-a11y.md](./02-html-css-a11y.md) |
| script vs async vs defer | [02-html-css-a11y.md](./02-html-css-a11y.md) |
| z-index stacking context | [02-html-css-a11y.md](./02-html-css-a11y.md) |

---

## 3. JavaScript Implementations

**Best matches:** polyfill/implement-from-scratch exercises

| Platform | URL |
|----------|-----|
| LearnersBucket | [learnersbucket.com](https://learnersbucket.com/) |
| This repo | [javascript-machine-coding/](../../javascript-machine-coding/) |

### Must-implement list (Round 1)

| Implementation | File | Time target |
|----------------|------|-------------|
| `debounce(fn, wait)` | [01-debounce-throttle.js](../../javascript-machine-coding/01-debounce-throttle.js) | 10 min |
| `throttle(fn, wait)` | Same | 10 min |
| `memoize(fn)` | [practice/memoize.js](./practice/memoize.js) | 8 min |
| `Promise.all` | [03-promise-all.js](../../javascript-machine-coding/03-promise-all.js) | 15 min |
| EventEmitter | [02-event-emitter.js](../../javascript-machine-coding/02-event-emitter.js) | 15 min |
| Deep clone (structured) | [04-deep-clone.js](../../javascript-machine-coding/04-deep-clone.js) | 15 min |
| Infinite scroll | [practice/infinite-scroll-vanilla.js](./practice/infinite-scroll-vanilla.js) | 20 min |
| `getElementsByClassName` | [practice/getElementsByClassName.js](./practice/getElementsByClassName.js) | 10 min |

### Functional style patterns (official requirement)

```javascript
// Pure reducer-style state updates
function reducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM":
      return { ...state, items: [...state.items, action.payload] };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

// Avoid mutating state in place — interviewers probe this explicitly
```

Practice: [practice/functional-state-module.js](./practice/functional-state-module.js)

---

## 7-Day Plan Using Official Resources Only

| Day | Front End Interview Handbook | Cheatsheet | JS Implementations |
|-----|------------------------------|------------|-------------------|
| 1 | Quiz: delegation, closures | Event loop, hoisting | guess-the-output drills |
| 2 | LinkedIn company page tips | Debounce, throttle | Implement both timed |
| 3 | UI: module from mockup | CSS centering, specificity | — |
| 4 | Algorithm easy | Flatten, map polyfill | memoize |
| 5 | Infinite scroll theme | Browser rendering | infinite-scroll-vanilla |
| 6 | Kevin Scott + Alex Vauthey blogs | Review weak cheatsheet topics | Promise.all |
| 7 | Full 60-min mock | — | — |

Full schedule: [05-study-plan.md](./05-study-plan.md)
