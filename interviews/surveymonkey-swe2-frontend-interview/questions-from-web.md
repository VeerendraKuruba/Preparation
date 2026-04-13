# SurveyMonkey — Senior Frontend Engineer Questions from Web Research
> Sources: Glassdoor, Hashnode (real candidate experience), Prepfully, InterviewQuery, AlgoDaily, GreatFrontend, GeeksforGeeks

## Detailed Solutions
| Section | Questions | Solutions File |
|---------|-----------|----------------|
| JS Fundamentals + CSS | Q1–Q25 | [solutions/01-js-css-solutions.md](solutions/01-js-css-solutions.md) |
| React Q&A | Q26–Q45 | [solutions/02-react-solutions.md](solutions/02-react-solutions.md) |
| Coding Tasks + DSA | Tasks 1–7, Q46–Q55 | [solutions/03-coding-dsa-solutions.md](solutions/03-coding-dsa-solutions.md) |
| System Design + LLD | Q56–Q75 | [solutions/04-system-design-lld-solutions.md](solutions/04-system-design-lld-solutions.md) |

---

## What Real Candidates Reported (SurveyMonkey / Momentive.ai)

### Interview Format (confirmed from multiple Glassdoor + Hashnode reports)
| Round | Format | Duration | What actually happened |
|-------|--------|----------|------------------------|
| Recruiter Screen | Phone | 30 min | Background, motivation, referral |
| Round 1 | Live Coding | ~90 min | JS theory → React Q&A → Build UI feature from scratch with mock API |
| Round 2 | Virtual Whiteboard | ~60 min | System Design (HLD) + Low Level Design (LLD component architecture) |
| Round 3 | Techno-Managerial | ~45 min | Behavioral STAR + technical depth questions |

---

## ROUND 1 — JavaScript Fundamentals (Verbal, before coding)

### Reported by real candidates verbatim:

1. What is hoisting in JavaScript? What is the Temporal Dead Zone (TDZ)?
2. What is the difference between `var`, `let`, and `const`? When would you use each?
3. Explain the JavaScript event loop. What are microtasks vs macrotasks?
4. What are Promises? How do `Promise.all` and `Promise.allSettled` differ?
5. What is `async/await`? How does it work under the hood?
6. What is closure? Give a real-world example.
7. What is the difference between `==` and `===`?
8. What is `this` in JavaScript? How does it behave in arrow functions vs regular functions?
9. What is prototypal inheritance? How does the prototype chain work?
10. What are the differences between `call`, `apply`, and `bind`?
11. What is the difference between shallow copy and deep copy? How do you deep-clone an object?
12. What is event delegation and why is it useful?
13. What is debounce? What is throttle? When do you use each?
14. What is `typeof null` and why? (classic JS quirk)
15. What does the `new` keyword do internally in JavaScript?

### CSS Questions reported by candidates:
16. How do you center an element horizontally AND vertically in CSS? (Give 3 different approaches)
17. What is the difference between `rem`, `em`, `vw`, `vh`, `%`, and `px`? When do you use each?
18. What is the CSS Box Model? What does `box-sizing: border-box` change?
19. What is the difference between `position: relative`, `absolute`, `fixed`, and `sticky`?
20. When do you use Flexbox vs CSS Grid?
21. What is CSS specificity? How is it calculated?
22. What is a CSS stacking context and when does it get created?
23. What are CSS custom properties (variables) and how do they differ from preprocessor variables (SASS)?
24. How does `z-index` work? Why does it sometimes not work as expected?
25. What is the difference between `display: none`, `visibility: hidden`, and `opacity: 0`?

---

## ROUND 1 — React Q&A (Verbal, before coding)

### Reported by real candidates:

26. Explain `useEffect` — how does it work with `[]`, with dependencies, and without a dependency array?
27. Explain `useState`. What happens if you call the setter with the same value as current state?
28. What is the Context API? How does it work? What are its re-render implications?
29. How does Redux work? What are actions, reducers, and the store?
30. Is React one-way or two-way data binding? Explain why.
31. What is the difference between controlled and uncontrolled components?
32. What are React keys? Why is using array index as a key a bad practice?
33. What is `useMemo`? What is `useCallback`? When do you actually need them?
34. What is `React.memo`? How does it differ from `useMemo`?
35. What is the difference between `useEffect` and `useLayoutEffect`?
36. How does React reconciliation work? What is the Fiber architecture?
37. What are Higher-Order Components (HOCs)? How do they differ from custom hooks?
38. What is prop drilling? What are the solutions?
39. How do you prevent unnecessary re-renders in React?
40. What is `useRef` and what are its use cases beyond storing DOM references?
41. What is `useReducer` and when would you prefer it over `useState`?
42. What is the difference between class components and functional components?
43. What are React portals and when do you use them?
44. How do you handle errors in React? What are Error Boundaries?
45. Explain React 18 concurrent features: `useTransition`, `useDeferredValue`, automatic batching.

---

