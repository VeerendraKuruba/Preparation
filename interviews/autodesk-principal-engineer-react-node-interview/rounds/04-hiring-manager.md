# Round 4 — Hiring Manager (Culture, Execution, Collaboration)

| | |
|---|---|
| **Format** | 1:1 with Engineering Manager or Director |
| **Duration** | 45–60 min |
| **Eliminates?** | Yes — significant weight at Autodesk |
| **Focus** | **Frontend leadership** — UI delivery, design partnership, React platform work, execution, culture fit |

> **Role note:** Frame stories around **UI architecture, design systems, perf wins, and cross-functional work with design/PM** — not backend infra ownership.

---

## What the HM Is Evaluating

| Signal | They listen for |
|--------|-----------------|
| **Ownership** | You drove outcomes, not just tasks |
| **Communication** | Clear trade-offs to PM/design/non-engineers |
| **Collaboration** | Disagree constructively; no blame |
| **Execution** | Ship despite ambiguity |
| **Culture fit** | Autodesk values: innovation, impact, respect, learning |
| **Principal readiness** | Influence beyond your squad (even if title is new) |

> **Autodesk pattern:** Heavy resume discussion — "Why did you implement it that way? What were the alternatives?"

---

## Opening Q&A

### Q1: Tell me about yourself (2 minutes)

**Answer template:**
> "I'm a Principal-level **frontend engineer** — React/TypeScript, design systems, and complex web UIs at scale. Most recently at [Company], I [one-line UI impact — e.g., led viewer shell redesign, cut LCP 60%, rolled out shared component library to 4 squads].
>
> I'm interested in Autodesk because [design/build mission + cloud web surfaces — APS Viewer, collaboration UI].
>
> For this role, I want to set **frontend architecture standards** — state patterns, perf budgets, a11y — while staying hands-on on the hardest UI problems."

**Don't:** Recite entire resume chronologically.

---

### Q2: Walk me through your most challenging project.

**STAR structure:**

**Situation:** "Our team owned a legacy [AngularJS / jQuery] admin UI — inconsistent components, 40% of bugs, poor LCP."

**Task:** "Improve UX consistency and dev velocity without a big-bang rewrite."

**Action:**
> "Strangler migration to **React + TypeScript**:
> - Shared **design system** (Button, Modal, DataTable) — I owned tokens and Storybook
> - Route-level code splitting; React Query for server state
> - Paired with design on Figma → component specs
> - Documented state ownership rules in an ADR"

**Result:** "In 3 quarters: bug rate −35%, build time 8min→2min, shipped 12 new features vs 4 prior quarter. Two seniors promoted after owning migration modules."

**Follow-up prep:** What failed? What would you redo?

---

### Q3: Tell me about a conflict with a teammate or PM.

**Answer (disagree-and-commit):**
> "**Situation:** PM wanted a full feature set for v1 launch in 6 weeks; I estimated 10 weeks with quality bar.
>
> **Action:** I built a **scope matrix** — must-have / should-have / cut — with engineering cost and risk. Proposed v1 with must-haves + feature flags for should-haves. Ran a 30-min working session instead of async debate. Documented decision in one-pager for leadership.
>
> **Result:** Shipped in 7 weeks with must-haves; turned on 2 should-haves in week 9. PM appreciated transparency; we reused the matrix template."

**Avoid:** "PM was unreasonable" or "I was right."

---

### Q4: Tell me about a time you missed a deadline or made a significant mistake.

**Answer:**
> "**Situation:** I approved a DB migration script that locked a production table during peak hours — 12 min outage.
>
> **Action:** Led incident response, rolled back, wrote postmortem with timeline and **my** decision error (skipped staging load test). Introduced migration checklist: off-peak window, `CONCURRENTLY` indexes, rollback script required in PR.
>
> **Result:** Zero similar incidents in 18 months; checklist adopted org-wide."

**Shows:** Accountability, systems thinking, learning.

---

### Q5: How do you prioritize when everything is urgent?

**Answer:**
> "I use **impact × urgency × reversibility**:
> 1. Production incidents / security — immediate
> 2. Committed customer dates with contractual SLAs
> 3. Platform debt blocking multiple teams
> 4. Nice-to-have features
>
> I make trade-offs **visible** — shared doc with PM/EM, not silent deprioritization. For Principal scope, I also ask: 'Does this unblock 5 engineers or just my squad?'"

---

### Q6: How do you work with designers and PMs?

**Answer:**
> "Early involvement — I join refinement to flag feasibility and suggest phased UX. I speak in **user outcomes**, not stack names.
>
> Example: Instead of 'we need GraphQL,' I say 'designer's mockup requires 6 round trips — I propose a aggregated dashboard endpoint to hit LCP target.'
>
> I document API contracts before sprint start so design and eng parallelize."

---

### Q7: Why are you leaving your current role?

**Answer (positive framing):**
> "I've grown significantly — led [X] and delivered [Y]. I'm looking for **broader platform impact** at a company where design/build software is the mission. Autodesk's move to cloud-native services and APS is the kind of multi-year technical challenge where Principal-level architecture work matters."

**Don't:** Badmouth manager, comp-only story, or "I'm bored."

---

### Q8: Why Autodesk? Why this team?

See full answer in [09-why-autodesk.md](../09-why-autodesk.md).

**Short version:**
> "Autodesk builds the infrastructure of how the physical world gets designed. The cloud platform transition — web viewers, collaboration, APS APIs — is a rare chance to apply React/Node at global scale in a domain I care about. I want to help teams ship reliable platform patterns, not just features."

---

### Q9: Where do you see yourself in 3–5 years?

**Answer:**
> "Deepening as a Principal — known for [platform area], mentoring staff-track engineers, and shaping technical direction for a product domain. Still coding prototypes and critical paths — I don't see Principal as pure management."

---

### Q10: What questions do you have for me?

**Strong questions:**
1. "What problem is this team solving in the next 12 months that excites you?"
2. "How does Autodesk define success for Principals — promotion criteria vs day-to-day?"
3. "What's the balance of greenfield vs maintaining mature products?"
4. "How does the team collaborate across time zones?"
5. "What's one thing you'd change about how the team works?"

---

## Behavioral Bank — Prepare 6 STAR Stories

| # | Theme | Your story hook |
|---|-------|-----------------|
| 1 | **Technical leadership** | Architecture decision you drove |
| 2 | **Conflict / disagreement** | PM, peer, or cross-team |
| 3 | **Failure / mistake** | Postmortem, what you changed |
| 4 | **Mentorship** | Grew someone's career |
| 5 | **Delivery under pressure** | Deadline, incident, scope cut |
| 6 | **Innovation** | New approach that paid off |

Each story: **60–90 seconds**, include **metric**, name **your** contribution.

---

## Autodesk Culture Signals (Weave In Naturally)

- **Impact:** "Software that helps design sustainable buildings / safer products"
- **Learning:** Postmortems, RFC culture, willingness to say "I don't know yet"
- **Respect:** Credit teams; no hero narrative
- **Innovation:** AI in SDLC (preview for Round 5), cloud transition

---

## Red Flags to Avoid

- Vague answers without your specific role
- Cannot explain *why* behind resume technologies
- Blaming other teams for failures
- Principal candidate who only describes coding tickets
- No questions for the HM

---

## Quick Prep — 30 Minutes Before HM Round

1. Re-read job description — match 3 bullets to your stories
2. Prepare 2-min "about me"
3. Prepare "why leaving" + "why Autodesk"
4. Write 3 questions on paper
5. Calm, conversational tone — this is not an oral exam
