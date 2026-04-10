# React & Frontend Deep Dive

**When tested:** Live coding round and technical follow-ups in behavioral round  
**Difficulty:** Hard — security and internals tested rigorously at JPMC

---

## React Internals

### Q: How does React reconciliation work?

**Answer:**
React uses a **virtual DOM diffing** algorithm (the "reconciler") to determine minimal DOM changes:

1. On state/prop change, React creates a new virtual DOM tree
2. Reconciler diffs new tree against the previous one using a heuristic algorithm:
   - Two elements of different types produce different trees (full re-render of that subtree)
   - For lists, uses `key` prop to match elements across renders
3. Only the actual DOM nodes that changed are updated (the "commit phase")

**Fiber** (React 16+) is the internal reconciliation engine:
- Breaks rendering into small units of work ("fibers") that can be paused/resumed
- Enables concurrent mode: React can interrupt low-priority renders for urgent updates
- Priority levels: user input (urgent) > data fetching > background transitions

```jsx
// key prop is critical for reconciliation correctness
// Wrong: index as key (breaks when list reorders)
{items.map((item, i) => <Item key={i} data={item} />)}

// Correct: stable unique id
{items.map(item => <Item key={item.id} data={item} />)}
```

---

### Q: What's the difference between useMemo, useCallback, and React.memo?

**Answer:**

| Hook/API | What it memoizes | When to use |
|---|---|---|
| `useMemo` | Return value of a function | Expensive calculations; derived data |
| `useCallback` | The function itself (reference) | Pass stable callback to child to prevent re-render |
| `React.memo` | Component render output | Prevent child from re-rendering if props haven't changed |

```jsx
// useMemo — memoize expensive computation
const sortedData = useMemo(() => {
  return largeDataset.sort((a, b) => a.price - b.price);
}, [largeDataset]); // only re-runs when largeDataset changes

// useCallback — stable function reference for child
const handleRowClick = useCallback((rowId) => {
  selectRow(rowId);
}, [selectRow]); // stable unless selectRow changes

// React.memo — prevent re-render if props are same
const TradeRow = React.memo(({ trade, onSelect }) => {
  return <div onClick={() => onSelect(trade.id)}>{trade.symbol}</div>;
});

// Common mistake: useMemo/useCallback without measuring
// These have their own cost — only use when profiling shows it's needed
```

---

### Q: When would you use useReducer over useState?

**Answer:**

Use `useReducer` when:
- State transitions are complex (multiple sub-values that update together)
- Next state depends on previous state in non-trivial ways
- You want to co-locate all state logic in one place (like Redux, but local)

```jsx
// Complex state — good candidate for useReducer
const initialState = {
  status: 'idle', // idle | loading | success | error
  data: null,
  error: null,
  filters: { from: null, to: null, symbol: '' },
};

function tradeReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, status: 'loading', error: null };
    case 'FETCH_SUCCESS':
      return { ...state, status: 'success', data: action.payload };
    case 'FETCH_ERROR':
      return { ...state, status: 'error', error: action.payload };
    case 'SET_FILTER':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    default:
      return state;
  }
}

function TradeList() {
  const [state, dispatch] = useReducer(tradeReducer, initialState);
  // ...
}
```

---

### Q: How does React Suspense work, and when would you use it?

**Answer:**

Suspense lets components "wait" for something (data, code) before rendering. It works by:
1. Component throws a Promise (or uses a Suspense-compatible data source)
2. Nearest `<Suspense>` boundary catches it, shows fallback
3. When Promise resolves, React retries rendering the component

```jsx
// Code splitting with Suspense
const TradingDashboard = React.lazy(() => import('./TradingDashboard'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TradingDashboard />
    </Suspense>
  );
}

// Data fetching with Suspense (React 18 + frameworks like Next.js)
// The framework handles the Promise-throwing internally
async function TradePage({ params }) {
  const trade = await fetchTrade(params.id); // Server Component
  return <TradeDetail trade={trade} />;
}
```

---

### Q: How do you handle large list rendering performance?

**Answer:** Virtualization — only render DOM nodes for visible items.

