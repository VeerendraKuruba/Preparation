# CSS, HTML & Accessibility — Detailed Answers

---

## 1. CSS Specificity & Cascade

**Q: Explain the cascade — specificity, origin, and layer. How do you resolve specificity conflicts at scale?**

**Verbal answer:**
> "The cascade is an algorithm with four dimensions: origin, importance, specificity, and order. Origin means user-agent vs author vs user styles. Importance (the !important flag) overrides everything else but is a code smell — it means you've lost control of specificity. Specificity is a 3-part score: IDs, classes/attributes/pseudoclasses, elements/pseudoelements. At scale the real problem isn't understanding specificity rules — it's accidentally creating a specificity arms race where you keep adding IDs and !important to override existing styles. CSS Layers (`@layer`) solve this by letting you control specificity by layer, independent of selector specificity."

```css
/* Specificity calculation: (ID, Class, Element) */
p               { color: black; }    /* (0, 0, 1) */
.text           { color: blue; }     /* (0, 1, 0) */
p.text          { color: green; }    /* (0, 1, 1) */
#main p         { color: red; }      /* (1, 0, 1) */
#main .text     { color: purple; }   /* (1, 1, 0) */
style=""        /* (1, 0, 0, 0) — inline, always wins */
!important      /* breaks the cascade — overrides all */

/* :where() — zero specificity selector */
:where(h1, h2, h3) { font-weight: bold; }  /* (0, 0, 0) — easy to override */

/* :is() — takes specificity of most specific argument */
:is(#main, .content) h2 { }  /* (1, 0, 1) — #main brings ID specificity */

/* --- CSS Layers — specificity by layer, not selector --- */
@layer reset, base, components, utilities;

@layer reset {
  * { box-sizing: border-box; margin: 0; }
}
@layer base {
  h1 { font-size: 2rem; }          /* lower specificity than components layer */
}
@layer components {
  .card h1 { font-size: 1.5rem; }  /* wins over base h1 even with same specificity */
}
@layer utilities {
  .text-lg { font-size: 1.25rem; } /* wins over everything — highest layer */
}
/* Layer order in @layer declaration = cascade order (later = higher priority) */
```

---

## 2. CSS Layout — Flexbox vs Grid Deep Dive

**Q: When do you choose Flexbox vs Grid? Give complex real-world examples.**

**Verbal answer:**
> "The mental model I use: Flexbox is content-first — let the items determine layout flow. Grid is layout-first — define the grid tracks first, then place items. For navigation bars, tag lists, button groups — Flexbox. For page layouts, dashboard grids, card galleries — CSS Grid. They're composable: use Grid for the page, Flexbox for components inside each cell."

```css
/* --- FLEXBOX: navigation bar with logo + links + action ---  */
.navbar {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.navbar .logo { margin-right: auto; } /* push everything else to the right */
.navbar .actions { display: flex; gap: 0.5rem; }

/* Flex wrap — tags/chips that overflow to next line */
.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* Equal-height cards regardless of content */
.card-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.card {
  flex: 1 1 280px; /* grow, shrink, min-width 280px */
  /* flex: 1 1 auto = grow and shrink freely */
  /* flex: 0 0 280px = fixed, no grow/shrink */
}

/* --- GRID: dashboard layout --- */
.dashboard {
  display: grid;
  grid-template-areas:
    "sidebar topbar"
    "sidebar main"
    "sidebar footer";
  grid-template-columns: 240px 1fr;
  grid-template-rows: 60px 1fr 48px;
  min-height: 100vh;
}

.sidebar { grid-area: sidebar; }
.topbar  { grid-area: topbar; }
.main    { grid-area: main; overflow: auto; }
.footer  { grid-area: footer; }

/* Responsive grid — auto-fill with minimum size */
.job-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}
/* auto-fill vs auto-fit: 
   auto-fill: creates empty tracks for remaining space
   auto-fit: collapses empty tracks — items stretch to fill */

/* --- Subgrid: align items across sibling containers ---  */
/* When cards have labels + values that should align across cards */
.cards-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.card {
  display: grid;
  grid-template-rows: subgrid; /* uses parent's row tracks */
  grid-row: span 3; /* label, value, action — align across all 3 cards */
}
```

---

## 3. CSS Custom Properties & Advanced Theming

**Q: Design a complete theming system using CSS custom properties for an enterprise app.**

