# Design Problem 3: Global Payment Processing — Frontend Deep Dive

**Prompt:** "Design the frontend for a system that processes 1 million payment transactions per day across 50 countries."

**What they test:** Form correctness, idempotency on the client, multi-currency, error states, optimistic UI, accessibility, compliance UI patterns.

> This is NOT a backend question. The interviewer wants to see how you handle the frontend of a high-stakes financial flow where mistakes cost real money.

---

## The Frontend Challenges (State These First)

1. **Correctness:** A payment submitted twice charges the user twice — idempotency must start at the client
2. **Currency arithmetic:** Float math is wrong for money — `0.1 + 0.2 !== 0.3`
3. **50 countries:** Currency formats, RTL languages, local date formats, and compliance disclosures differ per country
4. **Error states:** Network failures mid-payment — what does the user see? What's safe to retry?
5. **Accessibility:** Payment forms are legally required to be accessible in most jurisdictions
6. **Trust signals:** Users must feel the payment is secure — UI, SSL indicators, confirmation flows
7. **Compliance:** GDPR consent, PSD2 strong customer authentication (SCA), PCI-DSS — all have UI requirements

---

## Step 1: Requirements Clarification

### Functional
- Payment form: amount, currency, recipient, payment method
- Multi-step flow: enter details → review → authenticate → confirmation
- Status tracking: real-time status updates (initiated → processing → settled / failed)
- Payment history with filtering, export
- Saved recipients / beneficiaries
- Multi-currency: 50+ currencies, live FX rate preview
- Recurring payments: setup, manage, cancel
- Alert: payment failed, payment settled

### Non-Functional
- **Correctness:** Idempotent — submitting same payment twice must be safe
- **Latency:** Form interaction < 100ms; payment submission response < 3s (with loading state)
- **Availability:** Payment form must work even if payment history fails (isolated failures)
- **Offline resilience:** Handle network loss during submission gracefully
- **Compliance:** PSD2 SCA (2FA for EU), GDPR consent UI, audit trail readable by user

---

## Step 2: Payment Flow Architecture

```
User fills form
    │
    ▼
Client-side validation (amount, currency, recipient)
    │
    ▼
Generate idempotency key (UUID v4, bound to form session)
    │
    ▼
FX rate preview — GET /fx-rates (real-time, cached 30s)
    │
    ▼
Review screen (show recipient, amount, fees, net total)
    │
    ▼
SCA challenge (for EU/PSD2 — OTP or biometric)
    │
    ▼
POST /payments { ..., idempotencyKey }
    │
    ├── 202 Accepted → poll for status OR subscribe to WebSocket
    │       ↓
    │   Status: processing → settled → show confirmation
    │                      → failed → show error + safe retry
    │
    └── 4xx → show user-friendly error (not raw API error)
    └── 5xx → show "Try again" with same idempotency key (safe retry)
    └── Network timeout → show ambiguous state warning
```

---

## Step 3: Component Architecture

```
<PaymentApp>
  <AuthGuard>
    <PaymentRouter>
      /send         → <SendPaymentFlow />
      /history      → <PaymentHistory />
      /recipients   → <RecipientsManager />
      /recurring    → <RecurringPayments />
    </PaymentRouter>
  </AuthGuard>
</PaymentApp>

<SendPaymentFlow>     ← multi-step wizard
  Step 1: <PaymentDetailsStep>
    <RecipientSearch />
    <AmountInput />          ← currency-aware, Decimal.js
    <CurrencySelector />
    <FxRatePreview />        ← live rate, total in recipient's currency
    <PaymentReference />
  </PaymentDetailsStep>

  Step 2: <ReviewStep>
    <PaymentSummary />       ← all details read-only for final check
    <FeeBreakdown />
    <ComplianceDisclosure /> ← jurisdiction-specific legal text
    <SCAChallenge />         ← OTP / biometric for EU PSD2

  Step 3: <ProcessingStep>
    <PaymentStatusTracker /> ← animated status timeline
    <EstimatedArrival />

  Step 4: <ConfirmationStep>
    <SuccessDetails />
    <ReceiptDownload />
    <PayAgainButton />
```

---

## Step 4: The Amount Input — Financial Precision

This is the most critical component. Wrong math = wrong payment.

### 4.1 Never Use Float for Currency

```tsx
// BAD — float arithmetic causes wrong values
function calculateFee(amount: number, feeRate: number): number {
  return amount * feeRate; // 100.10 * 0.015 = 1.5014999999999999
}

// GOOD — use Decimal.js for all financial math
import Decimal from 'decimal.js';

function calculateFee(amount: string, feeRate: string): string {
  return new Decimal(amount).times(feeRate).toFixed(2);
}

function calculateTotal(amount: string, fee: string): string {
  return new Decimal(amount).plus(fee).toFixed(2);
}
```

