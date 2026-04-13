# Solutions — System Design + LLD (Q56–Q75)

---

## Q56. REST vs GraphQL — when to choose each

**REST:**
- Fixed endpoints (`/surveys`, `/surveys/:id/responses`)
- Resources map 1:1 to URLs
- Simple to cache (HTTP caching, CDN)
- Multiple round trips for related data

**GraphQL:**
- Single endpoint, flexible queries
- Client specifies exact shape of data needed
- Eliminates over-fetching and under-fetching
- Great for complex nested data (survey → questions → responses → respondent)

```
REST — 3 requests to load a survey with questions and response counts:
GET /surveys/123
GET /surveys/123/questions
GET /surveys/123/responses/summary

GraphQL — 1 request:
query {
  survey(id: "123") {
    title
    status
    questions { id text type options }
    responseSummary { total completionRate }
  }
}
```

**Choose REST when:** Simple CRUD, strong HTTP caching needed, team unfamiliar with GraphQL, public API.
**Choose GraphQL when:** Complex relationships, multiple clients with different data needs (web, mobile), frequent UI iterations that change data requirements.

---

## Q57. Real-time updates — polling vs WebSockets vs SSE

| | Polling | WebSockets | SSE |
|--|---------|------------|-----|
| Direction | Client pulls | Bidirectional | Server pushes only |
| Connection | Opens/closes | Persistent | Persistent |
| Protocol | HTTP | ws:// | HTTP |
| Reconnect | Auto | Manual | Auto (built-in) |
| Use case | Infrequent updates | Chat, games, collaboration | Notifications, live feeds |

```js
// Polling — simplest, highest latency
function pollSurveyResponses(surveyId) {
  return setInterval(async () => {
    const count = await fetchResponseCount(surveyId);
    setResponseCount(count);
  }, 5000); // every 5s
}

// SSE — server pushes, auto-reconnect, HTTP (firewall-friendly)
const eventSource = new EventSource(`/api/surveys/${id}/stream`);
eventSource.addEventListener('response', (e) => {
  const data = JSON.parse(e.data);
  setResponseCount(prev => prev + 1);
});
eventSource.onerror = () => eventSource.close();

// WebSocket — bidirectional, use for collaboration (multiple editors)
const ws = new WebSocket('wss://api.surveymonkey.com/surveys/123/collaborate');
ws.onmessage = (e) => {
  const { type, payload } = JSON.parse(e.data);
  if (type === 'cursor_move') updateCollaboratorCursor(payload);
  if (type === 'question_edit') applyRemoteEdit(payload);
};
ws.send(JSON.stringify({ type: 'question_edit', payload: { id: 'q1', text: 'New text' } }));
```

**For SurveyMonkey response counts:** SSE — server-push, one direction, auto-reconnect
**For live collaboration on survey builder:** WebSockets — bidirectional edits

---

## Q58. Designing a component library from scratch

**Key decisions:**

1. **API design:** Composition over configuration, controlled + uncontrolled support
2. **Styling approach:** CSS-in-JS (Styled Components) vs CSS Modules vs CSS variables
3. **Accessibility:** ARIA by default, keyboard nav, focus management
4. **Tree-shaking:** Named exports, ES modules
5. **Documentation:** Storybook for living docs + interactive playground

```tsx
// Well-designed button API — flexible but not complex
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant} btn--${size}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading && <Spinner size="sm" aria-hidden />}
      {leftIcon && <span className="btn__icon btn__icon--left">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="btn__icon btn__icon--right">{rightIcon}</span>}
    </button>
  );
}

// Design token system — theme-able via CSS variables
// tokens.css
:root {
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --radius-md: 6px;
  --font-weight-medium: 500;
}
```

---

## Q59. Architecting a large React app for scalability

**Folder structure (feature-based, not type-based):**

```
src/
├── features/
│   ├── surveys/              # everything for survey feature
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   ├── store/            # Zustand slice or Redux slice
│   │   └── index.ts          # public API of this feature
│   ├── auth/
│   └── analytics/
├── shared/
│   ├── components/           # reusable UI (Button, Modal, etc.)
│   ├── hooks/                # useDebounce, usePrevious, etc.
│   ├── utils/
│   └── api/                  # base fetch client, interceptors
├── app/
│   ├── router.tsx
│   ├── providers.tsx         # all context providers
│   └── App.tsx
```

