# Principal-Level Engineering — Architecture, Strategy & Leadership (Detailed)

> The differentiating round. Interviewers probe: org-level scope, multi-team impact, technical vision, and the ability to influence without authority.

---

## 1. Principal vs Senior — What the Role Actually Means

**Q: How do you define what a Principal Engineer does that a Senior cannot?**

**Verbal answer:**
> "I think of it in terms of leverage. A senior engineer applies their own skill to solve problems directly — 1x leverage. A principal engineer works through the organization — their code reviews, patterns, libraries, and architectural decisions affect what 20 other engineers build. That's 20x leverage. The work shifts from 'deliver this feature' to 'make this team capable of delivering features without me being in every design review.'"

**Concrete scope differences:**
```
Senior Engineer:
  → Owns features within a product area
  → Makes technical decisions for their own code
  → Raises concerns in their team's planning
  → Mentors occasionally when asked
  → Quality: their PRs and their team's PRs

Principal Engineer:
  → Owns the technical direction of a product domain
  → Defines patterns all teams follow
  → Drives architectural decisions across teams without formal authority
  → Systematically raises the technical bar (talks, docs, review standards)
  → Quality: the overall health of the frontend platform
  → Interfaces with EM, PM, and other disciplines as a technical peer
```

**How I spend my time (rough split):**
```
~40%  Hands-on engineering: coding, prototyping, proof-of-concepts
~25%  Architecture & design: RFCs, design reviews, ADRs
~20%  Mentorship & code review: teaching-focused reviews, 1:1s
~15%  Cross-functional: planning with PM, alignment with backend/infra, hiring
```

---

## 2. Technical Architecture Decisions

**Q: Walk me through a major architectural decision you drove. How did you evaluate options?**

**Verbal answer for a migration scenario:**
> "The clearest example I have is when I led the migration from a legacy class-component Angular 1 app to React with TypeScript. The existing codebase had grown to 200k+ lines over 6 years, had no tests, and was causing 40% of our bug reports. My first step was to define the problem clearly — this isn't 'we want to use React,' it's 'our app is brittle, hiring is hard, and our development velocity is declining.' I reframed the decision around that."

**Framework I use for major architectural decisions:**

```
Step 1 — Define the actual problem (not the solution)
  Before: "We should migrate to React"
  After: "Our 6-year Angular 1 app has 40% bug rate, no test coverage,
          takes 2 weeks to onboard, and we can't hire Angular 1 engineers anymore"

Step 2 — Generate 3+ options (never just one)
  Option A: Rewrite (Big Bang) — rebuild in React, ship when done
  Option B: Strangler Fig Migration — new features in React, migrate old pages progressively
  Option C: Modularize in place — better structure in Angular, defer migration
  Option D: Do nothing — accept the costs

Step 3 — Evaluate each on: risk, reversibility, cost, time, team impact
  Option A (Rewrite):
    + Clean slate
    - High risk: shipping nothing for 6–12 months
    - Historical rewrite failure rate: ~50%

  Option B (Strangler Fig):
    + Low risk: value delivered continuously
    + Reversible at any point
    - Dual-stack complexity during transition
    - Requires iframe boundary or module federation bridge

  Option C (Modularize):
    + No framework change cost
    - Doesn't solve hiring problem
    - Doesn't improve maintainability long-term

Step 4 — Recommendation with explicit assumptions
  "I recommend Option B (Strangler Fig) IF:
   - We can commit to 30% of sprint capacity for migration for 4 quarters
   - We accept 3 months of dual-stack complexity for the auth/shell layer
   - Leadership won't reprioritize migration mid-flight"

Step 5 — Define done and success metrics upfront
  Done: All customer-facing routes in React; Angular bundle removed
  Metrics: Build time, bundle size, LCP, bug rate, dev onboarding time
```

---

## 3. Driving Technical Decisions Across Teams

**Q: How do you get 5 teams to follow a shared technical standard when you have no authority over them?**

**Verbal answer:**
> "The word 'authority' is a trap. If you use formal authority — mandate from the top — you get compliance without buy-in, and people route around your standard the moment you're not looking. The only thing that works long-term is making the right thing the easy thing, and making the standard something teams feel they own."

**My actual playbook:**

