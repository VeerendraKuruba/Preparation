# Design Problem 2: Component Library / Design System for 3,000 Engineers

**Prompt:** "Design a frontend design system that will be used by 3,000 engineers across 50 product teams at JP Morgan."

**What they test:** Architecture thinking at org scale, tokens, versioning, governance, multi-framework, accessibility, DX ownership.

> Real-world mirror: JPMC built this — it's called **Salt DS** (open-sourced) + **Manhattan Design System** (internal). Mention this.

---

## The Core Challenges (State These First)

1. **Scale:** 3,000 engineers can't all be blocked by one team's release cycle
2. **Consistency:** 50 teams building independently will diverge unless there's a single source of truth
3. **Flexibility:** Teams need to customize without forking — a fork is a maintenance nightmare
4. **Multi-framework:** React is primary but some teams run Angular or plain HTML
5. **Accessibility:** JPMC is legally and ethically required to meet WCAG 2.1 AA
6. **Breaking changes:** A semver major in a shared library can block 50 teams simultaneously

---

## Step 1: Requirements Clarification

### Functional
- Shared component primitives: Button, Input, Select, Checkbox, Modal, Table, etc.
- Shared patterns (composed from primitives): FilterPanel, DataTable, FormLayout, DateRangePicker
- Design tokens: colors, spacing, typography, shadows — consistent across all surfaces
- Theming: dark/light mode, brand variants (JPMC, Chase, JPM Private)
- Charts / data viz: financial data components (candlestick, sparklines, gauges)
- Icons: a managed icon set shared across products

### Non-Functional
- **Adoption:** teams can install and start using in < 1 day
- **Bundle impact:** consuming one component shouldn't import the entire library
- **Accessibility:** WCAG 2.1 AA on every component — non-negotiable at JPMC
- **Stability:** breaking changes must be rare and well-communicated (< 1 major per year target)
- **DX:** Storybook docs, TypeScript types, Figma design kit, codemod tooling

---

## Step 2: Architecture Overview

