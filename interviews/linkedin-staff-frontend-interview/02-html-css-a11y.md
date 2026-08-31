# HTML, CSS & Accessibility — Phone Screen

> LinkedIn tests **semantic markup** and **CSS fundamentals**, not Tailwind tricks. Expect quick-fire trivia + possible UI-from-image task.

---

## 1. Semantic HTML

| Element | Use |
|---------|-----|
| `<header>`, `<footer>`, `<nav>` | Page landmarks |
| `<main>` | Single primary content (one per page) |
| `<article>` | Self-contained content (feed post) |
| `<section>` | Thematic grouping with heading |
| `<button>` | Actions (not `<div onclick>`) |
| `<a href>` | Navigation |
| `<ul>/<li>` | Lists of items |

**Staff signal:** "I'd use `<button type="button">` for in-page actions and `<a>` only when navigation occurs — better a11y and keyboard defaults."

---

## 2. Event Delegation

Attach **one** listener on a stable parent; handle events from dynamically added children.

```javascript
list.addEventListener("click", (event) => {
  const item = event.target.closest("[data-id]");
  if (!item || !list.contains(item)) return;
  handleSelect(item.dataset.id);
});
```

**Why LinkedIn cares:** Feed lists, notifications — thousands of dynamic DOM nodes.

| Bubbling | Capturing |
|----------|-----------|
| Target → ancestors (default) | Window → target |
| `addEventListener(type, fn)` | `addEventListener(type, fn, true)` |

**stopPropagation vs preventDefault:**
- `stopPropagation` — don't bubble to parents
- `preventDefault` — don't do default browser action (e.g. form submit)

Demo: [../practice/event-delegation-demo.js](../practice/event-delegation-demo.js)

---

## 3. CSS Specificity

Calculate: `(inline, IDs, classes/attrs/pseudo-classes, elements/pseudo-elements)`

| Selector | Specificity |
|----------|-------------|
| `#nav .item` | (0, 1, 1, 0) |
| `div.post.highlight` | (0, 0, 2, 1) |
| `style=""` inline | (1, 0, 0, 0) |
| `!important` | Wins within same origin rule (avoid in prod) |

**`padding` vs `margin`:**
- Padding — inside border, inherits background color
- Margin — outside border, collapses vertically between block siblings

**Box model:** `content-box` (default width = content) vs `border-box` (width includes padding + border) — `box-sizing: border-box` is industry default.

---

## 4. Layout Essentials

| Technique | When |
|-----------|------|
| Flexbox | 1D — nav bars, centering, toolbars |
| Grid | 2D — dashboards, card layouts |
| `position: sticky` | Table headers, section nav |
| `clamp()` | Fluid typography |

**Center a div (modern):**

```css
.container {
  display: grid;
  place-items: center;
  min-height: 100vh;
}
```

---

## 5. Accessibility (a11y)

LinkedIn is a professional network — a11y is a product requirement.

| Requirement | Implementation |
|-------------|----------------|
| Keyboard | All interactive elements focusable; visible `:focus-visible` |
| Screen readers | Semantic HTML, `aria-label` when visual label missing |
| Dynamic updates | `aria-live="polite"` on feed regions |
| Modals | Focus trap, `role="dialog"`, `aria-modal="true"`, return focus on close |
| Images | Meaningful `alt` text |
| Color | Don't rely on color alone (4.5:1 contrast for text) |

**Skip link pattern:**

```html
<a href="#main" class="skip-link">Skip to main content</a>
<main id="main">...</main>
```

---

## 6. Reported UI Coding Tasks (Later Rounds — Preview)

From [Frontend Interview Handbook](https://www.frontendinterviewhandbook.com/companies/linkedin-front-end-interview-questions):

| Task | Key skills |
|------|------------|
| Tooltip component | CSS positioning, arrow, hover/focus, viewport overflow |
| LinkedIn top nav | Flexbox, responsive, keyboard nav, semantic `<nav>` |
| Widget from image | Match layout, spacing, typography without pixel-perfect obsession |

Practice: [../../react-hands-on-45min/05-modal/](../../react-hands-on-45min/05-modal/README.md), [../../react-hands-on-45min/08-searchable-dropdown/](../../react-hands-on-45min/08-searchable-dropdown/README.md)

---

## 7. Quick-Fire Q&A

**Q: Difference between `display: none` and `visibility: hidden`?**  
A: `none` removes from layout and accessibility tree (usually); `hidden` keeps space, not visible.

**Q: Preprocessors (Sass/Less)?**  
A: Variables, nesting, mixins; build step required; modern CSS has native variables (`--token`).

**Q: Difference between promise and callback?**  
A: Promises give composable async flow and centralized error handling; callbacks are simpler but nest poorly.

**Q: `defer` vs `async` on scripts?**  
A: `defer` — download parallel, execute after HTML parse, order preserved. `async` — execute when ready, order not guaranteed.

**Q: How to improve LCP?**  
A: Optimize hero image, preload critical resources, reduce server TTFB, avoid render-blocking CSS/JS.

---

## 8. Phone Screen CSS/HTML Checklist

- [ ] Explain specificity with 2 competing rules
- [ ] Draw box model (content, padding, border, margin)
- [ ] Describe event delegation for a dynamic feed list
- [ ] Name 5 semantic elements and when to use each
- [ ] List 3 a11y requirements for a modal dialog
