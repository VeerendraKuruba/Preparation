# Autodesk Principal Engineer (React-Heavy) — Round Index

> **Study one file per round.** This role is **frontend-first** — weight React, UI/CSS, and frontend architecture over Node/backend depth.

---

## Process at a Glance (Your Loop)

| Round | File | Duration | Type | Eliminates? |
|-------|------|----------|------|-------------|
| 1 | [01-programming-round.md](./rounds/01-programming-round.md) | 60–90 min | **React/UI/CSS** + JS deep dive + DSA or UI build | Yes |
| 2 | [02-coding-system-design-deep-dive.md](./rounds/02-coding-system-design-deep-dive.md) | 60 min | **Frontend HLD** + coding extension | Yes |
| 3 | [03-system-design.md](./rounds/03-system-design.md) | 45–60 min | Frontend architecture at scale + algorithm | Yes |
| 4 | [04-hiring-manager.md](./rounds/04-hiring-manager.md) | 45–60 min | Culture, execution, collaboration | Yes |
| 5 | [05-leadership.md](./rounds/05-leadership.md) | 45–60 min | AI, strategy, principal scope | Yes |
| ★ | [09-why-autodesk.md](./09-why-autodesk.md) | All rounds | Why Autodesk / why leave / why now | — |

> **Note:** Autodesk also runs recruiter/HM screens *before* this loop. Those are lighter — prep [04-hiring-manager.md](./rounds/04-hiring-manager.md) and [09-why-autodesk.md](./09-why-autodesk.md) for early conversations.

---

## What Each Round Tests (From Candidate Reports)

```
Round 1  → Can you build and explain React/UI under pressure? (CSS, hooks, perf, a11y)
Round 2  → Can you design a **frontend architecture** (components, state, data flow) at scale?
Round 3  → Can you whiteboard a complex UI surface (seat map, project browser) with perf + concurrency UX?
Round 4  → Can you deliver UI/platform work, communicate with design/PM, and fit the team?
Round 5  → Can you lead **frontend** technically — design system, AI in UI/SDLC, org impact?
```

---

## Study Order (3 Weeks)

```
Week 1:  Round 1 — **React/UI/CSS first**, then DSA
         → Machine coding (autocomplete, table), hooks, Fiber, layout, a11y

Week 2:  Round 2 + Round 3 — **frontend system design**
         → Component trees, state strategy, React Query, viewer shell, seat-map UI

Week 3:  Round 4 + Round 5 + Why Autodesk
         → UI migration STAR stories, design system influence, AI in frontend workflow
```

Full timeline: [10-study-plan.md](./10-study-plan.md)

---

## Day-of Strategy

### Before any technical round
- 10 min warmup: sketch a React component tree OR valid parentheses + explain `useEffect` vs `useLayoutEffect`
- Resume bullets framed as **UI decisions** — component architecture, perf, design system, a11y

### During Round 1 (coding + UI)
```
Clarify UX states → component breakdown → implement → a11y → edge cases
```
- **Expect UI/CSS weight** — layout, responsive, specificity, keyboard nav
- If DSA instead of UI build, still narrate like a frontend engineer (immutable data, clarity)
- Principal bar: explain **why** this state lives here, not just how hooks work

### During Round 2–3 (frontend design)
```
User journeys → component hierarchy → state ownership → data fetching → perf → error/loading UX
```
- Lead with **React architecture** (routes, layouts, shared state, code splitting)
- API/backend: describe contracts and BFF role — don't dive into Kafka/DB unless asked
- Call out **UI concurrency** (optimistic updates, stale data, conflict modals)

### During Round 4–5 (behavioral / leadership)
- STAR with **your** contribution at Principal scope (influence, not just execution)
- AI answers: business problem first, guardrails second, hype never

### Red flags for a **frontend-heavy** Principal loop
- Strong DSA but weak CSS/layout or no loading/error/empty states in UI builds
- System design that's all AWS boxes with no component tree or state diagram
- Cannot explain re-render causes or frontend perf metrics (LCP, INP)
- Backend deep dive answers with no connection to UI impact

---

## Repo Cross-Links

| Practice | Link |
|----------|------|
| LeetCode solutions | [leetcode/](../../leetcode/README.md) |
| 45-min React builds | [react-hands-on-45min/](../../react-hands-on-45min/README.md) |
| React deep dives | [ReactConcepts/](../../ReactConcepts/README.md) |
| Frontend system design | [system-design/frontend/](../../system-design/frontend/README.md) |
| Node.js (awareness only) | [ebay-nodejs-practice/](../ebay-frontend-interview/ebay-nodejs-practice/NodeJS-JS-Competency-Round.md) — BFF/auth patterns, not backend depth |
