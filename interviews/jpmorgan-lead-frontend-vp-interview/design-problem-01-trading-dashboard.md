# Design Problem 1: Real-Time Trading Dashboard — Frontend Deep Dive

**Prompt:** "Design a real-time trading dashboard showing live stock prices, portfolio value, and trade execution status for institutional traders at JP Morgan."

**Focus of this doc:** Frontend architecture — component design, rendering strategy, real-time data patterns, CSS, hooks, testing, accessibility.

---

## The Frontend Challenges (State them first in interview)

1. **Volume:** 1,000 price ticks/sec arriving via WebSocket — naïve React re-renders crash the browser
2. **Scale:** 50,000 instruments, not all visible — DOM must stay small
3. **Precision:** Float arithmetic causes wrong P&L — must use integer math
4. **Latency:** Price updates must reach the screen in <100ms without blocking user interaction
5. **Density:** Traders need max information per pixel — data grids, not cards
6. **Correctness:** An order placed twice or with wrong price is a financial incident

---

## 1. Component Architecture

### 1.1 Component Tree

```
<App>
  <AuthGuard>                        # JWT check, RBAC
    <TradingLayout>
      <TopBar>                       # Account summary, P&L, connection status
        <PortfolioSummary />         # Total value, day P&L — updates per tick
        <ConnectionStatus />         # WS health indicator
        <UserMenu />                 # Auth actions
      </TopBar>

      <MainGrid>                     # CSS Grid layout: sidebar + center + right panel
        <Sidebar>
          <WatchlistPanel>           # Draggable, reorderable instrument list
            <WatchlistToolbar />     # Add/remove instruments, search
            <VirtualInstrumentList> # TanStack Virtual — renders ~20 rows from 50K
              <InstrumentRow />      # Symbol, bid, ask, last, change%, volume
            </VirtualInstrumentList>
          </WatchlistPanel>
        </Sidebar>

        <CenterPanel>
          <ChartContainer>           # Selected instrument chart
            <ChartToolbar />         # Timeframe selector (1m, 5m, 1H, 1D)
            <CandlestickChart />     # Canvas-based, 60fps
            <VolumeChart />          # Histogram below main chart
            <IndicatorOverlay />     # VWAP, EMA overlays
          </ChartContainer>

          <OrderBlotter>             # Active + recent orders
            <BlotterFilters />
            <VirtualOrderList>
              <OrderRow />           # Order status, fill price, remaining qty
            </VirtualOrderList>
          </OrderBlotter>
        </CenterPanel>

        <RightPanel>
          <OrderTicket>              # Primary order entry form
            <InstrumentSearch />
            <OrderForm />            # Buy/sell, quantity, price, order type
            <OrderConfirm />         # Confirmation modal for large orders
          </OrderTicket>

          <PositionsPanel>           # Current holdings
            <PositionRow />          # per-instrument P&L
          </PositionsPanel>
        </RightPanel>
      </MainGrid>
    </TradingLayout>
  </AuthGuard>
</App>
```

### 1.2 Component Design Principles for a Trading UI

**Principle 1 — Isolation of update frequency**
Components that update every 100ms must be isolated from components that update every few seconds. Wrap them separately so React's reconciler only touches the right subtree.

```tsx
// BAD — PortfolioSummary and Sidebar re-render every tick
function Dashboard() {
  const prices = usePriceStore(); // subscribes to ALL price changes
  return (
    <>
      <PortfolioSummary prices={prices} />
      <Sidebar prices={prices} />
    </>
  );
}

// GOOD — each component selects only what it needs
function PortfolioSummary() {
  // re-renders only when total portfolio value changes
  const totalValue = usePriceStore((s) => computeTotal(s.prices));
  return <div>{formatCurrency(totalValue)}</div>;
}

function InstrumentRow({ symbol }: { symbol: string }) {
  // re-renders only when THIS symbol's price changes
  const price = usePriceStore((s) => s.prices[symbol]);
  return <tr>...</tr>;
}
```

**Principle 2 — Never derive in render**
Derived values (P&L, % change, notional) must be `useMemo`'d. Never compute in JSX — that recalculates on every render including unrelated state changes.

**Principle 3 — Separate concerns by update source**
- REST data (orders, account) → TanStack Query
- Real-time ticks → Zustand
- UI state (selected tab, modal open) → local `useState`
- Global app state (auth, user prefs) → Redux Toolkit

---

