# Round 8 — Behavioral & Hiring Manager (45 min)

| | |
|---|---|
| **Format** | STAR stories + culture fit |
| **Eliminates?** | Yes |
| **Focus** | Ownership, speed, ambiguity, incidents, mission |

---

## Tesla Values — How to Demonstrate Each

| Value | Phrases to use | Example action |
|-------|----------------|----------------|
| Extreme ownership | "I drove…", "I fixed end-to-end" | Stayed through incident without handoff |
| First principles | "I questioned whether we needed…" | Cut WS scope for v1 with data |
| Bias for action | "Shipped MVP in…", "prototype in 2 days" | Mock before spec finalized |
| Mission | "Ops team depended on…" | Tie to real users, not vanity metrics |

---

## STAR Template (Detailed)

```
S — Situation   (2 sentences: team, stakes, deadline)
T — Task        (YOUR responsibility — not team's)
A — Action      (60% of answer — specific steps YOU took)
R — Result      (numbers: time, %, incidents, revenue, NPS)
```

**Length:** 2–3 minutes per answer. Practice with timer.

---

## Q1: Ship under aggressive deadline

**Question:** Tell me about a time you shipped under an aggressive deadline.

**Detailed answer:**

> **Situation:** In Q3 last year, our ops team was preparing for a factory pilot. They needed a live line-status dashboard — OEE, throughput, active alerts — or they'd continue using spreadsheets. Product committed to a fixed demo date **three weeks out**, but requirements were still a bullet point: "managers need to see line health."
>
> **Task:** I was the senior FE owner — UI, API integration, and coordinating with one part-time backend engineer. No designer assigned.
>
> **Action:**
> - **Day 1–2:** Built a clickable React prototype with mock JSON — no backend dependency — and demoed to three ops managers.
> - **Learned** they needed location + status + last-updated timestamp, not exports, historical charts, or mobile.
> - **Cut scope** ruthlessly: read-only metrics, desktop-only, SSO gate only, no alert acknowledgments in v1.
> - **Defined API contract** myself with backend: single `GET /lines?plantId=` returning five fields.
> - **Parallelized** with mock server so UI didn't block on backend slip.
> - **Feature-flagged** the one risky chart (throughput sparkline) so we could disable at demo if perf failed.
> - **Daily 15-min sync** with PM and backend — no multi-day surprises.
>
> **Result:** Demo shipped on **day 19**. Pilot NPS **4.1/5**. Zero P0 bugs in week one. Export and alert ack shipped in weeks 3–4 based on feedback — we'd have wasted two weeks if we'd built export upfront.

**Follow-up:** "What would you cut if you had one less week?"
> Alert severity colors and sparkline — core table and OEE numbers only.

---

## Q2: Technical disagreement

**Question:** Tell me about a disagreement with a PM or engineer.

**Detailed answer:**

> **Situation:** Same dashboard project — PM insisted on **WebSocket live updates** for launch because competitors had "real-time." Backend estimated **two sprints** for WS infrastructure. Launch was **six weeks total** — impossible to block on WS.
>
> **Task:** I needed to align on an architecture that hit the pilot date without painting us into a corner.
>
> **Action:**
> - Scheduled 30-min decision meeting — not Slack debate.
> - Wrote **two options** on paper:
>   - **A:** Delay launch 2 sprints → true real-time, miss pilot.
>   - **B:** Poll every 30s for v1, shared TypeScript event types (`MetricUpdate`, `AlertEvent`) so transport layer swaps later.
> - Quantified: pilot success metric was "managers stop using spreadsheets," not sub-second latency.
> - Got PM sign-off on 30s freshness for pilot in writing.
> - Implemented `useMetricsTransport` hook — v1 polling, v2 WS, **zero UI component changes** on migration.
>
> **Result:** Launched on time. Migrated to WebSocket sprint 2 in **three days** of FE work because abstraction held. PM later thanked me for "not delaying the pilot over infrastructure."

---

## Q3: Production incident

**Question:** Tell me about a production bug you caused or fixed.

**Detailed answer:**

