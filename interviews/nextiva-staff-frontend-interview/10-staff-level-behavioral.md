# Staff-Level & Behavioral — Nextiva Staff FE Q&A

---

## Q1: Staff IC vs Senior — what's the difference?

| Dimension | Senior | Staff |
|-----------|--------|-------|
| Scope | Team / feature | **Product area / platform** |
| Impact | Ships features reliably | **Raises bar for multiple teams** |
| Architecture | Implements patterns | **Defines patterns** via RFCs, design system |
| Ambiguity | Needs some direction | **Creates clarity** for others |
| Mentorship | Ad hoc pairing | **Systematic** — reviewers, office hours, docs |
| Metrics | Feature delivery | **Platform health** — build time, perf, incident rate |

**You are not evaluated on people management** — but on technical leadership and influence.

---

## Q2: "Tell me about a technical decision you disagreed with"

**STAR template:**
- **S:** Team wanted to add Redux for server state in new inbox
- **T:** You owned frontend architecture for the squad
- **A:** Wrote a short RFC comparing Redux+thunk vs TanStack Query — latency benchmarks, bundle size, team familiarity. Proposed Query with Zustand only for UI chrome state. Presented to tech lead + PM.
- **R:** Team adopted Query; 40KB smaller bundle; shipped 2 weeks faster; pattern adopted org-wide

**Key:** Disagree respectfully with **data**, not ego.

---

## Q3: "How do you handle technical debt?"

**Strong answer structure:**
1. **Make it visible** — track in backlog with impact (incidents, dev velocity)
2. **Quantify** — "build takes 12 min; target 4 min"
3. **Allocate capacity** — 15–20% sprint for platform
4. **Tie to product** — "Can't ship call recording until we stabilize WebSocket client"
5. **Strangler migrations** — incremental, measurable

---

## Q4: "Describe mentoring you've done"

Examples Staff should cite:
- Established PR review checklist adopted by 3 teams
- Ran "TypeScript strict mode" office hours during migration
- Paired junior engineer through first production incident
- Created Storybook templates reducing new component time 50%

---

## Q5: "How do you work with PM and Design?"

- **Early involvement** in PRD — flag technical risks before designs are final
- **Feasibility spikes** for uncertain UX (real-time, offline)
- **Design system partnership** — engineers attend design critiques
- **Trade-off conversations** — "v1 ships without offline; v2 adds queue"
- **Prototype in Storybook** before full integration

---

## Q6: Cross-team influence without authority

1. **RFCs** with clear problem, options, recommendation
2. **Pilot** — prove pattern in one app, share metrics
3. **Office hours** — low-barrier help for adoption
4. **Lint rules / codemods** — make the right thing easy
5. **Celebrate wins** — shout out teams using new patterns

---

## Q7: Production incident story

**Framework:**
1. **Detect** — alert, user report, RUM spike
2. **Mitigate** — feature flag off, rollback deploy
3. **Diagnose** — logs, repro, root cause
4. **Fix** — patch + test
5. **Prevent** — postmortem, monitoring, runbook

**Staff addition:** "I led the postmortem and added a CI check so this class of bug can't ship again."

---

## Q8: "Why Staff and not Engineering Manager?"

Sample answer:
> "I'm most energized by hands-on technical work at scale — architecture, design systems, critical path code. I lead through technical depth and mentorship, not people management. Staff IC lets me multiply impact across teams while staying in the codebase."

---

## Q9: Behavioral questions likely at Nextiva

| Question | Angle |
|----------|-------|
| Tell me about yourself | 2 min — arc toward communications/real-time if possible |
| Biggest technical challenge | Real-time, scale, or migration story |
| Conflict with teammate | Data-driven resolution |
| Tight deadline | Scope negotiation, MVP, feature flags |
| Failure | Own it; what you learned |
| Why Nextiva? | See [11-nextiva-domain.md](./11-nextiva-domain.md) |

---

## Q10: Questions you should ask them

1. What does the frontend modernization roadmap look like?
2. How mature is the design system — Storybook, Radix, adoption %?
3. What's the split between greenfield and legacy maintenance?
4. How do Staff engineers collaborate with backend on real-time APIs?
5. What does success look like in the first 6 months?
6. Team size and structure — platform vs product squads?

---

## Q11: STAR story bank — prepare 6

| # | Theme | Metric to include |
|---|-------|-------------------|
| 1 | Performance optimization | LCP/INP before → after |
| 2 | Design system adoption | Components shipped, time saved |
| 3 | Real-time feature delivery | Latency, reliability |
| 4 | Monorepo / CI improvement | Build time reduction |
| 5 | Cross-team conflict resolution | Timeline, outcome |
| 6 | Production incident | MTTR, prevention added |

---

## Q12: Red flags in your own answers

- "I did everything myself" — Staff shows collaboration
- No metrics — always quantify
- Blame others in incident stories
- Can't explain **why** you chose a technology
- Only talk about code — mention product impact