**State management layering:**
```
Local state (useState)
  ↓ too much prop drilling?
Context API (theme, auth, locale)
  ↓ complex updates / many consumers?
Server state: React Query / SWR (caching, background refresh)
  ↓ complex client-only global state?
Zustand / Redux Toolkit
```

**Code splitting per route:**
```tsx
// Every route is a separate chunk
const SurveyBuilder = lazy(() => import('./features/surveys/pages/SurveyBuilder'));
const Analytics = lazy(() => import('./features/analytics/pages/Analytics'));

function Router() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/build/:id" element={<SurveyBuilder />} />
        <Route path="/analyze/:id" element={<Analytics />} />
      </Routes>
    </Suspense>
  );
}
```

---

## Q60. Caching in a React SPA

**Three layers:**

```tsx
// 1. HTTP Cache (browser + CDN)
// Static assets: long max-age with content hashing
// Cache-Control: public, max-age=31536000, immutable  (hashed filename)
// API: short max-age or no-store for dynamic data

// 2. React Query (server state caching)
function useSurveys(filter) {
  return useQuery({
    queryKey: ['surveys', filter],    // cache key
    queryFn: () => fetchSurveys(filter),
    staleTime: 5 * 60 * 1000,         // data is fresh for 5 min
    gcTime: 10 * 60 * 1000,           // keep in memory 10 min after unmount
    refetchOnWindowFocus: true,        // auto-refresh when user returns
  });
}

// Optimistic update (instant UI, confirm with server)
const mutation = useMutation({
  mutationFn: deleteSurvey,
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ['surveys'] });
    const prev = queryClient.getQueryData(['surveys']);
    queryClient.setQueryData(['surveys'], old => old.filter(s => s.id !== id));
    return { prev }; // context for rollback
  },
  onError: (_, __, context) => {
    queryClient.setQueryData(['surveys'], context.prev); // rollback
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['surveys'] }),
});

// 3. In-memory / localStorage for user preferences
const useTheme = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  useEffect(() => localStorage.setItem('theme', theme), [theme]);
  return [theme, setTheme];
};
```

---

## Q61. Designing for accessibility (WCAG AA)

**Key WCAG AA requirements:**
- Colour contrast: 4.5:1 for normal text, 3:1 for large text
- Keyboard navigable: every interactive element focusable, logical tab order
- Screen reader: semantic HTML, ARIA labels, live regions
- Images: alt text
- Focus visible: `:focus-visible` styles

```tsx
// Accessible custom select dropdown
function Select({ options, value, onChange, label, id }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef(null);

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        setOpen(o => !o);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
        break;
      case 'Escape':
        setOpen(false);
        break;
    }
  };

  return (
    <div>
      <label id={`${id}-label`}>{label}</label>
      <button
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label`}
        onKeyDown={handleKeyDown}
        onClick={() => setOpen(o => !o)}
      >
        {value || 'Select...'}
      </button>
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-labelledby={`${id}-label`}
        >
          {options.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={value === opt.value}
              aria-activedescendant={i === activeIndex ? `opt-${i}` : undefined}
              id={`opt-${i}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Q62. Internationalization (i18n) in React

```tsx
// Using react-i18next (most common)
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: { 'survey.create': 'Create Survey', 'survey.responses': '{{count}} responses' } },
    fr: { translation: { 'survey.create': 'Créer un sondage', 'survey.responses': '{{count}} réponses' } },
  },
  lng: navigator.language.split('-')[0],
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Component
function SurveyHeader({ responseCount }) {
  const { t, i18n } = useTranslation();

  return (
    <header>
      <h1>{t('survey.create')}</h1>
      {/* Plural handled automatically */}
      <span>{t('survey.responses', { count: responseCount })}</span>
      <select onChange={e => i18n.changeLanguage(e.target.value)}>
        <option value="en">English</option>
        <option value="fr">Français</option>
      </select>
    </header>
  );
}

