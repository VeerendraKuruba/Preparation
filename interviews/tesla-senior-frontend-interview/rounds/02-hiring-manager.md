# Round 2 — Hiring Manager Chat (30 min)

| | |
|---|---|
| **Format** | Conversation — team, projects, fit |
| **Eliminates?** | Sometimes — weak fit or shallow answers |
| **Focus** | Ambiguity, leadership, resume depth, mutual interest |

---

## What They Evaluate

| Signal | Strong | Weak |
|--------|--------|------|
| Scope | "I owned X end-to-end" | "We did X" with no personal role |
| Decisions | Trade-offs named | "Best practice" hand-waving |
| Ambiguity | Prototype → ship | "Waited for spec" |
| Depth | Metrics + root causes | Vague outcomes |
| Curiosity | Questions about team problems | Only asks about WLB |

---

## Questions & Detailed Answers

### Q1: What was the hardest technical decision you made recently?

**Framework:** Context → Options (2–3 with pros/cons) → Decision → Outcome

**Detailed example:**

> **Context:** We were building a live ops dashboard for manufacturing stakeholders. Product wanted sub-5-second alert latency. Backend team said WebSocket infrastructure was two sprints out. Launch was fixed at six weeks — factory pilot depended on it.
>
> **Options I considered:**
> 1. **Delay launch** until WebSocket ready — correct long-term, misses pilot date.
> 2. **Short polling every 5s** — ships on time, higher server load, not true push.
> 3. **SSE (Server-Sent Events)** — simpler than full WS, one-way push, but our gateway didn't support it yet.
>
> **Decision:** I chose polling at 30s for v1 with a normalized client store (`Map<lineId, metrics>`) and shared TypeScript event types for `metric_update` and `alert` so WebSocket could swap the transport layer without touching UI components. I documented the migration path in an RFC and got PM to sign off on "30s latency for pilot."
>
> **Outcome:** Shipped on time. Zero user-facing changes when we migrated to WebSocket in sprint 2 — only the data hook changed. Pilot NPS was 4.1/5; alert latency complaint rate dropped after WS.

**Follow-up:** "What would you do differently?"
> Start the RFC earlier so backend could parallelize WS work. I'd still ship polling v1 — waiting would have killed the pilot.

---

### Q2: Tell me about shipping fast with imperfect requirements.

**Detailed example (STAR):**

> **S:** PM had a one-paragraph brief for an internal fleet status tool — "managers need to see which vehicles are in service." No wireframes, no API spec. Hard deadline: three weeks (exec demo).
>
> **T:** I was sole FE engineer; one backend partner part-time.
>
> **A:**
> - Day 1–2: Built clickable prototype in React with mock JSON — no backend.
> - Day 3: Showed three fleet managers; learned they care about **location + status + last updated**, not export or filters.
> - Cut scope: no auth beyond SSO gate, no historical charts, no mobile — desktop only for demo.
> - Defined minimal API with backend: `GET /fleet?status=` returning 4 fields.
> - Used feature flag for "refresh" button while polling was flaky.
>
> **R:** Demo shipped day 19. Exec approved budget for v2. Avoided ~2 weeks building export nobody asked for.

**Key phrase for Tesla:** "Prototype to learn, then cut scope to ship."

---

### Q3: What stack does your team use? What would you change?

**Detailed answer:**

> **Current:** React 18, TypeScript strict mode, TanStack Query for server state, Zustand for sparse global UI state, Next.js App Router for SSR pages, Jest + RTL for tests, Playwright for critical paths.
>
> **What works:** Query eliminated most hand-rolled fetch/cache bugs. Strict TS caught API drift early.
>
> **What I'd change:**
> 1. **Shared `@company/api-types` package** — we still had frontend types diverging from OpenAPI spec; caused two production bugs last year.
> 2. **Stricter performance budgets in CI** — bundle size regressions merged because we lacked automated checks.
> 3. **Storybook for design system** — engineers rebuilt similar button variants instead of composing primitives.
>
> I'd frame each as trade-off, not complaint: "We optimized for speed early; at our scale now, types package pays off."

---

### Q4: Tell me about a production incident you handled.

**Detailed example:**

