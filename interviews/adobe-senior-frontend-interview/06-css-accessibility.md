# CSS & Accessibility — Adobe Interview

> Adobe is deeply invested in accessibility (React Aria is their open-source gift to the community). Expect deep a11y questions. CSS questions focus on layout, animations, and responsive design for creative tools.

---

## 1. Adobe's Accessibility Philosophy

**Q: Why does Adobe invest so heavily in accessibility?**

**Verbal answer:**
> "Adobe builds tools that empower people to create. If those tools aren't accessible, they exclude a significant portion of creators — people with visual impairments using screen readers, people with motor disabilities who rely on keyboard, people with cognitive disabilities who need clear, predictable UIs. Adobe's React Aria library is their acknowledgment that building accessible interactive components is genuinely hard and most teams get it wrong. They've open-sourced the solution because they believe accessible software is table stakes, not a differentiator."

---

## 2. React Aria & React Spectrum Architecture

**Q: What is React Aria? How does it differ from a typical component library?**

**Verbal answer:**
> "React Aria is a collection of hooks that implement the accessibility behavior and keyboard interactions for UI components, with zero styling. It's based on the WAI-ARIA Authoring Practices Guide. The insight is that the hard part of accessible components is behavior — focus management, keyboard navigation, screen reader announcements, ARIA patterns — not the visual design. React Aria gives you that for free. You then layer your own styles on top. React Spectrum is Adobe's own implementation of those hooks with Spectrum design tokens applied."

```tsx
// Regular button vs React Aria Button — what's the difference?

// Basic button — you handle everything
<button
  onClick={handleClick}
  disabled={isDisabled}
  aria-pressed={isPressed}
  aria-label="Toggle format"
>
  Bold
</button>

// React Aria useButton — handles all edge cases for free
import { useButton, useToggleButton } from '@react-aria/button';
import { useToggleState } from '@react-stately/toggle';

function FormatButton({ children, ...props }) {
  const state = useToggleState(props);
  const ref = useRef(null);
  const { buttonProps, isPressed } = useToggleButton(props, state, ref);

  // useButton handles:
  // - keyboard activation (Enter + Space for all buttons, Enter-only for links)
  // - touch handling (no 300ms delay)
  // - focus management
  // - aria-pressed state
  // - disabled behavior (doesn't focus disabled buttons)
  // - form submission prevention

  return (
    <button
      {...buttonProps}
      ref={ref}
      className={state.isSelected ? 'active' : ''}
      style={{ fontWeight: state.isSelected ? 'bold' : 'normal' }}
    >
      {children}
    </button>
  );
}
```

---

## 3. ARIA Deep Dive

**Q: When do you use ARIA? What is the first rule of ARIA?**

**Verbal answer:**
> "The first rule of ARIA is: don't use ARIA if native HTML semantics can do the job. A `<button>` is always better than `<div role='button' tabIndex='0'>` because it comes with keyboard handling, focus management, and semantics for free. ARIA is for the gap — when you need a custom widget that HTML doesn't have (combobox, tree view, grid, menu) or when you need to communicate dynamic state changes that HTML can't express (aria-live for announcements, aria-expanded for collapsible content)."

```html
<!-- ARIA states — always update when UI state changes -->
<button aria-expanded="false" aria-controls="menu-id">Open Menu</button>
<ul id="menu-id" role="menu" hidden>...</ul>

<!-- When button is clicked: -->
<button aria-expanded="true" aria-controls="menu-id">Open Menu</button>
<ul id="menu-id" role="menu">...</ul>

<!-- Live regions — announce dynamic content changes -->
<div role="status" aria-live="polite" aria-atomic="true">
  <!-- Polite: waits for current speech to finish -->
  Job "Backup_2025" completed successfully.
</div>

<div role="alert" aria-live="assertive">
  <!-- Assertive: interrupts immediately — use for errors only -->
  Error: Upload failed. Please try again.
</div>

<!-- Labeling -->
<input aria-label="Search assets" />               <!-- no visible label -->
<input aria-labelledby="label-id" />               <!-- reference visible element -->
<input aria-describedby="hint-id error-id" />      <!-- supplementary info -->

<!-- ARIA roles — only use when HTML semantics not sufficient -->
<div role="grid">              <!-- data grid with cells -->
<div role="tree">              <!-- tree view (like folder hierarchy) -->
<div role="combobox">          <!-- searchable dropdown -->
<div role="toolbar">           <!-- group of action buttons -->
<div role="log">               <!-- scrolling log/chat feed -->
```

