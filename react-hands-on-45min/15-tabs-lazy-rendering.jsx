import { lazy, Suspense, useState } from 'react';

export function lazyTab(id, label, loader) {
  return { id, label, Panel: lazy(loader) };
}

export function TabsLazy({ tabs, initialId }) {
  const [active, setActive] = useState(initialId ?? tabs[0]?.id ?? '');

  return (
    <div>
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
              borderBottom:
                t.id === active ? '2px solid #2a6df4' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" style={{ padding: '12px 0' }}>
        {tabs.map((t) =>
          t.id === active ? (
            <Suspense key={t.id} fallback={<div>Loading…</div>}>
              <t.Panel />
            </Suspense>
          ) : null
        )}
      </div>
    </div>
  );
}
