# Nextiva — Staff Frontend Engineer (UI) Interview Prep

> **Role:** Staff Engineer – Frontend (UI) · **Experience:** 9–12 years · **Rounds:** 2 technical rounds (reported) · **Stack:** React, TypeScript, Tailwind, TanStack, monorepo, design systems, real-time UIs

---

## Start Here

| Doc | Purpose |
|-----|---------|
| [00-rounds.md](./00-rounds.md) | Round-by-round format, what to expect, day-of tips |
| [rounds/01-technical-round-1.md](./rounds/01-technical-round-1.md) | Round 1 — **React component design + practical problems** |
| [rounds/02-technical-round-2.md](./rounds/02-technical-round-2.md) | Round 2 — **frontend system design** (whiteboard) |

### Topic Q&A (study by JD area)

| File | Topics |
|------|--------|
| [01-javascript-core.md](./01-javascript-core.md) | Event loop, closures, async, polyfills, CS fundamentals |
| [02-react-typescript.md](./02-react-typescript.md) | React internals, hooks, rendering, concurrent features |
| [03-typescript-deep-dive.md](./03-typescript-deep-dive.md) | Strict mode, generics, type guards, discriminated unions |
| [04-css-tailwind-design-system.md](./04-css-tailwind-design-system.md) | Tailwind, design systems, Storybook, Radix/Base UI |
| [05-tanstack-ecosystem.md](./05-tanstack-ecosystem.md) | Query, Router, Form — caching, optimistic updates |
| [06-realtime-websocket-telephony.md](./06-realtime-websocket-telephony.md) | WebSockets, presence, messaging, WebRTC basics |
| [07-monorepo-cicd-tooling.md](./07-monorepo-cicd-tooling.md) | Turborepo, pnpm, Nx, CI/CD, modern workflows |
| [08-performance-debugging.md](./08-performance-debugging.md) | Core Web Vitals, profiling, scalability |
| [09-frontend-system-design.md](./09-frontend-system-design.md) | Chat, contact center, autocomplete, dashboards |
| [10-staff-level-behavioral.md](./10-staff-level-behavioral.md) | Staff IC signals, STAR stories, influence |
| [11-nextiva-domain.md](./11-nextiva-domain.md) | Company context, product, why Nextiva |
| [12-coding-challenges.md](./12-coding-challenges.md) | Machine coding patterns likely in Round 1 |
| [13-study-plan.md](./13-study-plan.md) | 2-week prep schedule |
| [14-web-research-sources.md](./14-web-research-sources.md) | Sources used for this pack |

---

## About Nextiva Engineering

| Fact | Detail |
|------|--------|
| Product | **NextOS** — unified CX platform: VoIP, video, live chat, SMS, email, social |
| Mission | AI-powered customer experience — voice, video, chat, automation in one platform |
| AI | XBert AI agent — handles calls, texts, chat, email; routing, transcription, sentiment |
| Integrations | Salesforce, HubSpot, Zendesk, Microsoft Teams, Google Workspace, REST APIs |
| Backend (context) | Java/Spring Boot microservices, MongoDB, Redis, AWS/GCP, Kubernetes |
| Frontend (this role) | React + TypeScript, design systems, real-time UIs, monorepo tooling |
| Dev workflow | Agile/Scrum, Jira, Confluence, Bitbucket, CI/CD, peer review |
| Real-time domain | Live messaging, presence, telephony UI, WebRTC-adjacent surfaces |

### Why This Role Is Different from Senior FE

| Aspect | Senior FE (6–9 yrs) | Staff FE (9–12 yrs) — this role |
|--------|---------------------|----------------------------------|
| Scope | Feature / squad | **Platform-wide UI architecture + modernization** |
| Coding | Hands-on features | Hands-on in **critical paths** + sets patterns for others |
| Design systems | Consumes components | **Builds/evolves** shared primitives and standards |
| System design | One feature's UI | **End-to-end product surfaces** — real-time, scale, a11y |
| Influence | Within team | Cross-team standards, CI/CD, monorepo, design–eng alignment |
| TypeScript | Solid usage | **Strict mode discipline** — generics, guards, zero `any` culture |

---

## Confirmed 2-Round Structure (Reported)

| Round | Duration | Primary Signal |
|-------|----------|----------------|
| **Technical 1** | 60–90 min | **React component design** + **live build** of practical UI problems (search, message list, tabs, forms) |
| **Technical 2** | 60–90 min | **Frontend system design** — whiteboard inbox/dashboard, real-time data flow, state architecture, trade-offs |

> Round 1 is **mostly React hands-on**, not JS trivia or hard DSA. Round 2 is **mostly system design**, not another long coding exercise.

---

## Practice Resources (This Repo)

| Need | Link |
|------|------|
| React builds | [react-hands-on-45min/](../../react-hands-on-45min/README.md) |
| React concepts | [ReactConcepts/](../../ReactConcepts/README.md) |
| System design | [system-design/frontend/](../../system-design/frontend/README.md) |
| JS machine coding | [javascript-machine-coding/](../../javascript-machine-coding/) |
| WebRTC | [WebRTC/](../../WebRTC/) |
| Staff-level framing | [freshworks-staff-frontend-interview/07-staff-level.md](../freshworks-staff-frontend-interview/07-staff-level.md) |

---

## Pre-Interview Checklist

- [ ] Both round files reviewed end-to-end
- [ ] **Round 1:** Built contact search + message list in 35 min each (timed)
- [ ] **Round 1:** Can explain Modal/DataTable component API without code
- [ ] **Round 2:** Whiteboarded agent inbox in 30 min (state table + WebSocket flow)
- [ ] 3 resume projects rehearsed with **why** for every tech choice
- [ ] TanStack Query story ready (cache keys, optimistic update, invalidation)
- [ ] Design system story ready (Radix primitive → styled component, Storybook, a11y)
- [ ] Performance story with metrics (LCP/INP fix, bundle split, or virtual list)
- [ ] TypeScript strict-mode example ready (discriminated union for async state)
- [ ] "Why Nextiva?" answer tied to unified communications + real-time product domain