```jsx
import { useVirtualizer } from '@tanstack/react-virtual';

function TradeTable({ trades }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: trades.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // row height in px
    overscan: 10, // render 10 rows beyond visible area
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflowY: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <TradeRow
            key={trades[virtualRow.index].id}
            style={{
              transform: `translateY(${virtualRow.start}px)`,
              position: 'absolute',
            }}
            trade={trades[virtualRow.index]}
          />
        ))}
      </div>
    </div>
  );
}
// Renders 50 DOM nodes for 10,000 rows — massive perf gain
```

---

### Q: Explain micro-frontend architecture. How would you implement it?

**Answer:**

Micro-frontends decompose a large SPA into independently deployable frontend apps, each owned by a separate team.

**Approaches:**
1. **Module Federation (Webpack 5)** — apps expose/consume remote modules at runtime
2. **iframes** — full isolation, but limited communication
3. **Web Components** — framework-agnostic custom elements
4. **Single-SPA** — routing-level composition

```javascript
// Host app webpack.config.js (Webpack Module Federation)
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        portfolio: 'portfolio@https://portfolio.jpmc.internal/remoteEntry.js',
        trading: 'trading@https://trading.jpmc.internal/remoteEntry.js',
      },
      shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
    }),
  ],
};

// In host app:
const PortfolioApp = React.lazy(() => import('portfolio/App'));
```

**Trade-offs to mention:**
- Pro: Independent deploys, team autonomy, tech stack flexibility
- Con: Shared dependency management is hard, cross-app state sharing is complex
- Compliance concern: ensure each micro-frontend enforces same auth/security policies

---

### Q: State management approaches — Context API vs Redux vs Zustand

**Answer:**

| Approach | Best For | Avoid When |
|---|---|---|
| `useState` / `useReducer` | Local component state | Cross-component sharing needed |
| Context API | Low-frequency global state (theme, auth user) | High-frequency updates (causes all consumers to re-render) |
| Redux Toolkit | Large apps, complex state, time-travel debugging | Small/medium apps — adds boilerplate |
| Zustand | Most cases — simple, performant, minimal boilerplate | When Redux ecosystem tools (redux-devtools deep integration) are required |
| React Query / SWR | Server state (fetch, cache, sync) | Client-only state |

```jsx
// Zustand — minimal boilerplate
import { create } from 'zustand';

const useTradeStore = create((set) => ({
  selectedTrades: [],
  addTrade: (trade) => set((state) => ({
    selectedTrades: [...state.selectedTrades, trade],
  })),
  clearTrades: () => set({ selectedTrades: [] }),
}));

// Usage in any component — no Provider needed
function TradePanel() {
  const { selectedTrades, addTrade } = useTradeStore();
  // ...
}
```

---

### Q: How do you write tests for React components? What tools?

**Answer:**

**Tool stack:** Jest + React Testing Library (RTL)

**Testing philosophy (RTL principle):** Test what the user sees and interacts with, not implementation details.

```jsx
// Component to test
function LoginForm({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Invalid email');
      return;
    }
    onSubmit(email);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input id="email" value={email} onChange={e => setEmail(e.target.value)} />
      {error && <span role="alert">{error}</span>}
      <button type="submit">Login</button>
    </form>
  );
}

// Tests
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('LoginForm', () => {
  it('shows error for invalid email', async () => {
    render(<LoginForm onSubmit={jest.fn()} />);
    await userEvent.type(screen.getByLabelText('Email'), 'notanemail');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email');
  });

  it('calls onSubmit with email when valid', async () => {
    const mockSubmit = jest.fn();
    render(<LoginForm onSubmit={mockSubmit} />);
    await userEvent.type(screen.getByLabelText('Email'), 'user@jpmc.com');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(mockSubmit).toHaveBeenCalledWith('user@jpmc.com');
  });
});
```

**Code coverage:** Use Istanbul (built into Jest). Target: 80%+ line coverage, 70%+ branch coverage. Cover:
- Happy path
- Error/edge cases
- User interaction paths

---

## Preparation Checklist

- [ ] Implement React hooks (useState, useEffect, useMemo, useCallback, useReducer) from memory
- [ ] Explain reconciliation and the Fiber architecture
- [ ] Set up and use React Testing Library for component tests
- [ ] Implement a virtualized list with @tanstack/virtual
- [ ] Understand Webpack Module Federation for micro-frontends
- [ ] Compare state management options with concrete trade-offs
- [ ] Know React Suspense for both lazy loading and data fetching
