import { lazy, Suspense, useState } from 'react';

// ── lazyTab helper ─────────────────────────────────────────────────────────────
// Call this at MODULE LEVEL (outside any component) to build your tabs config.
//
// Example usage:
//   const TABS = [
//     lazyTab('home',     'Home',     () => import('./panels/HomePanel')),
//     lazyTab('settings', 'Settings', () => import('./panels/SettingsPanel')),
//   ];
//
// WHY module level: React.lazy() must be called ONCE per component.
// If called inside a component body, every re-render creates a NEW lazy wrapper,
// discards the cached module, and triggers an infinite loading loop.
export function lazyTab(id, label, loader) {
  return {
    id,                  // unique string key (used as React key + active check)
    label,               // text shown on the tab button
    Panel: lazy(loader), // React.lazy() wraps the dynamic import — one chunk per panel
  };
}

// ── TabsLazy component ─────────────────────────────────────────────────────────
export function TabsLazy({ tabs, initialId }) {
  // active: id string of the currently selected tab.
  const [active, setActive] = useState(initialId ?? tabs[0]?.id ?? '');

  return (
    <div>
      {/* Tab button bar — role="tablist" is the ARIA pattern for a tab widget */}
      <div role="tablist" style={{ display: 'flex', gap: 8, borderBottom: '1px solid #ccc' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active}
            onClick={() => setActive(t.id)}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '8px 12px',
              // Transparent border (not none) prevents layout shift when toggling.
              borderBottom: t.id === active ? '2px solid #2a6df4' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panel area */}
      <div role="tabpanel" style={{ padding: '12px 0' }}>
        {tabs.map((t) =>
          // Only the active tab is mounted. Inactive panels are fully unmounted
          // (no memory, no running effects). The JS chunk stays cached by the browser.
          t.id === active ? (
            // Suspense per tab: only the loading tab shows the fallback, not the whole page.
            // key={t.id} resets Suspense state when switching tabs.
            <Suspense key={t.id} fallback={<div>Loading...</div>}>
              {/*
               * <t.Panel /> triggers lazy loading:
               * 1. First render: React calls the loader (dynamic import())
               * 2. Promise pending → Suspense shows fallback
               * 3. Promise resolves → real component renders
               * 4. Subsequent renders: module is cached → synchronous
               */}
              <t.Panel />
            </Suspense>
          ) : null
        )}
      </div>
    </div>
  );
}
