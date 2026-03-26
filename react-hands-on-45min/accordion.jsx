import { useState } from 'react';

export function Accordion({ items, singleOpen = true, defaultOpenIds }) {
  const initial =
    defaultOpenIds?.[0] ?? (singleOpen ? items[0]?.id ?? null : items[0]?.id ?? null);
  const [openSingle, setOpenSingle] = useState(singleOpen ? initial : null);
  const [openMany, setOpenMany] = useState(
    () => new Set(singleOpen ? [] : defaultOpenIds ?? (items[0] ? [items[0].id] : []))
  );

  const isOpen = (id) => (singleOpen ? openSingle === id : openMany.has(id));

  const toggle = (id) => {
    if (singleOpen) {
      setOpenSingle((cur) => (cur === id ? null : id));
      return;
    }
    setOpenMany((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      {items.map((item) => {
        const open = isOpen(item.id);
        return (
          <section key={item.id} style={{ borderBottom: '1px solid #ccc' }}>
            <h3 style={{ margin: 0 }}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`panel-${item.id}`}
                id={`header-${item.id}`}
                onClick={() => toggle(item.id)}
                style={{ width: '100%', textAlign: 'left', padding: '0.75rem', cursor: 'pointer' }}
              >
                {item.title}
              </button>
            </h3>
            <div
              id={`panel-${item.id}`}
              role="region"
              aria-labelledby={`header-${item.id}`}
              hidden={!open}
              style={{ padding: '0 0.75rem 0.75rem' }}
            >
              {open ? item.content : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