```
Source of Truth
┌──────────────────────────────────────────────────────────────────┐
│                       DESIGN TOKENS                              │
│   tokens.json (W3C Design Token format)                         │
│   → Style Dictionary pipeline                                    │
│   → CSS custom properties  (web)                                 │
│   → JS/TS token objects    (component logic)                     │
│   → Figma tokens plugin    (design tool sync)                    │
│   → iOS/Android tokens     (future native support)               │
└──────────────────────────────────────────────────────────────────┘
                          │
                          ▼
Package Structure (monorepo, Turborepo)
┌──────────────────────────────────────────────────────────────────┐
│  @jpmc/ds-tokens        — raw token values only, no code        │
│  @jpmc/ds-core          — primitives (Button, Input, Select...) │
│  @jpmc/ds-patterns      — compositions (DataTable, FilterPanel) │
│  @jpmc/ds-charts        — financial data viz (D3-backed)        │
│  @jpmc/ds-icons         — SVG icon components                   │
│  @jpmc/ds-web-components — WC wrappers for non-React teams     │
└──────────────────────────────────────────────────────────────────┘
                          │
                          ▼
Distribution
┌──────────────────────────────────────────────────────────────────┐
│  Internal NPM registry (Artifactory)                             │
│  Storybook (documentation + visual regression tests)            │
│  Figma library (design kit, stays in sync with tokens)          │
│  VS Code extension (snippet + prop autocomplete)                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## Step 3: Design Tokens — The Foundation

### 3.1 Token Structure (W3C Design Token Community Group format)

```json
// tokens/base.tokens.json — primitive values, never used directly in components
{
  "color": {
    "blue": {
      "100": { "$value": "#dbeafe", "$type": "color" },
      "500": { "$value": "#3b82f6", "$type": "color" },
      "900": { "$value": "#1e3a8a", "$type": "color" }
    },
    "red": {
      "500": { "$value": "#ef4444", "$type": "color" }
    }
  },
  "spacing": {
    "1": { "$value": "4px",  "$type": "dimension" },
    "2": { "$value": "8px",  "$type": "dimension" },
    "4": { "$value": "16px", "$type": "dimension" },
    "6": { "$value": "24px", "$type": "dimension" }
  },
  "fontSize": {
    "sm":  { "$value": "12px", "$type": "dimension" },
    "base":{ "$value": "14px", "$type": "dimension" },
    "lg":  { "$value": "16px", "$type": "dimension" }
  }
}
```

```json
// tokens/semantic.tokens.json — meaningful aliases, what components reference
{
  "color": {
    "action": {
      "primary":     { "$value": "{color.blue.500}", "$type": "color" },
      "primaryHover":{ "$value": "{color.blue.900}", "$type": "color" },
      "danger":      { "$value": "{color.red.500}",  "$type": "color" }
    },
    "text": {
      "primary":   { "$value": "#1a1a1a", "$type": "color" },
      "secondary": { "$value": "#6b7280", "$type": "color" },
      "disabled":  { "$value": "#d1d5db", "$type": "color" }
    },
    "bg": {
      "surface":   { "$value": "#ffffff", "$type": "color" },
      "subtle":    { "$value": "#f9fafb", "$type": "color" },
      "overlay":   { "$value": "rgba(0,0,0,0.5)", "$type": "color" }
    }
  },
  "component": {
    "button": {
      "height":       { "$value": "36px",  "$type": "dimension" },
      "paddingH":     { "$value": "{spacing.4}", "$type": "dimension" },
      "borderRadius": { "$value": "4px",   "$type": "dimension" }
    }
  }
}
```

### 3.2 Style Dictionary Pipeline

```js
// style-dictionary.config.js
module.exports = {
  source: ['tokens/**/*.tokens.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      prefix: 'ds',
      files: [{
        destination: 'dist/tokens.css',
        format: 'css/variables',
        // Output: --ds-color-action-primary: #3b82f6;
      }],
    },
    js: {
      transformGroup: 'js',
      files: [{
        destination: 'dist/tokens.js',
        format: 'javascript/es6',
        // Output: export const colorActionPrimary = '#3b82f6';
      }],
    },
    figma: {
      // Custom transform for Figma Tokens plugin format
    },
  },
};
```

**Why tokens → CSS variables (not hardcoded):**
Theming = swap one CSS file. Dark mode is `[data-theme="dark"] { --ds-color-bg-surface: #0d1117; }`. No component code changes.

---

## Step 4: Component Architecture

### 4.1 The Three-Layer Model

```
Layer 3: Patterns (@jpmc/ds-patterns)
  DataTable, FilterPanel, FormLayout, PageHeader
  — composed from Layer 2, no new styles

Layer 2: Core Components (@jpmc/ds-core)
  Button, Input, Select, Checkbox, Modal, Tooltip, Badge
  — styled with tokens, full a11y, tested

Layer 1: Headless Primitives (internal / Radix UI)
  accessibility logic only — focus trapping, ARIA, keyboard nav
  — no styles at all
```

**Why headless at the bottom:**
Accessibility behavior (focus trap in Modal, roving tabindex in RadioGroup, ARIA patterns) is complex and hard to get right. Using Radix UI or building headless primitives means that logic lives once. Styled components sit on top and just handle visuals.

### 4.2 Button Component — Full Implementation Pattern

```tsx
// packages/core/src/Button/Button.tsx

import { forwardRef } from 'react';
import { clsx } from 'clsx';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leadingIcon,
      trailingIcon,
      disabled,
      children,
      className,
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={clsx(
          styles.button,
          styles[variant],
          styles[size],
          loading && styles.loading,
          className
        )}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        {...rest}
      >
        {loading && <Spinner size="sm" aria-hidden className={styles.spinner} />}
        {leadingIcon && <span className={styles.leadingIcon} aria-hidden>{leadingIcon}</span>}
        <span className={styles.label}>{children}</span>
        {trailingIcon && <span className={styles.trailingIcon} aria-hidden>{trailingIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

```css
/* Button.module.css — uses tokens, never hardcoded values */
.button {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-spacing-2);
  height: var(--ds-component-button-height);
  padding: 0 var(--ds-component-button-padding-h);
  border-radius: var(--ds-component-button-border-radius);
  font-size: var(--ds-font-size-base);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 150ms ease, box-shadow 150ms ease;
  border: 1px solid transparent;

  &:focus-visible {
    outline: 2px solid var(--ds-color-action-primary);
    outline-offset: 2px;
  }

  &:disabled, &[aria-disabled="true"] {
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: none;
  }
}

