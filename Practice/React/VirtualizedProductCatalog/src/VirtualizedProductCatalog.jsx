import React, { useLayoutEffect, useMemo, useRef, useState, memo } from 'react';
import { List } from 'react-window';
import './VirtualizedProductCatalog.css';

const ITEM_COUNT = 50_000;
const ROW_HEIGHT = 56;
const LIST_HEIGHT = 480;

const CATEGORIES = ['Audio', 'Wearables', 'Office', 'Kitchen', 'Gaming', 'Cameras'];

function buildProducts(count) {
  const out = new Array(count);
  for (let i = 0; i < count; i += 1) {
    const category = CATEGORIES[i % CATEGORIES.length];
    out[i] = {
      id: `sku-${i + 1}`,
      name: `${category} item ${i + 1}`,
      category,
      price: (9.99 + (i % 230) * 0.75).toFixed(2),
    };
  }
  return out;
}

const Row = memo(function Row({ index, style, ariaAttributes, products }) {
  const product = products[index];
  return (
    <div {...ariaAttributes} style={style} className="vpc-row">
      <span className="vpc-cell vpc-sku" title={product.id}>
        {product.id}
      </span>
      <span className="vpc-cell vpc-name">{product.name}</span>
      <span className="vpc-cell vpc-cat">{product.category}</span>
      <span className="vpc-cell vpc-price">${product.price}</span>
    </div>
  );
});

export default function VirtualizedProductCatalog() {
  const products = useMemo(() => buildProducts(ITEM_COUNT), []);
  const rowProps = useMemo(() => ({ products }), [products]);
  const containerRef = useRef(null);
  const [listWidth, setListWidth] = useState(640);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) {
        setListWidth(Math.max(280, Math.floor(w)));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <section className="vpc" aria-labelledby="vpc-heading">
      <h2 id="vpc-heading" className="vpc-heading">
        {ITEM_COUNT.toLocaleString()} products (virtualized)
      </h2>
      <p className="vpc-hint">
        Scroll the list: DOM only keeps a small window of rows, not all {ITEM_COUNT.toLocaleString()}.
      </p>
      <div ref={containerRef} className="vpc-list-wrap">
        <List
          className="vpc-list"
          style={{ height: LIST_HEIGHT, width: listWidth }}
          rowCount={ITEM_COUNT}
          rowHeight={ROW_HEIGHT}
          rowProps={rowProps}
          rowComponent={Row}
          overscanCount={8}
        />
      </div>
    </section>
  );
}