## 2. React 18 Concurrent Features for a Trading Dashboard

### 2.1 `startTransition` — Keep Order Entry Responsive

```tsx
import { startTransition, useTransition } from 'react';

function InstrumentSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Instrument[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (value: string) => {
    setQuery(value); // urgent — update input immediately
    startTransition(() => {
      // non-urgent — searching 50K instruments can be deferred
      // React will yield to price tick renders first
      setResults(searchInstruments(value));
    });
  };

  return (
    <>
      <input value={query} onChange={(e) => handleSearch(e.target.value)} />
      {isPending && <Spinner />}
      <SearchResultList results={results} />
    </>
  );
}
```

Why this matters: without `startTransition`, typing in the search field freezes while React renders 50K filtered results. With it, the input stays responsive and React yields CPU to price tick updates.

### 2.2 `useDeferredValue` — Non-Urgent Chart Updates

```tsx
function ChartContainer({ symbol }: { symbol: string }) {
  const rawPrices = usePriceStore((s) => s.prices[symbol]);

  // Chart update is non-urgent — defer it so order entry stays snappy
  const deferredPrices = useDeferredValue(rawPrices);
  const isStale = rawPrices !== deferredPrices;

  return (
    <div style={{ opacity: isStale ? 0.9 : 1 }}>
      {/* Chart renders with slightly stale price while catching up */}
      <CandlestickChart prices={deferredPrices} />
    </div>
  );
}
```

### 2.3 `Suspense` for Historical Data Loading

```tsx
function ChartContainer({ symbol, timeframe }: Props) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      {/* ChartData throws a promise — React shows skeleton until resolved */}
      <ChartData symbol={symbol} timeframe={timeframe} />
    </Suspense>
  );
}

// TanStack Query v5 supports Suspense natively
function ChartData({ symbol, timeframe }: Props) {
  const { data } = useSuspenseQuery({
    queryKey: ['ohlcv', symbol, timeframe],
    queryFn: () => fetchHistoricalOHLCV(symbol, timeframe),
    staleTime: 60_000, // historical bars don't change frequently
  });
  return <CandlestickChart bars={data} />;
}
```

---

## 3. Custom Hooks Design

### 3.1 `usePriceFeed` — Core Real-Time Hook

```ts
// hooks/usePriceFeed.ts
export function usePriceFeed(symbol: string): PriceTick | undefined {
  return usePriceStore((s) => s.prices[symbol]);
}

// Multiple symbols — batch subscribe
export function usePriceFeedMany(symbols: string[]): Map<string, PriceTick> {
  return usePriceStore(
    useShallow((s) => {
      const map = new Map<string, PriceTick>();
      for (const sym of symbols) {
        if (s.prices[sym]) map.set(sym, s.prices[sym]);
      }
      return map;
    })
  );
  // useShallow: only re-renders when the selected subset actually changes
}
```

### 3.2 `usePortfolio` — Derived State

```ts
// hooks/usePortfolio.ts
export function usePortfolio() {
  const positions = useSelector(selectPositions);        // Redux — stable reference
  const prices = usePriceStore((s) => s.prices);         // Zustand — live prices

  const enrichedPositions = useMemo(() =>
    positions.map((pos) => {
      const tick = prices[pos.symbol];
      const last = tick?.last ?? pos.avgCost;
      const unrealized = Decimal(last).minus(pos.avgCost).times(pos.qty);
      const pnlPct = unrealized.dividedBy(Decimal(pos.avgCost).times(pos.qty)).times(100);
      return { ...pos, last, unrealized: unrealized.toNumber(), pnlPct: pnlPct.toNumber() };
    }),
    [positions, prices]
  );

  const totalValue = useMemo(
    () => enrichedPositions.reduce((sum, p) => sum + p.last * p.qty, 0),
    [enrichedPositions]
  );

  const totalPnL = useMemo(
    () => enrichedPositions.reduce((sum, p) => sum + p.unrealized, 0),
    [enrichedPositions]
  );

  return { positions: enrichedPositions, totalValue, totalPnL };
}
```

### 3.3 `useWebSocket` — Connection Lifecycle

