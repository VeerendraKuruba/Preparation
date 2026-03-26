# 39. Designing Reusable Component Systems

## The Core Challenge

Building reusable components is easy. Building them at the right level of abstraction — flexible enough to cover real use cases, stable enough that consumers don't break constantly — is hard. The failure modes are symmetric:

- **Too specific**: `InvoiceApprovalButton` — useless outside invoices
- **Too generic**: `Button` with 40 boolean props — impossible to use correctly, impossible to maintain
- **Wrong API**: 20 config props instead of composition — consumers hit walls immediately

---

## Levels of Reuse

```
┌─────────────────────────────────────────────────────────┐
│  LEVEL 4: Page-Specific                                 │
│  InvoiceApprovalFlow, UserOnboardingWizard              │
│  Lives in feature folder, not published to design system│
├─────────────────────────────────────────────────────────┤
│  LEVEL 3: Feature-Shared                                │
│  DataTable with column definitions, FilterBar           │
│  Used by multiple features, lives in shared/            │
├─────────────────────────────────────────────────────────┤
│  LEVEL 2: Patterns (opinionated compositions)           │
│  ConfirmModal, EmptyState, PageHeader                   │
│  Cross-product, lives in design system                  │
├─────────────────────────────────────────────────────────┤
│  LEVEL 1: Primitives (no business logic)                │
│  Button, Input, Modal, Tooltip, Badge                   │
│  Cross-product, strict API, full a11y                   │
├─────────────────────────────────────────────────────────┤
│  LEVEL 0: Tokens                                        │
│  color, space, type scale, motion, border-radius        │
│  JSON/CSS custom properties — consumed by all levels    │
└─────────────────────────────────────────────────────────┘
```

**Rule**: features use the design system; the design system does not import from features. Dependency always flows downward.

---

## API Design Principle: Composable over Configurable

The test: if you need to add a 15th boolean prop to a component, you've designed yourself into a corner. Compose instead.

```typescript
// BAD: boolean prop explosion — unscalable
<Modal
  title="Confirm Delete"
  hasCloseButton={true}
  hasFooter={true}
  footerHasCancelButton={true}
  footerHasConfirmButton={true}
  confirmButtonVariant="destructive"
  confirmButtonText="Delete"
  onConfirm={handleDelete}
  onCancel={handleCancel}
  isLoading={isDeleting}
/>

// GOOD: composable slots — consumer controls structure
<Modal open={open} onOpenChange={setOpen}>
  <Modal.Header>Confirm Delete</Modal.Header>
  <Modal.Body>Are you sure you want to delete this invoice?</Modal.Body>
  <Modal.Footer>
    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    <Button variant="destructive" loading={isDeleting} onClick={handleDelete}>
      Delete
    </Button>
  </Modal.Footer>
</Modal>
```

---

## Pattern 1: Compound Components

Compound components use React's context internally to share state between sub-components, giving consumers a natural, declarative API.

```typescript
// components/Tabs/Tabs.tsx
import { createContext, useContext, useState, useId } from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue>(null!);

// Root component manages shared state
function Tabs({
  children,
  defaultTab,
  activeTab: controlledValue,
  onTabChange,
}: {
  children: React.ReactNode;
  defaultTab?: string;
  activeTab?: string;           // controlled
  onTabChange?: (id: string) => void;
}) {
  const baseId = useId();
  const [internalTab, setInternalTab] = useState(defaultTab ?? '');

  // Works both controlled and uncontrolled
  const activeTab = controlledValue ?? internalTab;
  const setActiveTab = (id: string) => {
    setInternalTab(id);
    onTabChange?.(id);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, baseId }}>
      <div data-testid="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

function Tab({ id, children }: { id: string; children: React.ReactNode }) {
  const { activeTab, setActiveTab, baseId } = useContext(TabsContext);
  const isActive = activeTab === id;

  return (
    <button
      role="tab"
      id={`${baseId}-tab-${id}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${id}`}
      tabIndex={isActive ? 0 : -1}
      onClick={() => setActiveTab(id)}
      data-testid={`tab-${id}`}
    >
      {children}
    </button>
  );
}

function TabPanel({ id, children }: { id: string; children: React.ReactNode }) {
  const { activeTab, baseId } = useContext(TabsContext);
  if (activeTab !== id) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${id}`}
      aria-labelledby={`${baseId}-tab-${id}`}
      data-testid={`tabpanel-${id}`}
    >
      {children}
    </div>
  );
}

