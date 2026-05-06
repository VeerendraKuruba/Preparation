# Behavioral Questions — STAR Stories (Detailed)

> Commvault values: Customer-first, Innovation, Integrity, Teamwork.
> At Principal level: interviewers want scope (org-wide), influence (cross-team), and measurable outcomes.

---

## STAR Format — What "Good" Looks Like at Principal Level

| Component | Average Answer | Principal-Level Answer |
|-----------|----------------|----------------------|
| **Situation** | "We had a bug in production" | "We had a systemic quality problem across 3 teams — 30% of releases caused regressions" |
| **Task** | "I was the lead developer" | "My role was to define the technical strategy AND get 3 teams to adopt it without any formal authority" |
| **Action** | "I fixed the bug" | Specific steps: what you did first, what resistance you encountered, how you adapted |
| **Result** | "It got better" | Quantified: "Regression rate dropped from 30% to 8% in 2 quarters; onboarding time cut from 3 weeks to 5 days" |

---

## Q1: Technical Leadership Under Pressure

**"Tell me about a time you made a critical technical decision with incomplete information."**

**Full STAR answer:**
> **Situation:** We were 3 days before a major enterprise customer demo when our performance monitoring showed our dashboard's LCP was 12 seconds on a mid-range laptop. The customer's security team blocks CDNs, which meant our cached assets weren't loading. We had 72 hours to fix it without breaking the existing codebase or delaying the demo.
>
> **Task:** As the Principal Engineer, I needed to diagnose the root cause, evaluate options, make a call, and coordinate two engineers to implement it — all within 72 hours with incomplete information about the customer's exact network environment.
>
> **Action:** My first instinct was to investigate, not guess. I reproduced the issue by disabling our CDN in DevTools. LCP jumped from 2.1s to 11.8s — confirmed the CDN dependency. I ran `webpack-bundle-analyzer` and found a single third-party charting library was 340KB uncompressed and not cached. I had three options: (1) self-host the critical assets, (2) code-split the chart so it loads async, (3) replace the library with a lighter one. Option 3 would take a week. Option 1 solved it in hours but had long-term infrastructure cost. Option 2 was the right permanent fix but risky in 72 hours.
>
> I chose Option 1 for the demo and immediately opened a follow-up ticket for Option 2 post-demo. I documented the decision in our ADR file with the reasoning. I also called the customer's IT contact and confirmed which CDN domains they allowed — something I should have done weeks earlier.
>
> **Result:** LCP dropped to 3.1 seconds, well within WCAG's 2.5s guideline and acceptable for the demo. We won the deal. In the following sprint we implemented Option 2 (lazy loading the chart) which brought LCP to 1.8s. I also added a CI check that fails if our CDN dependencies aren't self-hostable — so we'd catch this in advance next time.

**Key principle to state:**
> "When I have incomplete information and a time constraint, I optimize for reversibility. I prefer the option I can undo if I'm wrong. I also document the decision and its assumptions — so if the assumptions turn out to be wrong, we know what to revisit."

---

## Q2: Influencing Without Authority

**"Tell me about a time you drove significant technical change that required buy-in from teams you don't manage."**

**Full STAR answer:**
> **Situation:** We had 6 product teams each maintaining their own form components. As a result, we had 6 different date pickers, 6 different form validation approaches, and at least 4 of them failed WCAG accessibility standards. An audit found that users with assistive technology couldn't complete 3 of our 5 critical workflows. But there was no mandate from leadership to fix it, and each team was under their own delivery pressure.
>
> **Task:** I needed to drive adoption of a shared, accessible form component library — across 6 teams I had no authority over — within 2 quarters, while those teams were shipping features.
>
> **Action:** I didn't start by proposing the library. I started by quantifying the pain. I pulled the accessibility audit report, mapped each violation to a team's codebase, and showed each team lead their own contribution to the problem. When the problem is concrete and personal, people are more likely to own it.
>
> Then I ran a discovery sprint: I paired with one engineer from each team for 2 days to understand their constraints. What came out: teams feared migration would break existing tests, they were worried about design drift, and they didn't want to be blocked on another team's release schedule.
>
> I proposed a design based on those constraints: Radix UI primitives (accessible for free), wrapped in our design tokens (visual consistency), published independently per component so each team can adopt at their own pace. I built the first 3 components and did the migration myself in one team — writing a migration guide as I went.
>
> After that team's a11y audit score improved by 60%, other teams wanted the same result. Adoption was pull-based, not push-based. Within 5 months, 5 of 6 teams had adopted the library for new components.
>
> **Result:** Our WCAG 2.1 AA compliance rate went from 45% to 87% across the product. The remaining team adopted it when they started a major redesign 2 months later. The library is now part of our onboarding standard — every new frontend engineer learns it in week 1. More importantly, we went from 6 teams maintaining their own date pickers to zero — about 400 hours/year of maintenance eliminated.

