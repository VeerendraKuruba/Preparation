# 37. Structuring Large React Codebases

## The Problem

Imagine 50 engineers, 200 features, and one monorepo. With a type-based folder structure (`components/`, `hooks/`, `services/`) you quickly hit:

- **Merge conflicts**: every new feature touches the same top-level folders
- **Implicit coupling**: `hooks/useInvoice.ts` imports from `hooks/useUser.ts` imports from `services/api.ts` — the dependency graph is a web with no enforced boundaries
- **Unclear ownership**: who owns `components/Table.tsx`? The billing team? The analytics team? Both?
- **Slow CI**: a change to `services/api.ts` potentially invalidates every test in the repo

The solution is **feature-based (vertical slice) organization** with explicit boundaries.

---

## Type-Based vs Feature-Based: Why Feature-Based Wins

```
TYPE-BASED (fails at scale)          FEATURE-BASED (scales)
─────────────────────────────        ───────────────────────────────────
src/                                 src/
  components/                          features/
    Button.tsx                           invoices/
    Table.tsx         ← who owns?          components/
    InvoiceRow.tsx                           InvoiceTable.tsx
    UserCard.tsx                             InvoiceRow.tsx
  hooks/                                 hooks/
    useInvoice.ts     ← tangled            useInvoices.ts
    useUser.ts                             useInvoiceFilters.ts
    usePagination.ts                     api/
  services/                                invoiceApi.ts
    api.ts            ← everyone          types/
    invoice.ts        ← imports from        Invoice.ts
    user.ts                              index.ts  ← public API barrel
  pages/                               users/
    InvoicesPage.tsx                     components/
    UsersPage.tsx                        hooks/
                                         api/
                                         index.ts
                                   shared/
                                     ui/           ← design system primitives
                                     utils/
                                     hooks/        ← truly reusable hooks
                                     types/
```

With feature-based structure, a developer working on invoices stays entirely within `features/invoices/`. Other teams stay out unless going through the public API (`index.ts`).

---

## Feature Module Anatomy

```
features/invoices/
├── components/
│   ├── InvoiceTable.tsx        ← list view
│   ├── InvoiceRow.tsx          ← single row (not exported — internal)
│   ├── InvoiceDetail.tsx       ← detail panel
│   ├── InvoiceFilters.tsx      ← filter bar
│   └── CreateInvoiceModal.tsx  ← create form in modal
│
├── hooks/
│   ├── useInvoices.ts          ← React Query list hook
│   ├── useInvoice.ts           ← React Query detail hook
│   ├── useCreateInvoice.ts     ← mutation hook
│   └── useInvoiceFilters.ts    ← local filter state management
│
├── api/
│   ├── invoiceApi.ts           ← fetch functions (no React)
│   └── invoiceKeys.ts          ← React Query key factory
│
├── types/
│   └── Invoice.ts              ← Invoice, InvoiceStatus, InvoiceFilters
│
├── utils/
│   └── invoiceFormatters.ts    ← formatCurrency, formatDueDate
│
├── __tests__/
│   ├── InvoiceTable.test.tsx
│   └── useInvoices.test.ts
│
└── index.ts                    ← PUBLIC API — only what other features need
```

### The Barrel File (index.ts) — Public API Contract

```typescript
// features/invoices/index.ts
// This file defines what the rest of the app is allowed to import.
// Internal components like InvoiceRow are NOT exported here.

export { InvoiceTable } from './components/InvoiceTable';
export { InvoiceDetail } from './components/InvoiceDetail';
export { useInvoices } from './hooks/useInvoices';
export { useInvoice } from './hooks/useInvoice';
export type { Invoice, InvoiceStatus } from './types/Invoice';

// NOT exported (internal implementation detail):
// InvoiceRow, useInvoiceFilters, invoiceApi, invoiceKeys
```

Other features import like this:
```typescript
// features/payments/components/PaymentForm.tsx
import { useInvoice } from 'features/invoices'; // goes through barrel
// NOT: import { useInvoice } from 'features/invoices/hooks/useInvoices' ← deep import, forbidden
```

---

## Enforcing Boundaries with ESLint

Without automation, boundary rules are forgotten under deadline pressure. Use `eslint-plugin-import` or the `@nx/enforce-module-boundaries` rule to make violations a CI failure.