```ts
// hooks/useWebSocket.ts
export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed' | 'error'>('connecting');

  useEffect(() => {
    let destroyed = false;

    function connect() {
      const token = getAuthToken();
      const ws = new WebSocket(`${url}?token=${token}`);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        if (!destroyed) {
          setStatus('open');
          reconnectCount.current = 0;
        }
      };

      ws.onmessage = (e) => priceWorker.postMessage(e.data);

      ws.onclose = () => {
        if (!destroyed) {
          setStatus('closed');
          const delay = Math.min(1000 * 2 ** reconnectCount.current, 30_000);
          reconnectCount.current++;
          setTimeout(connect, delay);
        }
      };

      ws.onerror = () => setStatus('error');
    }

    connect();
    return () => {
      destroyed = true;
      wsRef.current?.close();
    };
  }, [url]);

  const subscribe = useCallback((symbols: string[]) => {
    wsRef.current?.send(JSON.stringify({ type: 'subscribe', symbols }));
  }, []);

  const unsubscribe = useCallback((symbols: string[]) => {
    wsRef.current?.send(JSON.stringify({ type: 'unsubscribe', symbols }));
  }, []);

  return { status, subscribe, unsubscribe };
}
```

### 3.4 `useOrderForm` — Financial-Safe Order Entry

```ts
// hooks/useOrderForm.ts
export function useOrderForm(defaultSymbol?: string) {
  const [symbol, setSymbol] = useState(defaultSymbol ?? '');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('limit');
  const [idempotencyKey] = useState(() => crypto.randomUUID()); // stable per form instance

  const lastPrice = usePriceFeed(symbol)?.last;

  const notional = useMemo(() => {
    if (!qty || !price) return null;
    // Use Decimal for precision — never multiply floats for financial amounts
    return new Decimal(price).times(qty).toNumber();
  }, [qty, price]);

  const requiresConfirmation = notional !== null && notional > 1_000_000;

  const validate = (): string | null => {
    if (!symbol) return 'Symbol required';
    if (!qty || Number(qty) <= 0) return 'Invalid quantity';
    if (orderType === 'limit' && (!price || Number(price) <= 0)) return 'Invalid price';
    return null;
  };

  return {
    fields: { symbol, side, qty, price, orderType },
    setters: { setSymbol, setSide, setQty, setPrice, setOrderType },
    derived: { notional, requiresConfirmation, lastPrice },
    idempotencyKey,
    validate,
  };
}
```

### 3.5 `useStalePrice` — Data Freshness Indicator

```ts
export function useStalePrice(symbol: string, thresholdMs = 5000) {
  const timestamp = usePriceStore((s) => s.prices[symbol]?.timestamp);
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    const check = () => setIsStale(!timestamp || Date.now() - timestamp > thresholdMs);
    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, [timestamp, thresholdMs]);

  return isStale;
}
```

---

## 4. State Management Architecture

### 4.1 Why Three Separate Stores

```
Zustand (prices)          Redux Toolkit (app)       TanStack Query (server)
────────────────          ───────────────────       ───────────────────────
Write: 1,000x/sec         Write: 1-2x/sec           Write: on fetch/mutation
Read: per-component       Read: global selectors     Read: per-query subscriber
Size: ~50K price entries  Size: positions, orders    Size: orders, history, acct
Persist: NO (stale risk)  Persist: sessionStorage    Persist: query cache (mem)
DevTools: NO needed       DevTools: YES (RTK)        DevTools: YES (Query devtools)
```

**Why Zustand for prices (not Redux):**  
Redux dispatches go through middleware pipeline: action → logger → thunk → reducer → selector → re-render. At 1,000 writes/sec, that middleware chain consumes ~50ms of CPU per second. Zustand's `set()` is a direct reference update — zero middleware overhead.

**Why not Context API for prices:**  
`React.createContext` re-renders ALL consumers on every value change. One context update for AAPL re-renders the MSFT row. Zustand's selector model prevents this.

### 4.2 Redux Slice Structure

```ts
// store/orders.slice.ts
interface OrdersState {
  open: Order[];      // pending/partially filled
  recent: Order[];    // last 100 filled/cancelled
  submitting: boolean;
  error: string | null;
}

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    orderSubmitted: (state) => { state.submitting = true; state.error = null; },
    orderAccepted: (state, action: PayloadAction<Order>) => {
      state.submitting = false;
      state.open.push(action.payload);
    },
    orderFilled: (state, action: PayloadAction<FillEvent>) => {
      const idx = state.open.findIndex((o) => o.id === action.payload.orderId);
      if (idx !== -1) {
        const filled = state.open.splice(idx, 1)[0];
        state.recent.unshift({ ...filled, status: 'filled', fillPrice: action.payload.price });
        if (state.recent.length > 100) state.recent.pop();
      }
    },
    orderFailed: (state, action: PayloadAction<string>) => {
      state.submitting = false;
      state.error = action.payload;
    },
  },
});
```