---

## Q3: Conflict with a Senior Stakeholder

**"Tell me about a time you disagreed with a technical decision made by someone more senior."**

**Full STAR answer:**
> **Situation:** Our VP of Engineering had decided we'd adopt a particular state management library across all frontend teams — chosen based on a talk he'd seen at a conference. I had serious concerns: the library had a 12KB footprint, poor TypeScript support, and only one major contributor on GitHub. But this was a VP decision, already communicated to the teams.
>
> **Task:** Raise the concern professionally, with data, without damaging the relationship or appearing to be challenging authority for ego reasons.
>
> **Action:** I asked for 30 minutes with the VP — not in front of the team. I framed the conversation: "I want to make sure we've considered some risks before we invest in this direction. Can I share what I've found?" Not: "I think you're wrong."
>
> I prepared a written one-pager: library A (chosen) vs library B (my recommendation, Zustand) vs library C (Redux Toolkit) — comparing bundle size, TypeScript quality, community health (npm downloads/week, GitHub contributors, open issues), and migration effort. I also included a small code sample showing TypeScript autocomplete quality difference.
>
> The VP's concern about Zustand was that it was "too simple" and might not scale. I acknowledged that was a valid concern, proposed a 2-week proof-of-concept in our most complex state management scenario, with agreed criteria for "passes."
>
> The POC showed Zustand handled the complexity cleanly. The VP updated the decision. He later told me he appreciated the way I framed it — the written doc meant he could review it on his own time, and framing it as risk assessment rather than opposition made it safe to change his mind.
>
> **Result:** We adopted Zustand. Our initial bundle size target was met; our TypeScript error rate in state-related code dropped significantly. More importantly, the VP now regularly asks me to do these "pre-mortems" on architectural decisions — that's the relationship I wanted to build.

---

## Q4: Mentorship that Moved Someone

**"Tell me about a time you significantly contributed to another engineer's career growth."**

**Full STAR answer:**
> **Situation:** We had a talented mid-level engineer — strong coder but consistently getting "not yet" on their Staff engineer promo review. The feedback from the review panel: "Solves assigned problems well, doesn't yet identify and solve unassigned problems." She'd been in the same position for 2.5 years and was starting to consider leaving.
>
> **Task:** Help her bridge the gap from "executes well" to "operates with Staff-level initiative" — without micromanaging or projecting what I thought she should do.
>
> **Action:** I started with a conversation, not a prescription. "What problem in our codebase frustrates you most that nobody's fixing?" She said: our internationalization (i18n) setup was inconsistent across apps, strings were duplicated, and adding a new language would take 3 weeks per app. That was her problem to own.
>
> Over 3 months I provided scaffolding:
> - We did weekly "design reviews" where she'd draft an approach and I'd ask clarifying questions (not give answers). "What happens if the translation keys change mid-release?" "How would another team adopt this?"
> - I nominated her to present her design to the broader frontend guild — getting her visible to the org.
> - I explicitly coached her on RFC writing — the format, but also the political skill: how to bring skeptics into the conversation before the formal review.
>
> She drove the i18n solution to completion, got it adopted by 4 teams, and documented it so thoroughly that it became part of our onboarding. The review panel approved her promo 6 months later. The feedback: "Clear evidence of identifying and driving cross-team impact."
>
> **Result:** She got promoted. More importantly, she's now doing the same for a junior engineer on her team — that's the multiplier effect I wanted.