### With eslint-plugin-import

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // Prevent deep imports across feature boundaries
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            // Block: import from another feature's internals
            group: ['features/*/components/*', 'features/*/hooks/*', 'features/*/api/*'],
            message:
              'Import from the feature barrel (features/featureName) instead of internal paths.',
          },
        ],
      },
    ],
  },
};
```

### With Nx (Recommended for Large Teams)

```json
// nx.json or project.json — define tags per project
{
  "projects": {
    "feature-invoices": { "tags": ["scope:invoices", "type:feature"] },
    "feature-users":    { "tags": ["scope:users",   "type:feature"] },
    "shared-ui":        { "tags": ["scope:shared",  "type:ui"] }
  }
}
```

```javascript
// .eslintrc.js
{
  "@nx/enforce-module-boundaries": [
    "error",
    {
      "depConstraints": [
        // features can import from shared, but not from each other directly
        { "sourceTag": "type:feature", "onlyDependOnLibsWithTags": ["type:feature", "type:ui", "scope:shared"] },
        // shared ui cannot import from features
        { "sourceTag": "scope:shared", "onlyDependOnLibsWithTags": ["scope:shared"] }
      ]
    }
  ]
}
```

---

## Monorepo Structure with Nx or Turborepo

For very large apps (multiple product areas or teams that deploy independently), go further with workspace packages:

```
monorepo/
├── apps/
│   ├── web/                    ← main customer-facing SPA
│   └── admin/                  ← internal admin panel (separate deploy)
│
├── packages/
│   ├── ui/                     ← design system (Button, Modal, Table...)
│   │   ├── src/
│   │   └── package.json        ← "@company/ui"
│   │
│   ├── api-client/             ← typed API client, shared between apps
│   │   ├── src/
│   │   └── package.json        ← "@company/api-client"
│   │
│   ├── utils/                  ← date formatters, validators, etc.
│   │   └── package.json        ← "@company/utils"
│   │
│   └── auth/                   ← auth logic, useAuthStore, PermissionGuard
│       └── package.json        ← "@company/auth"
│
├── turbo.json                  ← or nx.json
└── package.json
```

```json
// turbo.json — parallel build pipeline
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],   // build dependencies first
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "cache": true              // cache test results — only re-run on file change
    },
    "lint": {
      "cache": true
    }
  }
}
```

With Turborepo, `turbo build` only rebuilds packages whose files changed. A change to `packages/utils` rebuilds `utils`, then any package that depends on it. A change in `features/invoices` only rebuilds the web app. This keeps CI fast as the repo grows.

---

## Lazy Loading Feature Routes

Each feature route is a separate dynamic import, which means a separate webpack/vite chunk. Users don't download invoice code until they navigate to invoices.

```typescript
// app/router.tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Each feature is its own chunk — downloaded on demand
const InvoicesPage  = lazy(() => import('features/invoices/pages/InvoicesPage'));
const UsersPage     = lazy(() => import('features/users/pages/UsersPage'));
const ReportsPage   = lazy(() => import('features/reports/pages/ReportsPage'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        path: 'invoices',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <InvoicesPage />
          </Suspense>
        ),
      },
      {
        path: 'users',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <UsersPage />
          </Suspense>
        ),
      },
    ],
  },
]);
```

A bundle analyzer (webpack-bundle-analyzer or Rollup's built-in visualizer) should show each feature as its own chunk. Initial JS should be only the app shell + the current route.

---

## Shared Layer — What Goes There

Not everything is a feature. Shared code has different rules:

```
shared/
├── ui/                         ← primitives with no business logic
│   ├── Button/
│   ├── Modal/
│   ├── DataTable/
│   └── index.ts
│
├── hooks/                      ← generic, truly reusable hooks
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   ├── usePagination.ts        ← generic pagination — no invoice concept
│   └── useClickOutside.ts
│
├── utils/
│   ├── date.ts                 ← formatDate, parseDate
│   ├── currency.ts             ← formatCurrency
│   └── validation.ts           ← isEmail, isRequired
│
└── types/
    ├── pagination.ts           ← PaginatedResponse<T>
    └── api.ts                  ← ApiError, ApiResponse<T>
```

**Rule**: if two features need the same thing, it goes to `shared/`. If only one feature needs it, it stays in that feature. Don't "pre-optimize" into shared — wait for the second use case.

---

## When to Split into Separate Repos (MFE Boundary)

Stay in a monorepo until:

1. **Deployment cycles truly diverge** — the payments team needs to deploy 10x/day; the reports team deploys weekly. A monorepo forces them to coordinate.
2. **Team sizes force it** — 5+ teams, each 8+ engineers, with genuinely different tech stacks.
3. **Build times are unacceptable** — even with Nx/Turborepo caching, CI takes 45+ minutes.

Do NOT split because of "loose coupling" or organizational politics. Monorepos with good boundaries give you most of the autonomy benefits without the overhead of cross-repo dependency management.

---

## Testing Strategy by Layer

```
Unit tests       → pure functions in utils/, type validators, hook logic in isolation
Integration      → feature component + hooks + MSW-mocked API (no real network)
E2E (Cypress)    → critical user journeys across features (checkout flow, auth flow)
Contract tests   → API shape validation (Pact or OpenAPI snapshot tests)
```

Keep integration tests per-feature — they run fast, can be parallelized per-package, and catch regressions without full E2E overhead.

---

## Summary Sound Bite

"Feature-first folder structure means each feature owns its components, hooks, API calls, and types in one directory. A barrel `index.ts` defines the public contract — other features import only from there, never from internal paths. ESLint rules or Nx boundaries enforce this automatically. Feature routes are lazy-loaded as separate chunks. Shared primitives live in a dedicated package that features depend on, not the other way around. The test for whether a structure works: can a new engineer find everything related to invoices in 30 seconds without grepping?"