---

## 5. CSS Architecture — Trading Dashboard UI

### 5.1 Dark Theme (Trading UIs Are Always Dark)

Traders use dashboards in dark rooms with multiple monitors. Dark theme reduces eye strain and makes price colors pop.

```css
/* tokens.css — design tokens */
:root {
  --color-bg-primary: #0d1117;
  --color-bg-secondary: #161b22;
  --color-bg-row: #1c2128;
  --color-bg-row-hover: #21262d;
  --color-border: #30363d;

  /* Price colors — universally understood in trading */
  --color-price-up: #3fb950;    /* green — price went up */
  --color-price-down: #f85149;  /* red — price went down */
  --color-price-neutral: #8b949e;

  /* P&L */
  --color-pnl-positive: #3fb950;
  --color-pnl-negative: #f85149;

  /* Text */
  --color-text-primary: #e6edf3;
  --color-text-secondary: #8b949e;
  --color-text-muted: #484f58;

  /* Monospace font — numbers must align */
  --font-mono: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;
  --font-ui: 'Inter', -apple-system, sans-serif;
}
```

### 5.2 Price Flash Animation — Critical UX

The flash (green for uptick, red for downtick) is how traders see price direction at a glance. Must be CSS-driven (not JS) for performance.

```css
/* PriceCell.module.css */
.price {
  font-family: var(--font-mono);
  font-size: 13px;
  text-align: right;
  transition: color 0.3s ease;
}

@keyframes flashUp {
  0%   { background-color: rgba(63, 185, 80, 0.4); }
  100% { background-color: transparent; }
}

@keyframes flashDown {
  0%   { background-color: rgba(248, 81, 73, 0.4); }
  100% { background-color: transparent; }
}

.priceUp {
  color: var(--color-price-up);
  animation: flashUp 0.6s ease-out;
}

.priceDown {
  color: var(--color-price-down);
  animation: flashDown 0.6s ease-out;
}
```

```tsx
// PriceCell.tsx
function PriceCell({ symbol }: { symbol: string }) {
  const tick = usePriceFeed(symbol);
  const prevRef = useRef<number | undefined>();
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const animKey = useRef(0); // force re-trigger animation on same direction

  useEffect(() => {
    if (tick?.last === undefined) return;
    if (prevRef.current !== undefined) {
      if (tick.last > prevRef.current) setFlash('up');
      else if (tick.last < prevRef.current) setFlash('down');
      animKey.current++;
    }
    prevRef.current = tick.last;
  }, [tick?.last]);

  return (
    <td
      key={animKey.current} // re-mounts span to restart animation
      className={cx(styles.price, {
        [styles.priceUp]: flash === 'up',
        [styles.priceDown]: flash === 'down',
      })}
    >
      {tick ? formatPrice(tick.last) : '—'}
    </td>
  );
}
```

### 5.3 Layout — CSS Grid for the Dashboard

```css
/* TradingLayout.module.css */
.layout {
  display: grid;
  grid-template-rows: 48px 1fr;      /* topbar + content */
  grid-template-columns: 280px 1fr 320px; /* sidebar + center + panel */
  height: 100vh;
  background: var(--color-bg-primary);
  overflow: hidden; /* trading UIs don't scroll the page */
}

.topbar   { grid-column: 1 / -1; border-bottom: 1px solid var(--color-border); }
.sidebar  { grid-row: 2; overflow-y: auto; border-right: 1px solid var(--color-border); }
.center   { grid-row: 2; display: flex; flex-direction: column; overflow: hidden; }
.panel    { grid-row: 2; border-left: 1px solid var(--color-border); overflow-y: auto; }
```

### 5.4 Number Formatting — Alignment Matters

In a price grid, numbers must align on the decimal point. Use tabular nums:

```css
.numericCell {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums; /* fixed-width digits — columns align */
  text-align: right;
  padding-right: 12px;
}
```

```ts
// formatters.ts
const priceFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const pnlFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  signDisplay: 'always', // always show + or -
});

export const formatPrice = (n: number) => priceFormatter.format(n);
export const formatPnL   = (n: number) => pnlFormatter.format(n);
export const formatPct   = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
```

