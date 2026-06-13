# Round 5 — Leadership (AI, Frontend Strategy, Culture)

| | |
|---|---|
| **Format** | VP, Director, or Principal+ peer panel |
| **Duration** | 45–60 min |
| **Eliminates?** | Yes — bar for **Principal Frontend** scope |
| **Focus** | AI in **UI/SDLC**, design system strategy, frontend platform vision, org influence |

---

## What This Round Tests (Principal Bar)

```
Can you set **frontend** technical direction for multiple teams?
Can you articulate AI strategy for **UI development and in-product assist** — not hype?
Can you drive design system and React standards without authority?
Can you connect UI decisions to business outcomes (adoption, support tickets, perf)?
```

> Autodesk invests heavily in AI/ML (reported in employee reviews). Expect **how you use AI today** and **how you'd scale AI responsibly** across an org.

---

## Section A — AI Usage (Hands-On)

### Q1: How do you use AI in your development workflow today?

**Strong answer (specific, honest):**
> "I use AI to accelerate **UI work**, not replace judgment:
>
> **Daily uses:**
> - Generate **Storybook stories** and RTL test scaffolds — I verify a11y and edge cases
> - Explore component splits: 'presentational vs container for this panel'
> - Convert design spec → starter JSX — I align with design tokens manually
> - Debug React perf: paste component + profiler notes → hypothesis list
>
> **Product/UI guardrails:** Never ship AI-generated UI without design review; no customer CAD data in public models."

---

### Q2: How would you introduce AI tools to a 40-person engineering org?

**Answer (change management + guardrails):**
```
Phase 1 — Policy (week 1-2)
  • Legal/security: approved tools, no customer data in prompts
  • Code ownership unchanged — author reviews all output

Phase 2 — Pilot (month 1)
  • 2 squads, measure: PR cycle time, defect rate, developer satisfaction
  • Share prompts that work for our stack (React testing, OpenAPI gen)

Phase 3 — Platform (month 2-3)
  • Internal docs in RAG for onboarding
  • CI checks unchanged — lint, test, SAST
  • Office hours + champions, not mandates

Phase 4 — Product (ongoing)
  • Separate track: AI features in product (copilot, search) with eval harness
```

> "Goal: **velocity with accountability**, not replace engineering judgment."

---

### Q3: RAG vs fine-tuning — when would you use each?

**Answer:**

| | RAG | Fine-tuning |
|---|-----|-------------|
| **What** | Retrieve docs at query time, augment prompt | Train weights on domain corpus |
| **When** | Fresh docs (API refs, internal wikis), cite sources | Stable domain language, style, classification |
| **Pros** | Updatable without retrain; auditable sources | Lower latency at inference; embedded behavior |
| **Cons** | Retrieval quality matters; chunking hard | Expensive; stale without retrain |
| **Autodesk angle** | APS docs, Revit API help, support KB | Specialized terminology for support bots |

> "Default to **RAG + good prompts** first. Fine-tune when RAG latency/cost doesn't meet SLO and you have curated training data."

---

### Q4: How do you prevent hallucinations in production AI features?

**Answer:**
1. **Ground in retrieved sources** — show citations in UI
2. **Constrained outputs** — JSON schema, enum actions
3. **Human-in-the-loop** for high-stakes (structural engineering advice → never auto-apply)
4. **Eval suite** — golden questions, regression on model/prompt changes
5. **Fallback** — "I don't know" + escalate to human
6. **Monitor** — thumbs down, escalation rate, latency, cost per session

---

### Q5: What's your view on AI replacing software engineers?

**Answer (Principal maturity):**
> "AI compresses **implementation** time for well-defined problems. It doesn't replace **judgment** — requirements ambiguity, system trade-offs, security, operability, and stakeholder alignment.
>
> Principals become more valuable: we set guardrails, architecture, and quality culture that AI-assisted teams need **more**, not less. The risk is teams shipping faster without understanding — my job is to raise the bar on review and design."

---

## Section B — AI Strategy (Org Level)

### Q6: How would you build an AI strategy for **frontend engineering** at a design software company?

**Answer:**
> "**User-facing:** AI assist inside products — search projects, summarize comments, suggest view angles — always with human approval for anything that affects the model.
>
> **Engineering-facing:** AI for component generation, test scaffolding, a11y audits, Figma-to-code **starting points** — with design system as the guardrail.
>
> **Platform:** One eval stack for in-product AI; shared RAG over APS docs for developer portal.
>
> **Governance:** No design file content in public LLMs; prompt/version registry; design + legal sign-off for customer-visible AI."

---

### Q7: Describe an AI project you led or influenced.

**Template if you haven't shipped ML:**
> "**Situation:** Support team drowned in duplicate tickets about [API error X].
>
> **Action:** Proposed RAG chatbot over public docs + internal runbooks — I owned architecture, not model training. Node BFF, vector DB, citation UI, escalation to human.
>
> **Result:** 30% deflection in pilot; escalations had full context → faster resolution. Kill criteria defined upfront — if accuracy <85% on golden set, no GA."

**If you have ML experience:** Use real metrics — latency, cost/token, accuracy, A/B.

---

## Section C — Principal Leadership & Strategy

### Q8: How do you define Principal Engineer vs Staff?

