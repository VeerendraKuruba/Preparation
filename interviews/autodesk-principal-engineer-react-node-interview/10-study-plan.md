# 3-Week Study Plan — Autodesk Principal (React-Heavy Frontend)

> **Assumption:** 2–3 hours/day weekdays, 4–6 hours weekend days. **Weight: 60% React/UI/CSS, 25% frontend system design, 15% DSA + Node awareness.**

---

## Week 1 — Round 1 (React/UI/CSS + JS Deep Dive)

| Day | Focus | Actions |
|-----|-------|---------|
| **Mon** | Machine coding | Build **autocomplete** from scratch in 45 min |
| **Tue** | Machine coding | Build **data table** or **seat grid** with all UX states |
| **Wed** | React deep dive | Hooks, memo, React Query patterns — verbal only |
| **Thu** | CSS/layout | Flex/grid dashboard layout; responsive breakpoints |
| **Fri** | JS fundamentals | Event loop, debounce, closures — tie to React effects |
| **Sat** | a11y + perf | Keyboard nav, aria roles; profile a slow list → virtualize |
| **Sun** | Mock Round 1 | 90 min: resume (UI projects) + 1 UI build + 5 React/CSS Qs |

**Repo practice:**
- [react-hands-on-45min/](../../react-hands-on-45min/README.md) — **primary**
- [ReactConcepts/](../../ReactConcepts/README.md)
- [leetcode/](../../leetcode/README.md) — stacks/trees if time (secondary)

---

## Week 2 — Rounds 2 & 3 (Frontend System Design)

| Day | Focus | Actions |
|-----|-------|---------|
| **Mon** | Design 1 | Whiteboard **APS viewer shell** — component tree + state |
| **Tue** | Design 2 | **Movie seat picker UI** — conflict UX, timer, a11y |
| **Wed** | Design 3 | **Project tree panel** — virtualization, selection, lazy load |
| **Thu** | Data fetching | React Query patterns: optimistic, invalidation, WebSocket patch |
| **Fri** | OAuth (FE POV) | PKCE + BFF cookie flow diagram; 401 handling in React |
| **Sat** | Mock Round 2 | 60 min: 30 min frontend HLD + 20 min tree UI coding |
| **Sun** | Mock Round 3 | 60 min: seat map design + find-best-adjacent-seats algorithm |

**Repo practice:**
- [system-design/frontend/](../../system-design/frontend/README.md) — **primary**
- [commvault 05-system-design](../commvault-principal-frontend-interview/05-system-design.md)

---

## Week 3 — Rounds 4 & 5 (Behavioral + Frontend Leadership)

| Day | Focus | Actions |
|-----|-------|---------|
| **Mon** | STAR stories | 6 stories — **UI migration, design system, perf fix, design conflict** |
| **Tue** | HM mock | Intro + "complex frontend project" + conflict with PM/design |
| **Wed** | Why Autodesk | Frontend-flavored 30s + 2min — [09-why-autodesk.md](./09-why-autodesk.md) |
| **Thu** | AI for FE | Copilot in UI workflow; in-product AI guardrails; RAG awareness |
| **Fri** | Principal FE | Design system rollout, influence without authority — [05-leadership.md](./rounds/05-leadership.md) |
| **Sat** | Leadership mock | AI + design system strategy + one frontend HLD |
| **Sun** | Review + rest | Skim round files; light autocomplete warmup only |

---

## Daily Micro-Habits (15 min)

1. **One event-loop snippet** — predict output before running in Node
2. **One "why" for resume bullet** — technology choice + alternative rejected
3. **One AWS service** — name + one sentence when to use

---

## Day Before Interview

- [ ] Re-read [00-rounds.md](./00-rounds.md) day-of strategy
- [ ] 3 STAR bullets on sticky note
- [ ] Questions for interviewer written down
- [ ] CoderPad warmup: valid parens + explain stack
- [ ] Sleep — no cramming new algorithms

---

## Day Of Each Round

| Round | Last 10 min review |
|-------|-------------------|
| 1 | Event loop, hooks rules, resume project #1 |
| 2 | AWS diagram sketch, OAuth flow, Kafka one-liner |
| 3 | Concurrency pattern (seat hold / exclusion constraint) |
| 4 | STAR #1 #3 #5, why Autodesk 2 min |
| 5 | AI usage story, Principal vs Staff, 90-day plan |

---

## LeetCode Topics (Reported Frequency)

| Priority | Topics | Examples |
|----------|--------|----------|
| **High** | Stack, string/array, tree recursion | Valid parens, filesystem, pattern match |
| **Medium** | Graph (topo sort), sliding window | Course schedule, subarray problems |
| **Medium** | BFS/DFS | Nested structure traversal |
| **Lower** | Hard DP | Possible but less common for web Principal |

---

## If You Only Have 1 Week (Frontend-Heavy)

```
Days 1–2: Round 1 — 2 UI builds (autocomplete + table) + React/CSS Q&A
Days 3–4: Round 2 + 3 — viewer shell + seat picker frontend whiteboards
Day 5:    Round 4 — 6 UI-focused STAR stories
Day 6:    Round 5 — AI in frontend + design system leadership
Day 7:    Why Autodesk + mock intro + rest
```

---

## Sources Used for This Prep Pack

- [LeetCode — Autodesk Senior SWE Bengaluru Nov 2025](https://leetcode.com/discuss/interview-experience/7386726/)
- [Dataford — Autodesk Software Engineer Guide 2026](https://dataford.io/interview-guides/autodesk/software-engineer)
- [Jointaro — Principal SE experiences (US, Pune, SF)](https://www.jointaro.com/interviews/companies/autodesk/experiences/)
- [Autodesk APS — Build on AWS](https://aps.autodesk.com/blog/how-build-your-forge-application-aws)
- [APS Viewer React sample](https://github.com/autodesk-platform-services/aps-viewer-react)