> **Situation:** Tuesday 2pm — error rate spiked after our deploy. ~15% of users on Chrome saw a **blank white dashboard**. I was on-call FE.
>
> **Task:** Mitigate user impact, find root cause, ship fix, prevent recurrence.
>
> **Action:**
> - **Detected** via Sentry — `TypeError: Cannot read 'oee' of undefined` clustered on new deploy.
> - **Mitigated in 8 min** — flipped feature flag to rollback frontend bundle.
> - **Communicated** in #incidents — impact estimate, rollback status, next update in 15 min.
> - **Root cause:** Backend started returning `metrics: null` for newly provisioned lines; FE assumed object always present.
> - **Fixed same day:** Optional chaining + Zod parse at API boundary; row renders "—" for missing OEE.
> - **Prevented:** Error boundary around dashboard grid so one bad row can't white-screen entire app; contract test against staging OpenAPI in CI.
>
> **Result:** MTTR **8 minutes**. Similar null-field errors caught by Zod twice since — error boundary prevented two would-be full-page outages. Post-mortem blameless; I owned the missing null check.

---

## Q4: Performance improvement

**Question:** Tell me about a time you improved performance measurably.

**Detailed answer:**

> **Situation:** Factory ops dashboard rendered **8,000+ event rows** in a single table on Samsung tablets used on the floor. Users reported "frozen screen" — support tickets **~12/week**.
>
> **Task:** I owned frontend performance — profiling, fix, validation on target hardware.
>
> **Action:**
> - Profiled with React DevTools — entire table re-rendered on every WebSocket tick (~2/sec).
> - Introduced **`@tanstack/react-virtual`** — 12 visible rows instead of 8,000 DOM nodes.
> - Moved WS handler to patch **`Map<lineId, metrics>`** instead of replacing array state.
> - Split Context — connection status separate from line data.
> - Worked with backend to **batch WS events** server-side where possible.
> - Validated on actual tablet hardware, not just MacBook.
>
> **Result:** LCP **4.2s → 1.8s**; INP **380ms → 120ms** on tablet profile. Support tickets about freezing **↓ ~70%** over six weeks. Ops manager emailed that dashboard was "finally usable on the floor."

---

## Q5: Ambiguous requirements

**Question:** Tell me about working with unclear requirements.

**Detailed answer:**

> **Situation:** Internal tool brief: "Build something for fleet managers to track vehicle service status." No wireframes, no user interviews scheduled, **four-week deadline**.
>
> **Task:** Define what to build before writing production code.
>
> **Action:**
> - Refused to start full build on one-paragraph spec — asked for **access to three fleet managers**.
> - Built **Figma-free HTML mock** in two days with togglable fake data.
> - **Observed:** managers cared about **VIN, location, status, ETA** — not maps or analytics.
> - Ran **30-min feedback sessions** — recorded notes, shared with PM.
> - Proposed v1 scope doc — PM signed in one meeting.
> - Delivered v1 in **3.5 weeks**; skipped features they'd said "nice to have" (export PDF, email digests).
>
> **Result:** Adoption **80% of target managers within two weeks**. Avoided ~1.5 weeks building map view nobody asked for. PM adopted "prototype first" for next project.

---

## Q6: Why Tesla?

> **Full guide with 30s / 90s / 2min answers, FAANG comparison, and follow-ups:** [09-why-tesla.md](./09-why-tesla.md)

**Detailed answer (2 minutes):**

> **Mission:** I'm motivated by software connected to physical outcomes — not engagement metrics. Tesla sits at that intersection: vehicles on the road, factory lines, energy products. When a dashboard is wrong, ops teams make wrong decisions — that responsibility appeals to me.
>
> **Technical:** I want real-time, data-dense UIs on constrained devices — the problems I've been solving, at larger scale. This role reads fullstack-heavy FE — owning UI through API shape — which matches how I already work.
>
> **Culture:** I thrive with ownership and short feedback loops. My best work happened when we shipped a narrow v1, learned from users, and iterated — that's the culture I understand Tesla values.
>
> **Personal timing:** I've maxed scope at [current company] and I'm deliberately moving toward operationally critical software — this isn't a random application.

**Follow-up they often ask next:** "Why not stay at [Company]?"
> Scope and problem domain — I want operational real-time software as my main work, not a side internal tool. See Q7 below and [09-why-tesla.md](./09-why-tesla.md).

