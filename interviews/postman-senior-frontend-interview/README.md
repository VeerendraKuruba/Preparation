# Postman Senior Frontend Engineer — Interview Prep

> Postman is the world's leading API platform (100M+ developers). The frontend role focuses on Electron-based desktop app, React/Redux/MobX, offline-first architecture, and API-centric UX.

---

## Interview Process (5 Rounds)

| Round | Type | Duration | Focus |
|-------|------|----------|-------|
| 1 | Recruiter Screen | 30 min | Background, motivation, culture fit |
| 2 | Technical Phone Screen | 60 min | JavaScript fundamentals, networking, OS concepts |
| 3 | Machine Coding / LLD | 90 min | Build a UI component (File Directory Manager confirmed), OOP design |
| 4 | HLD / System Design | 60 min | Design notification system, chat, or scheduled jobs |
| 5 | Culture Fit + Hiring Manager | 45 min | Values, collaboration, cross-functional impact |

> Postman is **less FAANG-style** than Google/Meta. LLD and HLD rounds are practical, product-centric. DSA is lighter (binary search, stack/queue, not heavy DP).

---

## Postman Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | **Electron** (main + renderer processes) |
| UI Framework | **React** (primary), Backbone.js (legacy) |
| State | **Redux** (global/shared), **MobX** (reactive local state) |
| Offline Storage | **IndexedDB** (via Waterline ORM / custom adapter) |
| Networking | **Node.js** (in Electron main) + browser fetch in renderer |
| WebSocket | **Bifrost gateway** — custom WebSocket routing layer |
| Backend | Node.js + Sails.js (MVC framework) |
| Runtime | postman-runtime (Node.js, executes API requests) |

---

## File Index

| File | Round | Topic |
|------|-------|-------|
| [01-javascript-networking.md](01-javascript-networking.md) | Round 2 | JS fundamentals, HTTP, WebSocket, OS |
| [02-react-state.md](02-react-state.md) | Round 2/3 | React + Redux + MobX patterns |
| [03-machine-coding-lld.md](03-machine-coding-lld.md) | Round 3 | File Directory Manager, API Builder UI, OOP LLD |
| [04-dsa.md](04-dsa.md) | Round 2/3 | Binary search, Queue/Stack, Scheduling, Graph |
| [05-hld-system-design.md](05-hld-system-design.md) | Round 4 | Notification system, chat, scheduled jobs |
| [06-api-design.md](06-api-design.md) | All rounds | REST, HTTP, auth, rate limiting — Postman-specific |
| [07-electron-architecture.md](07-electron-architecture.md) | Round 3/4 | Electron main/renderer, IPC, offline-first, WebSocket |
| [08-behavioral.md](08-behavioral.md) | Round 5 | STAR stories + Postman values |
| [09-postman-domain.md](09-postman-domain.md) | All rounds | Product knowledge, collections, environments, API design |

---

## What Makes Postman Different

| Aspect | Implication |
|--------|-------------|
| **Electron app** | You need main/renderer separation knowledge; IPC patterns; native OS integration |
| **Offline-first** | IndexedDB + sync queue; handle network interruptions gracefully |
| **API-centric users** | Your users are developers — they expect precision, keyboard shortcuts, no hand-holding |
| **Multiple state paradigms** | Redux for predictable global state + MobX for reactive local state — know both |
| **WebSocket at scale** | Bifrost handles millions of concurrent connections; pub/sub patterns critical |
| **API knowledge required** | You're building an API tool — you're expected to know HTTP inside-out |

---

## Pre-Interview Checklist

- [ ] Open Postman desktop app — use the collection runner, environments, pre-request scripts
- [ ] Understand the Postman product: Collections, Environments, Variables, Mock Servers, Monitors
- [ ] Read about the Bifrost WebSocket gateway (Postman blog)
- [ ] Practice File Directory Manager in 45 minutes on a blank editor
- [ ] Know Redux flow vs MobX observable/computed/action
- [ ] Know Electron's main/renderer split — can you explain IPC?
- [ ] Know IndexedDB read/write patterns (async, cursor-based)
- [ ] Prepare 4 STAR stories: quality ownership, API/developer tooling impact, cross-functional work, scope under ambiguity
