# 08 — Learning Roadmap

What to study, in what order, with the highest-signal resources. Calibrated
for someone who already builds frontends day-to-day and is preparing for a
**senior / staff system design round** that may include both general systems
*and* frontend-specific questions.

---

## How to use this roadmap

- **Time budget: 4–6 weeks** of focused prep (1–2 hours/day).
- **Mix theory and practice.** Don't only read; design something each week.
- **Anchor everything to this codebase.** When you read about caching, ask
  "where would this go in `the-app`?" That's how it sticks.
- **Out loud.** Talk through designs to yourself, a friend, or rubber duck.
  Interviews are spoken, not written.

---

## Phase 1 — Fundamentals (Week 1)

**Goal:** Vocabulary fluency. You should be able to define and contrast every
term in [01-fundamentals.md](01-fundamentals.md) without notes.

Topics:
- Latency vs throughput vs availability vs durability
- CAP, eventual consistency, causal consistency
- Caching layers (memory → SW → CDN → backend → DB)
- Load balancing strategies
- SQL vs NoSQL tradeoffs (you don't need to be deep, just literate)
- HTTP fundamentals (verbs, status codes, headers, HTTP/2 multiplexing)
- TCP vs UDP, TLS handshake costs

Resources:
- **Read:** *Designing Data-Intensive Applications* by Martin Kleppmann —
  Chapters 1, 5, 7, 9. The bible. Skim parts that are too deep.
- **Read:** *System Design Primer* on GitHub
  (`donnemartin/system-design-primer`) — Chapters on scaling, caching, CAP.
- **Watch:** Tech Dummies / Gaurav Sen YouTube videos on CAP, consistency.

Drill:
- After each chapter, write one paragraph applying it to `the-app`.

---

## Phase 2 — Frontend system design (Week 2)

**Goal:** Be able to design any frontend at scale.

Topics:
- Micro-frontend patterns (iframes, build-time, Module Federation,
  manifest-driven)
- BFF pattern
- Rendering strategies (CSR, SSR, SSG, ISR, streaming, islands)
- State management at scale (server state vs UI state vs URL state)
- Caching: Apollo, React Query, SWR
- Bundle optimization, code-splitting, tree-shaking
- Core Web Vitals (LCP, INP, CLS, TTFB)
- Perf budgets and CI gates

Resources:
- **Read:** [03-frontend-architecture.md](03-frontend-architecture.md) in
  this pack.
- **Read:** *Patterns.dev* (free online) — Lazy loading, code splitting,
  bundling, image optimization.
- **Read:** Apollo Client docs section on caching, fetch policies, and
  pagination.
- **Read:** TanStack Query (React Query) docs — even if you don't use it,
  the mental model is gold.
- **Watch:** Cam Jackson's talk "Micro-Frontends in Action" or his
  martinfowler.com article.
- **Build:** Take this codebase's Apollo no-op and *actually wire it up*
  on one small flow as a learning exercise (don't commit; just learn).

Drill:
- Design "the Spotify search page" front-to-back: bundle, render strategy,
  data layer, caching, perf budget. 30 minutes, whiteboard-style.
- Design "Twitter/X home feed" — focus on infinite scroll, real-time
  updates, virtualization.

---

## Phase 3 — Data & APIs (Week 3)

**Goal:** Speak fluently about REST, GraphQL, federation, real-time.

Topics:
- REST vs GraphQL vs gRPC
- GraphQL Federation (Apollo Federation)
- Idempotency keys (Stripe's API blog post)
- Pagination styles (offset, cursor, keyset)
- Real-time: polling, long-polling, WS, SSE, GraphQL Subscriptions
- Optimistic vs pessimistic concurrency
- Saga pattern for long-running ops
- Rate limiting (token bucket, leaky bucket)

Resources:
- **Read:** Stripe's "Designing Robust APIs" blog series. Particularly the
  idempotency article — canonical reference.
- **Read:** [04-data-and-apis.md](04-data-and-apis.md) in this pack.
- **Read:** Apollo Federation docs.
- **Watch:** "GraphQL at Scale" talks from Netflix / Airbnb / GitHub.

Drill:
- Take any feature in this codebase and design the *ideal* data layer for
  it. Document tradeoffs.
- Design "Uber ride-tracking" — real-time updates, optimistic UI,
  reconciliation.

---

## Phase 4 — Scale & perf (Week 4)

**Goal:** Be able to size systems, identify bottlenecks, propose fixes.

Topics:
- Latency numbers every engineer should know (Jeff Dean's table)
- Capacity estimation (Fermi-style "how many servers?")
- N+1 problem and DataLoader
- Virtualization for big lists
- Resilience patterns: timeout, retry, circuit breaker, bulkhead, hedged
  requests
- Observability: logs, metrics, traces; RUM vs synthetic monitoring
- Multi-region considerations (cross-region latency, data residency)

Resources:
- **Read:** *Site Reliability Engineering* (Google's book, free online) —
  Chapters on monitoring, alerting, error budgets.
- **Read:** [05-scalability-and-perf.md](05-scalability-and-perf.md).
- **Practice:** Lighthouse / WebPageTest on this app. Find the slow path
  yourself.

Drill:
- "Estimate how many requests/sec a Black Friday sale would generate."
- "How would you debug a P99 latency spike that only affects EU users?"

---

## Phase 5 — Security & compliance (Week 5)

**Goal:** Speak fluently about auth, multi-tenancy, OWASP.

Topics:
- AuthN: cookies vs tokens, OIDC, OAuth 2.0, SSO
- AuthZ: RBAC vs ABAC, PEP/PDP/PIP/PAP
- CSRF, XSS, IDOR, SSRF
- CSP, CORS, SameSite cookies, HSTS
- Multi-tenancy isolation (data, cache, logs)
- Secrets management (no client-side secrets!)
- GDPR / data residency (don't go deep, but know the shape)
- OWASP Top 10

Resources:
- **Read:** [06-security-and-auth.md](06-security-and-auth.md).
- **Read:** OWASP Top 10 (current year).
- **Read:** OWASP Cheat Sheet Series — XSS, CSRF, Authentication.
- **Read:** OAuth 2.0 simplified (`aaronparecki.com/oauth-2-simplified/`).

Drill:
- Threat-model `the-app` using STRIDE. Write down what you'd
  monitor for each threat.
- Design "a multi-tenant SaaS dashboard" — cover auth, AuthZ, isolation
  end-to-end.

---

## Phase 6 — Mock interviews (Week 6)

**Goal:** Performance under pressure.

What to do:
- **2 mocks/week** for two weeks. Friends, peers, paid services
  (Pramp, interviewing.io).
- **Record yourself** designing on whiteboard or Excalidraw, then watch
  back. Painful but high-signal.
- **Time-box.** Most rounds are 45–60 min. You should hit "deep dive on
  one component" by minute 25.

The standard FE system-design interview structure:

```
0-5 min:    Clarify requirements (functional + non-functional)
5-10 min:   API/data model sketch
10-25 min:  High-level architecture
25-40 min:  Deep dive on 1-2 areas (interviewer picks)
40-50 min:  Tradeoffs + what you'd change at scale
50-60 min:  Q&A
```

Practice questions:

1. Design a Google Docs–style collaborative editor (focus: real-time, OT/CRDT,
   offline).
2. Design a Twitter timeline (focus: infinite scroll, virtualization, caching).
3. Design a multi-tenant SaaS dashboard (focus: auth, multi-tenancy, MFE).
4. Design a video streaming player (focus: adaptive bitrate, buffering,
   analytics).
5. Design a stock-ticker dashboard (focus: real-time updates, throttling,
   100s of widgets).
6. Design Notion's block-based editor (focus: state, sync, plugin model).
7. Design Figma's canvas (focus: rendering perf, multiplayer, undo).
8. Design Slack's message list (focus: virtualization, real-time, search).

Pick 4. Do them deeply. The point isn't to memorize answers — it's to
practice the *shape* of an answer.

---

## What "good" looks like in an interview

A senior/staff candidate:

1. **Clarifies before designing.** Asks 3-5 sharp questions.
2. **States non-functional requirements explicitly.** "Let's target P95
   TTI < 2s, 99.9% availability, multi-region."
3. **Draws boxes, but explains the contracts between them.** Not "this
   service connects to this service" but "this service depends on
   <interface> from this service."
4. **Volunteers tradeoffs.** "I picked X over Y because of constraint Z;
   if Z weren't true I'd switch."
5. **Reaches for the right names.** "This is a circuit breaker. This is
   stale-while-revalidate. This is a saga."
6. **Has an opinion on what they'd improve at the next level of scale.**
7. **Acknowledges what they don't know.** "I'm fuzzy on consensus
   protocols; I'd lean on the database team for that decision."

Every one of these is a *behavior*, not a fact. They come from practice.

---

## A weekly checklist

```
[ ] Read 1-2 chapters of DDIA or equivalent
[ ] Write one design exercise (1-2 pages, by hand or Excalidraw)
[ ] Do 1 mock interview
[ ] Reflect: what didn't I have a name for? Look it up.
[ ] Update this codebase's design notes with one new insight
```

---

## Bookshelf (in priority order)

1. *Designing Data-Intensive Applications* — Kleppmann (the must-read)
2. *Site Reliability Engineering* — Google (free online)
3. *Patterns.dev* — Lydia Hallie + Addy Osmani (free, frontend-focused)
4. *Building Micro-Frontends* — Luca Mezzalira (O'Reilly)
5. *System Design Interview Vol 1 & 2* — Alex Xu (interview-shaped)
6. *Web Performance in Action* — Jeremy Wagner (perf, somewhat dated but
   still good fundamentals)
7. *OAuth 2 in Action* — Manning (deeper than you need; skim)

---

## What to skip

- Memorizing AWS service names. Interviewers want patterns, not vendor
  trivia.
- Deep crypto / consensus protocols (Paxos, Raft) unless you're
  interviewing for distributed-systems infrastructure roles.
- Writing actual production code in a system-design interview. They want
  whiteboard, not IDE.
- Memorizing specific numbers (e.g. "S3 has 11 nines"). Knowing orders of
  magnitude is enough.

---

## Final check: are you ready?

Walk into a room and answer this without notes:

> "Walk me through the architecture of the app. Where would it
> break under 100x load? What would you do about it?"

If you can talk for 10 minutes, hitting MFE, sandbox, GraphQL fan-out,
caching gaps, AuthN/AuthZ, multi-tenancy, observability, and end with **two
specific changes you'd ship and why** — you're ready.

If anything in that prompt felt fuzzy, go back to the relevant file in
this folder.
