import { useMemo, useState } from 'react';

const PRODUCTS = [
  { id: 1, name: 'Apple iPhone 15', category: 'Mobile', price: 70000 },
  { id: 2, name: 'Samsung Galaxy S24', category: 'Mobile', price: 80000 },
  { id: 3, name: 'MacBook Pro', category: 'Laptop', price: 150000 },
  { id: 4, name: 'Dell XPS', category: 'Laptop', price: 120000 },
];

const DEFAULT_FILTERS = {
  search: '',
  category: 'all',
  minPrice: '',
  maxPrice: '',
  sort: 'name-asc',
};

function parsePrice(value) {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Pure filter + sort — easy to unit test */
export function filterAndSortProducts(products, filters) {
  const query = filters.search.trim().toLowerCase();
  const min = parsePrice(filters.minPrice);
  const max = parsePrice(filters.maxPrice);

  const filtered = products.filter((p) => {
    if (query && !p.name.toLowerCase().includes(query)) return false;
    if (filters.category !== 'all' && p.category !== filters.category) return false;
    if (min !== null && p.price < min) return false;
    if (max !== null && p.price > max) return false;
    return true;
  });

  return filtered.slice().sort((a, b) => {
    switch (filters.sort) {
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      default:
        return a.name.localeCompare(b.name);
    }
  });
}

export function ProductSearch({ products = PRODUCTS }) {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products],
  );

  const visible = useMemo(
    () => filterAndSortProducts(products, filters),
    [products, filters],
  );

  const set = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h1>Product Search</h1>
      <p>
        Showing {visible.length} of {products.length} products
      </p>

      <form
        onSubmit={(e) => e.preventDefault()}
        style={{ display: 'grid', gap: 8, marginBottom: 16 }}
        aria-label="Product filters"
      >
        <label>
          Search by name
          <input
            type="search"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
          />
        </label>

        <label>
          Category
          <select
            value={filters.category}
            onChange={(e) => set('category', e.target.value)}
          >
            <option value="all">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label>
          Minimum price
          <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => set('minPrice', e.target.value)}
          />
        </label>

        <label>
          Maximum price
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => set('maxPrice', e.target.value)}
          />
        </label>

        <label>
          Sort
          <select
            value={filters.sort}
            onChange={(e) => set('sort', e.target.value)}
          >
            <option value="name-asc">Name (A–Z)</option>
            <option value="name-desc">Name (Z–A)</option>
            <option value="price-asc">Price (Low → High)</option>
            <option value="price-desc">Price (High → Low)</option>
          </select>
        </label>

        <button type="button" onClick={() => setFilters({ ...DEFAULT_FILTERS })}>
          Clear filters
        </button>
      </form>

      {visible.length === 0 ? (
        <p role="status">No products found. Try adjusting your filters.</p>
      ) : (
        <ul aria-label="Products">
          {visible.map((p) => (
            <li key={p.id}>
              {p.name} — {p.category} — ₹{p.price.toLocaleString('en-IN')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { PRODUCTS, DEFAULT_FILTERS };
export default ProductSearch;
