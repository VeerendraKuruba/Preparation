# Freshworks — Staff Frontend Engineer Interview Prep

## Interview Process (4–5 Rounds)

| Round | Format | Duration | Focus |
|-------|--------|----------|-------|
| 0 | Online Assessment | 90 min | MCQ JS/CSS/React + 4 coding Qs |
| 1 | Technical — DSA | 60 min | 2 Medium-Hard algorithmic problems |
| 2 | Technical — LLD | 60–90 min | Low-level design + coding |
| 3 | System Design — HLD | 60–90 min | Architecture, scalability, trade-offs |
| 4 | Cross-functional / Manager | 30–60 min | Architecture deep-dive, leadership, behavioral |
| 5 | HR | 30 min | Culture fit, compensation |

## Staff vs Senior — Key Difference
At Staff level the emphasis shifts:
- DSA is still tested but is a **filter**, not the main signal
- **Architecture thinking** (multi-team scope, trade-offs, "how would you evolve this?") is the main signal
- **Influence without authority** — cross-team decisions, platform thinking
- **Microfrontend & module federation** — Freshworks actively uses this (Freshservice migration to Vite + Module Federation + React)

## Freshworks Tech Stack (Know This)
- **React** (migrating from Ember.js + Rails)
- **Vite** (HMR < 100ms)
- **Module Federation** (microfrontend runtime loading)
- **CSS Modules + Tailwind CSS**
- **Monorepo** with differential CI
- **Freshworks Component Library** (framework-agnostic, React + Ember + Rails)

## Files in This Folder

| File | What It Covers |
|------|----------------|
| [01-javascript.md](./01-javascript.md) | Confirmed JS Qs — debounce, closures, event loop, serialization |
| [02-react.md](./02-react.md) | React internals, performance, hooks, state management |
| [03-css-html.md](./03-css-html.md) | Specificity, box model, layout, accessibility |
| [04-dsa.md](./04-dsa.md) | Confirmed DSA Qs — binary search, stack, sliding window, LRU cache |
| [05-lld.md](./05-lld.md) | Low-level design — LRU cache, Store class, rate limiter, autocomplete |
| [06-system-design.md](./06-system-design.md) | HLD — chat, feed, notification, microfrontend architecture |
| [07-staff-level.md](./07-staff-level.md) | Staff-specific — platform thinking, module federation, design systems |
| [08-behavioral.md](./08-behavioral.md) | STAR stories, Freshworks culture, cross-team influence questions |