---

## 6. Virtual Scrolling — Instrument List at Scale

TanStack Virtual renders only the visible DOM rows. For 50,000 instruments, only ~20 rows are in the DOM at any time.

```tsx
// WatchlistPanel.tsx
function VirtualInstrumentList({ symbols }: { symbols: string[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: symbols.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  return (
    <div
      ref={parentRef}
      style={{ height: '100%', overflow: 'auto' }}
      role="grid"
      aria-label="Instrument watchlist"
      aria-rowcount={symbols.length}
    >
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vRow) => (
          <InstrumentRow
            key={symbols[vRow.index]}
            symbol={symbols[vRow.index]}
            style={{
              position: 'absolute',
              top: vRow.start,
              left: 0,
              right: 0,
              height: vRow.size,
            }}
            aria-rowindex={vRow.index + 1}
          />
        ))}
      </div>
    </div>
  );
}
```

**Why not `react-window`:** TanStack Virtual supports dynamic row heights (needed when an instrument row expands to show detail) and has better TypeScript support.

---

## 7. Web Worker — Off-Main-Thread Price Processing

The main thread must stay free for React rendering and user interactions. All price decoding and batching runs in a worker.

```ts
// workers/price-worker.ts
import { decode } from '@msgpack/msgpack';

let buffer = new Map<string, PriceTick>();

// Receive raw binary frames from WebSocket on main thread
self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  const tick = decode(new Uint8Array(e.data)) as PriceTick;
  // Last-write-wins: if AAPL ticks 10x in 100ms, only the latest matters
  buffer.set(tick.symbol, tick);
};

// Flush batch every 100ms — synchronised with display refresh
setInterval(() => {
  if (buffer.size === 0) return;
  const batch = Object.fromEntries(buffer);
  self.postMessage(batch);
  buffer.clear();
}, 100);
```

```ts
// lib/priceWorkerBridge.ts — main thread side
const worker = new Worker(new URL('../workers/price-worker.ts', import.meta.url), {
  type: 'module',
});

worker.onmessage = (e: MessageEvent<Record<string, PriceTick>>) => {
  // Single Zustand write per 100ms batch — one React reconciliation cycle
  usePriceStore.getState().updateBatch(e.data);
};

export const priceWorker = worker;
```

**MessagePack over JSON:**
- JSON: `{"symbol":"AAPL","last":182.50,"bid":182.49}` = ~50 bytes
- MessagePack binary equivalent = ~20 bytes
- 60% smaller payload at 1,000 msg/sec = meaningful bandwidth saving
- Decode is also ~3× faster than JSON.parse in V8

---

## 8. Order Ticket Component — Correctness First

```tsx
// OrderTicket.tsx
function OrderTicket() {
  const dispatch = useAppDispatch();
  const [showConfirm, setShowConfirm] = useState(false);
  const { fields, setters, derived, idempotencyKey, validate } = useOrderForm();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) { toast.error(error); return; }

    if (derived.requiresConfirmation) {
      setShowConfirm(true); // show modal for orders > $1M
      return;
    }
    submitOrder();
  };

  const submitOrder = async () => {
    dispatch(orderSubmitted());
    try {
      await placeOrder({
        ...fields,
        idempotencyKey,           // prevents double-execution on retry
        qty: parseInt(fields.qty, 10),
        price: new Decimal(fields.price).toNumber(), // sanitized
      });
    } catch (err) {
      dispatch(orderFailed(getErrorMessage(err)));
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SideTabs value={fields.side} onChange={setters.setSide} />
      <InstrumentSearch value={fields.symbol} onChange={setters.setSymbol} />
      <QuantityInput value={fields.qty} onChange={setters.setQty} />
      <PriceInput
        value={fields.price}
        onChange={setters.setPrice}
        lastPrice={derived.lastPrice}
        disabled={fields.orderType === 'market'}
      />
      {derived.notional && (
        <NotionalDisplay value={derived.notional} warn={derived.requiresConfirmation} />
      )}
      <SubmitButton side={fields.side} />

      {showConfirm && (
        <ConfirmModal
          order={fields}
          notional={derived.notional!}
          onConfirm={() => { setShowConfirm(false); submitOrder(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </form>
  );
}
```

---

## 9. Accessibility — Trading UIs Are Not Exempt

### 9.1 Live Price Regions

Screen readers need to announce price changes without overwhelming the user.

