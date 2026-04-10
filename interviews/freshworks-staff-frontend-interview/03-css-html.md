# CSS & HTML — Freshworks Staff Frontend Q&A

---

## Q1: Center an element inside a container (CONFIRMED)

```css
/* Method 1: Flexbox (most common) */
.container {
  display: flex;
  justify-content: center; /* horizontal */
  align-items: center;     /* vertical */
}

/* Method 2: CSS Grid */
.container {
  display: grid;
  place-items: center; /* shorthand for align-items + justify-items */
}

/* Method 3: Absolute + transform (works without known size) */
.child {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* Method 4: Margin auto (horizontal only for block elements) */
.child {
  width: 300px;
  margin: 0 auto;
}
```

---

## Q2: CSS Box Model

```
┌─────────────────────────────────────┐
│              MARGIN                 │
│  ┌───────────────────────────────┐  │
│  │           BORDER              │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │        PADDING          │  │  │
│  │  │  ┌───────────────────┐  │  │  │
│  │  │  │     CONTENT       │  │  │  │
│  │  │  └───────────────────┘  │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

```css
/* content-box (default): width = content only */
.box { box-sizing: content-box; width: 200px; padding: 20px; }
/* actual rendered width = 200 + 40 (padding) + border = 240+ */

/* border-box: width includes padding + border — always use this */
.box { box-sizing: border-box; width: 200px; padding: 20px; }
/* actual rendered width = 200px exactly */

/* Set globally */
*, *::before, *::after { box-sizing: border-box; }
```

---

## Q3: CSS Specificity

```
Inline   ID    Class/Attr/Pseudo-class   Element
(1,0,0,0) (0,1,0,0)  (0,0,1,0)           (0,0,0,1)
```

```css
/* Specificity: 0,1,1,1 = 111 */
#header nav a { color: red; }

/* Specificity: 0,0,2,1 = 021 */
.nav .menu a { color: blue; }

/* ID wins → red */

