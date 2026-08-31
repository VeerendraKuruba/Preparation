# Round 1 — Staff Technical & Leadership Screening (Official)

> **Duration:** 60 min · **15 min** Leadership/Execution/Craftsmanship · **45 min** technical (CoderPad / whiteboard)

Official brief: [../07-official-round-brief.md](../07-official-round-brief.md)

---

## Official Timeline

```
0:00 – 0:15   Soft skills — Leadership, Execution, Craftsmanship
0:15 – 0:25   JS fundamentals Q&A (may overlap with coding)
0:25 – 0:40   Pragmatic problem — JS + possibly HTML/CSS
0:40 – 0:55   Small algorithmic problem + optimization
0:55 – 1:00   Testing, edge cases, your questions
```

Timing is flexible — some interviewers blend fundamentals into coding.

---

## Part A: Soft Skills (15 min)

### What they're assessing

| Pillar | Official focus |
|--------|----------------|
| **Leadership** | Lead team in your absence; potential to lead |
| **Execution** | Ship reliably; unblock; deliver outcomes |
| **Craftsmanship** | Uplevel other engineers; quality bar |

### Must-read blogs

- [Kevin Scott — Leadership, Craftsmanship, Execution](https://www.linkedin.com/pulse/20140718182828-9101035-leadership-craftsmanship-and-execution)
- [Alex Vauthey — 7 pillars of craftsmanship](https://engineering.linkedin.com/blog/2016/05/from-good-to-world-class--what-makes-software-engineers-excel-at)

Full story prep: [../04-behavioral-staff-signals.md](../04-behavioral-staff-signals.md)

---

## Part B: Technical (45 min)

### Knowledge areas (official)

| Area | Study file |
|------|------------|
| Events, inheritance, async | [../01-javascript-internals.md](../01-javascript-internals.md) |
| DOM, a11y, semantic markup | [../02-html-css-a11y.md](../02-html-css-a11y.md) |
| Functional style + state | [../practice/functional-state-module.js](../practice/functional-state-module.js) |
| Implementations | [../08-official-resources.md](../08-official-resources.md) |

### Two coding tasks (official)

| Task | Type | Practice |
|------|------|----------|
| **Pragmatic problem** | JS + possibly HTML/CSS | [ui-module-from-mockup](../practice/ui-module-from-mockup.html), memoize, infinite scroll |
| **Algorithmic problem** | Small LC-style | [../03-coding-practice.md](../03-coding-practice.md) |

### Official UI example

Build [this module](https://imgur.com/4YXYSsu) with HTML+CSS.

Solution reference: [../practice/ui-module-from-mockup.html](../practice/ui-module-from-mockup.html)

---

## Technical Success Criteria

| Signal | Strong | Weak |
|--------|--------|------|
| Clarifying questions | Asks about inputs, edge cases, a11y before coding | Jumps to code |
| JS fundamentals | Explains events, prototypes, async without notes | Needs MDN for basics |
| Pragmatic coding | Clean vanilla JS/HTML/CSS; semantic markup | Div soup; inline styles everywhere |
| Algorithmic | Working solution + stated complexity | Incomplete; no edge cases |
| Functional style | Immutable state, pure functions where possible | Mutates globals |
| Testing | Names test cases + edge cases aloud | "Looks good" |
| Optimization | Responds to follow-ups (throttle, Map cache) | Stuck on first approach |

---

## High-Probability Technical Topics

Merged from **official brief** + **candidate reports**:

| Topic | Probability | Practice |
|-------|-------------|----------|
| Memoize | Very high | [memoize.js](../practice/memoize.js) |
| Infinite scroll + fetch | Very high | [infinite-scroll-vanilla.js](../practice/infinite-scroll-vanilla.js) |
| HTML/CSS module from mockup | Official example | [ui-module-from-mockup](../practice/ui-module-from-mockup.html) |
| Event delegation | High | [02-html-css-a11y.md](../02-html-css-a11y.md) |
| Guess-the-output (closures, async) | High | [guess-the-output.js](../practice/guess-the-output.js) |
| LC easy (strings/arrays) | High | [03-coding-practice.md](../03-coding-practice.md) |
| Debounce / throttle | Medium | [javascript-machine-coding/01-debounce-throttle.js](../../../javascript-machine-coding/01-debounce-throttle.js) |
| Functional state module | Medium (official) | [functional-state-module.js](../practice/functional-state-module.js) |

---

## CoderPad Strategy (Virtual)

1. **Confirm format** — HTML/CSS in same pad or separate?
2. **Structure answer** — comments for approach, then code
3. **No frameworks** — vanilla JS, DOM APIs, plain CSS
4. **State aloud** — "I'll use a reducer pattern for state..."
5. **Testing** — write 3–5 test cases as comments even without runner:
   ```javascript
   // Tests:
   // memoize(fn)(1) === memoize(fn)(1) — cache hit
   // memoize(fn)(undefined) — should compute, not throw
   // empty scroll container — no fetch
   ```
6. **Optimization follow-up** — expect "how would you improve this?"

---

## Whiteboard Strategy (On-Site)

- Draw DOM tree before writing HTML
- Write CSS class names with BEM-like clarity
- For JS: pseudocode first, then implementation
- Leave space for complexity analysis on algo problem

---

## Mock Interview Script (60 min)

| Min | You do |
|-----|--------|
| 0–15 | Answer 3 behavioral (leadership, craftsmanship, conflict) — timed |
| 15–20 | Explain event loop + prototype chain on paper |
| 20–35 | Build UI module HTML+CSS from imgur (or mockup file) |
| 35–50 | LC easy + state edge cases |
| 50–60 | "How would you test?" + retrospective |

---

## Day-Before Checklist

- [ ] Kevin Scott + Alex Vauthey blogs reviewed
- [ ] 3 STAR stories rehearsed aloud
- [ ] Memoize + debounce from blank file (< 10 min each)
- [ ] UI module timed build (20 min)
- [ ] 1 LC easy with 3 edge cases written before code
- [ ] CoderPad account / browser tested
- [ ] Imgur reference reviewed: https://imgur.com/4YXYSsu
