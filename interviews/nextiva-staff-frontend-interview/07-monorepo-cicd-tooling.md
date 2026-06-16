# Monorepo, CI/CD & Modern Workflows — Nextiva Staff FE Q&A

---

## Q1: Monorepo structure for frontend platform

```
nextiva-frontend/
├── apps/
│   ├── agent-desktop/       # Main agent UI
│   ├── admin-portal/
│   └── browser-extension/
├── packages/
│   ├── ui/                  # Design system
│   ├── api-client/          # Generated from OpenAPI
│   ├── realtime/            # WebSocket client + types
│   ├── config-eslint/
│   ├── config-typescript/
│   └── utils/
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Q2: pnpm workspaces — why over npm/yarn?

- **Content-addressable store** — disk efficient, fast installs
- **Strict `node_modules`** — packages can't access undeclared deps (catches bugs)
- **Workspace protocol** — `"@nextiva/ui": "workspace:*"`
- **`pnpm exec`** — run binaries from package context

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

---

## Q3: Turborepo — task pipeline

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "lint": { "dependsOn": ["^lint"] },
    "test": { "dependsOn": ["^build"], "outputs": [] },
    "typecheck": { "dependsOn": ["^typecheck"] }
  }
}
```

**Commands:**
```bash
turbo run build --filter=agent-desktop...   # app + deps
turbo run lint test --affected              # only changed packages (CI)
```

**Remote cache:** Share build artifacts across CI and dev machines.

---

## Q4: Nx vs Turborepo (know both)

| | Turborepo | Nx |
|---|-----------|-----|
| Focus | Task runner + cache | Full toolkit (generators, graph, affected) |
| Learning curve | Lower | Higher |
| Caching | Remote cache | Remote cache + computation cache |
| Best for | JS/TS monorepos | Polyglot, enterprise |

**Interview answer:** "I've used Turborepo for task orchestration and remote caching; Nx offers richer project graph visualization and codegen — choice depends on team size and needs."

---

## Q5: CI/CD pipeline for frontend monorepo

```yaml
# Simplified GitHub Actions / Bitbucket Pipelines
jobs:
  ci:
    steps:
      - pnpm install --frozen-lockfile
      - turbo run lint typecheck test --affected --base=origin/main
      - turbo run build --filter=agent-desktop...

  preview:
    needs: ci
    steps:
      - turbo run build --filter=agent-desktop
      - deploy to preview URL (S3 + CloudFront / Vercel)

  production:
    if: branch == main
    steps:
      - turbo run build
      - deploy staging → smoke E2E → deploy prod (canary)
```

**Staff additions:**
- Bundle size budget check (fail PR if +50KB)
- Storybook deploy per PR for design review
- Changesets for package versioning

---

## Q6: Affected-only CI — how it works

1. Git diff against base branch
2. Build dependency graph (package.json `workspace:` deps)
3. Run tasks only on changed packages + dependents
4. Turbo/Nx caches unchanged package outputs

**Impact:** 50-package monorepo → 3-package PR runs in 2 min instead of 20.

---

## Q7: Modern dev workflow tooling

| Tool | Purpose |
|------|---------|
| **ESLint** + **typescript-eslint** | Lint + type-aware rules |
| **Prettier** | Formatting |
| **Husky** + **lint-staged** | Pre-commit hooks |
| **Commitlint** | Conventional commits |
| **Changesets** | Version + changelog for packages |
| **Vite** | Fast dev server + HMR |
| **Vitest** | Unit tests (Vite-native) |

---

## Q8: Environment management

```
.env.local          # gitignored, dev secrets
.env.development    # shared dev defaults
.env.staging
.env.production     # only non-secrets; secrets in CI vault
```

**Staff rule:** Never commit API keys; use feature flags for incomplete features.

---

## Q9: Feature flags in product orgs

```typescript
if (flags.newInboxUI) {
  return <InboxV2 />;
}
return <InboxLegacy />;
```

**Benefits:** Trunk-based development, gradual rollout, instant rollback
**Tools:** LaunchDarkly, Unleash, or in-house

---

## Q10: Browser extension in monorepo

**Challenges:**
- CSS isolation (Shadow DOM or CSS modules scoped)
- Shared `@nextiva/ui` with extension-specific build target
- Manifest V3 service worker constraints
- Different auth flow (extension storage)

**Staff approach:** Shared `packages/ui` + `packages/realtime`; separate `apps/extension` entry with platform adapters.

---

## Q11: Code review standards you'd establish

- No `any` without linked issue + timeline
- New UI must use design system primitives
- Loading/error/empty states required
- a11y checklist for interactive components
- Bundle impact noted for new dependencies
- Tests for business logic hooks; RTL for critical flows

---

## Q12: SDLC at product companies

1. **Discovery** — PRD, design review, tech spike if needed
2. **RFC** — Staff writes for cross-team changes
3. **Implementation** — feature branch, preview deploy
4. **Review** — code + design + QA
5. **Release** — feature flag → gradual rollout → monitor
6. **Retro** — incidents, metrics, debt items

**Staff role:** Own RFCs for platform changes; mentor seniors on RFC quality.