---

## 4. Keyboard Navigation Patterns

**Q: Implement a keyboard-navigable dropdown menu.**

```tsx
function DropdownMenu({ trigger, items }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const menuRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // WAI-ARIA menu pattern keyboard interactions
  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex(0); // focus first item
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => {
          if (i <= 0) { setIsOpen(false); triggerRef.current?.focus(); return -1; }
          return i - 1;
        });
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(items.length - 1);
        break;
      case 'Escape':
        setIsOpen(false);
        triggerRef.current?.focus(); // return focus to trigger
        break;
      case 'Tab':
        setIsOpen(false); // close on tab — don't trap focus in menus
        break;
    }
  };

  // Move DOM focus to active item
  useEffect(() => {
    if (isOpen && activeIndex >= 0) {
      const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
      (items?.[activeIndex] as HTMLElement)?.focus();
    }
  }, [activeIndex, isOpen]);

  return (
    <div className="dropdown">
      <button
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen(o => !o)}
        onKeyDown={handleTriggerKeyDown}
      >
        Actions
      </button>

      {isOpen && (
        <ul
          ref={menuRef}
          id={menuId}
          role="menu"
          onKeyDown={handleMenuKeyDown}
        >
          {items.map((item, index) => (
            <li key={item.id} role="none">
              <button
                role="menuitem"
                tabIndex={index === activeIndex ? 0 : -1} // roving tabindex
                onClick={() => { item.action(); setIsOpen(false); }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## 5. CSS Animations — Performance & Reduced Motion

**Q: How do you handle animations accessibly?**

```css
/* ALWAYS respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  /* Option 1: disable all animations */
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Option 2: provide alternative non-motion effect */
.fade-in {
  animation: fadeIn 0.3s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .fade-in {
    animation: none;
    /* Use a different effect that conveys the same info without motion */
    border: 2px solid var(--color-interactive);
  }
}

/* GPU-accelerated animations (only transform + opacity) */
.drawer {
  transform: translateX(-100%);
  transition: transform 0.25s ease-out; /* ✅ no layout/paint */
}
.drawer--open { transform: translateX(0); }

/* vs this — triggers layout every frame */
.drawer-bad {
  left: -300px;
  transition: left 0.25s ease-out; /* ❌ reflow every frame */
}

/* Staggered animations with CSS custom properties */
.toolbar-item {
  opacity: 0;
  animation: slideIn 0.2s ease-out forwards;
  animation-delay: calc(var(--index) * 50ms);
}

/* Set --index in HTML: style="--index: 0", style="--index: 1", etc. */
@keyframes slideIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

```tsx
// In React — read prefers-reduced-motion
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

const transition = prefersReducedMotion
  ? undefined
  : { type: 'spring', stiffness: 300, damping: 30 };
```

---

## 6. CSS Grid — Advanced Patterns

