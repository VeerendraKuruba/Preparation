# CSS, Tailwind & Design Systems — Nextiva Staff FE Q&A

---

## Q1: CSS specificity — resolve this cascade

```css
/* Specificity: (0,1,1) */
.card .title { color: blue; }

/* Specificity: (0,2,0) */
#sidebar .title { color: red; }

/* Specificity: (0,0,1) + !important */
.title { color: green !important; }
```

**Winner:** `green` — `!important` beats specificity (unless another `!important` with higher specificity).

**Staff practice:** Avoid `!important` in product CSS; use design tokens and consistent layering.

---

## Q2: Flexbox vs Grid — when to use each?

| Layout need | Tool |
|-------------|------|
| 1D distribution (nav bar, toolbar) | Flexbox |
| 2D layout (dashboard grid, calendar) | Grid |
| Content-driven sizing | Flexbox (`flex: 1`) |
| Fixed track sizes | Grid (`grid-template-columns`) |

**Agent dashboard:** Grid for page shell; Flexbox inside cards.

---

## Q3: Tailwind — architecture at scale

```
tailwind.config.ts
  theme.extend:
    colors: semantic tokens (primary, surface, danger)
    spacing: 4px scale
  plugins: @tailwindcss/forms, typography

@layer components:
  .btn-primary { @apply ... }  // sparingly — prefer component lib

@layer utilities:
  .scrollbar-thin { ... }
```

**Staff principles:**
- **Semantic tokens** — `bg-surface-elevated` not `bg-gray-800` (enables theming)
- **Component library** owns repeated patterns — don't `@apply` everything
- **Purge/content paths** include all monorepo packages

---

## Q4: `cva` + `cn` for variant-driven components

```typescript
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>;
```

---

## Q5: Headless UI — Radix vs Base UI vs Ark UI

| Library | Maintainer | Notes |
|---------|------------|-------|
| **Radix UI** | WorkOS | Mature, widely adopted, excellent a11y |
| **Base UI** | MUI team | Unstyled primitives, newer |
| **Ark UI** | Chakra team | Framework-agnostic, Zag.js state machines |

**Pattern:** Headless primitive provides behavior + a11y; your design system provides visuals.

```tsx
import * as Dialog from '@radix-ui/react-dialog';

export function ConfirmDialog({ open, onConfirm, children }) {
  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Dialog.Title>Confirm</Dialog.Title>
          {children}
          <button onClick={onConfirm}>OK</button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

## Q6: Storybook-driven development

**Workflow:**
1. Build primitive in isolation with all states (default, hover, disabled, error)
2. Add `play` functions for interaction tests (`@storybook/test`)
3. Visual regression via Chromatic
4. Document props with autodocs + controls

```tsx
// Button.stories.tsx
const meta = {
  component: Button,
  tags: ['autodocs'],
  argTypes: { variant: { control: 'select', options: ['primary', 'ghost'] } },
} satisfies Meta<typeof Button>;

export const Primary: Story = { args: { children: 'Save', variant: 'primary' } };
export const Disabled: Story = { args: { disabled: true, children: 'Save' } };
```

**Staff metric:** % of design system components with Storybook coverage; time-to-ship new feature using existing primitives.

---

## Q7: Accessibility essentials for communications UI

| Pattern | Requirements |
|---------|--------------|
| Modal / dialog | Focus trap, escape, `aria-modal` |
| Combobox / autocomplete | `aria-expanded`, `aria-activedescendant`, arrow keys |
| Live regions | `aria-live="polite"` for incoming messages |
| Skip links | Skip to main content for keyboard users |
| Color contrast | WCAG AA — 4.5:1 text, 3:1 large text |
| Focus visible | Never `outline: none` without replacement |

**Incoming call toast:** `role="alert"` or `aria-live="assertive"` for urgent notifications.

---

## Q8: CSS containment and performance

```css
.message-list {
  contain: strict; /* layout + style + paint */
  overflow: auto;
  height: 400px;
}
```

**`content-visibility: auto`** — skip rendering off-screen sections (with `contain-intrinsic-size`).

---

## Q9: Dark mode strategies

1. **CSS variables** — `:root` / `[data-theme="dark"]` swap token values
2. **Tailwind** — `dark:` variant with `class` strategy on `<html>`
3. **System preference** — `prefers-color-scheme` + user override in localStorage

```tsx
// Avoid flash of wrong theme
<script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
```

---

## Q10: Design system versioning and adoption

**Staff responsibilities:**
- RFC process for new primitives
- Breaking change policy (semver + codemods)
- Migration guides in Storybook docs
- Lint rule: discourage one-off copies of DS components
- Track adoption — `% imports from @company/ui` vs local duplicates