```css
/* === TIER 1: Design tokens — primitive values === */
:root {
  /* Color palette */
  --cv-gray-50: #f8fafc;
  --cv-gray-100: #f1f5f9;
  --cv-gray-900: #0f172a;
  --cv-blue-500: #3b82f6;
  --cv-blue-600: #2563eb;
  --cv-red-500: #ef4444;
  --cv-green-500: #22c55e;
  --cv-yellow-400: #facc15;

  /* Spacing scale */
  --cv-space-1: 0.25rem;
  --cv-space-2: 0.5rem;
  --cv-space-3: 0.75rem;
  --cv-space-4: 1rem;
  --cv-space-6: 1.5rem;
  --cv-space-8: 2rem;

  /* Typography */
  --cv-font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --cv-font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --cv-text-sm: 0.875rem;
  --cv-text-base: 1rem;
  --cv-text-lg: 1.125rem;
  --cv-text-xl: 1.25rem;

  /* Radius */
  --cv-radius-sm: 4px;
  --cv-radius-md: 8px;
  --cv-radius-lg: 12px;
}

/* === TIER 2: Semantic tokens — purpose, not value === */
:root {
  --color-bg-primary: var(--cv-gray-50);
  --color-bg-secondary: #ffffff;
  --color-bg-elevated: #ffffff;
  --color-text-primary: var(--cv-gray-900);
  --color-text-secondary: #64748b;
  --color-text-disabled: #94a3b8;
  --color-border: #e2e8f0;
  --color-interactive: var(--cv-blue-600);
  --color-interactive-hover: var(--cv-blue-500);
  --color-danger: var(--cv-red-500);
  --color-success: var(--cv-green-500);
  --color-warning: var(--cv-yellow-400);
}

/* === Dark theme — override semantic tokens only === */
[data-theme="dark"],
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg-primary: var(--cv-gray-900);
    --color-bg-secondary: #1e293b;
    --color-bg-elevated: #334155;
    --color-text-primary: #f8fafc;
    --color-text-secondary: #94a3b8;
    --color-border: #334155;
    /* Primitives stay the same — semantic tokens change */
  }
}

/* === Components use semantic tokens === */
.button {
  background: var(--color-interactive);
  color: white;
  padding: var(--cv-space-2) var(--cv-space-4);
  border-radius: var(--cv-radius-md);
  font-family: var(--cv-font-sans);
}
.button:hover { background: var(--color-interactive-hover); }
```

```js
// Runtime theme switching
document.documentElement.setAttribute('data-theme', 'dark');

// Reading CSS variables in JS
const primary = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-interactive').trim();

// Setting CSS variables dynamically (per-user color branding)
document.documentElement.style.setProperty('--color-interactive', brandColor);
```

---

## 4. CSS Performance — What Actually Matters

**Q: Walk me through CSS rendering — what triggers reflow, repaint, and composite-only updates?**

**Verbal answer:**
> "The browser rendering pipeline is: Style (calc CSS) → Layout (calc geometry) → Paint (rasterize pixels) → Composite (combine layers on GPU). The earlier in this pipeline a change is, the more expensive it is. Changing geometry properties like width/height/margin/padding forces the browser to re-layout the entire affected subtree — that's a reflow, and it's the most expensive. Changing visual properties like background/color/shadow only triggers repaint. Changing transform/opacity only triggers compositing — that's GPU-accelerated and the fastest."

```css
/* === What triggers REFLOW (most expensive) === */
/* Any change to geometry */
.bad-animation {
  transition: width 0.3s; /* ❌ REFLOW every frame */
}
.bad-hover:hover {
  margin-top: -10px; /* ❌ REFLOW + affects siblings */
}

/* === What triggers REPAINT only (medium cost) === */
.repaint-only {
  transition: background-color 0.3s; /* repaint only */
  transition: box-shadow 0.3s;       /* repaint only */
  transition: color 0.3s;            /* repaint only */
}

/* === Composite-only — GPU-accelerated (cheapest) === */
.smooth-animation {
  transition: transform 0.3s ease, opacity 0.3s ease; /* ✅ composite only */
}
.card:hover {
  transform: translateY(-4px) scale(1.02); /* ✅ no reflow */
}

/* Promote to its own layer (use sparingly — layers use GPU memory) */
.sticky-header {
  will-change: transform; /* hints browser to create a layer in advance */
  /* Use: elements that animate frequently */
  /* Don't use: everything — memory pressure causes jank on mobile */
}

/* contain — isolate an element's layout/paint */
.widget {
  contain: layout style; /* browser doesn't need to check parent/siblings when this changes */
}
.isolated-list {
  contain: strict; /* layout + style + paint + size */
}

/* content-visibility — skip rendering of off-screen content */
.article {
  content-visibility: auto; /* skip paint + layout for off-screen articles */
  contain-intrinsic-size: 0 500px; /* placeholder height to prevent scroll jumps */
}
```

