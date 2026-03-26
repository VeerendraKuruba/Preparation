# 23 - Tabs with Lazy Rendering

## What to Build

A **tab component where each panel's JavaScript is only downloaded when first clicked** — code splitting at the tab level.

- Tab buttons switch between panels.
- Each panel is defined with `React.lazy()` + `dynamic import()`.
- The JS chunk for a panel is not fetched until the user clicks that tab.
- While the chunk is downloading, `Suspense` shows a "Loading..." fallback.
- After the first load the module is cached — subsequent visits are instant.

---

## Core Pattern

```
lazyTab() (module level) → creates { id, label, Panel: lazy(...) }
         ↓
TabsLazy renders:
  active tab only → <Suspense fallback="Loading..."><t.Panel /></Suspense>
  inactive tabs   → null (fully unmounted)
```

**Key building blocks:**

| Concept | Why |
|---|---|
| `React.lazy()` | Wraps a dynamic `import()` — emits a separate JS chunk |
| `Suspense` | Catches the "not ready" signal from a lazy component; shows fallback |
| `dynamic import()` | The bundler split point — tells Webpack/Vite to create a separate chunk |
| `lazyTab()` helper | Calls `lazy()` once per tab **outside** any component |
| Inactive tabs = `null` | Unmounts panels when not active — no memory, no running effects |

---

## Why `lazyTab` Must Be Called at Module Level

```jsx
// CORRECT — module level, called once:
const TABS = [
  lazyTab('home', 'Home', () => import('./panels/HomePanel')),
];

// WRONG — inside a component:
function MyPage() {
  const TABS = [
    lazyTab('home', 'Home', () => import('./panels/HomePanel')),  // BAD
  ];
}
```

`React.lazy()` returns a **new lazy component wrapper** each time it is called. If called inside a component body, every re-render creates a NEW wrapper. React sees a different component type, discards the cached module, calls the loader again, and enters an **infinite loading loop**. Module-level placement ensures the wrapper is created exactly once and reused.

---

## The Lazy Loading Sequence

```
User clicks "Settings" tab:
  1. setActive('settings') → React tries to render <t.Panel />
  2. lazy() calls the loader: () => import('./SettingsPanel')
  3. The Promise is pending → lazy component throws → Suspense catches it
  4. Suspense renders <div>Loading...</div> fallback
  5. Promise resolves → chunk is evaluated → module cached
  6. React re-renders with the real SettingsPanel component
  7. User clicks "Settings" again → module cached → renders synchronously
```

---

## Code Splitting Explained

Without lazy:
```
bundle.js (everything — HomePanel + SettingsPanel + ProfilePanel)
  → Downloaded upfront, even panels the user never visits
```

With lazy:
```
bundle.js (core app code only)
HomePanel.chunk.js  ← downloaded when Home tab is clicked
SettingsPanel.chunk.js  ← downloaded when Settings tab is clicked
ProfilePanel.chunk.js  ← downloaded when Profile tab is clicked
```

Users who never visit the Settings tab never download `SettingsPanel.chunk.js`. This reduces the **initial bundle size** and improves **Time-to-Interactive**.

---

## Suspense Placement

```jsx
// Suspense wraps each panel individually — not the whole tab area.
// This means only the LOADING panel shows the fallback.
<Suspense key={t.id} fallback={<div>Loading...</div>}>
  <t.Panel />
</Suspense>
```

`key={t.id}` resets the Suspense boundary when switching tabs, ensuring a fresh fallback for each new panel that needs loading.

---

## Inactive Tabs — Unmount vs CSS Hide

Current approach: `t.id === active ? <Suspense>...</Suspense> : null`

| Approach | Pros | Cons |
|---|---|---|
| Unmount (null) | Frees memory; no running effects | Re-mounts on revisit; scroll position lost |
| CSS hide (display:none) | Keeps state/scroll across tab switches | Memory still used; effects still running |
| React offscreen (future) | Best of both | Not stable in React yet |

---

## Interview Questions

**Q: What is code splitting?**
A: Instead of shipping one large `bundle.js`, the bundler (Webpack/Vite) splits the app into multiple smaller chunk files. Each chunk is downloaded only when needed. `dynamic import()` is the split point — wherever you write `import('./SomeModule')`, the bundler emits a separate chunk for that module.

**Q: Why must `React.lazy()` be called outside a component, not inside render?**
A: `React.lazy()` returns a new lazy component wrapper each time it is called. If called inside a component, every re-render creates a NEW wrapper. React treats it as a different component type, discards the cached module, and triggers the loader again — causing an infinite Suspense loop. Module-level placement ensures the wrapper is stable.

**Q: What does `Suspense` do?**
A: It catches the special signal (a thrown Promise) that a lazy component emits while its code is loading. While the Promise is pending, `Suspense` renders the `fallback` prop instead. When the Promise resolves, React re-renders with the real component. Without a `Suspense` ancestor, using a lazy component throws a runtime error.

**Q: What are the trade-offs between unmounting inactive tabs vs hiding them with CSS?**
A: Unmounting frees memory and is simpler — good for heavy, independent panels. But the component re-mounts each visit, re-running `useEffect` and potentially re-fetching data or losing scroll position. CSS hiding (`display: none`) keeps the component mounted and preserves local state, but wastes memory if panels are large. For most tabs, unmounting is fine; for panels with expensive setup, CSS hiding is better.