// Challenges to mention:
// - RTL languages (Arabic, Hebrew): use `dir="rtl"` and logical CSS properties
// - Date/number/currency formatting: use Intl.DateTimeFormat, Intl.NumberFormat
// - Dynamic language loading: lazy-load translation files per language
```

---

## Q63. Micro-frontend architecture

**Concept:** Split a large frontend into independently deployable sub-apps owned by different teams.

```
Shell App (host)
├── /surveys → Team A's React app (surveys.surveymonkey.com)
├── /analyze → Team B's Vue app (analytics.surveymonkey.com)
└── /account → Team C's Angular app (account.surveymonkey.com)
```

**Implementation approaches:**

```js
// 1. Module Federation (Webpack 5) — most powerful
// webpack.config.js (host)
new ModuleFederationPlugin({
  name: 'host',
  remotes: {
    surveys: 'surveys@https://surveys.cdn.com/remoteEntry.js',
    analytics: 'analytics@https://analytics.cdn.com/remoteEntry.js',
  },
});

// In host component
const SurveyApp = lazy(() => import('surveys/App'));

// 2. iframe — maximum isolation, worst DX
<iframe src="https://surveys.surveymonkey.com" title="Survey Builder" />

// 3. Web Components — framework-agnostic custom elements
customElements.define('survey-builder', SurveyBuilderElement);
```

**Tradeoffs:**
| Pro | Con |
|-----|-----|
| Team autonomy | Duplicate dependencies (React loaded twice?) |
| Independent deploys | Complex cross-app communication |
| Technology freedom | Inconsistent UX without shared design system |
| Incremental migration | Performance overhead |

---

## Q64. Error boundaries + fallback UI at scale

```tsx
// Granular boundaries — contain failures to the smallest unit
function App() {
  return (
    <ErrorBoundary fallback={<AppCrash />}>   {/* top-level safety net */}
      <Header />
      <main>
        <ErrorBoundary fallback={<SurveyListError onRetry={refetch} />}>
          <SurveyList />
        </ErrorBoundary>
        <ErrorBoundary fallback={<AnalyticsError />}>
          <AnalyticsPanel />
        </ErrorBoundary>
      </main>
    </ErrorBoundary>
  );
}

// Reusable ErrorBoundary with retry support
class ErrorBoundary extends React.Component {
  state = { hasError: false, key: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    errorTracking.capture(error, { componentStack: info.componentStack });
  }

  handleRetry = () => {
    this.setState(s => ({ hasError: false, key: s.key + 1 }));
  };

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback;
      return typeof Fallback === 'function'
        ? <Fallback onRetry={this.handleRetry} />
        : Fallback;
    }
    // key change forces remount of children (resets their state)
    return <React.Fragment key={this.state.key}>{this.props.children}</React.Fragment>;
  }
}
```

---

## Q65. Forms at scale — React Hook Form vs Formik vs custom

```tsx
// React Hook Form — performance focus, uncontrolled inputs, minimal re-renders
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  type: z.enum(['multiple_choice', 'rating', 'text']),
  required: z.boolean().default(false),
});

function AddQuestionForm({ onSubmit }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, control } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { type: 'multiple_choice', required: false },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} placeholder="Question text" aria-invalid={!!errors.title} />
      {errors.title && <p role="alert">{errors.title.message}</p>}

      <Controller
        name="type"
        control={control}
        render={({ field }) => <Select {...field} options={questionTypes} />}
      />

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Add Question'}
      </button>
    </form>
  );
}

// Why RHF over Formik:
// - Uncontrolled inputs = no re-render on every keystroke
// - ~50% smaller bundle (9kb vs 15kb gzipped)
// - First-class TypeScript support
// - Better performance with large forms (50+ fields)
```

---

## Q66. Component API design — flexible and easy to use

```tsx
// Principles:
// 1. Reasonable defaults
// 2. Extend, don't replace (spread HTML attrs)
// 3. Composable (children, render props, compound pattern)
// 4. Controlled AND uncontrolled support

// BAD — too many props, hard to use
<DataTable
  data={rows}
  columns={cols}
  sortable={true}
  sortKey="name"
  sortDir="asc"
  onSortChange={fn}
  paginated={true}
  pageSize={10}
  currentPage={1}
  onPageChange={fn}
  selectable={true}
  selectedRows={[]}
  onSelectionChange={fn}
/>

// GOOD — composable, each concern is opt-in
<DataTable data={rows} columns={cols}>
  <DataTable.Sort defaultKey="name" />
  <DataTable.Pagination pageSize={10} />
  <DataTable.Selection onChange={setSelected} />
</DataTable>
```

---

## Q67. Compound component pattern — `<Select>`

```tsx
const SelectContext = createContext(null);