---

## Q7: Why leave current company?

**Detailed answer:**

> I've had a strong run at [Company] — grew from mid-level to senior, led [project], learned [skill]. I'm not leaving because of one bad quarter or manager conflict. I'm leaving because I want **broader end-to-end ownership on real-time systems** and a **faster path from idea to production** on problems that matter outside the app. Tesla is a deliberate step toward that, not a lateral move.

**Avoid:** Badmouthing, "I'm bored," compensation as lead reason, work-life balance as primary frame.

---

## Q8: Harsh code review feedback

**Detailed answer:**

> A senior engineer left extensive comments on my PR — felt like a rewrite request. My first reaction was defensive.
>
> I **asked for a 10-min call** instead of arguing in GitHub comments. Learned their concern was **consistent error handling patterns** — I'd mixed try/catch with `.catch()` across files.
>
> I **refactored** to team convention, added a shared `fetchJson` helper, and thanked them in PR — reviewer became ally.
>
> **Result:** That helper is now used in 40+ files; my follow-up PRs had fewer nits. I separate "reviewer found real issue" from "reviewer preference" by asking clarifying questions upfront now.

---

## Q9: Mentorship / raising the bar

**Detailed answer:**

> Junior engineers on my team repeated the same **`useEffect` fetch without cleanup** pattern — caused race bugs on fast navigation.
>
> Instead of only commenting on PRs, I ran a **45-min lunch session** on data fetching + AbortController with live debugging demo.
>
> Added **PR checklist item**: "fetch effects have cleanup?"
>
> Wrote **three example patterns** in team wiki (Query preferred, raw fetch with abort, SSR).
>
> **Result:** Fetch-related review comments **↓ ~60%** over two months. One junior engineer caught a production race in their own PR before merge using the checklist.

---

## Q10: Failure / mistake

**Question:** Tell me about a time you failed.

**Detailed answer:**

> I pushed a "small" CSS change that broke layout on IE11 — yes, we still supported it for one enterprise client. Didn't test on required browser matrix.
>
> **Action:** Owned mistake in standup, rolled back, added BrowserStack check to CI for supported browsers, updated PR template.
>
> **Result:** No repeat in 18 months. Learned "small" changes need same test bar when contract specifies browsers.

*(Adapt to your real story if IE11 doesn't apply.)*

---

## Questions to Ask Interviewers

| Question | What good answer sounds like |
|----------|------------------------------|
| First 90 days success? | Specific deliverable, not vague "ramp up" |
| Biggest tech debt? | Honest — shows trust |
| Deploy frequency? | Daily/weekly = healthy; quarterly = yellow flag |
| Speed vs quality? | "We ship MVPs with flags, harden after validation" |
| Real-time today? | WS/poll/hybrid — tells you stack |

---

## 6 Stories Worksheet — Fill Before Interview

| # | Theme | Situation (1 line) | Your action (3 bullets) | Result (metric) |
|---|-------|-------------------|-------------------------|-----------------|
| 1 | Ship fast | | | |
| 2 | Disagreement | | | |
| 3 | Incident | | | |
| 4 | Performance | | | |
| 5 | Mentorship | | | |
| 6 | Ambiguity | | | |

---

## Red Flags Tesla Interviewers Dislike

- Vague "we" without your role
- No numbers in results
- Blaming backend/PM repeatedly
- "I only do frontend" energy
- Waiting passively for perfect spec
- Over-engineering stories (Kafka day one)
- Badmouthing previous employers

---

## Day-of Tips

- Print STAR bullet sheet — glancing is OK
- **"I"** not **"we"** for your contributions
- 2–3 min max per answer — they'll ask follow-ups
- Between rounds: reset mentally — don't spiral on one bad round
- Team lunch: be curious, ask engineers what they're building — not performative

---

## Prep Checklist

- [ ] 6 STAR stories written in worksheet above
- [ ] Each story has at least one metric in Result
- [ ] Why Tesla — record 2 min, listen for authenticity
- [ ] 5 questions for interviewers ready
- [ ] One "failure" story prepared

**Done.** Review [../10-study-plan.md](../10-study-plan.md) for final onsite checklist.