.primary {
  background: var(--ds-color-action-primary);
  color: #fff;

  &:hover:not(:disabled) { background: var(--ds-color-action-primary-hover); }
}

.secondary {
  background: transparent;
  border-color: var(--ds-color-action-primary);
  color: var(--ds-color-action-primary);

  &:hover:not(:disabled) { background: var(--ds-color-bg-subtle); }
}

.danger {
  background: var(--ds-color-action-danger);
  color: #fff;
}

.sm { height: 28px; font-size: var(--ds-font-size-sm); }
.lg { height: 44px; font-size: var(--ds-font-size-lg); }
```

### 4.3 DataTable — Flagship Pattern Component

Financial teams live in tables. This is the most important pattern component.

```tsx
// packages/patterns/src/DataTable/DataTable.tsx

interface Column<T> {
  key: keyof T;
  header: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  stickyHeader?: boolean;
  virtualizeRows?: boolean; // auto-enable for data.length > 100
  getRowId: (row: T) => string;
}

function DataTable<T>({
  data, columns, onRowClick, loading, emptyMessage, stickyHeader, getRowId, virtualizeRows,
}: DataTableProps<T>) {
  const shouldVirtualize = virtualizeRows ?? data.length > 100;

  return (
    <div className={styles.tableWrapper} role="region" aria-label="Data table">
      <table className={styles.table} aria-busy={loading}>
        <TableHead columns={columns} sticky={stickyHeader} />
        {shouldVirtualize ? (
          <VirtualTableBody data={data} columns={columns} onRowClick={onRowClick} getRowId={getRowId} />
        ) : (
          <StaticTableBody data={data} columns={columns} onRowClick={onRowClick} getRowId={getRowId} />
        )}
      </table>
      {loading && <TableSkeleton columns={columns.length} />}
      {!loading && data.length === 0 && (
        <div className={styles.empty} role="status">{emptyMessage ?? 'No data'}</div>
      )}
    </div>
  );
}
```

---

## Step 5: Multi-Framework Support

### 5.1 The Problem

JPMC has Angular teams that can't use React components. Options:
1. Build separate Angular library — 2× maintenance forever
2. Web Components wrapper — one codebase, every framework consumes it

### 5.2 Web Components Wrapper Strategy

```tsx
// packages/web-components/src/button.ts
import { createComponent } from '@lit/react';
import React from 'react';
import { Button as ReactButton } from '@jpmc/ds-core';

// Wrap React component as a Web Component using @lit/react
export const DSButton = createComponent({
  tagName: 'ds-button',
  elementClass: ReactButton,
  react: React,
  events: { onClick: 'click' },
});
```

Angular team usage:
```html
<!-- Angular template — no React knowledge needed -->
<ds-button variant="primary" (click)="handleClick()">Submit</ds-button>
```

**Trade-off to state:** Web Components have a serialization cost — props must cross the JS/WC boundary as strings or simple values. Complex objects (render functions, React nodes) cannot be passed. Patterns like DataTable's `render` column prop won't work in WC — Angular teams get a simpler table API.

---

## Step 6: Theming Architecture

### 6.1 CSS Custom Property Cascading

```css
/* global theme — applied to :root */
:root {
  --ds-color-bg-surface: #ffffff;
  --ds-color-text-primary: #1a1a1a;
  --ds-color-action-primary: #0052cc;
}