/* !important overrides everything (avoid — creates unmaintainable CSS) */
a { color: green !important; } /* overrides even inline styles */
```

**Practical rule:** Avoid ID selectors in CSS. Keep specificity low and consistent. Use BEM or CSS Modules to scope styles.

---

## Q4: CSS Modules vs CSS-in-JS vs Tailwind — Staff-level trade-off question

**CSS Modules:**
```css
/* Button.module.css */
.button { padding: 8px 16px; background: #0064d2; }
.primary { font-weight: bold; }
```
```jsx
import styles from './Button.module.css';
<button className={`${styles.button} ${styles.primary}`}>Click</button>
// Compiled to: <button class="Button_button__x7y3 Button_primary__8k2p">
```
- **Pros:** Zero runtime overhead, scoped by default, works with any build tool
- **Cons:** No dynamic styles based on JS values, verbose composition

**CSS-in-JS (styled-components / Emotion):**
```jsx
const Button = styled.button`
  padding: 8px 16px;
  background: ${props => props.variant === 'primary' ? '#0064d2' : '#eee'};
`;
```
- **Pros:** Fully dynamic, co-located with component, TypeScript support
- **Cons:** Runtime overhead (style injection), SSR complexity, bundle size

**Tailwind CSS:**
```jsx
<button className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">
  Click
</button>
```
- **Pros:** No context switching, consistent design tokens, zero unused CSS (PurgeCSS)
- **Cons:** Long class strings, HTML readability, learning curve

**Freshworks uses CSS Modules + Tailwind.** The answer they want at Staff level: understand the trade-offs for a component library that must be framework-agnostic (Tailwind classes work in Ember and Rails too).

---

## Q5: Flexbox — all key properties

```css
.container {
  display: flex;
  flex-direction: row | column | row-reverse | column-reverse;
  flex-wrap: nowrap | wrap | wrap-reverse;
  justify-content: flex-start | center | flex-end | space-between | space-around | space-evenly;
  align-items: stretch | flex-start | center | flex-end | baseline;
  align-content: (same as justify-content, for multi-line);
  gap: 16px; /* space between items */
}

.item {
  flex: 1;            /* flex-grow: 1, flex-shrink: 1, flex-basis: 0 */
  flex: 0 0 200px;    /* fixed width, no grow/shrink */
  align-self: center; /* override align-items for this item */
  order: 2;           /* change visual order without changing DOM */
}
```

---

## Q6: CSS Grid — key patterns

```css
/* Fixed columns */
.grid { display: grid; grid-template-columns: 200px 1fr 1fr; gap: 16px; }

/* Responsive auto-fill */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

/* Named areas */
.layout {
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-columns: 250px 1fr;
  grid-template-rows: auto 1fr auto;
}
.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
```

---

## Q7: Accessibility — ARIA and semantic HTML

```html
<!-- Bad: div soup -->
<div class="button" onclick="submit()">Submit</div>

<!-- Good: native semantics -->
<button type="submit">Submit</button>

<!-- Custom widget needs explicit ARIA -->
<div
  role="combobox"
  aria-expanded="true"
  aria-haspopup="listbox"
  aria-controls="dropdown-list"
>
  <input aria-autocomplete="list" aria-activedescendant="opt-2" />
</div>
<ul id="dropdown-list" role="listbox">
  <li id="opt-1" role="option" aria-selected="false">Option 1</li>
  <li id="opt-2" role="option" aria-selected="true">Option 2</li>
</ul>
```

**WCAG key principles (POUR):**
- **Perceivable** — content available to all senses (alt text, captions)
- **Operable** — keyboard navigable, no seizure-inducing content
- **Understandable** — clear language, consistent navigation
- **Robust** — works with assistive technologies

---

## Q8: CSS font loading — `font-display` strategies

```css
@font-face {
  font-family: 'Freshworks Sans';
  src: url('/fonts/fw-sans.woff2') format('woff2');
  font-display: swap; /* show fallback immediately, swap when font loads */
}
```

| `font-display` | Behavior | Use case |
|----------------|----------|----------|
| `block` | Invisible text until font loads (max 3s) | Avoid for body text |
| `swap` | Show fallback immediately, swap when ready | Body text (may cause layout shift) |
| `fallback` | 100ms block, then swap or use fallback | Good balance |
| `optional` | 100ms block, browser decides if worth loading | Performance-critical |

**Best practice:** `font-display: swap` + `<link rel="preload">` for critical fonts.

---

## Q9: CSS performance — what causes layout thrashing?

**Layout thrashing:** Alternating DOM reads and writes forces the browser to recalculate layout multiple times in a single frame.

```js
// Bad — read/write/read/write → multiple reflows
elements.forEach(el => {
  const height = el.offsetHeight; // READ — forces reflow
  el.style.height = height + 10 + 'px'; // WRITE
});

// Good — batch reads, then batch writes
const heights = elements.map(el => el.offsetHeight); // all reads
elements.forEach((el, i) => { el.style.height = heights[i] + 10 + 'px'; }); // all writes
```

**CSS properties that trigger layout (expensive):** width, height, margin, padding, top, left, font-size
**CSS properties that only trigger paint:** color, background-color, border-color, visibility
**CSS properties that only composite (fastest):** transform, opacity

---

## Q10: Design tokens and theming (Staff-level)

```css
/* :root variables — single source of truth */
:root {
  --color-primary: #0064d2;
  --color-surface: #ffffff;
  --color-text: #111111;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --border-radius: 4px;
  --font-size-base: 16px;
}

/* Dark theme — override tokens, not individual components */
[data-theme="dark"] {
  --color-surface: #1a1a2e;
  --color-text: #e0e0e0;
}
```

**Why this matters at Freshworks:** They have multiple products (Freshdesk, Freshsales, Freshservice) each with slightly different branding. A design token system lets one component library serve all products by swapping token values, not rewriting components.