> **S:** Tuesday 2pm — PagerDuty fired on elevated JS error rate. Dashboard showed blank white screen for ~15% of users on Chrome.
>
> **T:** I was on-call FE; owned mitigation and frontend fix.
>
> **A:**
> - **Detect:** Sentry showed `TypeError: Cannot read property 'oee' of undefined` spike after deploy 20 min prior.
> - **Mitigate:** Rolled back deploy via feature flag in 8 minutes; error rate normalized.
> - **Communicate:** Posted in Slack incident channel — ETA, impact, rollback status.
> - **Root cause:** Backend added optional `metrics` object; FE assumed always present. New fleet lines returned `metrics: null`.
> - **Fix:** Defensive optional chaining + Zod validation at API boundary; added RTL test for null metrics row.
> - **Prevent:** CI contract test against staging OpenAPI; error boundary on dashboard so one bad row doesn't white-screen entire app.
>
> **R:** MTTR 8 min for rollback; patch shipped same day; no recurrence in 6 months. Error boundary prevented full-page failures on similar bugs twice since.

---

### Q5: What do you know about what our team builds?

**Detailed answer (honest + curious):**

> I've researched Tesla's software surfaces at a high level — vehicle infotainment and settings, Gigafactory line monitoring, energy products like Powerwall monitoring, and customer-facing service flows like scheduling and repair status. Frontend here seems to sit on real-time and form-heavy workflows more than marketing sites.
>
> I don't know exactly which surface your team owns, and I'd rather hear that from you than guess. **What problems is the team focused on this quarter, and what would the first 90 days look like for this role?**

Shows humility + redirects to their priorities.

---

### Q6: Why leave your current role?

**Detailed answer:**

> I've learned a lot at [Company] — especially [specific skill]. I'm leaving because I've hit a ceiling on **scope**: I want more end-to-end ownership on real-time, operationally critical UIs, and a faster ship cycle on problems that matter outside the app. Tesla's mix of fullstack frontend work and physical-world impact is the direction I'm deliberately moving, not a lateral jump.

**Don't say:** Manager is bad, I'm bored, I want less hours (reads wrong for Tesla intensity).

---

### Q7: How do you handle code review feedback you disagree with?

> I assume the reviewer sees something I missed. I ask clarifying questions — "Is the concern performance, readability, or team convention?" If I still disagree, I bring data: benchmark, link to docs, or suggest we align with tech lead. I've been wrong often — once a reviewer caught a stale closure bug I missed. When I am right, I document the decision in the PR so the next person understands. Ego stays out of it; shipping correct code stays in.

---

### Q8: Tell me about mentoring or raising the bar on your team.

**Detailed example:**

> Junior engineers were shipping `useEffect` fetch patterns that raced on tab switches. I didn't just fix PRs — I ran a 45-min lunch session on fetch cleanup + AbortController, added an ESLint custom rule for missing effect cleanups, and a PR template checkbox for "loading/error/empty states." Review comments on data-fetching dropped ~60% over two months. One engineer later said the rule caught a bug before merge.

---

## Tesla Domains — What to Mention If Relevant

| Domain | UI examples | Technical hooks |
|--------|-------------|-----------------|
| Vehicle | Infotainment, climate, media | Embedded perf, offline, driver distraction |
| Energy | Solar/Powerwall dashboards | High-frequency telemetry, charts |
| Factory | OEE, Andon alerts, line status | WebSocket, tablets, flaky WiFi |
| Service | VIN lookup, appointments, repair tracking | Forms, mobile, photo upload |
| Sales/Delivery | Configurator, delivery scheduling | Complex state, payments |

---

## Questions to Ask HM (detailed)

1. **"What would success look like at 30 / 60 / 90 days?"** — Shows you're outcome-oriented.
2. **"What's the biggest technical debt on the team?"** — Shows seniority; their answer tells you culture.
3. **"How often do you deploy? What's on-call like?"** — Operational reality check.
4. **"How do you balance speed vs quality when they conflict?"** — Tesla-specific tension.
5. **"Is this role more UI craft or fullstack integration?"** — Confirm loop expectations.

---

## Prep Checklist

- [ ] 2 project deep-dives with metrics (60 sec each)
- [ ] 1 technical decision with 3 options + trade-offs
- [ ] 1 production incident with MTTR + prevention
- [ ] 1 mentoring / process improvement story
- [ ] 5 questions for HM written

**Next round:** [03-online-assessment.md](./03-online-assessment.md) or [04-phone-screen.md](./04-phone-screen.md)