```tsx
// Use aria-live="polite" for non-critical updates (price changes)
// Use aria-live="assertive" for order fills (time-critical)

function ConnectionStatus({ status }: { status: string }) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {status === 'closed' && 'Market data disconnected'}
    </div>
  );
}

function OrderFillNotification({ fill }: { fill: FillEvent }) {
  return (
    <div role="alert" aria-live="assertive">
      Order filled: {fill.qty} {fill.symbol} @ {formatPrice(fill.price)}
    </div>
  );
}
```

### 9.2 Keyboard Navigation

Traders work at speed — mouse is slower than keyboard.

```tsx
function InstrumentRow({ symbol, onSelect }: Props) {
  return (
    <tr
      tabIndex={0}
      role="row"
      onClick={() => onSelect(symbol)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(symbol);
      }}
      aria-selected={isSelected}
    >
      ...
    </tr>
  );
}
```

Global keyboard shortcuts:
```ts
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'b' && e.altKey) openOrderTicket('buy');
    if (e.key === 's' && e.altKey) openOrderTicket('sell');
    if (e.key === 'Escape') closeAllModals();
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

### 9.3 Color Not the Only Indicator

Green/red for P&L — but some traders are color-blind. Add:
- `+` / `−` prefix on numbers
- Arrow icons ▲ / ▼ alongside color
- `aria-label="up 2.3%"` on price cells

---

## 10. Performance — The Full Picture

### 10.1 Rendering Budget

At 60fps the browser has 16.67ms per frame to do everything (JS, style, layout, paint).

```
Budget per frame:
  Price store update (Zustand)   ~0.5ms
  React reconciliation (batch)   ~2ms   (only changed components)
  Layout (virtual list)          ~1ms   (few DOM nodes)
  Paint                          ~3ms
  Available for user events      ~10ms
```

If a frame exceeds 16.67ms → jank. Web Worker + 100ms batching ensures React only reconciles once per 6 frames, not every frame.

### 10.2 `React.memo` Strategy

```tsx
// MEMO: InstrumentRow re-renders 1,000x/sec without memo (one per tick)
const InstrumentRow = React.memo(
  ({ symbol, style }: Props) => {
    const price = usePriceFeed(symbol); // re-renders only when THIS symbol changes
    return <tr style={style}>...</tr>;
  },
  // Custom comparator: only re-render if style changes (virtual position)
  // Price changes are handled inside via Zustand selector
  (prev, next) => prev.symbol === next.symbol && prev.style === next.style
);
```

### 10.3 Code Splitting

```ts
// routes.tsx — split chart (heaviest dependency) into its own chunk
const CandlestickChart = lazy(() => import('./features/charts/CandlestickChart'));
const OrderBlotter = lazy(() => import('./features/orders/OrderBlotter'));

// lightweight-charts (TradingView) is ~200KB — lazy load it
// The order ticket (critical path) loads immediately
```

### 10.4 Visibility API — Throttle Background Tabs

```ts
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    wsClient.setUpdateInterval(1000); // 1/sec when hidden
    priceWorker.postMessage({ type: 'set-flush-interval', ms: 1000 });
  } else {
    wsClient.setUpdateInterval(100);  // 10/sec when visible
    priceWorker.postMessage({ type: 'set-flush-interval', ms: 100 });
  }
});
```

---

## 11. Testing Strategy

### 11.1 Testing a WebSocket-Driven Component

```ts
// __tests__/PriceCell.test.tsx
import { act, render, screen } from '@testing-library/react';

// Mock the Zustand price store
jest.mock('../store/priceStore', () => ({
  usePriceStore: (selector: any) =>
    selector({ prices: { AAPL: { last: 182.5, timestamp: Date.now() } } }),
}));