## ROUND 1 — Coding Challenge (Live, Build from Scratch)

### Confirmed coding tasks from real candidates:

**Task 1 — Bar Chart (Vanilla JS, no libraries)**
> "Implement a Bar Chart based on the given requirements without using any external library or framework. Follow best practices for clean, modular, and extensible code."

Key expectations:
- DOM manipulation with `document.createElement` or template literals
- Accept data as props/argument (array of `{ label, value }`)
- Scale bars proportionally to the max value
- Add tooltips or value labels on hover
- Clean CSS — no inline styles for everything
- Extensible: easy to change colors, add new bars

**Task 2 — Build a SurveyMonkey skeleton page with mock API**
> "Create a skeleton SurveyMonkey page from scratch that interacts with a mock API. A design mockup is provided."

Key expectations:
- Fetch data from a given mock API endpoint on load
- Handle loading, error, and success states
- Render a list or table of survey results
- Basic CSS matching the provided design
- React preferred but Vanilla JS also accepted

**Task 3 — Valid Anagram (with async extension)**
> "Write a function to check if two strings are valid anagrams. Follow-up: How would you handle this if it were async (Promises)? Show loading states."

```js
// Core solution
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const freq = {};
  for (const ch of s) freq[ch] = (freq[ch] || 0) + 1;
  for (const ch of t) {
    if (!freq[ch]) return false;
    freq[ch]--;
  }
  return true;
}

// Async extension expected
async function checkAnagramAsync(s, t) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(isAnagram(s, t)), 500);
  });
}
```

**Task 4 — localStorage with TTL (Time-To-Live)**
> "Implement a localStorage wrapper that automatically deletes items after a specific time period."

```js
const storage = {
  set(key, value, ttlMs) {
    const item = { value, expiry: Date.now() + ttlMs };
    localStorage.setItem(key, JSON.stringify(item));
  },
  get(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const item = JSON.parse(raw);
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  },
};
```

**Task 5 — Modal Dialog (HTML + CSS + JS)**
> "Design a modal dialog with HTML, CSS, and JavaScript — open/close, backdrop click, keyboard (Escape), focus trap."

**Task 6 — Hover information overlay**
> "Create an HTML/CSS prototype to display information over an image upon mouse hover."

**Task 7 — Center element over image**
> "How would you ensure an element (badge/label) is perfectly centered over a background image?"

---

## ROUND 1 — Additional Coding (DSA, reported by candidates)

46. Two Sum — find indices of two numbers that sum to a target. O(n) with hashmap.
47. Valid Parentheses — check if brackets are balanced using a stack.
48. Check if two strings are anagrams.
49. Flatten a nested array without using `Array.flat()`.
50. Remove duplicates from an array (Set, filter, reduce — all 3 approaches).
51. Find the first non-repeating character in a string.
52. Reverse a string without using `.reverse()`.
53. Implement `Array.prototype.map` from scratch.
54. Implement `debounce(fn, delay)` from scratch.
55. Implement `Promise.all` from scratch.

---

## ROUND 2 — System Design (HLD)

### Reported design problems:

**Design 1 — Design SurveyMonkey (the product itself)**
> Design the frontend architecture of a survey creation and response collection platform.