```css
/* === Auto-responsive grid — no media queries === */
.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}
/* When viewport < 200px per column: fewer columns automatically */
/* When viewport wide: more columns fill up */

/* === Masonry-like layout (CSS only, no JS) === */
/* columns property — not true masonry but close */
.masonry {
  columns: 3 220px; /* max 3 columns, min 220px wide */
  column-gap: 1rem;
}
.masonry-item {
  break-inside: avoid; /* don't split item across columns */
  margin-bottom: 1rem;
}

/* === Named template areas with responsive collapse === */
.editor-layout {
  display: grid;
  grid-template-areas:
    "toolbar toolbar toolbar"
    "sidebar canvas properties"
    "status  status  status";
  grid-template-columns: 240px 1fr 280px;
  grid-template-rows: 48px 1fr 32px;
  height: 100vh;
}

@media (max-width: 1024px) {
  .editor-layout {
    grid-template-areas:
      "toolbar"
      "canvas"
      "sidebar"
      "status";
    grid-template-columns: 1fr;
    grid-template-rows: 48px 1fr auto 32px;
  }
  .properties-panel { display: none; } /* hide on tablet */
}
```

---

## 7. CSS Custom Properties — Dynamic Theming

```css
/* === Adobe Spectrum token structure === */
:root {
  /* Global tokens */
  --spectrum-global-color-blue-500: #1473e6;
  --spectrum-global-font-size-100: 14px;
  --spectrum-global-dimension-size-100: 8px;

  /* Alias tokens — semantic, not visual */
  --spectrum-alias-background-color-default: #fff;
  --spectrum-alias-text-color: #2c2c2c;
  --spectrum-alias-border-color: #cacaca;
  --spectrum-alias-focus-ring-color: var(--spectrum-global-color-blue-500);

  /* Component tokens */
  --spectrum-button-primary-background-color: var(--spectrum-global-color-blue-500);
  --spectrum-button-primary-text-color: white;
}

/* Dark mode overrides */
@media (prefers-color-scheme: dark) {
  :root {
    --spectrum-alias-background-color-default: #1e1e1e;
    --spectrum-alias-text-color: #e0e0e0;
    --spectrum-alias-border-color: #444;
  }
}
[color-scheme="dark"] { /* explicit override */ }
```

---

## 8. Common Accessibility Audit Failures & Fixes

| Failure | Bad | Fix |
|---------|-----|-----|
| Missing button label | `<button><img src="icon.svg" /></button>` | `<button aria-label="Upload file">` |
| Low contrast | `color: #999` on white | Use at least 4.5:1 ratio |
| Focus lost | Modal closes, focus goes to body | `previousFocus.current?.focus()` |
| Click-only interaction | `onClick` on a `<div>` | Use `<button>` or add `role="button" tabIndex={0} onKeyDown` |
| Form without labels | `<input placeholder="Email">` | `<label htmlFor="email">Email</label><input id="email">` |
| Status not announced | `<div>Upload complete</div>` | `<div role="status" aria-live="polite">Upload complete</div>` |
| Icon without alt | `<img src="star.svg">` | `<img src="star.svg" alt="Favorite" />` or `aria-hidden="true"` if decorative |
| Keyboard trap | Focus gets stuck in a widget | Ensure Escape key exits; Tab moves to next focusable element |

---

## Quick-Fire Q&A

| Question | Answer |
|----------|--------|
| `aria-hidden="true"` purpose? | Removes element from accessibility tree — use for decorative icons, duplicated text. Never on focusable elements. |
| `tabIndex={0}` vs `tabIndex={-1}`? | `0` = in natural tab order. `-1` = focusable programmatically but not via Tab key. Use for ARIA widgets with roving tabindex. |
| What is roving tabindex? | Pattern for composite widgets (tabs, menu, radio group): only ONE item has `tabIndex=0` at a time; rest are `tabIndex=-1`. Arrow keys move focus. |
| Focus indicator requirement? | WCAG 2.4.7: visible focus indicator required. Never do `outline: none` without providing an equally visible alternative. |
| Screen reader reading order? | Follows DOM order, not visual order. `order` CSS property and absolute positioning can break this — test with a real screen reader. |
| `role="presentation"` vs `aria-hidden`? | `presentation` removes role but children are still in tree. `aria-hidden` removes entire subtree including children. |