### 4.2 AmountInput Component

```tsx
// AmountInput.tsx
interface AmountInputProps {
  currency: string;
  value: string;          // always string — never number for money
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}

function AmountInput({ currency, value, onChange, min, max }: AmountInputProps) {
  const locale = useLocale();
  const currencyMeta = getCurrencyMeta(currency); // decimal places, symbol

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Allow only: digits, one decimal point, appropriate decimal places
    const pattern = new RegExp(
      `^\\d*(\\.\\d{0,${currencyMeta.decimalPlaces}})?$`
    );
    if (!pattern.test(raw)) return; // reject invalid input silently

    // JPY has 0 decimal places — prevent 100.00 for Yen
    onChange(raw);
  };

  const handleBlur = () => {
    // Normalize on blur: "5" → "5.00", ".5" → "0.50"
    if (value && !isNaN(Number(value))) {
      onChange(new Decimal(value).toFixed(currencyMeta.decimalPlaces));
    }
  };

  const formatted = value
    ? new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: currencyMeta.decimalPlaces,
      }).format(Number(value))
    : '';

  return (
    <div className={styles.wrapper}>
      <label htmlFor="payment-amount" className={styles.label}>
        Amount
      </label>
      <div className={styles.inputWrapper}>
        <span className={styles.currencySymbol} aria-hidden>
          {currencyMeta.symbol}
        </span>
        <input
          id="payment-amount"
          type="text"           // NOT type="number" — too many browser inconsistencies
          inputMode="decimal"   // shows numeric keyboard on mobile
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-label={`Amount in ${currency}`}
          aria-describedby="amount-hint amount-error"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {value && (
        <p id="amount-hint" className={styles.hint}>
          {formatted}
        </p>
      )}
    </div>
  );
}
```

**Why `type="text"` not `type="number"`:**
- `type="number"` strips leading zeros (bad for account numbers)
- Different browsers format numbers differently (commas, dots)
- Can't control decimal places precisely
- Use `inputMode="decimal"` for the right mobile keyboard

### 4.3 FX Rate Preview

```tsx
function FxRatePreview({ fromCurrency, toCurrency, amount }: Props) {
  const { data: rate, isStale } = useQuery({
    queryKey: ['fx-rate', fromCurrency, toCurrency],
    queryFn: () => fetchFxRate(fromCurrency, toCurrency),
    staleTime: 30_000,     // FX rates valid for 30s
    refetchInterval: 30_000,
  });

  const converted = useMemo(() => {
    if (!rate || !amount) return null;
    return new Decimal(amount).times(rate.mid).toFixed(
      getCurrencyMeta(toCurrency).decimalPlaces
    );
  }, [amount, rate]);

  return (
    <div
      className={clsx(styles.preview, isStale && styles.stale)}
      aria-live="polite"
      aria-atomic="true"
    >
      {converted && (
        <>
          <span>≈ {formatCurrency(converted, toCurrency)}</span>
          <span className={styles.rateNote}>
            Rate: 1 {fromCurrency} = {rate?.mid} {toCurrency}
            {isStale && ' (rate may be outdated)'}
          </span>
        </>
      )}
    </div>
  );
}
```

---

## Step 5: Idempotency — Client-Side Implementation

Idempotency prevents double-payments on network retry. The key must be:
- Generated once per payment attempt (not per page load)
- Stable across retries of the same payment
- Reset only when the user intentionally starts a new payment

```tsx
// hooks/usePaymentIdempotency.ts
export function usePaymentIdempotency() {
  // useRef — survives re-renders, doesn't cause re-renders
  const keyRef = useRef<string>(crypto.randomUUID());

  const resetKey = useCallback(() => {
    keyRef.current = crypto.randomUUID();
  }, []);

  return {
    idempotencyKey: keyRef.current,
    resetKey, // call this only after confirmed success or user starts fresh
  };
}
```

```tsx
// PaymentDetailsStep.tsx
function SendPaymentFlow() {
  const { idempotencyKey, resetKey } = usePaymentIdempotency();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'failed'>('idle');

  const handleSubmit = async (data: PaymentData) => {
    setStatus('submitting');
    try {
      await submitPayment({ ...data, idempotencyKey });
      setStatus('success');
      resetKey(); // new key for next payment — the old payment is done
    } catch (err) {
      setStatus('failed');
      // DON'T resetKey here — user can retry with same key safely
    }
  };
}
```

