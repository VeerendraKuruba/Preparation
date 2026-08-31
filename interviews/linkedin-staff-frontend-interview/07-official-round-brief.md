# Official Round Brief — Staff Technical & Leadership Screening

> Source: LinkedIn recruiter/candidate prep email. This is the **authoritative format** for Round 1.

---

## Format at a Glance

| Block | Duration | Platform |
|-------|----------|----------|
| **Soft Skills** — Leadership, Execution, Craftsmanship | **~15 min** | Conversation |
| **Technical Skills** — JS, HTML/CSS, pragmatic + algorithmic coding | **~45 min** | **CoderPad** (virtual) or **whiteboard** (on-site) |
| **Total** | **60 min** | Virtual or on-site (your choice if local) |

---

## Logistics

- Virtual: computer + internet; code in **CoderPad** (text editor)
- On-site: code on **whiteboard** (no framework scaffolding)
- **No particular UI framework knowledge required** — vanilla JavaScript expected

---

## Soft Skills (~15 min)

Staff engineers are expected to be **leaders**. Interviewers assess:

| Pillar | What they want to hear |
|--------|------------------------|
| **Leadership** | How you've led without authority; team operates in your absence |
| **Execution** | How you ship reliably under constraints |
| **Craftsmanship** | How you've upleveled engineering quality on your team |

### Likely question themes

- How have you **led a team to operate in your absence**?
- How have you **upleveled the craftsmanship** of other engineers?
- How would you **mitigate conflict**?
- Tangible examples from **projects you've worked on**

### Required reading (LinkedIn-provided)

| Blog | Author | URL |
|------|--------|-----|
| Leadership, Craftsmanship, and Execution | **Kevin Scott** (former LinkedIn VP Eng) | [LinkedIn Pulse](https://www.linkedin.com/pulse/20140718182828-9101035-leadership-craftsmanship-and-execution) |
| From Good to World-Class (7 pillars of craftsmanship) | **Alex Vauthey** (former LinkedIn VP Eng) | [LinkedIn Engineering Blog](https://engineering.linkedin.com/blog/2016/05/from-good-to-world-class--what-makes-software-engineers-excel-at) |

Deep prep: [04-behavioral-staff-signals.md](./04-behavioral-staff-signals.md)

---

## Technical Skills (~45 min)

### Knowledge areas probed

| Area | Topics |
|------|--------|
| **JavaScript fundamentals** | Events, inheritance (prototypes), async operations |
| **Application fundamentals** | DOM structure, accessibility, semantic markup |
| **Programming ability** | Live JS; possibly HTML+CSS for pragmatic problem |
| **Algorithms** | Small algorithmic problem |
| **Engineering maturity** | Clarifying questions, optimization when prompted, **testing strategies**, **edge cases** |
| **Style & architecture** | Modern JS, **functional style**, **state management** in applications |

### What you'll build

1. **Pragmatic problem** — small real-world UI/JS task (possibly HTML+CSS)
2. **Algorithmic problem** — small LC-style problem

### Official example UI question

> Construct [this module](https://imgur.com/4YXYSsu) using HTML and CSS.

Practice: [practice/ui-module-from-mockup.html](./practice/ui-module-from-mockup.html) + [practice/ui-module-from-mockup.css](./practice/ui-module-from-mockup.css)

### Official study resources (LinkedIn-provided)

| Resource | Best match URL | Use for |
|----------|----------------|---------|
| **Front End Interview Questions** | [Frontend Interview Handbook](https://www.frontendinterviewhandbook.com/) | Quiz Q&A, UI coding, algorithms |
| **Frontend Interview Cheatsheet** | [github.com/tmdautov/frontend-interview-cheatsheet](https://github.com/tmdautov/frontend-interview-cheatsheet) | Short answers: hoisting, closure, debounce, throttle, CSS |
| **JavaScript Implementations** | [LearnersBucket — JS](https://learnersbucket.com/) + this repo's [javascript-machine-coding/](../../javascript-machine-coding/) | Polyfills: map, debounce, memoize, Promise.all |

Also: [08-official-resources.md](./08-official-resources.md) — mapped exercises per resource

---

## How to Win Each Block

### Soft skills (15 min)

- Prepare **3 STAR stories** — one per pillar (Leadership, Execution, Craftsmanship)
- Use LinkedIn language from Kevin Scott's Venn diagram: balance all three
- Quote Alex Vauthey's craftsmanship pillars when discussing quality (code quality, performance, simplicity)

### Technical (45 min)

Suggested time split:

| Segment | Time | Activity |
|---------|------|----------|
| Fundamentals Q&A | 5–10 min | Events, async, inheritance — may be woven into coding |
| Pragmatic coding | 15–20 min | UI module or JS utility + HTML/CSS if needed |
| Algorithmic coding | 15–20 min | Small problem + optimization follow-up |
| Testing & edge cases | 5 min | State aloud: unit tests, a11y checks, empty/error states |

### Phrases interviewers expect at Staff level

- "Before I code — let me clarify inputs, edge cases, and whether this needs to be pure/functional."
- "For state, I'd keep a single source of truth and derive UI from that state."
- "I'd test with: empty input, null handler, duplicate events, and async race conditions."
- "Optimization: IntersectionObserver instead of scroll listener; Map for O(1) cache lookup."

---

## CoderPad Tips

- No framework imports — write plain JS, HTML string or DOM APIs
- Ask if HTML/CSS should be in same pad or separate sections
- Write **test cases as comments** or pseudo-assertions if no test runner
- Dry-run one example on paper before saying "done"
- Leave time to discuss **how you'd test in production** (Jest, Testing Library, a11y audit)

---

## Prep Checklist (Official-Aligned)

### Soft skills
- [ ] Read Kevin Scott blog — note anti-patterns of bad craftsmanship
- [ ] Read Alex Vauthey blog — memorize 7 craftsmanship pillars
- [ ] Story: team operated without you
- [ ] Story: upleveled another engineer's craft
- [ ] Story: resolved conflict constructively

### Technical
- [ ] Implement debounce, memoize, throttle from memory
- [ ] Build UI module from mockup in 20 min (HTML+CSS only)
- [ ] 5 LC easy problems with edge cases stated upfront
- [ ] Explain event delegation + prototype inheritance aloud
- [ ] Practice functional state pattern (reducer or immutable updates)