// Attach sub-components as static properties
Tabs.Tab    = Tab;
Tabs.Panel  = TabPanel;

// Consumer usage — reads naturally, no config needed
<Tabs defaultTab="details">
  <div role="tablist">
    <Tabs.Tab id="details">Details</Tabs.Tab>
    <Tabs.Tab id="history">History</Tabs.Tab>
    <Tabs.Tab id="comments">Comments</Tabs.Tab>
  </div>
  <Tabs.Panel id="details"><InvoiceDetails /></Tabs.Panel>
  <Tabs.Panel id="history"><InvoiceHistory /></Tabs.Panel>
  <Tabs.Panel id="comments"><InvoiceComments /></Tabs.Panel>
</Tabs>
```

---

## Pattern 2: Polymorphic Component (the 'as' prop)

Sometimes a component needs to render as a different HTML element. A `Box` layout primitive or a `Text` component should adapt without losing its styling.

```typescript
// components/Box/Box.tsx
import { ElementType, ComponentPropsWithRef, forwardRef } from 'react';

// The magic type: takes an element type and infers its valid props
type PolymorphicProps<E extends ElementType> = {
  as?: E;
} & Omit<ComponentPropsWithRef<E>, 'as'>;

function BoxInner<E extends ElementType = 'div'>(
  { as, children, ...rest }: PolymorphicProps<E>,
  ref: React.ForwardedRef<Element>
) {
  const Component = as ?? 'div';
  return (
    <Component ref={ref} {...rest}>
      {children}
    </Component>
  );
}

export const Box = forwardRef(BoxInner) as <E extends ElementType = 'div'>(
  props: PolymorphicProps<E>
) => React.ReactElement;

// Usage — TypeScript validates the correct props for each element type
<Box as="section" aria-labelledby="title">...</Box>
<Box as="button" type="submit" onClick={handleSubmit}>Submit</Box>
<Box as="a" href="/invoices" target="_blank">View Invoices</Box>
<Box as="ul" role="list">...</Box>
```

---

## Pattern 3: Controlled vs Uncontrolled

A component should work both ways. Default (uncontrolled) mode for simple uses. Controlled mode when the parent needs to drive the state.

```typescript
// components/Combobox/Combobox.tsx
interface ComboboxProps {
  // Controlled: both provided → parent owns state
  value?: string;
  onChange?: (value: string) => void;

  // Uncontrolled: only this → component owns state internally
  defaultValue?: string;

  // Always present
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  id?: string;
}

export function Combobox({
  value: controlledValue,
  onChange,
  defaultValue = '',
  options,
  placeholder = 'Select...',
  id,
}: ComboboxProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const handleChange = (newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onChange?.(newValue); // always fire — controlled parents need it
  };

  return (
    <select id={id} value={value} onChange={e => handleChange(e.target.value)}>
      <option value="" disabled>{placeholder}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// Uncontrolled — fire and forget
<Combobox defaultValue="USD" options={currencies} />

// Controlled — parent manages state (e.g., driven by URL params)
<Combobox value={currency} onChange={setCurrency} options={currencies} />
```

---

## Pattern 4: forwardRef for DOM Access

Library components must forward refs so consumers can access the underlying DOM node — for focus management, measurements, or animation libraries.

```typescript
// components/Input/Input.tsx
import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id: idProp, className, ...rest }, ref) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const errorId  = `${id}-error`;
    const hintId   = `${id}-hint`;

    return (
      <div className={cn('input-wrapper', className)}>
        <label htmlFor={id}>{label}</label>
        <input
          ref={ref}
          id={id}
          aria-describedby={[hint && hintId, error && errorId].filter(Boolean).join(' ')}
          aria-invalid={Boolean(error)}
          data-testid={id}
          {...rest}
        />
        {hint  && <p id={hintId}  className="input-hint">{hint}</p>}
        {error && <p id={errorId} className="input-error" role="alert">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Consumer can focus programmatically
function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus(); // direct DOM access
  }, []);

  return (
    <Input
      ref={inputRef}
      label="Search invoices"
      placeholder="Search by invoice number..."
    />
  );
}
```

---

## Accessibility and Test IDs as First-Class Citizens

These are not afterthoughts. Build them into the component contract from day one.

```typescript
// Every interactive primitive should:
// 1. Accept an explicit id (generate one if not provided)
// 2. Have aria labels and relationships wired
// 3. Have data-testid for integration tests
// 4. Handle keyboard navigation

