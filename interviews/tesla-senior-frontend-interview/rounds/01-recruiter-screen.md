# Round 1 — Recruiter Screen (20–30 min)

| | |
|---|---|
| **Format** | Phone / video |
| **Eliminates?** | Rarely — filters fit & logistics |
| **Focus** | Background, fullstack scope, comp, onsite, brief Why Tesla |

---

## What They Evaluate

- Senior FE experience (years, ownership scope)
- Fullstack exposure — API integration, not just UI
- Timeline, visa, location (Fremont / Austin onsite)
- Salary band alignment
- Communication clarity — can you explain your work simply?

---

## Questions & Detailed Answers

### Q1: Walk me through your background.

**What they're really asking:** Are you senior? Do you own outcomes? Is your resume accurate?

**Answer structure (2 minutes):**
1. Current title + years + core stack
2. Scope — team size, what you own end-to-end
3. One flagship project with metric
4. Why you're exploring Tesla now

**Sample answer (customize with your details):**
> I'm a senior frontend engineer with seven years of experience, mostly React and TypeScript in production. For the last three years at [Company], I've been the tech lead on [Product] — a team of four engineers serving about 12,000 daily active users.
>
> I don't just implement mockups. I own the full feature slice: component architecture, API contracts with our Node backend, performance, accessibility, and on-call for our surface. Last year I led a dashboard rewrite that cut LCP from 4.2 seconds to 1.8 seconds by virtualizing large tables and moving data fetching to the server layer.
>
> I'm talking to Tesla because I want that same end-to-end ownership, but on problems tied to real-time operations — factory metrics, service workflows, or energy monitoring — where reliability actually matters.

**What makes this strong:**
- Specific numbers (years, team size, users, LCP)
- "Own" language — not "I was assigned"
- Natural bridge to Tesla

**Weak answer:** Generic buzzwords, no metrics, only lists technologies.

---

### Q2: What projects have you worked on?

**What they're really asking:** Depth vs resume bullet points.

**Pick two projects — tell each in 60 seconds:**

**Project A — UI + performance/scale**
> **Problem:** Ops team had an 8,000-row table that froze on factory tablets.
> **My role:** Led frontend perf work — profiling, virtualization, state colocation.
> **Actions:** Introduced `@tanstack/react-virtual`, split Context so row updates didn't re-render the whole page, worked with backend to paginate API responses.
> **Result:** LCP 4.2s → 1.8s, INP 380ms → 120ms, support tickets about "frozen screen" dropped ~70%.

**Project B — Fullstack / API integration**
> **Problem:** Mobile service app needed offline-tolerant appointment booking.
> **My role:** Owned UI + BFF routes in Next.js — not a separate backend team for the glue layer.
> **Actions:** Designed REST contracts (`POST /bookings` with idempotency key), implemented Route Handlers that aggregated two upstream services, optimistic UI with rollback on failure.
> **Result:** Booking flow shipped in six weeks; duplicate-submit bugs went to zero after idempotency.

**Follow-up they might ask:** "What was hardest?"
> Getting buy-in to cut v1 scope. We dropped photo upload for launch and added it sprint 2 — users cared more about reliable slot booking first.

---

### Q3: Why Tesla? Why now?

**What they're really asking:** Will you stay? Are you genuinely interested or spraying applications?

**This is asked in EVERY round** — see full prep with 3 answer lengths + follow-ups: **[09-why-tesla.md](./09-why-tesla.md)**

**90-second answer (customize):**

> Three reasons.
>
> **First, the problem space.** Tesla software isn't abstract — it connects to vehicles on the road, factory lines, and energy products. I've spent the last few years on real-time dashboards and data-heavy UIs, and I want that work to sit closer to physical operations where latency and reliability have real consequences.
>
> **Second, the engineering scope.** This role is fullstack-heavy frontend — UI through API integration. That's how I already work, and Tesla is one of the few places where that mix is the job itself.
>
> **Third, timing.** I'm senior enough to own features end-to-end. I'm not running from my current company — I'm moving deliberately toward operational, real-time product software at mission scale.

