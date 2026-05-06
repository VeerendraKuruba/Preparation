# Micro-Frontend Architecture & Interview Prep

A study pack for senior / staff / principal-level frontend interviews,
anchored on a real production micro-frontend codebase. Concepts grounded in
actual code — not generic theory.

> **Note on sanitization:** Identifying internal data (URLs, Slack channels,
> asset IDs, product/project/team names) has been redacted from these docs.
> Architectural concepts and code snippets are preserved. **However**, the
> markdown links use relative file-system paths that point at a sibling
> repo on disk (under `../../` or `../../../`). Those paths still contain
> the source repo's actual folder name. **Before sharing this folder
> externally, scrub link targets** — see "External-sharing checklist" below.

---

## What's in this folder

```
mfe-architecture-prep/
├── README.md                          ← you are here
├── ARCHITECTURE_WALKTHROUGH.md        ← beginner-friendly tour
├── PRINCIPAL_ENGINEER_QA.md           ← deep architecture Q&A (PE-level)
└── system-design/                     ← full system-design study pack
    ├── README.md                      ← study-pack index + roadmap
    ├── 01-fundamentals.md             ← system-design vocabulary
    ├── 02-application-design.md       ← full design write-up
    ├── 03-frontend-architecture.md    ← MFE, bundling, state, perf budgets
    ├── 04-data-and-apis.md            ← GraphQL, BFF, retries, caching
    ├── 05-scalability-and-perf.md    ← bundle, virt, multi-region, RUM
    ├── 06-security-and-auth.md       ← AuthN/AuthZ, multi-tenancy, OWASP
    ├── 07-interview-qna.md            ← 32 drillable Q&A
    ├── 08-learning-roadmap.md         ← 6-week study plan + resources
    └── 09-opex-tools-and-observability.md
                                       ← CI/CD, logging, RUM, alerts, SLOs
```

---

## How to use this — three modes

### Mode 1: "I just want to understand the app"
1. Read [ARCHITECTURE_WALKTHROUGH.md](ARCHITECTURE_WALKTHROUGH.md) — beginner-friendly,
   one example traced end-to-end.
2. Skim [system-design/02-application-design.md](system-design/02-application-design.md)
   for the full design picture.

### Mode 2: "I'm preparing for an interview round"
1. Start with [system-design/README.md](system-design/README.md) for the study path.
2. Follow the 6-week roadmap in [system-design/08-learning-roadmap.md](system-design/08-learning-roadmap.md).
3. Drill [system-design/07-interview-qna.md](system-design/07-interview-qna.md) out loud.

### Mode 3: "I have a design review tomorrow"
1. [PRINCIPAL_ENGINEER_QA.md](PRINCIPAL_ENGINEER_QA.md) — adversarial Q&A focused
   on tradeoffs, failure modes, what you'd change.
2. Cross-reference [system-design/02-application-design.md](system-design/02-application-design.md)
   for the canonical write-up.

---

## Quick map: which file answers which question

| Question | File |
|---|---|
| What is this app? | [ARCHITECTURE_WALKTHROUGH.md](ARCHITECTURE_WALKTHROUGH.md) |
| How does a widget load? | [ARCHITECTURE_WALKTHROUGH.md](ARCHITECTURE_WALKTHROUGH.md) Stage 2 |
| How does data flow? | [ARCHITECTURE_WALKTHROUGH.md](ARCHITECTURE_WALKTHROUGH.md) Stage 5 |
| How does auth work? | [ARCHITECTURE_WALKTHROUGH.md](ARCHITECTURE_WALKTHROUGH.md) Stage 4 + [system-design/06-security-and-auth.md](system-design/06-security-and-auth.md) |
| Why micro-frontends? | [system-design/03-frontend-architecture.md](system-design/03-frontend-architecture.md) §1 |
| What's the sandbox? | [system-design/02-application-design.md](system-design/02-application-design.md) §6 |
| How would I scale this? | [system-design/05-scalability-and-perf.md](system-design/05-scalability-and-perf.md) |
| What's wrong with the design? | [PRINCIPAL_ENGINEER_QA.md](PRINCIPAL_ENGINEER_QA.md) (every Q probes a weakness) |
| Where do logs go? | [system-design/09-opex-tools-and-observability.md](system-design/09-opex-tools-and-observability.md) §3 |
| What CI/CD is used? | [system-design/09-opex-tools-and-observability.md](system-design/09-opex-tools-and-observability.md) §7 |
| What should I study? | [system-design/08-learning-roadmap.md](system-design/08-learning-roadmap.md) |

---

## TL;DR — the 30-second pitch on this app

The reference codebase is a **micro-frontend plugin** for a host SaaS
application, hosted by a plugin-platform shell. It exposes ~40 widgets that
mount independently inside the host. Each widget receives a **`sandbox`**
prop providing identity, environment, AuthZ, logging, and inter-widget
loading. Data is fetched directly from ~13 backend GraphQL endpoints using
session cookies for auth. State is widget-local; cross-widget communication
goes via props, URL, or backend round-trips. Observability flows through
`sandbox.logger` to a centralized log platform; performance via
`sandbox.performance.startCustomerInteraction`; CI/CD via Jenkins.

Everything else in this folder is detail.

---

## External-sharing checklist

If you ever want to share this prep folder outside your laptop:

- [ ] Verify no internal URLs remain (`grep -r 'intuit\|internal' .`)
- [ ] Verify no internal Slack channels (`grep -r '#ies\|#team-' .`)
- [ ] Verify no asset IDs or numeric internal IDs (`grep -rE '[0-9]{15,}' .`)
- [ ] Verify no internal email addresses (`grep -rE '@[a-z]+\.com' .`)
- [ ] **Replace file-path link targets**: links like
      `(../../multi-entity-ui/src/...)` and `(../../../multi-entity-ui/src/...)`
      reveal the source repo's folder name. Either (a) replace the project
      name in those paths with a generic placeholder, breaking the live
      links, or (b) strip the links and inline the file path as plain text.
- [ ] Spot-check code snippets — class/function names like
      `MultiEntityAllocation`, `logMultiEntityInfo`, etc., were preserved
      verbatim from source. If those names identify the project for an
      external audience, anonymize.
- [ ] Remove the URL example domains (`example.com`) if you'd rather not
      hint at internal endpoints at all.

For purely personal study (this folder stays on your machine), none of the
above is necessary — the redactions in body text already strip the most
identifying material.