```
Step 1: Find the real pain point everyone agrees on
  Don't start with "we need a shared component library"
  Start with: "We have 5 tables in 5 codebases, none of them are accessible,
  and every team is maintaining their own forever — is that a problem?"

Step 2: Build with, not for
  Invite 1–2 engineers from each affected team into the design
  Let them shape the API surface — they understand their constraints
  Their buy-in = organic adoption

Step 3: Start with the smallest useful slice
  Don't ship a complete library before getting feedback
  Ship 3 components — the ones teams hate maintaining most
  Prove the value before asking for commitment

Step 4: Lower switching cost to near zero
  Write a migration guide
  Offer to do the first migration yourself in a consuming team
  Create a codemod if the migration is repetitive

Step 5: Let success speak — don't mandate
  "Team A migrated their table and cut their a11y bugs by 70%"
  Other teams adopt because they want that outcome, not because you told them to

Step 6: After adoption — THEN get formal buy-in
  Once 3+ teams have adopted organically, bring to EM/VP for formal endorsement
  Now it's: "most teams are already doing this, let's make it official"
```

---

## 4. Technical RFC Writing

**Q: What does a good technical RFC look like? Walk me through one.**

**Verbal answer:**
> "An RFC should make a decision — not just describe a problem. The common mistake is writing an RFC that presents options and then waits for consensus. An RFC should come with a recommendation. You're asking for input to stress-test your thinking, not asking for permission."

**RFC Template I use:**

```markdown
# RFC: [Short title describing the change]
**Author:** [Your name]  **Date:** [Date]  **Status:** Draft | Review | Accepted | Rejected

## Problem Statement
What user/developer/business problem does this solve?
Why now? (Cost of not solving it)

## Context & Constraints
What exists today? What can't we change? What's the time horizon?

## Proposed Solution
The recommendation — stated clearly, not buried in the options section.
Architecture diagram, code examples, API surface.

## Alternatives Considered
| Option | Pros | Cons | Why rejected |
|--------|------|------|--------------|
| ...    | ...  | ...  | ...          |

## Implementation Plan
Phase 1 (week 1–2): ...
Phase 2 (week 3–4): ...
Rollout: feature flag / progressive / big bang — and why

## Migration Path
What changes for teams using the old approach?
Is there a codemod? Migration guide? Deprecation timeline?

## Success Metrics
How will we know this worked? Measurement method, timeline.

## Open Questions
Things we need input on specifically. (Keep this list short — 3 max)

## Decision Record
[Filled after RFC is accepted/rejected]
Decision: [What was decided]
Rationale: [Why]
Rejected alternatives: [What was not chosen and why]
```

---

## 5. Build vs Buy vs Borrow

**Q: When do you build a component library vs adopt Material UI vs use Radix UI?**

**Verbal answer:**
> "This decision depends on three variables: time, ownership needs, and team capacity. I've made all three choices at different points. The biggest mistake teams make is building something they should have bought — spending 6 months building a fully accessible dropdown that Radix UI ships for free. The second mistake is buying something and then fighting its opinionated defaults for a year."

```
BUILD (from scratch):
  ✅ You need pixel-perfect brand control
  ✅ Your design system is a competitive differentiator
  ✅ You have dedicated bandwidth (platform team, design system team)
  ✅ The library will be used by 10+ internal teams for 5+ years
  ❌ You're a startup / small team (<10 engineers)
  ❌ You don't have a designer dedicated to the system

BUY (Material UI, Ant Design, Chakra):
  ✅ Speed to market is the priority
  ✅ You can accept the visual/API design decisions
  ✅ Small team that can't maintain a library
  ❌ You need unique branding — MUI takes significant work to override
  ❌ Bundle size is critical (MUI adds ~100KB)

BORROW (Radix + Headless UI + CVA — my recommendation for Commvault's scale):
  ✅ Get accessible behavior for free
  ✅ Own the visual design completely
  ✅ Zero runtime CSS, composable
  ✅ Works with any CSS approach (Tailwind, CSS Modules, Vanilla Extract)
  ✅ "We own the design layer, not the behavior layer"
  Effort: 2–3x more than MUI, 5x less than scratch
```