**Force reflow pitfall in JavaScript:**
```js
// Interleaving reads and writes causes layout thrashing
function badLayout() {
  elements.forEach(el => {
    const height = el.offsetHeight; // READ (forces layout)
    el.style.height = (height + 10) + 'px'; // WRITE (invalidates layout)
    // Next iteration: READ forces layout again because write happened
  });
}

// Fix: batch reads, then batch writes
function goodLayout() {
  const heights = elements.map(el => el.offsetHeight); // all reads first
  elements.forEach((el, i) => {
    el.style.height = (heights[i] + 10) + 'px'; // all writes after
  });
}
// Or use requestAnimationFrame to schedule writes
```

---

## 5. CSS Architecture for Scale — CSS Modules vs Tailwind vs Vanilla Extract

**Q: How would you choose and implement a CSS architecture for a team of 20 frontend engineers?**

**Verbal answer:**
> "The core problem at scale is three things: specificity conflicts, naming collisions, and unused CSS. Every CSS architecture is trying to solve one or more of these. CSS Modules solve collisions automatically via local scoping. Tailwind solves unused CSS via JIT purging and solves conflicts via utility composition. Vanilla Extract solves all three with type-safe, zero-runtime CSS-in-JS."

```tsx
/* === CSS Modules — safe for any team, familiar, no runtime === */
/* JobRow.module.css */
.row { display: grid; grid-template-columns: 2fr 1fr 1fr 80px; }
.statusBadge { border-radius: 999px; padding: 2px 8px; font-size: 0.75rem; }
.statusBadge.failed { background: #fef2f2; color: #dc2626; }
.statusBadge.running { background: #eff6ff; color: #2563eb; }

/* JobRow.tsx */
import styles from './JobRow.module.css';
import clsx from 'clsx'; // conditional class combiner

function JobRow({ job }: { job: Job }) {
  return (
    <div className={styles.row}>
      <span>{job.clientName}</span>
      <span className={clsx(styles.statusBadge, styles[job.status])}>
        {job.status}
      </span>
    </div>
  );
}

/* === Tailwind — fast iteration, excellent for design system consumers === */
function JobRowTailwind({ job }: { job: Job }) {
  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_80px] items-center px-4 py-2 hover:bg-gray-50">
      <span className="font-medium text-gray-900">{job.clientName}</span>
      <span className={clsx(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        {
          'bg-red-100 text-red-700': job.status === 'failed',
          'bg-blue-100 text-blue-700': job.status === 'running',
          'bg-green-100 text-green-700': job.status === 'success',
        }
      )}>
        {job.status}
      </span>
    </div>
  );
}
```

---

## 6. Accessibility (a11y) — Production Implementation

**Q: How do you implement WCAG 2.1 AA in a complex interactive dashboard?**

**Verbal answer:**
> "Accessibility is an architecture concern, not a checkbox. The three pillars are: semantic HTML so screen readers get free context, keyboard navigation so mouse isn't required, and ARIA for the gaps where HTML semantics don't cover interactive patterns like comboboxes, tree views, or live regions. I've found that the biggest wins are always semantic HTML first — use button for clickable things, not div. ARIA is for when semantics run out, not a replacement."

```tsx
// === 1. Semantic structure ===
<header>
  <nav aria-label="Primary navigation">
    <ul role="list">
      <li><a href="/dashboard" aria-current="page">Dashboard</a></li>
      <li><a href="/jobs">Backup Jobs</a></li>
    </ul>
  </nav>
</header>
<main id="main-content" tabIndex={-1}> {/* SPA route change focus target */}
  <h1>Backup Dashboard</h1>
  <section aria-labelledby="active-jobs-heading">
    <h2 id="active-jobs-heading">Active Jobs (24)</h2>
    {/* ... */}
  </section>
</main>

// === 2. Keyboard navigation — modal focus trap ===
function Modal({ isOpen, onClose, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Move focus into modal when opened
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusable?.[0];
    const lastEl = focusable?.[focusable.length - 1];
    firstEl?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;

      // Trap focus within modal
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl?.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <h2 id="modal-title">Confirm Restore</h2>
      {children}
      <button onClick={onClose} aria-label="Close dialog">✕</button>
    </div>
  );
}

// === 3. Live regions — announce status updates ===
function JobStatusAnnouncer({ status }: { status: string }) {
  // Screen readers announce when content inside aria-live regions changes
  return (
    <>
      {/* polite — waits for user to finish reading, then announces */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {status}
      </div>
      {/* assertive — interrupts immediately (use sparingly, for urgent alerts) */}
      <div role="alert" aria-live="assertive" className="sr-only">
        {/* Only put critical errors here */}
      </div>
    </>
  );
}

// === 4. Skip links — let keyboard users skip nav ===
// In CSS: .skip-link { position: absolute; transform: translateY(-100%); }
// .skip-link:focus { transform: translateY(0); }
<a href="#main-content" className="skip-link">Skip to main content</a>

// === 5. Accessible custom select/combobox ===
// Use Radix UI, Headless UI, or WAI-ARIA combobox pattern
// Avoid building from scratch — ARIA combobox has 30+ keyboard interactions
```

