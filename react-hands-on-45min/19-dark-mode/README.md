# 19 — Dark Mode / Theme Provider

## What to Build

A theme system with three modes — `"light"`, `"dark"`, and `"system"` — backed by `localStorage` so the user's choice persists across page reloads.

Three exports:
- `ThemeProvider` — wraps the app; manages all theme state
- `useTheme` — hook for any child component to read or change the theme
- `ThemeToggle` — ready-made UI with three mode buttons

---

## State

| Variable | Type | Purpose |
|---|---|---|
| `mode` | `"light" \| "dark" \| "system"` | The user's stored preference |
| `systemDark` | `boolean` | Whether the OS is currently in dark mode |
| `effective` | `"light" \| "dark"` | The resolved theme CSS actually uses |

**Why two separate values (`mode` and `effective`)?**

When `mode` is `"system"`, the actual theme depends on the OS. Components and CSS need to know the real theme (`"light"` or `"dark"`), but the toggle UI needs to show the stored preference so it can correctly display "System: on". Merging them into one value would lose that distinction.

```js
const effective = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
```

---

## System Detection: `window.matchMedia`

```js
// Read the current OS preference on mount
const [systemDark, setSystemDark] = useState(() =>
  window.matchMedia('(prefers-color-scheme: dark)').matches
);

// Subscribe to changes (e.g. macOS auto-switch at sunset)
useEffect(() => {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = () => setSystemDark(mq.matches);
  mq.addEventListener('change', listener);
  return () => mq.removeEventListener('change', listener); // cleanup on unmount
}, []);
```

The `"system"` mode is live — if the user has scheduled their OS to switch at sunset, the app's theme updates automatically without them touching the toggle.

---

## Applying the Theme: `data-theme` on `document.documentElement`

```js
useEffect(() => {
  document.documentElement.dataset.theme = effective;    // sets data-theme="dark"
  document.documentElement.style.colorScheme = effective; // native UI (scrollbars, inputs)
}, [effective]);
```

**Why set the attribute on `document.documentElement` (the `<html>` element)?**

Setting `data-theme` on `<html>` means every element in the entire page is a descendant. CSS selectors like `[data-theme="dark"] { --bg: #111 }` then apply globally. If you set it on a `<div>` wrapper, elements outside that wrapper (portals, modals, third-party tooltips) would not inherit the theme.

`colorScheme` tells the browser itself to render native controls (scrollbars, checkboxes, `<select>` dropdowns) in the correct OS style.

---

## localStorage Persistence

```js
const setMode = (m) => {
  setModeState(m);
  try {
    localStorage.setItem('theme-mode', m);
  } catch {
    // storage blocked in private browsing — theme works in memory, just won't persist
  }
};

// Lazy initializer: reads localStorage only once on mount
const [mode, setModeState] = useState(() => readStoredMode() ?? 'system');
```

Always wrap `localStorage` in `try/catch`. Storage access throws in private/incognito browsing, when the quota is exceeded, or when blocked by browser policy. Without the guard, a storage error would crash the entire theme toggle.

---

## `useMemo` on the Context Value

```js
const value = useMemo(() => ({ mode, setMode, effective }), [mode, effective]);
```

**Why is this necessary?**

`{ mode, setMode, effective }` is a new object literal on every render. React Context consumers compare the value by reference. Without `useMemo`, every time `ThemeProvider` re-renders for any reason (including an unrelated parent re-render), all consumers of `useTheme` would also re-render — even if `mode` and `effective` have not changed. `useMemo` returns the same object reference until the dependencies actually change.

---

## Interview Questions

**Q: What is the "system" mode and how does it work?**

A: "System" mode means the app's theme follows the OS dark/light preference automatically. It uses `window.matchMedia('(prefers-color-scheme: dark)')` to read the current preference on mount, and subscribes to the `change` event to react to OS-level switches in real time (e.g., macOS scheduled dark mode at sunset). The effective theme is computed as: if `mode === 'system'` then use `systemDark ? 'dark' : 'light'`; otherwise use the user's explicit choice.

**Q: Why set the `data-theme` attribute on `document.documentElement` rather than on a wrapper `<div>`?**

A: The `<html>` element is the ancestor of every element on the page. Placing `data-theme` there means the CSS selectors `[data-theme="dark"]` match the entire document. A wrapper `<div>` misses elements rendered outside it — React portals, modals, third-party widgets, and anything attached directly to `<body>`. Using `<html>` also allows `colorScheme` to control native browser UI (scrollbars, form controls) which only responds to styles on the root element.

**Q: Why `useMemo` on the context value?**

A: The context value object `{ mode, setMode, effective }` is a new object on every render. React Context compares by reference — a new object triggers a re-render in every consumer even if the data inside is identical. `useMemo` memoises the object and returns the same reference until `mode` or `effective` actually changes, preventing unnecessary re-renders across all `useTheme` consumers.