function Select({ children, value, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <SelectContext.Provider value={{ value, onChange, open, setOpen }}>
      <div className="select">{children}</div>
    </SelectContext.Provider>
  );
}

Select.Trigger = function Trigger({ children }) {
  const { value, open, setOpen } = useContext(SelectContext);
  return (
    <button
      className="select-trigger"
      onClick={() => setOpen(o => !o)}
      aria-haspopup="listbox"
      aria-expanded={open}
    >
      {value || children}
      <ChevronIcon />
    </button>
  );
};

Select.Options = function Options({ children }) {
  const { open } = useContext(SelectContext);
  if (!open) return null;
  return <ul role="listbox" className="select-options">{children}</ul>;
};

Select.Option = function Option({ value, children }) {
  const { value: selected, onChange, setOpen } = useContext(SelectContext);
  return (
    <li
      role="option"
      aria-selected={selected === value}
      onClick={() => { onChange(value); setOpen(false); }}
      className={`select-option ${selected === value ? 'selected' : ''}`}
    >
      {children}
    </li>
  );
};

// Usage — clear, composable
<Select value={status} onChange={setStatus}>
  <Select.Trigger>Status</Select.Trigger>
  <Select.Options>
    <Select.Option value="active">Active</Select.Option>
    <Select.Option value="closed">Closed</Select.Option>
    <Select.Option value="draft">Draft</Select.Option>
  </Select.Options>
</Select>
```

---

## Q68. Controlled + uncontrolled support in a reusable component

```tsx
function useControllableState({ value, defaultValue, onChange }) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;

  const handleChange = (newValue) => {
    if (!isControlled) setInternalValue(newValue);
    onChange?.(newValue);
  };

  return [isControlled ? value : internalValue, handleChange];
}

// Reusable Toggle — works both controlled and uncontrolled
function Toggle({ checked, defaultChecked = false, onChange, label }) {
  const [isOn, setIsOn] = useControllableState({
    value: checked,
    defaultValue: defaultChecked,
    onChange,
  });

  return (
    <button
      role="switch"
      aria-checked={isOn}
      aria-label={label}
      onClick={() => setIsOn(!isOn)}
      className={`toggle ${isOn ? 'toggle--on' : ''}`}
    />
  );
}

// Uncontrolled — internal state
<Toggle defaultChecked label="Email notifications" />

// Controlled — parent owns state
<Toggle checked={emailsEnabled} onChange={setEmailsEnabled} label="Email notifications" />
```

---

## Q69. Making a component library tree-shakeable

```js
// BAD — barrel file with wildcard export
// index.js
export * from './Button';
export * from './Modal';
export * from './Table'; // bundler can't know what's used → entire lib included

// GOOD — named exports, bundler-friendly
// package.json
{
  "main": "dist/index.cjs.js",
  "module": "dist/index.esm.js",  // ES module for tree-shaking
  "sideEffects": false,            // tell bundler: no side effects → safe to tree-shake
  "exports": {
    ".": "./dist/index.esm.js",
    "./Button": "./dist/Button/index.js",  // direct sub-path imports
    "./Modal": "./dist/Modal/index.js"
  }
}

// Consumer — only Button is bundled
import { Button } from '@company/ui';
// or
import Button from '@company/ui/Button';
```

---

## Q70. Virtualization — `react-window` / `react-virtual`

**Why:** Rendering 10,000 `<SurveyRow>` DOM nodes crashes the browser. Virtualization renders only visible rows.

```tsx
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

function VirtualSurveyList({ surveys }) {
  const Row = ({ index, style }) => (
    // style MUST be applied — contains top/height from react-window
    <div style={style} className="survey-row">
      <SurveyCard survey={surveys[index]} />
    </div>
  );

  return (
    <AutoSizer>
      {({ height, width }) => (
        <FixedSizeList
          height={height}
          width={width}
          itemCount={surveys.length}
          itemSize={80}           // each row is 80px
          overscanCount={5}       // render 5 extra rows above/below for smoother scroll
        >
          {Row}
        </FixedSizeList>
      )}
    </AutoSizer>
  );
}

