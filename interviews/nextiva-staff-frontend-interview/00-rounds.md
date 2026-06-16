# Nextiva Staff FE — Round Overview & Day-of Guide

## Process (2 Technical Rounds — Reported)

| Round | Format | Duration | Focus |
|-------|--------|----------|-------|
| 1 | **React component design + live build** | 60–90 min | Component API design, then practical React problems (search, lists, forms) |
| 2 | **Frontend system design** | 60–90 min | Whiteboard architecture — inbox, real-time, state, scale, trade-offs |

> There may be additional HM/HR rounds after technicals — confirm with recruiter.

---

## Round 1 — React Component Design + Practical Problems

**Full guide:** [rounds/01-technical-round-1.md](./rounds/01-technical-round-1.md)

### Typical Flow

1. **Intro** (5 min) — brief background
2. **Component design discussion** (10–15 min) — "How would you design a Modal / DataTable / Search?"
3. **Live React build** (35–50 min) — implement a real UI problem from scratch
4. **Follow-up Q&A** (10–15 min) — extend feature, testing, optimization, "why this structure?"

### High-Probability Live Coding Tasks

| Task | Why Nextiva cares |
|------|-------------------|
| Debounced search / autocomplete | Contact lookup, agent search |
| Infinite scroll / virtualized list | Message history, call logs |
| Timer / countdown | Call duration, hold time |
| Multi-step form with validation | Onboarding, IVR config |
| Toast / notification queue | Real-time alerts, incoming calls |

### Round 1 Success Criteria (Staff Level)

- Clarifies requirements before coding
- Clean component API — hooks extracted, presentational split
- Types everything without `any` (discriminated unions for async state)
- Handles loading, error, and empty states
- Keyboard + ARIA for interactive widgets
- Explains trade-offs aloud while coding

---

## Round 2 — Frontend System Design

**Full guide:** [rounds/02-technical-round-2.md](./rounds/02-technical-round-2.md)

### Typical Flow

1. **Brief intro / resume** (5–10 min) — largest system you owned
2. **System design whiteboard** (40–50 min) — design a product surface end-to-end (main event)
3. **Deep dive** (10–15 min) — interviewer probes real-time, state, scale, testing
4. **Wrap-up** (5 min) — your questions

### High-Probability System Design Prompts

| Prompt | Nextiva relevance |
|--------|-------------------|
| Design a real-time team chat / inbox | Core product — messaging, presence |
| Design a contact center agent dashboard | Calls, queues, live status |
| Design a shared component library | JD explicitly mentions design systems |
| Design an autocomplete for CRM contacts | Integrations (Salesforce, HubSpot) |
| Design a notification system | Incoming calls, messages, alerts |

### Round 2 Success Criteria (Staff Level)

- Starts with requirements and constraints before drawing boxes
- Separates server state (TanStack Query) from client state (Zustand/local)
- Addresses real-time: WebSocket lifecycle, reconnect, optimistic UI
- Mentions performance budgets and Core Web Vitals
- Discusses how design system primitives accelerate delivery
- Articulates migration/modernization path for legacy code

---

## Day-of Tips

### Communication Framework (STAR for technical)

1. **Situation** — what product problem
2. **Task** — your scope as Staff IC
3. **Action** — architecture decision + implementation
4. **Result** — metric (latency, bundle size, dev velocity, bug rate)

### Phrases That Signal Staff Level

- "I'd start with a thin vertical slice and instrument it before optimizing"
- "Server state belongs in TanStack Query; I'd keep UI interaction state local"
- "For real-time, I'd use a client-side event bus decoupled from the WebSocket transport"
- "Design system primitives should be headless + styled — Radix for behavior, Tailwind for tokens"
- "In strict TypeScript, I'd model this as a discriminated union, not boolean flags"

### Red Flags to Avoid

- Jumping to Redux for everything
- Ignoring reconnect/offline in real-time designs
- `any` in TypeScript without a migration plan
- Memoizing everything without measuring
- Designing without asking clarifying questions

### Questions to Ask Interviewers

1. How is the frontend organized — monorepo apps vs packages?
2. What's the design system maturity — Storybook coverage, Radix/Base UI usage?
3. How do real-time features (calls, chat) connect — WebSocket gateway, SSE?
4. What does "modernization" mean for the team right now?
5. How do Staff engineers influence without being managers?

---

## Study Order (If Short on Time)

| Priority | Files | Time | For |
|----------|-------|------|-----|
| P0 | `rounds/01`, `12-coding-challenges`, `02-react`, `03-typescript` | 5–6 hrs | **Round 1** — build 2 components timed |
| P0 | `rounds/02`, `09-frontend-system-design`, `06-realtime` | 4–5 hrs | **Round 2** — whiteboard inbox |
| P1 | `05-tanstack`, `04-css-tailwind-design-system` | 2–3 hrs | Both rounds |
| P2 | `08-performance`, `10-staff-level`, `11-nextiva-domain` | 2 hrs | Round 2 + stories |
| P3 | `01-javascript`, `07-monorepo-cicd` | 1–2 hrs | Follow-ups only |