**Critical rule:** If the server returns 5xx or the network times out — **the payment may or may not have gone through**. Show an "ambiguous" state, never auto-retry money movement.

```tsx
function AmbiguousPaymentState({ idempotencyKey }: { idempotencyKey: string }) {
  return (
    <Alert variant="warning" role="alert">
      <h2>Payment status unknown</h2>
      <p>
        Your network connection dropped. Your payment may or may not have been sent.
        Please check your payment history before trying again.
      </p>
      <Button onClick={() => navigate(`/history?ref=${idempotencyKey}`)}>
        Check payment status
      </Button>
    </Alert>
  );
}
```

---

## Step 6: Multi-Step Payment Form — State Machine

A payment flow with steps, validation, and back/forward navigation is complex enough to warrant a state machine.

```ts
// paymentMachine.ts — using XState
import { createMachine, assign } from 'xstate';

export const paymentMachine = createMachine({
  id: 'payment',
  initial: 'details',
  context: {
    paymentData: null as PaymentData | null,
    error: null as string | null,
    transactionId: null as string | null,
  },
  states: {
    details: {
      on: {
        NEXT: { target: 'review', guard: 'isDetailsValid' },
      },
    },
    review: {
      on: {
        BACK: 'details',
        CONFIRM: 'sca',
      },
    },
    sca: {
      on: {
        SCA_PASSED: 'submitting',
        SCA_FAILED: { target: 'review', actions: assign({ error: 'Authentication failed' }) },
        BACK: 'review',
      },
    },
    submitting: {
      invoke: {
        src: 'submitPayment',
        onDone: { target: 'success', actions: assign({ transactionId: ({ event }) => event.output }) },
        onError: { target: 'failed', actions: assign({ error: ({ event }) => event.error.message }) },
      },
    },
    success: { type: 'final' },
    failed: {
      on: {
        RETRY: 'submitting',     // same idempotency key — safe
        START_OVER: { target: 'details', actions: 'resetIdempotencyKey' },
      },
    },
  },
});
```

**Why a state machine here (not useState):**
Payment flows have many states (details, review, SCA challenge, submitting, success, failed, ambiguous) with strict transition rules. A state machine makes invalid states (e.g. jumping from details to success) impossible by construction. The machine also acts as documentation.

---

## Step 7: Real-Time Payment Status

After submission, the user needs to see the payment progress without polling the page.

```tsx
// hooks/usePaymentStatus.ts
export function usePaymentStatus(transactionId: string | null) {
  const [status, setStatus] = useState<PaymentStatus | null>(null);

  useEffect(() => {
    if (!transactionId) return;

    // Use SSE for status updates — server pushes, client only reads
    // SSE is better than WebSocket here: unidirectional, simpler, auto-reconnects
    const es = new EventSource(`/api/payments/${transactionId}/status-stream`, {
      withCredentials: true,
    });

    es.onmessage = (e) => {
      const update = JSON.parse(e.data) as PaymentStatus;
      setStatus(update);
      if (update.state === 'settled' || update.state === 'failed') {
        es.close(); // terminal state — stop listening
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects — only close on terminal state
    };

    return () => es.close();
  }, [transactionId]);

  return status;
}
```

```tsx
// PaymentStatusTracker.tsx
const STATUS_STEPS = ['initiated', 'processing', 'settled'] as const;

function PaymentStatusTracker({ transactionId }: { transactionId: string }) {
  const status = usePaymentStatus(transactionId);

  return (
    <ol
      className={styles.timeline}
      aria-label="Payment progress"
      aria-live="polite"
    >
      {STATUS_STEPS.map((step) => {
        const state = getStepState(step, status?.state);
        return (
          <li
            key={step}
            className={clsx(styles.step, styles[state])}
            aria-current={state === 'active' ? 'step' : undefined}
          >
            <span className={styles.dot} aria-hidden />
            <span className={styles.label}>{capitalize(step)}</span>
            {state === 'active' && <Spinner size="sm" />}
          </li>
        );
      })}
    </ol>
  );
}
```

**Why SSE not WebSocket for status:**
Payment status is unidirectional (server → client only). SSE is simpler, auto-reconnects, works over HTTP/2, and doesn't need a separate WebSocket handshake. WebSocket is overkill when you don't need to send from client.

---

## Step 8: Internationalisation (i18n) — 50 Countries

### 8.1 What Varies per Country

