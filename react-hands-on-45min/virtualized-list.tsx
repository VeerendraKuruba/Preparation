import { useState, type Key, type ReactNode } from 'react';

type VirtualListProps<T> = {
  items: T[];
  rowHeight: number;
  height: number;
  renderRow: (item: T, index: number) => ReactNode;
  getKey: (item: T, index: number) => Key;
};

export function VirtualList<T>({
  items,
  rowHeight,
  height,
  renderRow,
  getKey,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const total = items.length * rowHeight;
  const start = Math.floor(scrollTop / rowHeight);
  const overscan = 2;
  const visibleCount = Math.ceil(height / rowHeight) + overscan;
  const end = Math.min(items.length, start + visibleCount);

  return (
    <div
      style={{ height, overflow: 'auto', border: '1px solid #ccc' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: total, position: 'relative' }}>
        <div style={{ transform: `translateY(${start * rowHeight}px)` }}>
          {items.slice(start, end).map((item, i) => {
            const index = start + i;
            return (
              <div key={getKey(item, index)} style={{ height: rowHeight, boxSizing: 'border-box' }}>
                {renderRow(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
