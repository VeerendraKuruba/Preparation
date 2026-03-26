# Q9. Design system / frontend platform (many teams)

**Prompt variants:** Frontend at **50+ teams**—how do UI and releases scale?

 [← Question index](./README.md)

**Also:** [Micro frontends](../micro-frontends.md) · [Airbnb DLS](../airbnb-design-system.md)

---

### One-line mental model

**Contracts beat heroics**: versioned packages, tokens, examples, and **governance** so product teams move fast without **N conflicting** button implementations.

### Clarify scope in the interview

Monorepo? Mobile + web? Who approves breaking changes?

### Goals & requirements

- **Functional:** components, themes, a11y baselines, docs.
- **Non-functional:** adoption, **semver**, CI visual diff, bundle size.

### High-level frontend architecture

Design tokens → **component library** packages → **app shells** (optional **module federation** / MFE)—see [micro-frontends.md](../micro-frontends.md) and [airbnb-design-system.md](../airbnb-design-system.md).

### What the client does (core mechanics)

1. **Tokens** single source; codemods for renames.
2. **Visual regression** + Storybook (or similar).
3. **RFC** for breaking API changes; **deprecated** paths with timeline.

### Trade-offs

Central DS vs team autonomy; MFE bundle duplication vs deploy independence.

### Failure modes & degradation

Fallback older package on failed canary; **feature flags** for risky rollout.

### Accessibility checklist

Components ship with **tested** patterns (focus trap, dialog, combobox).

### Minute summary (closing)

“We scale UI with **tokens + versioned components + governance**, optional **MFE** boundaries for deploy independence, and **tooling** that catches visual and a11y regressions before users do.”

---

## For a ~60 minute round

### Suggested time boxes

| Block | Minutes | Focus |
|-------|--------:|--------|
| Clarify + requirements | 8–12 | Web + native? Monorepo? Release cadence, compliance brand |
| High-level architecture | 12–18 | Tokens → packages → apps; CI; docs portal |
| Deep dive 1 | 12–18 | **Governance** (RFC, semver, deprecation) |
| Deep dive 2 | 12–18 | **MFE / scaling teams** or **quality** (VRT, a11y tests) |
| Trade-offs, failure, metrics | 8–12 | Version skew, rollback, adoption |

### What to draw (whiteboard)

- **Tokens** (color/type/space) → **@corp/ui-components** → **product apps** (and optional **remote** chunks).
- **CI:** lint, unit, **VRT**, bundle size budget on PR.
- **Release train:** canary app consumes `next` tag optional.

### Deep dives — pick 2

**A. Governance** — RFC for breaking props; **semver** discipline; deprecation windows; **codemods**; who owns **breaking** releases; SLAs for bugfixes in primitives.

**B. Micro-frontends** — When to split: team ownership, deploy isolation, **routing** composition, shared deps policy (dedupe vs duplicate). See [micro-frontends.md](../micro-frontends.md) and [airbnb-design-system.md](../airbnb-design-system.md).

**C. Quality gates** — Storybook + interaction tests; **axe**/ Playwright a11y; visual snapshots flaky management; **bundle analyzer** in CI.

**D. Theming & branding** — Token tiers; white-label overrides; dark mode; contrast budget.

### Common follow-ups

- **“Designers code?”** — Figma → tokens pipeline (brief); automatic **token** PRs; human review.
- **“Third-party widgets?”** — Isolate CSS (**shadow** boundary imperfect on web); lazy load; contracts for sizing.
- **“Emergency hotfix?”** — Patch version; cherry-pick; **override** via CDN flag; comms to consumers.

### What you’d measure

- **Adoption:** % imports from DS vs rogue copies (code search).
- **Health:** issue MTTR on P0 components; bundle size trend; **a11y** violations caught in CI vs production.