---

## Q5: Handling Scope Creep / Protecting Quality

**"Tell me about a time requirements kept changing and you had to make hard calls about what to cut."**

**Full STAR answer:**
> **Situation:** We were building a new job monitoring dashboard with a 6-week deadline for a beta launch. 2 weeks in, the PM added requirements for bulk actions, export to CSV, real-time notifications, and a new chart type. Each of those was 1–2 weeks of work. We couldn't fit them all.
>
> **Task:** Make the scope call with the PM without damaging the relationship, and deliver a beta that was genuinely useful rather than a half-built everything.
>
> **Action:** I didn't say "no" to the features. I asked: "What does a successful beta look like from a user perspective?" Together we landed on: users can monitor their jobs, take basic actions (retry, cancel), and understand why a job failed. Everything else was enhancement.
>
> I wrote a MoSCoW list (Must have, Should have, Could have, Won't have) and walked through it with PM and design lead. For each "should have" I gave a rough effort estimate and asked them to rank-order. Real-time notifications moved to "should have" because job status updates in 5-second polling intervals were acceptable for beta. Export moved to "could have" — users could still see the data, just couldn't download it.
>
> I also built the architecture to make adding these features easy post-launch: the notification system was architected as a pluggable WebSocket subscription that we could activate in sprint 2.
>
> **Result:** Beta launched on time with the core 4 features. User research post-beta showed export was the #1 requested feature — which validated the priority call and made the case for fast-following it in the next sprint. We shipped export 3 weeks post-beta.

---

## Q6: Recovering from a Technical Mistake

**"Tell me about a time a technical decision you made turned out to be wrong."**

**Full STAR answer:**
> **Situation:** I made the call to implement our frontend architecture as a micro-frontend with Module Federation. I had read about the benefits, seen a successful case study, and was confident it was the right call for our 4-team setup.
>
> **Task:** 3 months in, multiple problems emerged: shared state was hard to synchronize, the CI pipeline was 40% slower because 4 remotes built separately, and onboarding a new engineer required understanding 4 codebases to fix a bug that crossed module boundaries.
>
> **Action:** I called a retrospective specifically about the architecture decision. I didn't wait for someone else to raise it. I went in with a written analysis of what assumptions I'd made that turned out to be wrong: I'd assumed teams would stay clearly separated, but in practice they needed to share state much more than I anticipated. I'd assumed CI time wouldn't matter as much — it did.
>
> I proposed rolling back the Module Federation boundary for the 3 most tightly coupled modules, keeping it only for 1 module that was genuinely independent (the reports module, owned by a team in a different timezone). This was a painful call — it meant 2 weeks of re-integration work.
>
> **Result:** CI times went from 14 minutes to 5 minutes. Cross-cutting bugs were diagnosed in one codebase instead of 4. The one remaining remote (reports module) still ships independently, which was the original value proposition.
>
> What I learned: "Micro-frontends are a solution to organizational problems as much as technical ones. The architecture fit our organizational structure 6 months earlier when teams were more siloed. I should have re-evaluated as teams started collaborating more."

---

## Opening "Tell Me About Yourself" — Principal Level

*"I'm a Principal Frontend Engineer with [X] years of experience building large-scale React applications. My work sits at the intersection of hands-on engineering and architectural leadership — I spend time both writing production code and defining the patterns that other teams follow.*

*What I find most valuable at this level is identifying the leverage points: the architectural decisions, shared libraries, or standards that multiply the output of the entire team, not just my own.*

*Most recently, I [one concrete accomplishment — e.g., 'led the migration from a legacy Angular app to a React + TypeScript monorepo that cut our deployment frequency from monthly to daily and brought our LCP from 8 seconds to 1.4 seconds'].*

*I'm excited about Commvault specifically because building enterprise-grade UIs for data protection is genuinely hard — you have real-time requirements, complex workflows, high stakes (IT admins are protecting critical business data), and an organization complex enough that architectural decisions matter. That's exactly the type of environment where the Principal role creates real impact."*