test('shows price and flashes green on uptick', async () => {
  const { rerender } = render(<PriceCell symbol="AAPL" />);
  expect(screen.getByText('182.50')).toBeInTheDocument();

  // Simulate a price increase
  act(() => {
    usePriceStore.getState().updateBatch({ AAPL: { last: 183.0, timestamp: Date.now() } });
  });

  rerender(<PriceCell symbol="AAPL" />);
  const cell = screen.getByText('183.00').closest('td');
  expect(cell).toHaveClass('priceUp');
});
```

### 11.2 Testing WebSocket Reconnect Logic

```ts
// __tests__/useWebSocket.test.ts
test('reconnects with exponential backoff on close', async () => {
  const { result } = renderHook(() => useWebSocket('wss://test'));

  // Simulate server closing connection
  act(() => wsServer.close());

  expect(result.current.status).toBe('closed');

  // Fast-forward timers — first reconnect at 1s
  jest.advanceTimersByTime(1000);
  expect(WebSocket).toHaveBeenCalledTimes(2);

  // Second reconnect at 2s
  act(() => wsServer.close());
  jest.advanceTimersByTime(2000);
  expect(WebSocket).toHaveBeenCalledTimes(3);
});
```

### 11.3 Testing Order Idempotency

```ts
test('does not regenerate idempotency key on re-render', () => {
  const { result, rerender } = renderHook(() => useOrderForm());
  const key1 = result.current.idempotencyKey;
  rerender();
  expect(result.current.idempotencyKey).toBe(key1); // same key after re-render
});

test('prevents double submission', async () => {
  render(<OrderTicket />);
  const btn = screen.getByRole('button', { name: /buy/i });

  fireEvent.click(btn);
  fireEvent.click(btn); // second click while submitting

  // API should be called only once
  await waitFor(() => expect(mockPlaceOrder).toHaveBeenCalledTimes(1));
});
```

### 11.4 Testing Virtual List Rendering

```ts
test('renders only visible rows, not all 50K', () => {
  const symbols = Array.from({ length: 50_000 }, (_, i) => `SYM${i}`);
  render(<VirtualInstrumentList symbols={symbols} />);

  // Only ~20 rows should be in DOM (viewport height / row height)
  const rows = screen.getAllByRole('row');
  expect(rows.length).toBeLessThan(50);
  expect(rows.length).toBeGreaterThan(10);
});
```

---

## 12. Bundle Architecture

```
Initial bundle (< 200KB gzipped):
  ├── React + ReactDOM
  ├── Redux Toolkit + React-Redux
  ├── Zustand
  ├── TanStack Query
  ├── OrderTicket (critical path — trader needs this immediately)
  └── WatchlistPanel (core UI)

Lazy chunks:
  ├── charts.chunk.js       (~200KB) — lightweight-charts, loaded on chart open
  ├── order-blotter.chunk.js (~50KB) — order history, loaded after mount
  └── msgpack.chunk.js      (~30KB)  — MessagePack decoder, loaded when WS connects
```

```ts
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts:   ['lightweight-charts'],
          msgpack:  ['@msgpack/msgpack'],
          query:    ['@tanstack/react-query', '@tanstack/react-virtual'],
        },
      },
    },
  },
};
```

---

## 13. Key Interview Answers — Pocket Responses

**"Why not use SSE instead of WebSocket?"**
SSE is unidirectional — server to client only. For a trading dashboard we also need to send subscriptions (which instruments to watch) and orders through the same persistent connection. WebSocket is bidirectional and binary-capable.

**"How do you prevent React from re-rendering 1,000 times per second?"**
Three layers: (1) Web Worker processes binary frames off the main thread and batches into 100ms windows. (2) Zustand store with per-symbol selectors so only the component for the changed symbol re-renders. (3) `React.memo` on `InstrumentRow` with a custom comparator ignoring style changes from the virtualizer.

**"How do you ensure price arithmetic is correct?"**
Never use native float math for financial amounts. `0.1 + 0.2 = 0.30000000000000004` in JavaScript. Use `decimal.js` or store prices as integers (price in cents / basis points) and convert only for display. All P&L calculations go through Decimal before being stored in state.

**"How would you handle a WebSocket disconnect during market hours?"**
Exponential backoff reconnect (1s, 2s, 4s, max 30s). On reconnect, replay subscriptions from the local registry. Show a "stale" badge on prices older than 5s. Never silently show stale prices as live — that's a financial risk. Alert the trader if disconnected for > 30s.

**"What's your component memoization strategy?"**
`React.memo` on every row component. `useMemo` for all derived state (P&L, notional, portfolio totals). `useCallback` on event handlers passed to list rows. Zustand selectors ensure components subscribe only to their own data slice. `useDeferredValue` for chart updates so the order ticket always feels instant.

**"How would you test this?"**
Unit: hooks with `renderHook`, stores with direct state mutations. Integration: mock WebSocket server (`jest-websocket-mock`) + React Testing Library. E2E: Playwright against a staging environment with seeded market data replay. Performance: React DevTools Profiler, Lighthouse, Chrome Performance tab recording a tick flood.