**Answer:**
> "**Staff** — technical north star for a large initiative or platform area; deep execution.
> **Principal** — multi-team, multi-quarter **technical strategy**; shapes what gets built across squads; represents engineering to leadership; systematic mentorship.
>
> The shift is **leverage**: Principals win when teams they don't directly manage ship better architecture."

---

### Q9: Tell me about a time you influenced architecture without authority.

**Answer (influence playbook):**
> "**Situation:** Three teams built separate React apps with different state libs, design tokens, and auth flows — inconsistent UX and 3× security review burden.
>
> **Action:**
> - Wrote **problem doc** with customer screenshots, not 'use my library'
> - Built **thin reference app** — auth shell + design tokens + routing — 2-week spike
> - Ran **office hours**, incorporated feedback from squad leads
> - Got EM sponsor for 'recommended default' (not mandate)
>
> **Result:** 2 teams adopted in one quarter; third joined after seeing velocity. Shared package reduced auth bugs to zero for 6 months."

---

### Q10: How do you decide build vs buy?

**Answer framework:**
```
Evaluate:
  • Core differentiator? → Build
  • Commodity (auth, payments, email)? → Buy (Auth0, Stripe, SES)
  • Integration cost vs 2-year TCO
  • Team skill to operate (Kafka cluster vs managed MSK)
  • Exit strategy / vendor lock-in

Example: "For APS Viewer — build on platform API (core). For feature flags — LaunchDarkly/Unleash (commodity ops)."
```

---

### Q11: Technical roadmap for a platform team — how do you prioritize?

**Answer:**
> "Balance **horizon 1** (keep lights on — security, SLOs), **horizon 2** (platform capabilities — shared auth, design system), **horizon 3** (bets — AI-assisted workflows, new collaboration model).
>
> Input: squad pain surveys, incident trends, leadership product bets, tech debt interest payments.
>
> Output: quarterly RFC themes with **explicit trade-offs** — 'We won't do X this quarter because Y unblocks 3 teams.'"

---

### Q12: How do you handle a team that resists your technical direction?

**Answer:**
> "Resistance usually means **lack of safety** or **bad past experience**, not stupidity.
>
> I listen first — what's the fear? Extra work? Failed migration before?
>
> Then: **pilot with volunteers**, measure, let results persuade. If still blocked and decision is critical, escalate with data to EM — but I try proof over politics first."

---

## Section D — System Design (Light / Strategic)

### Q13: How would you scale a **React design system** across 5 product teams?

**Answer:**
```
1. Tokens + primitives (color, type, spacing) — single package
2. Composite components (DataTable, Modal) — documented in Storybook
3. Adoption: recommended default, not mandate; office hours; track import metrics
4. Versioning: semver, codemods for breaking changes
5. Contribution model: teams PR components upstream when reused 2+ times
```

---

### Q14: Multi-region strategy for a global design platform?

**Answer:**
> "**Phase 1:** Single region + CloudFront for static assets + DR failover (RTO/RPO defined)
> **Phase 2:** Read replicas in EU for data residency (GDPR)
> **Phase 3:** Active-active only for stateless tiers; files in S3 cross-region replication; Postgres conflict resolution is hard — prefer **cell-based** architecture (users pinned to region)

Autodesk global user base → data residency matters for EU customers."

---

## Section E — Culture & Personal Fit

### Q15: What kind of culture do you thrive in?

**Answer (align with Autodesk):**
> "Collaborative but **accountable** — honest postmortems, written decisions, respect for deep domain (design/engineering customers). I thrive when Principals are expected to **teach and elevate**, not just approve PRs. Hybrid with intentional in-person for design reviews and relationship building."

---

### Q16: What's the hardest feedback you've received?

**Answer:**
> "A director told me I was **too deep in implementation** and not visible enough on cross-team alignment. I started weekly platform syncs, published RFC summaries for non-attendees, and delegated module ownership. Six months later, three squad leads cited those docs in their planning."

Shows: receptiveness, behavior change, outcome.

---

### Q17: Diversity, inclusion, and psychological safety — your role as Principal?

**Answer:**
> "Principals model **who gets heard** in design reviews. I explicitly ask quiet engineers for input, review for biased language in RFCs, and sponsor junior folks for visible presentations. Technical excellence without inclusion doesn't scale."

---

## Section F — Questions to Ask Leadership

1. "How is Autodesk measuring success for AI investments — product vs engineering productivity?"
2. "What's the Principal engineer career ladder here — IC track vs management?"
3. "What architectural bet are you most worried about in the next 2 years?"
4. "How do Principals partner with EMs — decision rights?"
5. "What would make you excited about me joining in 90 days?"

---

## 60-Second Closing Pitch (If They Ask "Anything Else?")

> "I'm a hands-on **Principal Frontend Engineer** — React platforms, design systems, viewer-grade UIs — and I elevate teams through architecture and mentorship, not heroics. I've adopted AI thoughtfully in UI development and would help Autodesk scale that with guardrails. I'm here because your web surfaces shape how the world gets designed, and that's the work I want to lead."

---

## Cross-Reference

- Principal framing: [commvault 06-principal-level.md](../../commvault-principal-frontend-interview/06-principal-level.md)
- Why Autodesk: [09-why-autodesk.md](../09-why-autodesk.md)
- System design depth: [03-system-design.md](./03-system-design.md)
