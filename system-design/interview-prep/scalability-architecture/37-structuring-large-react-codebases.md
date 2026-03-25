# 37. Structuring large React codebases

## Goals

Predictable ownership, safe refactors, fast CI, and **clear boundaries** between product areas.

## Common layouts

1. **By feature (vertical slices)** — `features/billing/`, `features/search/` with components, hooks, API, tests colocated. Shared primitives live in `shared/` or `ui/`.
2. **By layer** — `components/`, `hooks/`, `services/` — works for small teams; can blur ownership at scale unless combined with **ownership rules** in docs/CI.
3. **Monorepo packages** — `packages/app-shell`, `packages/design-system`, `packages/feature-x` with internal boundaries enforced by **ESLint boundaries** or TS path rules.

## Engineering practices

- **Public API per package/folder** — re-export from `index.ts`/`index.js`; avoid deep imports across features.
- **Design system** — tokens, primitives, patterns; app code composes; don’t fork button styles per feature.
- **Lazy routes** — code splitting by route/feature to keep initial bundle bounded.
- **Testing pyramid** — unit for pure logic, integration for user flows, contract tests for critical APIs.

## Interview trade-offs

Feature folders improve **team autonomy**; shared horizontal layers can reduce duplication but need **strong governance**.

## One-liner

“**Feature-first folders, shared design system, lazy routes, and explicit package boundaries so teams don’t import each other’s internals.**”
