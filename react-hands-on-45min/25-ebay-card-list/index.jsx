const ITEMS = [
  { id: '1', title: 'Wireless headphones', imageUrl: 'https://picsum.photos/seed/a/280/200', price: '$129.99' },
  { id: '2', title: 'Mechanical keyboard', imageUrl: 'https://picsum.photos/seed/b/280/200', price: '$89.99' },
  { id: '3', title: 'USB-C hub', imageUrl: 'https://picsum.photos/seed/c/280/200', price: '$34.99' },
  { id: '4', title: 'Desk lamp LED', imageUrl: 'https://picsum.photos/seed/d/280/200', price: '$24.99' },
];

function Card({ title, imageUrl, price }) {
  return (
    <article
      style={{
        border: '1px solid #ddd',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <img src={imageUrl} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 14, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{price}</div>
      </div>
    </article>
  );
}

/** Simple list-of-cards grid (eBay-style interview snippet). */
export function EbayStyleListing() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Items</h2>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        {ITEMS.map((item) => (
          <li key={item.id}>
            <Card {...item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