**Follow-ups to prep:** "Why leave current job?" · "Why Tesla over FAANG?" · "What do you know about our software?"

**Avoid:** Stock price, celebrity CEO, "I've always loved Teslas" as the main reason.

---

### Q4: Are you comfortable with fullstack work?

**What they're really asking:** Tesla FE loops are fullstack-heavy — will you fail when asked about APIs?

**Detailed answer:**

> Yes — with an honest scope boundary.
>
> **What I do routinely:** Design and consume REST APIs, implement pagination and error contracts, build BFF-style Route Handlers in Next.js or Express, handle auth via HTTP-only cookies, write integration tests for fetch flows, and pair with backend on shared TypeScript types in a monorepo.
>
> **How I think about architecture:** Next.js isn't just frontend anymore — API routes, Server Actions, and middleware often *are* the backend for many products. I reach for that colocation when one team owns the product surface. I'd push for NestJS or a separate service when we need strict module boundaries, microservices, queues, or an API shared by mobile, web, and partners.
>
> **What I'm not:** A dedicated backend engineer who designs distributed systems all day. But for a senior FE role that owns UI through the BFF layer — that's exactly the scope I want and have been doing.

**Follow-up:** "Have you written backend code?"
> Yes — Node Route Handlers and Express BFFs that aggregate upstream services, validate input, map errors to consistent UI shapes. I don't typically own database schema design alone, but I collaborate on API contracts and have implemented server-side auth middleware.

---

### Q5: What's your compensation expectation?

**Detailed answer:**

> Based on my research for senior frontend roles in [location] and my current total comp, I'm targeting **[X–Y] base** or equivalent total package, depending on level, equity, and scope. I'm flexible if the role is strong fit and the level aligns — can you share the band for this position?

**Tips:**
- Research Levels.fyi / Glassdoor for Tesla SWE in your location
- Give a range, not a single number
- Never undersell — recruiter expects negotiation
- If pressed early: "I'd like to understand scope and level first, but I'm aligned with market for senior FE in this market"

---

### Q6: Are you open to onsite / relocation?

**Detailed answer:**

> Yes, I'm open to onsite in [Fremont / Austin / etc.] for the interview loop and full-time if that's where the team is based. [If relocating:] I'd need [timeline] for relocation but no blockers on my side. [If local:] I'm based in [city] and can be on-site [frequency].

Tesla often flies candidates in for final rounds — express willingness if true.

---

### Q7: What's your notice period / timeline?

**Detailed answer:**

> [X weeks] notice at current company. I can start interviews immediately and target a start date of [date]. I'm not actively interviewing at many places — Tesla is a priority if the process moves in the next [2–4] weeks.

---

### Q8: Do you require visa sponsorship?

**Answer honestly.** If yes: confirm they sponsor for this role before investing weeks in prep.

---

## Questions to Ask Recruiter (with why)

| Question | Why ask |
|----------|---------|
| How many rounds and virtual vs onsite? | Plan prep time |
| Is there a Codility/HackerRank OA? | ~30% of FE candidates report one |
| Which org — Vehicle, Energy, Manufacturing, Internal tools? | Tailor system design examples |
| Is the role fullstack-heavy or UI-only? | Confirm expectations |
| Timeline from onsite to offer? | Manage other processes |
| Who does the team report to / team size? | Context for HM round |

---

## Red Flags to Avoid

- Can't explain your own resume projects in detail
- "I only do React components" — sounds junior for Tesla senior FE
- Badmouthing current employer
- No questions for them — signals low interest
- Unrealistic comp without research

---

## Prep Checklist

- [ ] 2-min pitch written and practiced aloud (record yourself)
- [ ] Two project stories with metrics
- [ ] 90-sec Why Tesla — authentic, not scripted
- [ ] Comp range researched
- [ ] Onsite / visa / notice answers ready
- [ ] 5 questions for recruiter written

**Next round:** [02-hiring-manager.md](./02-hiring-manager.md)
