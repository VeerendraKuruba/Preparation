# 2-Week Study Plan — Nextiva Staff FE

> **Confirmed format:** Round 1 = React component design + practical problems · Round 2 = system design whiteboard

---

## Week 1 — Round 1: React Component Building

### Day 1 (2 hrs)
- [ ] Read [README.md](./README.md) + [00-rounds.md](./00-rounds.md)
- [ ] Read [rounds/01-technical-round-1.md](./rounds/01-technical-round-1.md) fully
- [ ] [11-nextiva-domain.md](./11-nextiva-domain.md) — draft "Why Nextiva?"

### Day 2 (2.5 hrs) — React theory for follow-ups
- [ ] [02-react-typescript.md](./02-react-typescript.md) — Q1–Q8 (re-renders, hooks, Fiber)
- [ ] [03-typescript-deep-dive.md](./03-typescript-deep-dive.md) — discriminated unions (Q3)
- [ ] [ReactConcepts/memoization-unstable-props-trap.md](../../ReactConcepts/memoization-unstable-props-trap.md)

### Day 3 (2.5 hrs) — Build #1: Contact Search
- [ ] **Timed 35 min:** debounced contact search from scratch
- [ ] Compare with [rounds/01](./rounds/01-technical-round-1.md) Problem 1 solution
- [ ] Practice: [react-hands-on-45min/18-search-debounce/](../../react-hands-on-45min/18-search-debounce/)

### Day 4 (2.5 hrs) — Build #2: Message List
- [ ] **Timed 35 min:** message list + send + optimistic status
- [ ] Compare with [rounds/01](./rounds/01-technical-round-1.md) Problem 2 solution
- [ ] Practice: [react-hands-on-45min/13-infinite-scroll/](../../react-hands-on-45min/13-infinite-scroll/)

### Day 5 (2 hrs) — Component design (no code)
- [ ] Practice aloud: design Modal, DataTable, Tabs APIs (rounds/01 Phase 1)
- [ ] [04-css-tailwind-design-system.md](./04-css-tailwind-design-system.md) — Radix/a11y section
- [ ] Build tabs or toast in 30 min: [react-hands-on-45min/04-tabs/](../../react-hands-on-45min/04-tabs/) or [21-toast-system/](../../react-hands-on-45min/21-toast-system/)

### Day 6 (2 hrs) — Build #3: Pick one
- [ ] Multi-step form OR call timer (35 min timed)
- [ ] [12-coding-challenges.md](./12-coding-challenges.md) — remaining challenges

### Day 7 (2 hrs) — Round 1 Full Mock
- [ ] **60 min mock:** 10 min design discussion + 40 min live build + 10 min follow-ups
- [ ] Use contact search or message list as prompt
- [ ] Record yourself; note gaps

---

## Week 2 — Round 2: System Design

### Day 8 (2.5 hrs) — System design framework
- [ ] [rounds/02-technical-round-2.md](./rounds/02-technical-round-2.md) — read fully
- [ ] [09-frontend-system-design.md](./09-frontend-system-design.md) — Q1 agent inbox
- [ ] **Whiteboard 30 min:** agent inbox (no notes)

### Day 9 (2 hrs) — Real-time depth
- [ ] [06-realtime-websocket-telephony.md](./06-realtime-websocket-telephony.md)
- [ ] Draw WebSocket reconnect + optimistic send flow from memory
- [ ] [05-tanstack-ecosystem.md](./05-tanstack-ecosystem.md) — query keys + optimistic updates

### Day 10 (2 hrs) — Second whiteboard
- [ ] **Whiteboard 30 min:** contact center dashboard OR notification system
- [ ] [09-frontend-system-design.md](./09-frontend-system-design.md) — prompts 2–4

### Day 11 (2 hrs) — Design system + staff stories
- [ ] [04-css-tailwind-design-system.md](./04-css-tailwind-design-system.md) — Storybook/Radix
- [ ] [10-staff-level-behavioral.md](./10-staff-level-behavioral.md) — write 6 STAR stories

### Day 12 (2 hrs) — Performance + resume
- [ ] [08-performance-debugging.md](./08-performance-debugging.md) — one STAR perf story
- [ ] Rehearse 3 resume projects with architecture decisions

### Day 13 (1.5 hrs) — Round 2 Full Mock
- [ ] **60 min mock:** 5 min intro + 45 min system design + 10 min deep dive
- [ ] Prompt: "Design Nextiva agent inbox with chat and call status"

### Day 14 (1 hr) — Light review
- [ ] Skim rounds/01 + rounds/02 headings only
- [ ] README checklist
- [ ] No cramming

---

## If You Only Have 3 Days

| Day | Focus |
|-----|-------|
| **1** | `rounds/01` + build contact search (35 min) + build message list (35 min) |
| **2** | `rounds/02` + `09-system-design` + whiteboard inbox (30 min) |
| **3** | `06-realtime` + `10-behavioral` + `11-nextiva-domain` + 2 STAR stories |

---

## Day-Of Reminders

| Round | Do | Don't |
|-------|-----|-------|
| **1** | Clarify requirements, type props, handle all UI states | Jump into code without component tree |
| **2** | Ask questions first, draw state ownership table | Jump to "use Redux for everything" |