| Concern | Example | Solution |
|---|---|---|
| Currency format | $1,234.56 vs 1.234,56 € | `Intl.NumberFormat` |
| Date format | MM/DD/YYYY vs DD/MM/YYYY | `Intl.DateTimeFormat` |
| RTL text | Arabic, Hebrew | CSS logical properties |
| Decimal separator | `.` vs `,` | `Intl.NumberFormat` |
| Legal disclosures | PSD2 in EU, different in US | Locale-keyed content |
| Phone format | +44 vs +1 | `libphonenumber-js` |

### 8.2 Always Use Intl APIs

```ts
// formatters.ts
export function formatCurrency(amount: string | number, currency: string, locale?: string): string {
  return new Intl.NumberFormat(locale ?? navigator.language, {
    style: 'currency',
    currency,
    // JPY: 0 decimal places; KWD: 3 decimal places
    minimumFractionDigits: getCurrencyMeta(currency).decimalPlaces,
  }).format(Number(amount));
}

export function formatDate(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale ?? navigator.language, {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(date);
}
```

### 8.3 RTL Support

```css
/* Use logical properties — they flip automatically in RTL */
.input {
  padding-inline-start: 12px; /* = padding-left in LTR, padding-right in RTL */
  padding-inline-end: 40px;   /* = padding-right in LTR, padding-left in RTL */
  text-align: start;          /* = left in LTR, right in RTL */
}

.icon {
  inset-inline-end: 12px;    /* = right in LTR, left in RTL */
}
```

```tsx
// Apply dir attribute at root based on locale
function App() {
  const { locale } = useLocale();
  const dir = RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';
  return <div dir={dir} lang={locale}>{/* app */}</div>;
}
```

---

## Step 9: Security & Compliance UI

### 9.1 PCI-DSS — Card Data Never Touches Your App

```tsx
// Never collect card numbers yourself — use an iframe from the payment processor
// Stripe Elements, Braintree Hosted Fields, etc.

function CardPaymentMethod() {
  return (
    <div>
      <label htmlFor="card-element">Card details</label>
      {/* Stripe's iframe — card data goes direct to Stripe, never your servers */}
      <div id="card-element">
        {/* Stripe Elements mounted here via Stripe.js */}
      </div>
      <p className={styles.securityNote}>
        <LockIcon aria-hidden /> Your card details are encrypted and never stored on our servers.
      </p>
    </div>
  );
}
```

### 9.2 PSD2 Strong Customer Authentication

For EU payments > €30, two-factor authentication is required:

```tsx
function SCAChallenge({ onPass, onFail }: Props) {
  const [otp, setOtp] = useState('');

  return (
    <section aria-labelledby="sca-heading">
      <h2 id="sca-heading">Verify your identity</h2>
      <p>Enter the 6-digit code sent to your registered mobile number.</p>
      <OTPInput
        length={6}
        value={otp}
        onChange={setOtp}
        onComplete={(code) => verifyOTP(code).then(onPass).catch(onFail)}
        autoFocus
      />
      <p className={styles.hint}>
        This verification is required by EU regulations (PSD2) for payments over €30.
      </p>
    </section>
  );
}
```

### 9.3 GDPR Consent Before Processing

```tsx
function GDPRConsent({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);

  return (
    <fieldset>
      <legend>Data processing consent</legend>
      <Checkbox
        id="gdpr-consent"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        required
      >
        I consent to JP Morgan processing my payment data in accordance with the{' '}
        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </a>
        .
      </Checkbox>
      <Button
        onClick={onAccept}
        disabled={!checked}
        aria-disabled={!checked}
      >
        Continue
      </Button>
    </fieldset>
  );
}
```

---

## Step 10: Error Handling — Every Payment Error Has a Recovery Path

```tsx
// Every error maps to a user-actionable message — never show raw API errors
const ERROR_MESSAGES: Record<string, { title: string; action: string; retry: boolean }> = {
  INSUFFICIENT_FUNDS: {
    title: 'Insufficient funds',
    action: 'Please check your account balance or use a different account.',
    retry: false,
  },
  RECIPIENT_NOT_FOUND: {
    title: 'Recipient not found',
    action: 'Please verify the recipient account details.',
    retry: false,
  },
  RATE_LIMIT: {
    title: 'Too many attempts',
    action: 'Please wait a few minutes before trying again.',
    retry: true, // safe to retry after wait
  },
  NETWORK_ERROR: {
    title: 'Connection lost',
    action: 'Check your internet connection. Your payment may not have been sent — please check your payment history.',
    retry: false, // ambiguous — don't auto-retry money movement
  },
  UNKNOWN: {
    title: 'Something went wrong',
    action: 'Please try again. If this continues, contact support.',
    retry: true,
  },
};

function PaymentError({ code, onRetry }: { code: string; onRetry: () => void }) {
  const msg = ERROR_MESSAGES[code] ?? ERROR_MESSAGES.UNKNOWN;
  return (
    <Alert variant="error" role="alert" aria-live="assertive">
      <h2>{msg.title}</h2>
      <p>{msg.action}</p>
      {msg.retry && <Button onClick={onRetry}>Try again</Button>}
    </Alert>
  );
}
```