**Concrete example:**
```tsx
// Radix + cva + Tailwind: accessible, branded, minimal
import * as Dialog from '@radix-ui/react-dialog';
import { cva } from 'class-variance-authority';

const overlayVariants = cva(
  'fixed inset-0 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out',
);

export function Modal({ open, onClose, title, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayVariants()} />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                     w-full max-w-lg bg-white rounded-lg shadow-xl p-6
                     focus:outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
          {children}
          <Dialog.Close asChild>
            <button aria-label="Close" className="absolute top-4 right-4">✕</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
// Radix handles: focus trap, scroll lock, portal, keyboard (Escape), aria-modal
// We handle: visual design, animation, brand tokens
```

---

## 6. Technical Roadmap Ownership

**Q: How do you build and communicate a technical roadmap for a frontend platform?**

**Verbal answer:**
> "A roadmap is a prioritized list of bets. It's not a commitment to specific dates — it's a communication tool to align the team on what we're building and why, so that daily decisions are made in the right direction. At Principal level I own the 'why' and 'what', work with EM on the 'when', and involve the team in the 'how'."

**How I structure a 12-month roadmap:**

```
Q1 — Foundation (high certainty)
  - Migrate to Vite (build times: 120s → 8s — unblocks team velocity)
  - CSS Modules migration from styled-components (remove runtime CSS-in-JS)
  - Error tracking setup (Sentry integration — we're flying blind today)

Q2 — Quality (high certainty)
  - Shared component library v1 (Button, Input, Table, Modal — 80% of UI)
  - E2E test coverage for critical paths (Cypress, 5 core journeys)
  - Accessibility audit + remediation (fail WCAG 2.1 AA today)

Q3 — Platform (medium certainty, depends on Q1/Q2 completion)
  - Module Federation POC (evaluate micro-frontend readiness)
  - Performance budget enforcement in CI (LCP/bundle size gates)
  - Design token system (enable product-level theming)

Q4 — Scale (low certainty — depends on business direction)
  - Micro-frontend migration for [team X] if federation POC succeeds
  - React 19 upgrade (server components, improved Suspense)
  - Developer experience: better monorepo tooling, faster test runs

How I communicate it:
  - Quarterly written update: what shipped, what's next, what changed and why
  - Bi-weekly sync with engineering managers: flag blockers early
  - ADR (Architecture Decision Record) for each completed decision
  - A11y / perf dashboards on the wall — visible proof of impact
```

---

## 7. Handling Technical Disagreement

**Q: A backend team ships an API that will make your frontend significantly more complex. How do you handle it?**

**Verbal answer:**
> "My first move is to understand before disagreeing. Sometimes what looks like a bad API decision has a constraint I'm not aware of. So I schedule a conversation with the backend lead — not to push back immediately, but to understand their reasoning."

**My conflict framework:**

```
Step 1: Seek to understand
  "Help me understand the constraints that led to this shape."
  Often: performance, existing schema, downstream consumer, time pressure

Step 2: Quantify the impact on your side
  Don't say: "This API is hard to use"
  Say: "This response shape requires us to do N transformations on the client,
        adds 50 lines of non-business-logic code per consumer,
        and will need to be duplicated across 3 teams"

Step 3: Propose alternatives with their costs/benefits
  "Option A: We keep this shape — here's the frontend adaptation cost
   Option B: We add a derived field X — here's the backend cost (1 day? 2?)
   Option C: We create a BFF transformation — adds infra complexity

Step 4: Make it a shared problem
  "I'm not saying either approach is wrong — I want to find the option
  that minimizes total engineering cost, not just frontend or backend"

Step 5: Escalate via data if stuck
  If still unresolved: bring to EM + backend EM with the written trade-off analysis
  Frame it as: "We want to make the right call, here's our analysis"
  Don't frame it as: "Frontend vs backend"

Step 6: Accept and commit (or prototype and revisit)
  Once decided — fully commit, even if you disagree
  Ask to revisit after 2 months if you believe the concern will materialize
```

---

## 8. Mentorship at Scale

**Q: You can't mentor everyone 1:1. How do you raise the bar of an entire engineering org?**

**Verbal answer:**
> "Individual mentorship doesn't scale past maybe 3 people. To move an entire org you need to codify the knowledge into systems — written guides, code patterns, automated checks, and cultural norms in code review."

**My toolkit for scaling mentorship:**