/* dark mode — override at html level */
[data-theme="dark"] {
  --ds-color-bg-surface: #0d1117;
  --ds-color-text-primary: #e6edf3;
  --ds-color-action-primary: #58a6ff;
}

/* brand variant — Chase consumer vs JPM institutional */
[data-brand="chase"] {
  --ds-color-action-primary: #117aca;
}

[data-brand="jpm-private"] {
  --ds-color-action-primary: #8b6914;
}
```

```tsx
// ThemeProvider.tsx
export function ThemeProvider({ theme, brand, children }: Props) {
  return (
    <div data-theme={theme} data-brand={brand}>
      {children}
    </div>
  );
}
```

**No JS theme switching needed** — toggling `data-theme="dark"` on the root element cascades through all component tokens automatically.

### 6.2 Team-Level Customization (Without Forking)

Teams can customize via CSS custom property override at their container level:

```css
/* Team-level override — scoped to their app container */
.my-trading-app {
  --ds-component-button-border-radius: 2px; /* sharper for dense trading UI */
  --ds-font-size-base: 12px;               /* smaller for data-dense screens */
}
```

This is safe: overrides are scoped, don't affect other teams, and follow the cascade — no component code changes required.

---

## Step 7: Accessibility Architecture

Every component must pass these before merge:

### 7.1 Automated Accessibility Testing

```ts
// Button.a11y.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Button accessibility', () => {
  it('has no WCAG violations', async () => {
    const { container } = render(<Button variant="primary">Submit</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('is keyboard operable', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    const btn = screen.getByRole('button');

    btn.focus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);

    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('communicates loading state to screen readers', () => {
    render(<Button loading>Submit</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toBeDisabled();
  });
});
```

### 7.2 Accessibility Checklist Per Component

| Check | Tooling |
|---|---|
| No axe violations | jest-axe (automated) |
| Keyboard navigation | @testing-library/user-event |
| Screen reader announcement | NVDA/VoiceOver manual test |
| Color contrast ≥ 4.5:1 | Storybook a11y addon |
| Focus visible on all interactions | Visual regression + manual |
| Touch target ≥ 44×44px | CSS audit |

---

## Step 8: Documentation — Storybook

```tsx
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Button> = {
  title: 'Core/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    a11y: { disable: false }, // enable axe-core in Storybook
  },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size:    { control: 'select', options: ['sm', 'md', 'lg'] },
    loading: { control: 'boolean' },
    disabled:{ control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { variant: 'primary', children: 'Submit Order' } };
export const Loading: Story  = { args: { variant: 'primary', loading: true, children: 'Submitting...' } };
export const Danger: Story   = { args: { variant: 'danger', children: 'Cancel Order' } };

// Interaction test — runs in Storybook and CI
export const ClickInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
    await expect(fn).toHaveBeenCalled();
  },
};
```

---

## Step 9: Versioning & Release Strategy

### 9.1 Semantic Versioning Rules

```
MAJOR (e.g. 1.0.0 → 2.0.0):
  - Removed component
  - Changed prop interface in breaking way
  - Changed token name
  - Target: < 1 per year

MINOR (e.g. 1.2.0 → 1.3.0):
  - New component or pattern
  - New optional prop
  - New token
  - Target: monthly

PATCH (e.g. 1.2.3 → 1.2.4):
  - Bug fix
  - Accessibility fix
  - Visual fix within existing API
  - Target: weekly