Key areas to cover:
- Component architecture (SurveyBuilder, QuestionTypes, ResponseViewer)
- State management strategy (which state is local vs global vs server)
- Real-time collaboration (concurrent editors on same survey)
- API design — REST vs GraphQL (how you'd fetch survey templates, responses)
- Performance: pagination / virtualization for large response lists
- Accessibility: keyboard navigation for survey forms, ARIA roles
- Offline support (survey taker loses connection mid-submission)

**Design 2 — Analytics Dashboard**
> Design a real-time analytics dashboard showing survey response rates, completion rates, drop-off points.

**Design 3 — Notification System**
> Design a notification/toast system for a large React app (multiple sources, priorities, persistence).

**Design 4 — Multi-step Survey Form**
> Design a multi-step survey form with: progress saving, validation per step, back navigation, and final submission.

### System Design Questions (verbal):
56. How do you decide between REST and GraphQL for a data-heavy frontend?
57. How do you handle real-time updates — polling, WebSockets, SSE? When do you choose each?
58. How do you design a component library from scratch? What decisions matter most?
59. How do you architect a large React app for scalability? (folder structure, state, code splitting)
60. How do you handle caching in a React SPA? (HTTP cache, React Query, in-memory)
61. How do you design for accessibility? What does WCAG AA compliance require?
62. How do you handle internationalization (i18n) in a React app?
63. What is micro-frontend architecture? What are the tradeoffs?
64. How do you design error boundaries and fallback UI at scale?
65. How do you manage forms at scale? (React Hook Form vs Formik vs custom)

---

## ROUND 2 — Low Level Design (LLD) Component Architecture

### Reported LLD problems:

**LLD 1 — Console-based Text Editor (reported on Glassdoor)**
> Design a text editor component with: undo/redo, cursor movement, selection, basic formatting (bold/italic).

Key design decisions:
- State: represent document as array of characters or as a tree of nodes?
- Command pattern for undo/redo history
- How to handle cursor position state

**LLD 2 — Survey Question Builder**
> Design the architecture of a drag-and-drop survey question builder component.

**LLD 3 — Data Table / Grid Component**
> Design a reusable `<DataTable>` component with: sorting, pagination, column visibility, row selection, and virtualization for large datasets.

**LLD 4 — Autocomplete / Typeahead Component**
> Design an autocomplete input with: debounced API calls, keyboard navigation, highlight matching text, loading state, empty state.

### LLD Questions (verbal):
66. How do you design a component API that's both flexible and easy to use?
67. What is the compound component pattern? Build a `<Select>` component using it.
68. What is the controlled/uncontrolled component pattern and how do you support both in a reusable component?
69. How do you make a component library tree-shakeable?
70. What is virtualization? When would you use `react-window` or `react-virtual`?
71. How do you implement an accessible dropdown/combobox from scratch?
72. How do you design a form that supports dynamic fields (add/remove rows)?
73. How do you handle optimistic updates in a React app?
74. What is the difference between lifting state up and using context? When do you choose each?
75. How do you test React components? Unit vs integration vs E2E — what do you prioritize?

---

## ROUND 3 — Techno-Managerial (Behavioral + Technical Depth)

### Technical depth questions reported:
76. Describe the most complex frontend component or system you've built. Walk me through the architecture.
77. Tell me about a time you improved performance on a frontend app. What did you measure? What were the results?
78. How do you approach refactoring legacy code without breaking existing functionality?
79. Describe your experience with TypeScript. What's a complex type you've had to write?
80. How do you handle technical debt in a fast-moving product team?
81. What is your testing strategy? How do you balance unit tests, integration tests, and E2E?
82. Tell me about a time you had to make a major architectural decision under time pressure.
83. How do you evaluate whether to use an existing library vs build in-house?
84. Describe your experience with design systems. How do you ensure consistency across teams?
85. How do you approach performance debugging? Walk me through your process from symptom to fix.

### Behavioral (STAR format expected):
86. Tell me about a time you disagreed with a technical decision on your team. What did you do?
87. Describe a situation where you had to work with ambiguous requirements.
88. Tell me about a time you mentored or coached a junior engineer.
89. Describe the most challenging bug you've debugged. How did you find it?
90. Tell me about a time a project you owned didn't go as planned. What did you learn?
91. How do you prioritize when you have multiple high-priority items competing for your time?
92. Describe a time you received critical feedback. How did you respond?
93. Tell me about a cross-functional collaboration that was difficult. How did you navigate it?
94. What does "ownership" mean to you in your work?
95. Why SurveyMonkey / Momentive.ai? What interests you about our product specifically?

---

## Key Patterns from Real Candidate Reports

### What SurveyMonkey interviewers care about:

| Signal | What they look for |
|--------|--------------------|
| **Clean code** | Modular, readable, no spaghetti — even in 60-min challenges |
| **CSS fluency** | Don't underestimate CSS — it counts even if interviewer says it doesn't |
| **Communication** | Talk while coding, explain trade-offs before diving in |
| **API design sense** | How you model state and fetch data reveals senior thinking |
| **Accessibility** | ARIA, keyboard nav, semantic HTML — always include unprompted |
| **Edge cases** | Empty state, loading state, error state — cover all three |
| **Follow-up handling** | They add extensions (async, undo/redo, scale) — stay calm |

### Must-know for Round 1:
- Build a **bar chart from scratch** (DOM + CSS, no chart.js)
- Build a **UI that fetches from API** (loading/error/success states)
- All JS fundamentals: hoisting, TDZ, event loop, Promise.all vs allSettled
- CSS centering: flexbox, grid, position absolute approaches
- React: useEffect, useState, Context, controlled vs uncontrolled

### Must-know for Round 2:
- RADIO framework: Requirements → Architecture → Data Model → Interfaces → Optimization
- Design SurveyMonkey itself — be ready for this
- Virtualization, WebSockets vs SSE vs polling, state management trade-offs

### Must-know for Round 3:
- Prepare 4–5 STAR stories covering: performance win, architecture decision, disagreement, mentoring, ambiguity
- Be specific with numbers ("reduced bundle size by 40%", "improved LCP from 4.2s to 1.8s")

---

## Quick Practice List (highest-signal questions)

```
JS Core:        Q1–15  (hoisting, TDZ, event loop, promises)
CSS:            Q16–25 (centering, box model, flex vs grid)
React:          Q26–45 (hooks, context, reconciliation)
Coding tasks:   Task 1–7 (bar chart, modal, API page, anagram)
DSA:            Q46–55 (two sum, valid parens, anagram, flatten)
System Design:  Q56–65 (REST vs GraphQL, real-time, caching)
LLD:            Q66–75 (component API, virtualization, a11y)
Behavioral:     Q86–95 (STAR stories)
```