// Variable height rows: use VariableSizeList with a size getter function
// TanStack Virtual (react-virtual) is a newer, headless alternative
```

---

## Q71. Accessible dropdown/combobox

(Covered in Q61 above — see Select component with role="combobox", aria-haspopup, arrow key nav, Escape to close, focus management)

**ARIA pattern for combobox:**
- Trigger: `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`
- List: `role="listbox"`
- Options: `role="option"`, `aria-selected`
- `aria-activedescendant` on trigger points to currently highlighted option

---

## Q72. Dynamic form fields (add/remove rows)

```tsx
import { useFieldArray, useForm } from 'react-hook-form';

function SurveyOptionsForm() {
  const { register, control, handleSubmit } = useForm({
    defaultValues: { options: [{ text: '' }] },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'options',
  });

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <ul>
        {fields.map((field, index) => (
          <li key={field.id}>  {/* field.id — stable RHF key, not index! */}
            <input
              {...register(`options.${index}.text`)}
              placeholder={`Option ${index + 1}`}
            />
            <button type="button" onClick={() => move(index, index - 1)}>↑</button>
            <button type="button" onClick={() => remove(index)}>✕</button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => append({ text: '' })}>+ Add Option</button>
      <button type="submit">Save</button>
    </form>
  );
}
```

---

## Q73. Optimistic updates

```tsx
// Pattern: update UI immediately, confirm with server, rollback on failure

function useSurveyToggle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, active }) => toggleSurvey(id, active),

    // 1. Snapshot current state + immediately apply update
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: ['surveys'] });
      const snapshot = queryClient.getQueryData(['surveys']);

      queryClient.setQueryData(['surveys'], (old) =>
        old.map(s => s.id === id ? { ...s, active } : s)
      );

      return { snapshot }; // return context for rollback
    },

    // 2. On error — rollback to snapshot
    onError: (err, variables, context) => {
      queryClient.setQueryData(['surveys'], context.snapshot);
      toast.error('Failed to update survey status');
    },

    // 3. On settle — sync with server truth
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
    },
  });
}
```

---

## Q74. Lifting state up vs Context — when to choose each

```
Decision tree:
State used by 1 component → useState inside that component
State shared between 2–3 nearby siblings → lift up to nearest common ancestor
State accessed by many components across the tree → Context
State with complex transitions / many consumers → Zustand / Redux

// Lifting state up (2 siblings sharing filter)
function SurveyPage() {
  const [filter, setFilter] = useState('all'); // lifted here

  return (
    <>
      <FilterBar filter={filter} onFilterChange={setFilter} />
      <SurveyList filter={filter} />
    </>
  );
}

// Context (auth used across entire app)
function App() {
  return (
    <AuthProvider>   {/* provides user to any nested component */}
      <Router />
    </AuthProvider>
  );
}
```

---

## Q75. Testing strategy — unit vs integration vs E2E

```
Testing pyramid:
         /\
        /E2E\       — few, expensive, cover critical paths (Playwright, Cypress)
       /------\
      / Integr \    — medium, test components with real dependencies (React Testing Library)
     /----------\
    /    Unit    \  — many, cheap, pure functions, hooks in isolation (Vitest, Jest)
   /--------------\

// Unit test — pure function
test('isAnagram returns true for valid anagram', () => {
  expect(isAnagram('listen', 'silent')).toBe(true);
  expect(isAnagram('hello', 'world')).toBe(false);
});

// Integration test — component + DOM (React Testing Library)
test('SurveyList shows loading skeleton then surveys', async () => {
  server.use(rest.get('/api/surveys', (req, res, ctx) =>
    res(ctx.json([{ id: 1, title: 'NPS Survey' }]))
  ));

  render(<SurveyList />);

  // Loading state
  expect(screen.getByTestId('skeleton')).toBeInTheDocument();

  // Success state
  expect(await screen.findByText('NPS Survey')).toBeInTheDocument();
});

// E2E — full user flow (Playwright)
test('user can create and publish a survey', async ({ page }) => {
  await page.goto('/surveys/new');
  await page.fill('[name="title"]', 'Customer Satisfaction');
  await page.click('button:has-text("Add Question")');
  await page.fill('[placeholder="Question text"]', 'How satisfied are you?');
  await page.click('button:has-text("Publish")');
  await expect(page.locator('.survey-status')).toHaveText('Active');
});
```

**Priority:** Integration tests give the best ROI — they test real user interactions without the fragility of E2E. The guiding principle (Kent C. Dodds): "Test behaviour, not implementation."
