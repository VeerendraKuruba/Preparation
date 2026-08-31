# Behavioral — Leadership, Execution & Craftsmanship (15 min)

> **Official Round 1 format:** ~15 min soft skills on **Leadership**, **Execution**, and **Craftsmanship** — then ~45 min technical on CoderPad.

Required reading:
- [Kevin Scott — Leadership, Craftsmanship, and Execution](https://www.linkedin.com/pulse/20140718182828-9101035-leadership-craftsmanship-and-execution)
- [Alex Vauthey — From Good to World-Class (7 pillars)](https://engineering.linkedin.com/blog/2016/05/from-good-to-world-class--what-makes-software-engineers-excel-at)

---

## LinkedIn's Three Pillars (Kevin Scott)

Engineering teams that innovate long-term balance three circles in a Venn diagram:

```
        Leadership
           ╱╲
          ╱  ╲
         ╱    ╲
   Craftsmanship — Execution
```

**Holy grail:** All three balanced, valued, and practiced at **every level** — especially Staff.

| Pillar | Definition | Staff signal |
|--------|------------|--------------|
| **Leadership** | Getting people moving in the same direction | Influence without authority; team works when you're away |
| **Execution** | Shipping reliably — "get s**t done" | Deliver under constraints; unblock others |
| **Craftsmanship** | Quality of design and workmanship | Raise the bar; coach others; kill anti-patterns |

### Craftsmanship anti-patterns (memorize — Kevin Scott)

- Unreadable, unmaintainable, untestable, poorly documented code
- Purposeless complexity; ugly architecture
- Crappy UX (including bad APIs)
- Brittle, flaky services hard to troubleshoot

**Staff answer frame:** "I don't just fix the bug — I address the class of craftsmanship failure."

---

## Alex Vauthey's 7 Craftsmanship Pillars

Use these as vocabulary when telling technical quality stories:

| # | Pillar | FE-relevant example |
|---|--------|---------------------|
| 1 | **Code quality & maintainability** | Modular vanilla JS; clear naming; future engineer can extend |
| 2 | **Scalability** | Reusable components; feed handles load spikes |
| 3 | **Extensibility** | Design system primitives used by multiple squads |
| 4 | **Availability / resilience** | Graceful degradation; offline states; error boundaries |
| 5 | **Security** | XSS prevention; sanitize user content; CSP |
| 6 | **Simplicity** | "As simple as possible, but not simpler" — no over-engineering |
| 7 | **Performance** | Core Web Vitals ownership; RUM instrumentation; LCP fixes |
| + | **Operability** | Logging, debuggability, low noise in production |

**Unifying theme:** **Care** — craftsmanship = caring about the work and the next engineer.

---

## Official Question Themes → Story Bank

Prepare **one STAR story per row** (60–90 sec each).

| Official theme | Story prompt | Pillar |
|----------------|--------------|--------|
| Lead team in your **absence** | Vacation/oncall — how did team keep shipping? | Leadership |
| **Uplevel craftsmanship** of other engineers | Code review culture, lint rules, pairing, promotion support | Craftsmanship |
| **Mitigate conflict** | PM vs eng scope; designer vs a11y requirement | Leadership |
| **Execution** under pressure | Deadline + quality trade-off; how you decided | Execution |
| **Project deep-dive** | Largest FE system you owned — scope, impact, metrics | All three |

---

## STAR Template (Phone Screen — Keep Under 90 sec)

```
Situation — 1 sentence (team, scale, stakes)
Task      — YOUR ownership as Staff IC (not "we" for key actions)
Action    — 2–3 concrete steps with craft/leadership/execution verbs
Result    — Quantified outcome + what changed for the team
```

---

## Example Stories (Adapt With Your Experience)

### Leadership — Team operated without you

**S:** Platform squad of 8; I was sole Staff FE leading design system adoption across 3 product teams.  
**T:** Two-week international trip — team had to ship a major nav migration without me in meetings.  
**A:** Before leaving: wrote decision doc with API contracts, delegated DRI per squad, async Slack channel with 24h SLA, pre-recorded architecture walkthrough. Checked in 30 min/day max.  
**R:** Migration shipped on schedule; zero sev-2s; two seniors later cited the decision doc as template for their own leaves.

### Craftsmanship — Upleveled other engineers

**S:** Junior/mid engineers shipping inconsistent async UI patterns — duplicate fetches, no error states.  
**T:** Raise craftsmanship bar without blocking feature velocity.  
**A:** Introduced discriminated union for UI state, shipped headless `useAsyncData` hook, paired on 4 PRs, added ESLint rule banning raw `isLoading` + `error` boolean pairs, ran 2 lunch-and-learns on the pattern.  
**R:** Duplicate API calls −40%; pattern adopted by 3 squads in 6 weeks; became FE style guide default.

### Execution — Shipped under constraint

**S:** Regulator-mandated consent flow — 3-week deadline, incomplete backend API.  
**T:** Deliver compliant UI without waiting for final API contract.  
**A:** Defined OpenAPI mock with legal/PM sign-off, built UI against contract with feature flag, parallel integration when API landed, daily 15-min standup with backend DRI.  
**R:** Launched on day 20; zero compliance findings; reused mock pattern for 2 later launches.

### Conflict mitigation

**S:** PM wanted full feed redesign for launch; eng assessment showed 6-week perf regression risk on mobile.  
**T:** Resolve scope conflict without damaging relationship or missing business goal.  
**A:** Ran side-by-side RUM comparison on prototype, shared LCP data with PM/design, proposed phased rollout — shell first, rich media lazy-loaded in v2. Documented trade-offs in one-pager both sides signed.  
**R:** Launch hit date with v1; LCP held within budget; PM later requested eng earlier in roadmap process.

---

## LinkedIn Culture Values (Weave In Naturally)

| Value | Example phrase |
|-------|----------------|
| Members first | "We prioritized member load time over internal dev convenience" |
| Relationships matter | "I invested in PM relationship before the hard conversation" |
| Demand excellence | "We didn't ship until a11y audit passed" |
| Take intelligent risks | "We flagged the feature behind an experiment rather than blocking launch" |

---

## Staff vs Senior — How Answers Sound Different

| Topic | Senior | Staff |
|-------|--------|-------|
| Craftsmanship | "I write clean code" | "I changed how the team writes code — lint, docs, reviews" |
| Leadership | "I mentored juniors" | "Seniors operated independently using my playbooks" |
| Execution | "I delivered the feature" | "I unblocked 2 teams and delivered the platform piece" |
| Conflict | "We compromised" | "I surfaced data, aligned stakeholders, documented decision" |

---

## Questions to Ask Interviewer (End of 15 min or wrap-up)

1. How does LinkedIn evaluate craftsmanship on FE teams today?
2. What does Staff FE leadership look like — platform, guild, or embedded?
3. How do the three pillars show up in your team's performance reviews?

---

## Prep Checklist

- [ ] Read Kevin Scott blog (15 min)
- [ ] Read Alex Vauthey blog — list 7 pillars from memory (10 min)
- [ ] Write 3 STAR stories: Leadership, Execution, Craftsmanship
- [ ] Practice "tell me about yourself" in 2 min — end with why LinkedIn Staff FE
- [ ] Prepare conflict + "team without you" stories (officially listed)
- [ ] 2-min "why LinkedIn" — members, professional graph, craftsmanship culture