**WCAG 2.1 AA quick checklist:**
| Criterion | What to Check |
|-----------|--------------|
| 1.1.1 Non-text content | All images have `alt`; decorative images have `alt=""` |
| 1.3.1 Info & Relationships | Tables have `<th>` with `scope`; forms have `<label>` |
| 1.4.3 Contrast | Text ≥ 4.5:1; large text ≥ 3:1 — use Colour Contrast Analyser |
| 1.4.11 UI components | Buttons, inputs, focus rings ≥ 3:1 contrast |
| 2.1.1 Keyboard | Every interactive element reachable & operable by keyboard |
| 2.4.3 Focus order | Tab order follows visual reading order |
| 2.4.7 Focus visible | Focus ring visible — never `outline: none` without alternative |
| 3.3.1 Error identification | Form errors identified in text, not just color |
| 4.1.2 Name, role, value | Custom widgets have correct ARIA roles + states |

---

## 7. Responsive & Adaptive Design

**Q: How do you approach responsive design for a data-heavy enterprise dashboard that must work on both wide monitors and 13" laptops?**

```css
/* === Container queries — component-level responsiveness === */
/* Better than media queries for reusable components in different contexts */

.card-container {
  container-type: inline-size;
  container-name: card;
}

/* When the CARD itself is narrow — not when the viewport is narrow */
@container card (max-width: 400px) {
  .card-stats { flex-direction: column; }
  .card-actions { display: none; } /* hide non-essential actions */
}

/* === Fluid typography === */
:root {
  /* min: 14px at 320px viewport, max: 16px at 1440px viewport */
  font-size: clamp(0.875rem, 0.875rem + 0.347vw, 1rem);
}
h1 { font-size: clamp(1.5rem, 4vw, 2.5rem); }

/* === Data table responsiveness === */
@media (max-width: 768px) {
  .data-table { display: block; }
  .data-table thead { display: none; } /* hide column headers */
  .data-table tbody tr {
    display: block;
    border: 1px solid var(--color-border);
    border-radius: var(--cv-radius-md);
    margin-bottom: 1rem;
    padding: 1rem;
  }
  .data-table td {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.25rem 0;
  }
  /* Show column name as pseudo-label */
  .data-table td[data-label]::before {
    content: attr(data-label);
    font-weight: 600;
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
}
```

---

## Quick-Fire Q&A

| Question | Detailed Answer |
|----------|----------------|
| `em` vs `rem`? | `em` = relative to parent's computed `font-size` (compounds in nested elements). `rem` = always relative to `:root` font-size (safer for layout). |
| `position: sticky` requirement? | Parent must not have `overflow: hidden/auto/scroll` — that creates a new stacking context and breaks sticky. |
| BFC (Block Formatting Context)? | Independent layout container. Created by: `overflow:hidden`, `display:flex/grid/table`, `position:absolute/fixed`. Contents don't interact with outside floats. |
| `z-index` not working? | Element needs `position` !== `static`. Also check stacking context — a parent with `transform`, `filter`, `opacity<1`, `isolation:isolate` creates a new context. |
| What is `isolation: isolate`? | Creates a new stacking context without any visual effect. Use to prevent z-index bleed-through from children into parent layers. |
| How does CSS Grid `fr` unit work? | Fractional unit — fills available space after fixed lengths are allocated. `1fr 2fr` = first gets 1/3, second 2/3 of remaining space. |
| `aspect-ratio` CSS property? | Maintains width-to-height ratio regardless of dimension changes. `aspect-ratio: 16/9` — great for video embeds and preventing CLS. |
| `logical properties`? | `margin-inline-start` instead of `margin-left` — works for RTL languages automatically. Use for internationalized apps. |