---

## Step 11: Payment History — Performance

```tsx
function PaymentHistory() {
  const [filters, setFilters] = useState<HistoryFilters>({});

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['payment-history', filters],
    queryFn: ({ pageParam }) => fetchPaymentHistory({ ...filters, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });

  const allPayments = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <HistoryFilters value={filters} onChange={setFilters} />
      <DataTable
        data={allPayments}
        columns={PAYMENT_COLUMNS}
        getRowId={(p) => p.id}
        virtualizeRows // auto for > 100 rows
      />
      {hasNextPage && (
        <Button
          onClick={() => fetchNextPage()}
          loading={isFetchingNextPage}
        >
          Load more
        </Button>
      )}
    </>
  );
}
```

**Infinite query over pagination:** Payment history is read continuously — "load more" is more natural than pagination for a timeline. Cursor-based pagination (not offset) is correct here: offset pagination gives wrong results when new payments are added between page fetches.

---

## Step 12: Testing Strategy

```ts
// Idempotency test — same key on retry
test('retains idempotency key on failed submission', async () => {
  mockPaymentAPI.mockRejectedValueOnce(new NetworkError());
  const { result } = renderHook(() => usePaymentIdempotency());
  const originalKey = result.current.idempotencyKey;

  await act(() => result.current.submit(paymentData));

  // Key must be unchanged — safe to retry
  expect(result.current.idempotencyKey).toBe(originalKey);
});

// Amount precision test
test('calculates fee without float error', () => {
  const fee = calculateFee('100.10', '0.015');
  expect(fee).toBe('1.50'); // NOT '1.5014999...'
});

// Multi-currency format test
test('formats JPY without decimal places', () => {
  expect(formatCurrency('1000', 'JPY', 'ja-JP')).toBe('¥1,000');
  expect(formatCurrency('1000', 'JPY', 'ja-JP')).not.toContain('.');
});

// SCA flow test
test('blocks payment submission without SCA when required', async () => {
  render(<SendPaymentFlow requiresSCA={true} />);
  // Fill in details and proceed to review
  await fillPaymentDetails();
  fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

  // Should show SCA challenge, not submit
  expect(screen.getByText(/verify your identity/i)).toBeInTheDocument();
  expect(mockSubmitPayment).not.toHaveBeenCalled();
});

// Ambiguous state test
test('shows ambiguous state on network timeout', async () => {
  mockPaymentAPI.mockRejectedValueOnce(new TimeoutError());
  render(<SendPaymentFlow />);
  await submitPayment();

  expect(screen.getByText(/payment status unknown/i)).toBeInTheDocument();
  expect(screen.getByText(/check your payment history/i)).toBeInTheDocument();
});
```

---

## Key Interview Answers

**"How do you prevent double payments?"**
Idempotency key generated once per payment intent (UUID, stored in `useRef`). Sent with every API call. Server deduplicates on the key. Key is reset only after confirmed success or explicit user restart. On network failure, we show an ambiguous state — never auto-retry money movement.

**"How do you handle float arithmetic for currency?"**
`decimal.js` for all math operations. Input values stored as strings, never numbers. Display uses `Intl.NumberFormat`. All amounts sent to the API as strings or integers in smallest unit (cents). `0.1 + 0.2` is `0.3` in Decimal, never `0.30000000000000004`.

**"Why SSE for payment status instead of WebSocket?"**
Payment status updates are unidirectional — server pushes, client only reads. SSE handles this natively, auto-reconnects, works over HTTP/2 multiplexed connections. WebSocket adds bidirectional complexity we don't need here.

**"What happens if the network drops during submission?"**
Show an ambiguous state. Tell the user to check payment history before retrying. Do not auto-retry because we don't know if the payment was processed. The idempotency key means a manual retry is safe — the server will return the cached response from the first attempt if it went through.

**"How do you support 50 countries without duplicating code?"**
`Intl.NumberFormat` and `Intl.DateTimeFormat` for locale-sensitive formatting. CSS logical properties for RTL support. Content (legal disclosures, compliance text) loaded from a locale key map. `libphonenumber-js` for phone number formatting. No custom formatting code — lean on platform APIs.
