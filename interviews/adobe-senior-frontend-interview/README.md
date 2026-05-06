# Adobe — Senior Frontend Engineer Interview Prep

## About Adobe

| Fact | Detail |
|------|--------|
| Headquarters | San Jose, California |
| Industry | Creative software, Digital marketing, Document cloud |
| Products | Creative Cloud (Photoshop, Illustrator, Premiere), Document Cloud (Acrobat, Sign), Experience Cloud (Analytics, AEM, Commerce), GenStudio |
| Frontend Stack | React, TypeScript, React Spectrum, React Aria, React Stately |
| Design System | **Spectrum 2** (open-source, accessible, all Adobe products use it) |
| Engineering Culture | Intersection of technology and creativity; strong accessibility culture |
| 2025 Focus | GenAI integration across all products, Spectrum 2 launch, agentic workflows |

### Why Context Matters
As a Senior Frontend Engineer at Adobe you may work on:
- **Creative Cloud Web** — Photoshop / Illustrator on the web (canvas, WebGL, WASM)
- **Adobe Express** — collaborative content creation tool
- **GenStudio** — AI-powered brand content generation
- **Experience Cloud** — marketing analytics, AEM, personalization dashboards
- **Document Cloud** — PDF viewer, e-sign workflows
- **Adobe Spectrum** — the shared design system consumed by all teams

All these products share the Spectrum design system and accessibility-first culture.

---

## Interview Process (4–5 Rounds, Often Same Day)

| Round | Format | Duration | Focus |
|-------|--------|----------|-------|
| 1 | JS Fundamentals + Coding | 60 min | 3 problems: polyfills, output questions, vanilla JS |
| 2 | React + TypeScript Coding | 60 min | Build component with skeleton files; controlled forms, hooks |
| 3 | Frontend System Design | 60 min | HLD for complex UI (file system, rich text editor, asset manager) |
| 4 | Behavioral / Cross-functional | 45 min | STAR stories, Adobe values, collaboration, conflict |
| 5 | Hiring Manager | 45 min | Technical vision, career trajectory, team fit |

> Difficulty rating: **2.6 / 5** (Glassdoor 2025). Process is 50% positive rated — preparation makes the difference.
> All rounds in one day (or across 2 days for senior roles).

---

## Senior vs Mid-Level — What Adobe Tests for Senior

| Aspect | Mid-Level | Senior |
|--------|-----------|--------|
| JavaScript | Uses ES6+ correctly | Deep internals — explain HOW it works |
| React | Writes functional components | Performance optimization, architecture decisions |
| System Design | Absent at mid-level | Required — design scalable, accessible UIs |
| Polyfills | Not expected | **Key signal** — implement Array.map, Promise.all from scratch |
| Accessibility | Occasional question | Deep — React Aria patterns, WCAG, ARIA internals |
| Behavioral | Simple STAR | Complex: influence, mentorship, technical decision trade-offs |

---

## Adobe Tech Stack (Know This)

| Layer | Technology |
|-------|-----------|
| UI Framework | **React 18+** with TypeScript |
| Design System | **React Spectrum** (Spectrum 2), React Aria, React Stately |
| State | Redux Toolkit, Zustand, Context API |
| Build | Webpack, Vite, Parcel |
| Testing | Jest, React Testing Library, Cypress, Playwright |
| Canvas/Graphics | WebGL, WASM, Canvas API (for Creative Cloud Web) |
| APIs | REST, GraphQL |
| Cloud | AWS (primary), Azure |

---

## Files in This Folder

| File | What It Covers |
|------|----------------|
| [01-javascript-polyfills.md](./01-javascript-polyfills.md) | Polyfills (map, filter, reduce, bind, Promise.all), output questions, vanilla JS |
| [02-react-typescript.md](./02-react-typescript.md) | React hooks, performance, TypeScript patterns, controlled forms |
| [03-machine-coding.md](./03-machine-coding.md) | Build UI components: star rating, autocomplete, tabs, drag-drop, infinite scroll |
| [04-dsa.md](./04-dsa.md) | DSA confirmed at Adobe: stacks, trees, flood fill, LRU, OOP class design |
| [05-system-design.md](./05-system-design.md) | File system UI, rich text editor, asset manager, real-time collaboration |
| [06-css-accessibility.md](./06-css-accessibility.md) | CSS deep dive + Adobe's accessibility-first culture |
| [07-behavioral.md](./07-behavioral.md) | Adobe values STAR stories, creativity, collaboration, ownership |
| [08-adobe-domain.md](./08-adobe-domain.md) | Products, React Spectrum, GenStudio, Experience Cloud, Spectrum 2 |