```

### 9.2 Deprecation Policy

```tsx
// Mark deprecated 2 minor versions before removal
export function OldButton({ color, ...rest }: OldButtonProps) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '[DS] OldButton `color` prop is deprecated. ' +
      'Use `variant` instead. Will be removed in v3.0.0. ' +
      'Run: npx @jpmc/ds-codemod button-color-to-variant'
    );
  }
  // Map old prop to new internally during deprecation window
  return <Button variant={colorToVariant(color)} {...rest} />;
}
```

### 9.3 Codemod for Breaking Changes

```ts
// codemods/button-variant-rename.ts (jscodeshift)
export default function transform(fileInfo: FileInfo, api: API) {
  const j = api.jscodeshift;
  return j(fileInfo.source)
    .find(j.JSXAttribute, { name: { name: 'color' } })
    .filter((path) => {
      const component = path.parent.node.name?.name;
      return component === 'Button' || component === 'OldButton';
    })
    .replaceWith((path) =>
      j.jsxAttribute(j.jsxIdentifier('variant'), path.node.value)
    )
    .toSource();
}
// Run: npx jscodeshift -t ./codemods/button-variant-rename.ts src/
```

Teams run the codemod and their PRs are auto-migrated. Reduces upgrade friction dramatically.

---

## Step 10: Governance Model

```
Design System Team (owns): 
  ├── Token decisions
  ├── Accessibility standards
  ├── Release schedule
  └── Breaking change approval

Inner-Source Contribution (any engineer can):
  ├── Open PR with new component
  ├── DS team reviews for token usage, a11y, API consistency
  ├── Approved → merged → released in next minor
  └── Author gets credit, DS team owns maintenance

Consumer Advisory Board:
  ├── 1 rep per major product team, rotating 6-month term
  ├── Votes on API proposals before they go to implementation
  └── "No surprises" guarantee — breaking changes must be approved by board
```

---

## Step 11: Testing Strategy

```
Unit tests (Jest + RTL):
  - Every component has a11y test (jest-axe)
  - Every interactive component has keyboard test
  - Run on every PR

Visual regression (Chromatic / Percy):
  - Screenshot every Storybook story
  - PR blocks if unexpected visual diff
  - Run on every PR

Integration tests (Storybook interaction tests):
  - Complex flows (DataTable sort/filter, Modal focus trap)
  - Run in CI via Storybook test runner

Cross-browser (Playwright):
  - Chrome, Firefox, Safari, Edge
  - Run nightly on main branch

Accessibility audit (manual):
  - NVDA + Chrome (Windows)
  - VoiceOver + Safari (macOS)
  - Run before each major release
```

---

## Step 12: Key Interview Talking Points

**"Why not just use MUI or Ant Design?"**
External libraries can't align with JPMC brand tokens, can't guarantee WCAG compliance on every component, and add an external dependency JPMC can't control. Security and licensing reviews for every version update. At this scale, owning the library is cheaper than the overhead of external dependency management.

**"How do you handle 50 teams having different needs?"**
Token overrides at the container level (CSS cascade). Composition — teams use our primitives to build their own compound components without forking. For teams that truly need a different pattern, they open a PR to ds-patterns. The governance model prevents fragmentation.

**"How do you migrate 3,000 engineers from v1 to v2?"**
Codemod tooling automates mechanical changes. Published migration guide. Version v1 stays on LTS support (security patches only) for 6 months. Consumer Advisory Board approves the timeline so teams aren't surprised.

**"How does dark mode work without JS?"**
CSS custom properties cascade from a `data-theme` attribute on the root. Swap one attribute, all tokens recompute. No component logic changes. Respects `prefers-color-scheme` via media query fallback.

**"What's the most important metric for a design system?"**
Adoption rate. A design system that 50% of teams use is better than a perfect one that 20% use. We measure: npm downloads, Storybook visits, deprecation warning frequency, time-to-first-render for new teams.

---

## Answer Checklist

- [ ] Explained tokens → semantic tokens → CSS variables flow
- [ ] Described 3-layer component architecture (headless → core → patterns)
- [ ] Addressed multi-framework (Web Components wrapper)
- [ ] Explained theming without JS (CSS custom properties + data-theme)
- [ ] Described semver + deprecation + codemod strategy
- [ ] Covered governance (inner-source + Consumer Advisory Board)
- [ ] Mentioned axe-core + Storybook a11y addon for accessibility
- [ ] Referenced JPMC's Salt DS by name
