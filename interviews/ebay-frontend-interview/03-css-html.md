# CSS & HTML — eBay Frontend Interview Q&A

---

## Q1: Flexbox vs CSS Grid — when do you use each?

**Answer:**

| | Flexbox | Grid |
|--|---------|------|
| Dimension | One-dimensional (row OR column) | Two-dimensional (rows AND columns) |
| Use for | Navigation, button groups, centering, aligning items along one axis | Page layouts, card grids, complex 2D arrangements |
| Content-driven | Yes — sizes flex to content | No — layout-driven, you define the grid |

```css
/* Flexbox — centering content */
.nav {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Grid — responsive product listing */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
```

**eBay relevance:** Product listing pages use Grid. The top nav and cart item rows use Flexbox.

---

## Q2: Responsive layout — 4 blocks on large, 3 on medium, 2 on small, 1 on XS (Confirmed eBay question)

**Answer:**
```css
.container {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr; /* XS: 1 column */
}

@media (min-width: 480px) {
  .container { grid-template-columns: repeat(2, 1fr); } /* Small: 2 */
}

@media (min-width: 768px) {
  .container { grid-template-columns: repeat(3, 1fr); } /* Medium: 3 */
}

@media (min-width: 1024px) {
  .container { grid-template-columns: repeat(4, 1fr); } /* Large: 4 */
}
```

Or mobile-first with `repeat(auto-fill, minmax(...))` for a purely fluid approach.

---

## Q3: Explain CSS specificity.

**Answer:**
Specificity is a weight system that determines which CSS rule wins when there are conflicts.

| Selector | Specificity |
|----------|-------------|
| Inline style | 1,0,0,0 |
| ID (`#id`) | 0,1,0,0 |
| Class, attribute, pseudo-class | 0,0,1,0 |
| Element, pseudo-element | 0,0,0,1 |
| `!important` | Overrides everything (avoid) |

```css
#cart .item p { }          /* 0,1,1,1 */
.item p { }                /* 0,0,1,1 */
p { }                      /* 0,0,0,1 */
/* ID wins → #cart .item p applies */
```

**Rule:** More specific selector always wins, regardless of order. Same specificity → last rule wins.

---

## Q4: What is the CSS Box Model?

**Answer:**
Every element is a rectangular box made of:
- **Content** — the actual content area
- **Padding** — space between content and border
- **Border** — the border line
- **Margin** — space outside the border (collapses with adjacent margins)

```css
/* content-box (default): width = content only */
/* border-box: width includes padding + border — much more intuitive */

*, *::before, *::after {
  box-sizing: border-box; /* use this globally */
}
```

With `border-box`, `width: 200px` means the whole box is 200px regardless of padding.

---

## Q5: CSS positioning — relative, absolute, fixed, sticky.

**Answer:**

| Value | Positioned relative to | Removed from flow? |
|-------|------------------------|-------------------|
| `static` (default) | Normal flow | No |
| `relative` | Its own normal position | No (occupies space) |
| `absolute` | Nearest positioned ancestor | Yes |
| `fixed` | Viewport | Yes |
| `sticky` | Normal flow + sticks at threshold | No (hybrid) |

```css
/* Tooltip positioned relative to its trigger */
.trigger { position: relative; }
.tooltip {
  position: absolute;
  top: 100%;   /* just below trigger */
  left: 0;
}

/* Sticky header */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
}
```

---

## Q6: What is semantic HTML and why does it matter?

**Answer:**
Semantic HTML uses elements that convey meaning about the content, not just appearance.

```html
<!-- Non-semantic -->
<div class="header">...</div>
<div class="nav">...</div>

<!-- Semantic -->
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/cart">Cart</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h1>Product Title</h1>
  </article>
</main>
<footer>...</footer>
```

**Why it matters:**
- Screen readers use landmarks (`<header>`, `<nav>`, `<main>`) to let users jump between sections
- Search engines weight semantic elements
- Easier to understand and maintain

---

## Q7: ARIA — what is it and when do you use it?

**Answer:**
ARIA (Accessible Rich Internet Applications) adds accessibility metadata that HTML alone can't express — especially for custom interactive widgets.

**Three pillars:**
- `role` — what it is (`role="dialog"`, `role="button"`, `role="combobox"`)
- `aria-label` / `aria-labelledby` — what to call it
- `aria-*` state/property — current state (`aria-expanded`, `aria-checked`, `aria-pressed`)

```html
<!-- Custom dropdown trigger -->
<button
  aria-haspopup="listbox"
  aria-expanded={isOpen}
  aria-controls="options-list"
>
  Select category
</button>
<ul id="options-list" role="listbox" aria-label="Categories">
  <li role="option" aria-selected="false">Electronics</li>
</ul>
```

**Rule:** Use native HTML elements first (`<button>`, `<select>`, `<input>`). Only reach for ARIA when building custom widgets.

---

## Q8: How do you handle focus management in a modal?

**Answer:**
When a modal opens:
1. Move focus inside the modal (first focusable element)
2. Trap focus within the modal while open (Tab should cycle inside)
3. On close, return focus to the trigger element

```js
// Focus first element when modal opens
useEffect(() => {
  if (isOpen) firstFocusableRef.current?.focus();
}, [isOpen]);

// Return focus to trigger on close
useEffect(() => {
  if (!isOpen) triggerRef.current?.focus();
}, [isOpen]);

// Focus trap — intercept Tab key
function handleKeyDown(e) {
  if (e.key === 'Escape') onClose();
  if (e.key === 'Tab') {
    const focusable = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
}
```

---

## Q9: CSS animations — CSS transitions vs JS animations.

**Answer:**

**CSS transitions/animations:**
- Run on the compositor thread (GPU) — don't block main thread
- Best for: `transform` (translate, scale, rotate) and `opacity`
- Triggered automatically by class/state changes

**JS animations:**
- Use `requestAnimationFrame` — syncs with browser's paint cycle
- Better for complex sequences, physics-based, or scroll-driven
- Avoid `setInterval` for animation — not synced to display refresh

```css
/* CSS — prefer for simple transitions, perf-safe properties */
.cart-badge {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.cart-badge.updated {
  transform: scale(1.3);
}
```

**Properties safe to animate (no layout/repaint):** `transform`, `opacity`.
**Avoid animating:** `width`, `height`, `top`, `left`, `margin` — they trigger layout (reflow).

---

## Q10: What is `z-index` and what is a stacking context?

**Answer:**
`z-index` controls the stacking order of positioned elements. A new **stacking context** is created by:
- `position` + `z-index` (not auto)
- `opacity` < 1
- `transform`, `filter`, `will-change`

Once in a separate stacking context, `z-index` values only compete within that context — they can't "escape" to compete with siblings.

```css
/* Common bug: modal inside a parent with transform — modal can't be on top */
.parent { transform: translateX(0); } /* creates stacking context! */
.modal { z-index: 9999; } /* still trapped inside parent */

/* Fix: render modal via React Portal into document.body */
```
