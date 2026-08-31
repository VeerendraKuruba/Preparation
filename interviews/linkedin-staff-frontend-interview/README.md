# LinkedIn — Staff Frontend Engineer Interview Prep

> **Role:** Staff Software Engineer — Front-End Engineering · **Round 1:** Staff Technical & Leadership Screening (60 min) · **Platform:** CoderPad (virtual) or whiteboard (on-site)

---

## Start Here (Official Format)

| Doc | Purpose |
|-----|---------|
| **[07-official-round-brief.md](./07-official-round-brief.md)** | **Recruiter email parsed** — 15 min soft + 45 min technical |
| [rounds/01-staff-technical-phone-screen.md](./rounds/01-staff-technical-phone-screen.md) | Round 1 strategy, timeline, CoderPad tips |
| [04-behavioral-staff-signals.md](./04-behavioral-staff-signals.md) | Leadership, Execution, Craftsmanship + Kevin Scott / Alex Vauthey blogs |
| [08-official-resources.md](./08-official-resources.md) | Maps LinkedIn's 3 study resources to exercises |
| [05-study-plan.md](./05-study-plan.md) | 1–2 week prep schedule |
| [00-rounds.md](./00-rounds.md) | Full interview loop preview |

### Topic Guides

| File | Topics |
|------|--------|
| [01-javascript-internals.md](./01-javascript-internals.md) | Closures, hoisting, prototypes, event loop, coercion, guess-the-output |
| [02-html-css-a11y.md](./02-html-css-a11y.md) | Semantic HTML, specificity, layout, accessibility, event delegation |
| [03-coding-practice.md](./03-coding-practice.md) | Memoize, infinite scroll, LC easy/medium, LinkedIn-tagged problems |
| [04-behavioral-staff-signals.md](./04-behavioral-staff-signals.md) | 15-min leadership slice + LinkedIn values (Staff phone screen) |

### Practice Code (This Folder)

| File | LinkedIn-reported topic |
|------|-------------------------|
| [practice/memoize.js](./practice/memoize.js) | Memoize I & II (Map cache, TTL follow-up) |
| [practice/infinite-scroll-vanilla.js](./practice/infinite-scroll-vanilla.js) | Infinite scroll + pagination in plain JS |
| [practice/guess-the-output.js](./practice/guess-the-output.js) | Tricky JS output drills |
| [practice/getElementsByClassName.js](./practice/getElementsByClassName.js) | DOM utility (GreatFrontEnd reported) |
| [practice/event-delegation-demo.js](./practice/event-delegation-demo.js) | Event bubbling/capturing/delegation |
| [practice/ui-module-from-mockup.html](./practice/ui-module-from-mockup.html) | **Official UI example** — HTML+CSS module ([imgur ref](https://imgur.com/4YXYSsu)) |
| [practice/functional-state-module.js](./practice/functional-state-module.js) | Functional style + state management (official requirement) |

### References

| File | Purpose |
|------|---------|
| [06-web-research-sources.md](./06-web-research-sources.md) | All external links and interview write-ups |
| [07-official-round-brief.md](./07-official-round-brief.md) | Official recruiter description |
| [08-official-resources.md](./08-official-resources.md) | Front End Interview Questions, Cheatsheet, JS Implementations |

---

## Official Round 1 Structure

| Block | Time | Focus |
|-------|------|-------|
| **Soft skills** | ~15 min | Leadership, Execution, Craftsmanship |
| **Technical** | ~45 min | JS fundamentals + pragmatic coding + small algo |
| **Tools** | — | CoderPad (virtual) · whiteboard (on-site) |

**No UI framework required** — vanilla JavaScript, HTML, CSS.

---

## LinkedIn FE Interview — What Makes It Different

| Aspect | LinkedIn | Typical FAANG FE |
|--------|----------|------------------|
| Framework in coding | **Vanilla JS** in early rounds | Often React |
| Primary signal (R1) | JS internals + pragmatic UI | Mixed DSA + React |
| Code execution | Sometimes **no Run button** — dry run only | Usually live IDE |
| Bar for R1 | **Elimination round** — near-perfection expected | Often pass/fail softer |
| Later rounds | Machine coding, FE system design, craftsmanship | Varies |
| Why | Ember codebase — fundamentals > framework | — |

---

## Reported Full Process (Staff FE)

| Round | Name | Duration | Focus |
|-------|------|----------|-------|
| 0 | Recruiter screen | 30 min | Resume, motivation, level alignment |
| **1** | **Staff Technical & Leadership Screening** | **60 min** | **15 min L/E/C + 45 min technical (THIS FOLDER)** |
| 2 | Pragmatic UI / Machine coding | 60–90 min | HTML/CSS/JS widget build (tooltip, nav bar) |
| 3 | JavaScript deep-dive | 60 min | Closures, prototypes, DOM APIs |
| 4 | Frontend system design | 60–90 min | Feed, notifications, infinite scroll at scale |
| 5 | DSA (Staff) | 60 min | Medium–hard LC (graphs, heaps, concurrency) |
| 6 | Craftsmanship / Product sense | 60 min | Performance, a11y, cross-functional stories |
| 7 | Hiring Manager | 45–60 min | Scope, leadership, team fit |
| 8 | Team matching | 30 min | Org alignment |
| 9 | Offer | — | TC, RSU (Microsoft stock) |

> Exact round count varies by org and level. **Confirm with your recruiter** which rounds apply to Staff FE vs Staff fullstack.

---

## Practice Resources (This Repo)

| Need | Link |
|------|------|
| JS tricky output | [javascript/js-tricky-questions-answers.js](../../javascript/js-tricky-questions-answers.js) |
| Machine coding | [javascript-machine-coding/](../../javascript-machine-coding/) |
| React hands-on (later rounds) | [react-hands-on-45min/](../../react-hands-on-45min/README.md) |
| FE system design | [system-design/frontend/](../../system-design/frontend/README.md) |
| Infinite feed design | [system-design/frontend/q01-infinite-feed-social-timeline.md](../../system-design/frontend/q01-infinite-feed-social-timeline.md) |
| LeetCode tagged | Filter **Company: LinkedIn** on leetcode.com |

---

## Critical Prep Rules (From Interview Write-ups)

1. **Practice without a console** — write code in a plain text editor and dry-run.
2. **Vanilla JS only** for phone screen — no React imports.
3. **Edge cases out loud** — empty input, null, duplicate keys, race conditions.
4. **Explain while coding** — they grade communication as much as correctness.
5. **Ask clarifying questions** — "Should memo cache per-argument or per-call signature?"

---

## Quick 3-Day Crash Plan (Official-Aligned)

| Day | Focus | Hours |
|-----|-------|-------|
| 1 | Kevin Scott + Alex Vauthey blogs + [04-behavioral-staff-signals.md](./04-behavioral-staff-signals.md) STAR stories | 3 |
| 2 | [practice/ui-module-from-mockup.html](./practice/ui-module-from-mockup.html) timed + [01-javascript-internals.md](./01-javascript-internals.md) | 3–4 |
| 3 | [practice/memoize.js](./practice/memoize.js) + [03-coding-practice.md](./03-coding-practice.md) LC easy + 60-min mock | 3–4 |

Full schedule: [05-study-plan.md](./05-study-plan.md)
