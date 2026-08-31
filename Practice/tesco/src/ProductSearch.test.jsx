import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ProductSearch,
  PRODUCTS,
  DEFAULT_FILTERS,
  filterAndSortProducts,
} from './ProductSearch';

describe('filterAndSortProducts', () => {
  const base = () => ({ ...DEFAULT_FILTERS });

  it('searches by name (case-insensitive)', () => {
    const result = filterAndSortProducts(PRODUCTS, { ...base(), search: 'iphone' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Apple iPhone 15');
  });

  it('filters by category', () => {
    const result = filterAndSortProducts(PRODUCTS, { ...base(), category: 'Laptop' });
    expect(result.map((p) => p.name)).toEqual(['Dell XPS', 'MacBook Pro']);
  });

  it('filters by min and max price', () => {
    const result = filterAndSortProducts(PRODUCTS, {
      ...base(),
      minPrice: '70000',
      maxPrice: '120000',
    });
    expect(result.map((p) => p.name)).toEqual([
      'Apple iPhone 15',
      'Dell XPS',
      'Samsung Galaxy S24',
    ]);
  });

  it('sorts by price ascending', () => {
    const result = filterAndSortProducts(PRODUCTS, { ...base(), sort: 'price-asc' });
    expect(result.map((p) => p.price)).toEqual([70000, 80000, 120000, 150000]);
  });

  it('returns empty when nothing matches', () => {
    expect(filterAndSortProducts(PRODUCTS, { ...base(), search: 'nokia' })).toEqual([]);
  });
});

describe('ProductSearch', () => {
  it('renders all products', () => {
    render(<ProductSearch />);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('searches by name', async () => {
    const user = userEvent.setup();
    render(<ProductSearch />);
    await user.type(screen.getByLabelText(/search by name/i), 'MacBook');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText(/MacBook Pro/)).toBeInTheDocument();
  });

  it('filters by category', async () => {
    const user = userEvent.setup();
    render(<ProductSearch />);
    await user.selectOptions(screen.getByLabelText(/category/i), 'Mobile');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('filters by price range', async () => {
    const user = userEvent.setup();
    render(<ProductSearch />);
    await user.type(screen.getByLabelText(/minimum price/i), '100000');
    await user.type(screen.getByLabelText(/maximum price/i), '130000');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText(/Dell XPS/)).toBeInTheDocument();
  });

  it('sorts by price', async () => {
    const user = userEvent.setup();
    render(<ProductSearch />);
    await user.selectOptions(screen.getByLabelText(/sort/i), 'price-asc');
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Apple iPhone 15');
    expect(items[3]).toHaveTextContent('MacBook Pro');
  });

  it('shows empty state', async () => {
    const user = userEvent.setup();
    render(<ProductSearch />);
    await user.type(screen.getByLabelText(/search by name/i), 'Nokia');
    expect(screen.getByText(/no products found/i)).toBeInTheDocument();
  });

  it('clears filters', async () => {
    const user = userEvent.setup();
    render(<ProductSearch />);
    await user.type(screen.getByLabelText(/search by name/i), 'Samsung');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });
});
