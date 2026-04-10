# Round 3 — Techno-Managerial Round

This round is with the hiring manager or director. It's a conversation — not a quiz. They assess:
- **Leadership & ownership** — do you drive things or wait to be told?
- **Technical depth** — can you go deep when pushed?
- **Collaboration** — how do you work with PMs, designers, backend teams?
- **Growth & learning** — self-awareness, handling failure
- **Culture fit** — SurveyMonkey values data-driven decisions and customer empathy

---

## Behavioral Questions (STAR Format)

**Situation → Task → Action → Result**

---

### 1. "Tell me about yourself"

**Template:**
> "I'm a Senior Frontend Engineer with X years of experience, primarily in React and TypeScript ecosystems. Most recently at [Company], I [key achievement]. I focus on [your strength: performance, architecture, mentoring]. I'm excited about SurveyMonkey because [specific reason — their product, customer focus, scale of forms/data collection]."

**Tips:**
- 90 seconds max
- End with why SurveyMonkey specifically
- Avoid reading a resume — tell a narrative

---

### 2. "Tell me about a technically complex project you led"

**What they want:** Can you own a complex problem end-to-end?

**Structure your answer:**
- What was the problem and its business impact
- Why it was technically complex
- How you drove the solution (your decisions, trade-offs)
- Measurable outcome

**Example angle:**
> "We had a legacy survey builder built in jQuery that was causing 3x the support tickets of any other product area. I proposed and led a migration to React with a phased rollout — we couldn't take the builder down for 3 months. I designed a strangler fig approach where new question types launched in React while legacy ones stayed, with a shared event bus bridging the two. We reduced bugs by 60% and cut median build-completion time from 8 minutes to 3."

---

### 3. "Tell me about a time you disagreed with a technical decision"

**What they want:** Constructive dissent — can you push back respectfully and accept final calls?

**Example:**
> "Our team decided to adopt Redux for state management, but I felt the complexity wasn't justified for our use case. I put together a quick prototype using React Query + Context and benchmarked both approaches — dev time, bundle size, and onboarding time for new engineers. I shared this in a team meeting without an agenda. After discussion, we agreed to use React Query for server state and keep local state simple. The key was backing my opinion with data, not just preference."

---

### 4. "Describe a time you improved team performance or processes"

**Example:**
> "Our PR review cycle averaged 4 days — blocking delivery. I observed that most comments were about style and minor patterns, not logic. I proposed adopting ESLint + Prettier with CI enforcement. PRs started coming in pre-linted, and review time dropped to 1.5 days. I also introduced a PR template that required a screenshot for UI changes — that alone caught 30% of visual regressions before they reached QA."

---

### 5. "Tell me about a production incident you handled"

**What they want:** Composure, diagnosis skills, communication, blameless culture.

**Structure:**
- What happened (impact in user/business terms)
- How you detected it
- How you diagnosed and fixed it
- What you did to prevent recurrence

**Example:**
> "Our survey embed widget started crashing for 12% of respondents after a deploy. I was on-call. I first checked our error monitoring (Sentry) — immediately saw a type error on `undefined.length` in the serializer. I correlated it with the deploy that introduced a new optional field. I rolled back within 8 minutes. Post-mortem: we added a schema validation layer for API responses and added an e2e test covering nullable fields. We moved from 12% crash rate to 0% within an hour."

---

### 6. "How do you mentor junior developers?"

**What they want:** Leadership without authority, knowledge sharing, patience.

**Example:**
> "I pair program rather than just review code — it's 10x more effective. For junior devs, I resist the urge to just give the answer. I ask 'what have you tried?' and 'what does the error tell you?' first. I've also started internal 'Frontend Friday' — 20-minute talks where anyone shares something they learned that week. Two juniors on my team have since given talks to the full engineering org."

---

### 7. "Why SurveyMonkey? Why this role?"

**Research hooks to use:**
- SurveyMonkey's evolution into Momentive/SM platform — they care deeply about data products
- Their enterprise push — Salesforce integration, complex enterprise survey workflows
- Their commitment to accessibility (surveys must work for all respondents)
- Scale: 20M+ users, survey responses at massive scale

**Example:**
> "SurveyMonkey sits at an interesting intersection — it's a consumer-grade UX that must handle enterprise-scale reliability. The frontend challenges here (complex form builders, real-time analytics, accessibility at scale) align exactly with what I've been solving. I also believe in the product — feedback collection is foundational to how companies improve. I want to work on something that genuinely helps people make better decisions."

---

## Technical Depth Questions (Managerial Style)

These come up when the HM wants to validate your depth:

### "How do you make build/architecture decisions?"

> "I start by understanding constraints — timeline, team size, existing stack. I write an ADR (Architecture Decision Record) that lists: the problem, options considered, trade-offs, and the decision. I circulate it before finalizing. The goal is to make the decision-making process transparent and revisitable — 6 months later anyone can see why we chose X."

---

### "How do you think about frontend performance?"

> "I think in three layers:
> 1. **Load time** — bundle splitting, lazy loading, CDN, critical CSS
> 2. **Render performance** — avoiding unnecessary re-renders, virtualizing large lists, web workers for heavy computation
> 3. **Perceived performance** — skeleton screens, optimistic updates, streaming responses
>
> I measure with Lighthouse CI on every PR and track Core Web Vitals in production via web-vitals library."

---

### "How do you handle technical debt?"

> "I treat it like financial debt — some is acceptable, some is toxic. I track it in a debt registry (a Notion doc or Linear label), categorize by impact and urgency, and negotiate 10-20% of sprint capacity for addressing it. I never just refactor silently — I tie every cleanup to a measurable improvement: 'this refactor reduced build time by 15%' or 'this makes onboarding faster because X'."

---

### "How do you collaborate with designers and PMs?"

> "I involve designers at the component-spec level, not just mockup review. I'll flag infeasible interactions early — 'this animation will jank on low-end devices, here's an alternative.' With PMs, I translate technical constraints into user impact — 'this feature requires 3 sprints not 1 because of X' explained in terms of user value, not engineering complexity."

---

## Questions to Ask the Interviewer

These signal thoughtfulness and genuine interest:

1. "What's the biggest frontend challenge the team is facing right now?"
2. "How does the frontend team collaborate with design — do you use a shared design system?"
3. "What does success look like for a Senior Engineer II in the first 6 months?"
4. "How does engineering influence product decisions at SurveyMonkey?"
5. "What's the on-call rotation like for frontend engineers?"
6. "How does the team handle technical debt — is there dedicated capacity?"
7. "What's the engineering culture around experimentation and A/B testing?"

---

## Culture Signals to Weave In

SurveyMonkey values:
- **Customer empathy** — mention user research, NPS, usability testing
- **Data-driven decisions** — A/B testing, metrics, measuring impact
- **Collaboration** — cross-functional work, not siloed
- **Craftsmanship** — care about quality, accessibility, performance
- **Ownership** — end-to-end, not just "my ticket"