function Button({
  children,
  loading,
  disabled,
  'data-testid': testId,
  'aria-label': ariaLabel,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...rest}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {loading && <Spinner aria-hidden="true" />}
      <span aria-hidden={loading}>{children}</span>
    </button>
  );
}
```

---

## Storybook as the Source of Truth

Every component variant should have a Story. Stories serve as:
- **Documentation**: copy-paste usage examples
- **Acceptance tests**: PMs review in Storybook before merging
- **Visual regression baseline**: Chromatic snapshots every story

```typescript
// components/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'destructive'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { variant: 'primary', children: 'Save Invoice' },
};

export const Loading: Story = {
  args: { variant: 'primary', loading: true, children: 'Saving...' },
};

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Delete Invoice' },
};

// Interaction test — runs in Storybook and in CI
export const ClickTest: Story = {
  args: { variant: 'primary', children: 'Click me' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');
    await userEvent.click(button);
    expect(args.onClick).toHaveBeenCalled();
  },
};
```

---

## Testing: Interaction Tests with Testing Library

```typescript
// components/Tabs/Tabs.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from './Tabs';

describe('Tabs', () => {
  function renderTabs() {
    return render(
      <Tabs defaultTab="a">
        <div role="tablist">
          <Tabs.Tab id="a">Tab A</Tabs.Tab>
          <Tabs.Tab id="b">Tab B</Tabs.Tab>
        </div>
        <Tabs.Panel id="a">Content A</Tabs.Panel>
        <Tabs.Panel id="b">Content B</Tabs.Panel>
      </Tabs>
    );
  }

  it('shows the default tab panel', () => {
    renderTabs();
    expect(screen.getByText('Content A')).toBeVisible();
    expect(screen.queryByText('Content B')).not.toBeInTheDocument();
  });

  it('switches panels on tab click', async () => {
    renderTabs();
    await userEvent.click(screen.getByRole('tab', { name: 'Tab B' }));
    expect(screen.getByText('Content B')).toBeVisible();
    expect(screen.queryByText('Content A')).not.toBeInTheDocument();
  });

  it('sets aria-selected correctly', async () => {
    renderTabs();
    expect(screen.getByRole('tab', { name: 'Tab A' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'Tab B' }));
    expect(screen.getByRole('tab', { name: 'Tab B' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Tab A' })).toHaveAttribute('aria-selected', 'false');
  });
});
```

---

## Versioning and Breaking Change Policy

```
MAJOR (2.0.0) — breaking changes
  - Rename a prop
  - Remove a prop
  - Change the behavior of an existing prop
  - Change the DOM structure in a way that affects styling

MINOR (1.1.0) — additive, non-breaking
  - Add a new optional prop
  - Add a new sub-component
  - Deprecate a prop (with console warning)

PATCH (1.0.1) — bug fixes
  - Fix incorrect aria-label
  - Fix visual regression in Firefox
  - Fix controlled/uncontrolled inconsistency
```

**Deprecation pattern** (minor release, warn in console, remove in next major):

```typescript
function Button({ isLarge, size, ...rest }: ButtonProps) {
  let resolvedSize = size;

  if (isLarge !== undefined) {
    console.warn(
      '[Button] The `isLarge` prop is deprecated and will be removed in v3. ' +
      'Use `size="lg"` instead.'
    );
    resolvedSize = isLarge ? 'lg' : 'md';
  }

  // ...
}
```

---

## Summary Sound Bite

"A component system has four levels — tokens, primitives, patterns, features — and dependencies only flow downward. Composable APIs (compound components, slots) beat boolean prop configuration at scale. Every primitive supports both controlled and uncontrolled patterns, forwards refs, and has aria attributes wired from day one. Storybook stories are the documentation and the visual regression baseline. Versioning follows semver with deprecation warnings before removal. The metric for a healthy design system: how often do consumers hit the escape hatch? If they're frequently reaching for `className` overrides or `!important`, the abstraction is wrong."