```
1. Architecture Decision Records (ADRs)
   Every significant decision written down: context, options, decision, consequences
   Living in the repo — searchable, versioned
   New engineer onboarding: read the last 20 ADRs to understand the system

2. Code review standards document
   "What a good PR looks like at [company]"
   Performance: no .filter().map() where one pass works
   Accessibility: every interactive element gets tested for keyboard
   Types: no 'any', no non-null assertions without comment
   Removes subjectivity — reviewers point to the doc, not their preference

3. Internal tech talks (recorded)
   Monthly 30-min session: deep dive on one topic
   "How does React's reconciler work and what does that mean for performance"
   "What we learned migrating 50k lines from JS to TypeScript"
   Async viewing — engineers in different time zones benefit too

4. Automated checks (enforce by default)
   ESLint rules for common anti-patterns
   axe-core in test suite for a11y
   Lighthouse CI in pipeline for performance budget
   If you want people to write accessible code — make inaccessible code fail CI

5. Inner-source model
   Shared packages owned by a platform team, but PRs from any team accepted
   Engineers who contribute to the platform learn it deeply
   They become advocates in their own team
```

---

## 9. Observability Strategy for Frontend

**Q: How do you instrument a large frontend application for production visibility?**

**Verbal answer:**
> "Frontend observability has three layers: errors, performance, and user behavior. Most teams only instrument errors. That means they find out about performance degradations from user complaints instead of dashboards. I set up all three layers before we launch anything significant."

```js
// === Error tracking (Sentry) ===
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.BUILD_ID,
  tracesSampleRate: 0.1, // 10% of transactions — don't sample 100%
  beforeSend(event) {
    // Scrub PII before sending
    if (event.user) delete event.user.email;
    // Filter noise — browser extensions, known bots
    if (event.exception?.values?.[0].value.includes('ResizeObserver')) return null;
    return event;
  },
  integrations: [
    new Sentry.BrowserTracing({ tracePropagationTargets: ['api.commvault.com'] }),
  ],
});

// === Performance monitoring (Real User Monitoring) ===
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

function reportWebVital({ name, value, rating, id, navigationType }) {
  // Send to DataDog/New Relic
  window.DD_RUM?.addAction('web_vital', {
    metric: name,
    value: Math.round(value),
    rating,                  // 'good' | 'needs-improvement' | 'poor'
    page: location.pathname,
    navigationType,          // 'navigate' | 'reload' | 'back_forward'
  });

  // Also push to internal analytics for p75 tracking
  analytics.track('web_vital', { name, value, rating, page: location.pathname });
}

onCLS(reportWebVital);
onINP(reportWebVital);
onLCP(reportWebVital);
onFCP(reportWebVital);
onTTFB(reportWebVital);

// === Custom performance marks ===
// Measure business-critical interactions beyond standard web vitals
performance.mark('job-list-fetch-start');
await fetchJobs();
performance.mark('job-list-render-complete');
performance.measure('job-list-total', 'job-list-fetch-start', 'job-list-render-complete');

const measure = performance.getEntriesByName('job-list-total')[0];
analytics.track('feature_perf', { feature: 'job-list', duration: measure.duration });

// === User session analytics for critical flows ===
// LogRocket / FullStory — session replay for debugging user-reported issues
LogRocket.init('commvault/prod', {
  shouldCaptureIP: false,  // GDPR
  dom: {
    textSanitizer: true,   // auto-redact sensitive field values
    inputSanitizer: true,
  },
});

// Tag session with context (no PII)
LogRocket.identify(user.id, {
  role: user.role,
  tenantId: user.tenantId,
  plan: user.plan,
  // No: email, name, phone
});
```

---

## 10. Questions to Ask the Interviewer

These signal that you're thinking at organization level, not just job-scope:

1. "What does the current frontend platform look like — monorepo or multiple repos? Micro-frontends or monolith?"

2. "What's the biggest technical challenge for the frontend org in the next 12 months? Is it a quality/debt problem, a scale problem, or a developer velocity problem?"

3. "How are architectural decisions made — does the principal level drive them, or is there an architecture committee?"

4. "What does the relationship between Principal Engineers and Engineering Managers look like here? Who owns the technical roadmap?"

5. "Are there Core Web Vitals tracked in production today? What's the current LCP or INP on the main dashboard?"

6. "What's the test coverage story — are there E2E tests for critical user journeys?"

7. "What does 'success in the first 90 days' look like for this role from your perspective?"
