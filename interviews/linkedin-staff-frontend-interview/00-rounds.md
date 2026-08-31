# LinkedIn Staff FE — Round Overview

## Round 1: Staff Technical & Leadership Screening (Official)

| Attribute | Detail |
|-----------|--------|
| Duration | **60 minutes** |
| Soft skills | **~15 min** — Leadership, Execution, Craftsmanship |
| Technical | **~45 min** — JS, HTML/CSS, pragmatic + algorithmic coding |
| Platform | **CoderPad** (virtual) or **whiteboard** (on-site) |
| Frameworks | **Not required** — vanilla JavaScript |

Full official brief: [07-official-round-brief.md](./07-official-round-brief.md)

### Official structure

| Block | Time | Components |
|-------|------|------------|
| **Soft skills** | 15 min | Lead in absence, uplevel craftsmanship, conflict mitigation |
| **Technical** | 45 min | Events, inheritance, async · DOM/a11y · pragmatic code · small algo · testing/edge cases |

### Required reading (LinkedIn-provided)

- [Kevin Scott — Leadership, Craftsmanship, Execution](https://www.linkedin.com/pulse/20140718182828-9101035-leadership-craftsmanship-and-execution)
- [Alex Vauthey — 7 pillars of craftsmanship](https://engineering.linkedin.com/blog/2016/05/from-good-to-world-class--what-makes-software-engineers-excel-at)

---

## Round 1 — Technical Breakdown (45 min)

| Segment | Likely content | Practice |
|---------|----------------|----------|
| Fundamentals | Events, prototypes, async, functional style, state | [01-javascript-internals.md](./01-javascript-internals.md) |
| Pragmatic | JS utility or **HTML+CSS module** ([official imgur example](https://imgur.com/4YXYSsu)) | [practice/ui-module-from-mockup.html](./practice/ui-module-from-mockup.html) |
| Algorithmic | Small LC-style problem + optimization | [03-coding-practice.md](./03-coding-practice.md) |
| Quality | Testing strategy, edge cases | State aloud before finishing |

---

## Round 1 — Soft Skills (15 min)

| Pillar | Example questions |
|--------|-------------------|
| **Leadership** | How have you led a team to operate in your absence? |
| **Craftsmanship** | How have you upleveled other engineers? |
| **Execution** | Tangible project examples with impact |
| **Conflict** | How would you mitigate conflict? |

Prep: [04-behavioral-staff-signals.md](./04-behavioral-staff-signals.md)

---

## Official Study Resources

| LinkedIn resource | Mapped guide |
|-------------------|--------------|
| Front End Interview Questions | [08-official-resources.md](./08-official-resources.md) → [Frontend Interview Handbook](https://www.frontendinterviewhandbook.com/) |
| Frontend Interview Cheatsheet | [github.com/tmdautov/frontend-interview-cheatsheet](https://github.com/tmdautov/frontend-interview-cheatsheet) |
| JavaScript Implementations | [javascript-machine-coding/](../javascript-machine-coding/) + [practice/](./practice/) |

---

## High-Probability Topics (Official + Reports)

| Topic | Source | Practice |
|-------|--------|----------|
| Closures & hoisting output | Roundz, Shubham Choudhary, FE Handbook | [practice/guess-the-output.js](./practice/guess-the-output.js) |
| Memoize I + II | FE Handbook, Medium 2026 | [practice/memoize.js](./practice/memoize.js) |
| Infinite scroll + pagination | FE Handbook | [practice/infinite-scroll-vanilla.js](./practice/infinite-scroll-vanilla.js) |
| Event delegation | FE Handbook quiz | [02-html-css-a11y.md](./02-html-css-a11y.md) |
| `getElementsByClassName` | GreatFrontEnd | [practice/getElementsByClassName.js](./practice/getElementsByClassName.js) |
| LC easy (strings/arrays) | FE Handbook Jan 2025 | [03-coding-practice.md](./03-coding-practice.md) |
| HTML/CSS module from image | **Official example** | [practice/ui-module-from-mockup.html](./practice/ui-module-from-mockup.html) |
| Functional state in JS | Official brief | [practice/functional-state-module.js](./practice/functional-state-module.js) |

---

## Round 1 Success Criteria (Staff Bar)

| Signal | Strong | Weak |
|--------|--------|------|
| JS output questions | Correct + explains *why* (scope, TDZ, coercion) | Guesses, can't trace execution |
| Live coding | Clean vanilla JS, modular, handles edge cases | Needs console to debug |
| Communication | Thinks aloud, clarifies requirements first | Silent coding |
| Staff slice | Mentions perf, a11y, maintainability unprompted | Only makes it work |
| Behavioral (if asked) | Concrete impact stories with metrics | Generic "I'm a team player" |

---

## Later Rounds (Preview — Not Phone Screen)

Study these **after** passing R1. LinkedIn FE loop is long (6–9 rounds).

| Round | Focus | Prep |
|-------|-------|------|
| Pragmatic UI | Build tooltip, top nav, widget from mock | [react-hands-on-45min/](../../react-hands-on-45min/README.md) |
| JS deep-dive | Prototype chain, `this`, async patterns | [01-javascript-internals.md](./01-javascript-internals.md) |
| FE system design | Feed, notifications, typeahead | [system-design/frontend/](../../system-design/frontend/README.md) |
| Staff DSA | Max stack, bi-directional BFS, LRU+TTL | LeetCode LinkedIn tag |
| Craftsmanship | Core Web Vitals, rollout, PM collaboration | [04-behavioral-staff-signals.md](./04-behavioral-staff-signals.md) |

---

## Day-of Tips (Phone Screen)

### Before the Call

- [ ] Editor ready: plain text or CoderPad — **no AI assistants**
- [ ] Quiet space, stable network, camera optional but professional
- [ ] Have water; 60 min is dense

### During the Call

1. **Repeat the problem** back before coding.
2. **State approach** in 30 seconds, then code.
3. **Dry-run** one example on paper if no execution.
4. **Call out edge cases** as you go: empty array, null fn, stale cache.
5. **Leave 5 min** for questions — ask about FE platform, Ember→modernization, a11y standards.

### Phrases That Signal Staff Level

- "I'll use a `Map` for O(1) cache lookup; for object keys I'd need a stable serializer."
- "For infinite scroll I'd prefer `IntersectionObserver` over scroll listeners — fewer main-thread reflows."
- "This delegation handler should check `event.target.closest()` for dynamic lists."
- "I'd add `aria-live` for the loading region so screen readers announce new content."

### Red Flags

- Reaching for React in a vanilla JS round
- Ignoring accessibility on UI questions
- Can't explain closure output without running code
- Skipping edge cases on "easy" LC problems

---

## Questions to Ask Recruiter (Before R1)

1. Is Round 1 FE-focused (JS + UI) or LC-heavy for Staff?
2. Will code run in the editor, or is it dry-run only?
3. Vanilla JS only, or is React allowed?
4. How many rounds total for Staff FE?
5. Which team/org is this for? (Feed, Messaging, Growth, etc.)

---

## Study Order for Round 1 (Official)

| Priority | Files | Time |
|----------|-------|------|
| **P0** | `07-official-round-brief`, `04-behavioral` + Kevin Scott / Alex Vauthey blogs | 2–3 hrs |
| **P0** | `practice/ui-module-from-mockup` (timed 20 min), `01-javascript-internals` | 4 hrs |
| **P0** | `practice/memoize`, `03-coding-practice`, `08-official-resources` | 4–5 hrs |
| **P1** | `02-html-css-a11y`, `practice/infinite-scroll`, cheatsheet drills | 3 hrs |
| **P2** | Full 60-min mock from `rounds/01` | 1 hr |
