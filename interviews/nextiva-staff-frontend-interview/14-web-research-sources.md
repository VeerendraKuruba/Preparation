# Web Research Sources — Nextiva Staff FE Prep

> Audit of external sources consulted when building this interview pack (June 2026).

---

## Job Descriptions & Role Requirements

| Source | URL | What we used |
|--------|-----|--------------|
| Staff Software Engineer (UI) — Jobs for Developers | https://jobsfordevelopers.com/jobs/staff-software-engineer-ui-at-nextiva-com-may-19-2026-ed3384 | Full JD: 9–12 yrs, React, TS strict, monorepo, TanStack, design system, Tailwind |
| Senior Software Engineer – Frontend — Employbl | https://www.employbl.com/jobs/senior-software-engineer-nextiva-1551629 | Adjacent role requirements; WebRTC, real-time, Storybook, Radix |
| Software Engineer (React) — Built In Chennai | https://builtinchennai.in/job/software-engineer-react/6587715 | React III role: perf, design systems, WebSockets, testing stack |
| Software Engineer — Simplify Jobs | https://simplify.jobs/p/4b137767-19b7-41b6-a803-c1c2c74b9a9a/Software-Engineer | Agile, Jira, CI/CD, REST/GraphQL integration |

---

## Company & Product Context

| Source | URL | What we used |
|--------|-----|--------------|
| Nextiva homepage | https://www.nextiva.com/ | Product: NextOS, XBert AI, omnichannel, integrations |
| Atlassian customer story | https://www.atlassian.com/customers/nextiva | Jira, Confluence, Bitbucket engineering workflow |
| Senior Engineering Manager (Java) — Built In | https://builtin.com/job/senior-engineering-manager-java/8580883 | Backend stack context: Java/Spring, MongoDB, Redis, K8s, GCP/AWS |
| Senior Voice/Video DSP — Simplify | https://simplify.jobs/p/203f5404-147c-42a1-9505-2e04283ef500/ | WebRTC, SIP, real-time platform, five-9s uptime |

---

## Interview Patterns & Senior FE Trends

| Source | URL | What we used |
|--------|-----|--------------|
| Frontend Engineer Interview Guide — PhantomCodeAI | https://www.phantomcodeai.com/blogs/frontend-engineer-interview-guide | Round structure: JS, React internals, CSS, Web Vitals, UI system design |
| Frontend System Design 2026 — FrontendInterviews.dev | https://frontendinterviews.dev/frontend-system-design-interview-questions | State separation, autocomplete/feed prompts, TanStack Query framing |
| Frontend Developer Interview Questions 2026 — KORE1 | https://www.kore1.com/frontend-developer-interview-questions/ | Re-render causes, TypeScript expectations, memoization anti-patterns |
| React State Management 2026 — techinterview.org | https://www.techinterview.org/post/3233474940/react-state-management-2026-landscape/ | Server vs client state decision tree |
| Frontend Routing — techinterview.org | https://www.techinterview.org/post/3233475205/frontend-routing-hash-history-app-router/ | TanStack Router, URL as state |
| State Management Interview — frontendtechlead.com | https://www.frontendtechlead.com/frontend-interview/state-management-interview | TanStack Query patterns, Context pitfalls |

---

## TanStack Ecosystem

| Source | URL | What we used |
|--------|-----|--------------|
| TanStack Router + Query integration | https://tanstack.com/router/latest/docs/integrations/query | SSR dehydration, loader prefetch, streaming |
| Hiring TanStack Developers — daily.dev | https://recruiter.daily.dev/stacks/tanstack/ | Interview signals: cache vs refetch, optimistic updates |

---

## Real-Time & Communications UI

| Source | URL | What we used |
|--------|-----|--------------|
| Frontend System Design: Chat App — JavaScriptBit | https://javascriptbit.com/frontend-system-design-chat-application/ | Local-first, IndexedDB, optimistic UI, cross-tab sync |
| Design real-time chat — JS Guide | https://www.jsguide.dev/question/design-realtime-chat-application-slack-messenger | WebSocket heartbeat, backoff, virtualization |
| WhatsApp System Design — System Design Newsletter | https://newsletter.systemdesign.one/p/whatsapp-system-design | WebSocket tradeoffs, sticky sessions, heartbeats |
| WebSocket architecture best practices — Ably | https://ably.com/topic/websocket-architecture-best-practices | Pub/sub, backpressure, fault tolerance |

---

## React Interview Trends

| Source | URL | What we used |
|--------|-----|--------------|
| Top ReactJS questions — Gourav Hammad (LinkedIn) | https://www.linkedin.com/posts/gouravhammad_interview-reactjs-frontend-activity-7348554026856140802-DzHy | Prop drilling, memo, error boundaries, hooks |
| React Interview Questions 2025 — Sakshi Gawande (LinkedIn) | https://www.linkedin.com/posts/sakshi-gawande_20-trending-react-interview-questions-for-activity-7395305829135978496-OROC | React 19 features awareness (RSC, compiler, useOptimistic) |

---

## Internal Repo Cross-References Used

| Path | Relevance |
|------|-----------|
| `interviews/freshworks-staff-frontend-interview/` | Staff FE structure template |
| `interviews/autodesk-principal-engineer-react-node-interview/` | README + round file pattern |
| `interviews/commvault-principal-frontend-interview/` | Principal/staff behavioral framing |
| `interviews/docusign-frontend-interview/answers/04-typescript.md` | TypeScript Q&A depth |
| `system-design/frontend/` | Real-time dashboard, perf, scalability |
| `react-hands-on-45min/` | Live coding practice index |
| `ReactConcepts/` | Fiber, memoization, batching |
| `javascript-machine-coding/` | Debounce, EventEmitter |
| `WebRTC/` | Telephony UI context |

---

## What Was NOT Found (Gaps)

| Gap | Notes |
|-----|-------|
| Glassdoor/Blind Nextiva FE interview reports | No public detailed write-ups found for this specific role |
| Exact 2-round format confirmation | Inferred from recruiter info + staff FE industry patterns — **confirm with recruiter** |
| Nextiva's exact frontend monorepo tooling | JD mentions Turborepo/pnpm/Nx — actual choice unknown |
| Internal design system name | Not publicly documented |

**Recommendation:** Ask recruiter: round format, live coding environment (CoderPad vs local IDE), whether TanStack/Storybook are in their stack today.

---

## Suggested Follow-Up Searches Before Interview

- [ ] LinkedIn: connect with Nextiva frontend engineers — ask about stack
- [ ] Check Nextiva engineering blog / careers page for tech posts
- [ ] Review Nextiva product demo (agent desktop UX)
- [ ] Radix UI docs: Dialog, Combobox patterns
- [ ] TanStack Query v5 migration notes if they use v4
