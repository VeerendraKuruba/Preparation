# React + Redux + MobX State Management — Postman

> Postman's codebase uses React for UI, Redux for global shared state (collections, workspaces, auth), and MobX for reactive local state (request builder, response panel). You must know both paradigms.

---

## 1. Redux — Fundamentals & Patterns

### Core Concepts

**Q: Explain the Redux data flow.**

**Verbal answer:**
> "Redux enforces a unidirectional data flow. The store holds the entire app state as a single immutable object. To change state, components dispatch actions — plain objects with a `type` field. Reducers are pure functions that take the current state and an action and return the next state (never mutate). The store updates, React re-renders subscribed components.
>
> In Postman, Redux manages the collection tree, active workspace, authentication state, and shared environment variables — things that multiple distant components need to read or write. The constraint of pure reducers makes it easy to debug, replay actions, and implement undo/redo."

```typescript
// Action creators (Redux Toolkit style — modern approach)
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

interface Collection {
  id: string;
  name: string;
  requests: Request[];
}

interface CollectionsState {
  items: Record<string, Collection>;
  status: 'idle' | 'loading' | 'error';
  error: string | null;
}

// Async thunk for fetching collections
export const fetchCollections = createAsyncThunk(
  'collections/fetchAll',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      const response = await api.getCollections(workspaceId);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const collectionsSlice = createSlice({
  name: 'collections',
  initialState: { items: {}, status: 'idle', error: null } as CollectionsState,
  reducers: {
    addCollection(state, action: PayloadAction<Collection>) {
      // Immer (built into RTK) allows "mutating" syntax — it's still immutable under the hood
      state.items[action.payload.id] = action.payload;
    },
    renameCollection(state, action: PayloadAction<{ id: string; name: string }>) {
      const { id, name } = action.payload;
      if (state.items[id]) {
        state.items[id].name = name;
      }
    },
    deleteCollection(state, action: PayloadAction<string>) {
      delete state.items[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCollections.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCollections.fulfilled, (state, action) => {
        state.status = 'idle';
        action.payload.forEach(col => { state.items[col.id] = col; });
      })
      .addCase(fetchCollections.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload as string;
      });
  },
});

export const { addCollection, renameCollection, deleteCollection } = collectionsSlice.actions;
```

---

### Redux Selectors & Memoization

```typescript
import { createSelector } from '@reduxjs/toolkit';

const selectCollectionsMap = (state: RootState) => state.collections.items;
const selectActiveWorkspaceId = (state: RootState) => state.workspace.activeId;

// Memoized selector — recomputes only when dependencies change
export const selectCollectionsForWorkspace = createSelector(
  [selectCollectionsMap, selectActiveWorkspaceId],
  (items, workspaceId) =>
    Object.values(items)
      .filter(col => col.workspaceId === workspaceId)
      .sort((a, b) => a.name.localeCompare(b.name))
);

// Usage in component — won't cause re-render if result is same reference
const collections = useSelector(selectCollectionsForWorkspace);
```

---

### Redux Middleware — Thunk vs Saga

```typescript
// Redux Thunk — simpler, sufficient for most cases
// A thunk is a function that returns a function
export const saveRequestWithOptimisticUpdate = (requestId: string, data: Partial<Request>) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    const original = getState().requests.items[requestId];

    // Optimistic update: apply change immediately
    dispatch(updateRequest({ id: requestId, ...data }));

    try {
      await api.patchRequest(requestId, data);
    } catch (err) {
      // Revert on failure
      dispatch(updateRequest(original));
      dispatch(showToast({ type: 'error', message: 'Failed to save request' }));
    }
  };

// Redux Saga — for complex async flows (rare in new code, but Postman legacy)
// Sagas are generator functions that yield effects
import { call, put, takeLatest, select } from 'redux-saga/effects';

function* executeRequestSaga(action) {
  try {
    yield put(setRequestStatus('running'));
    const auth = yield select(selectActiveAuth);
    const environment = yield select(selectActiveEnvironment);

    const response = yield call(
      postmanRuntime.execute,
      { request: action.payload, auth, environment }
    );

    yield put(setResponse(response));
    yield put(setRequestStatus('done'));
  } catch (error) {
    yield put(setRequestStatus('error'));
    yield put(setRequestError(error.message));
  }
}

function* watchExecuteRequest() {
  yield takeLatest(EXECUTE_REQUEST, executeRequestSaga); // cancels previous if still running
}
```

---

## 2. MobX — Reactive State

### Why MobX Alongside Redux?

**Verbal answer:**
> "Postman uses Redux for global, cross-component state and MobX for local reactive state within complex components — primarily the request builder. The request builder has dozens of interdependent fields: change the method from GET to POST and the body panel should appear; change the auth type and the auth form should update. These reactive dependencies are awkward to model in Redux (lots of derived state calculations) but natural in MobX (computeds automatically track their dependencies)."

```typescript
import { makeObservable, observable, computed, action, autorun } from 'mobx';
import { observer } from 'mobx-react-lite';

class RequestBuilderStore {
  method: string = 'GET';
  url: string = '';
  headers: Map<string, string> = new Map();
  body: string = '';
  bodyType: 'none' | 'raw' | 'form-data' | 'urlencoded' = 'none';
  authType: 'none' | 'bearer' | 'basic' | 'api-key' = 'none';
  bearerToken: string = '';

  constructor() {
    makeObservable(this, {
      method: observable,
      url: observable,
      headers: observable,
      body: observable,
      bodyType: observable,
      authType: observable,
      bearerToken: observable,
      // Computed — derived state, automatically cached and updated
      showBodyPanel: computed,
      showAuthFields: computed,
      computedHeaders: computed,
      hasBody: computed,
      // Actions — the only way to modify observables
      setMethod: action,
      setUrl: action,
      setBody: action,
      setAuthType: action,
    });
  }

  // Computed values — tracked by MobX, cached until dependencies change
  get showBodyPanel(): boolean {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(this.method);
  }

  get hasBody(): boolean {
    return this.bodyType !== 'none' && this.body.trim().length > 0;
  }

  get computedHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    this.headers.forEach((value, key) => {
      if (key && value) headers[key] = value;
    });
    if (this.hasBody && this.bodyType === 'raw') {
      headers['Content-Type'] = 'application/json';
    }
    if (this.authType === 'bearer') {
      headers['Authorization'] = `Bearer ${this.bearerToken}`;
    }
    return headers;
  }

  get showAuthFields(): boolean {
    return this.authType !== 'none';
  }

  // Actions
  setMethod(method: string) {
    this.method = method;
    // Side effect: clear body if switching to GET
    if (method === 'GET') {
      this.bodyType = 'none';
      this.body = '';
    }
  }

  setUrl(url: string) { this.url = url; }
  setBody(body: string) { this.body = body; }
  setAuthType(type: typeof this.authType) { this.authType = type; }
}

// React component — observer re-renders when observables change
const RequestBuilder = observer(({ store }: { store: RequestBuilderStore }) => {
  return (
    <div className="request-builder">
      <MethodSelector
        value={store.method}
        onChange={(m) => store.setMethod(m)}
      />
      <UrlInput
        value={store.url}
        onChange={(u) => store.setUrl(u)}
      />
      {store.showBodyPanel && (
        <BodyPanel
          body={store.body}
          bodyType={store.bodyType}
          onBodyChange={(b) => store.setBody(b)}
        />
      )}
      <AuthPanel
        authType={store.authType}
        onAuthTypeChange={(t) => store.setAuthType(t)}
        visible={store.showAuthFields}
      />
    </div>
  );
});
```

---

### MobX Reactions

```typescript
import { autorun, reaction, when } from 'mobx';

// autorun — runs immediately and re-runs whenever ANY observable inside changes
const dispose = autorun(() => {
  console.log('Headers changed:', store.computedHeaders);
  // Tracks: store.computedHeaders (and all its dependencies transitively)
});
// Call dispose() to stop watching

// reaction — like autorun but split into what to track vs what to do
// Only re-runs the effect when the TRACKED value changes
const dispose2 = reaction(
  () => store.url, // what to track
  (url, prevUrl) => { // what to do when it changes
    validateUrl(url);
    saveToHistory(url);
  }
);

// when — one-time reaction (resolves once condition is true)
await when(() => store.responseStatus === 'received');
// Continues here once the response arrives
```

---

## 3. Redux vs MobX — When to Use Each

| Aspect | Redux | MobX |
|--------|-------|------|
| Boilerplate | More (actions, reducers, selectors) | Less (decorators, observables) |
| Debugging | Excellent (DevTools, action log, time-travel) | Moderate (MobX DevTools) |
| Mental model | Functional, immutable | OOP, reactive |
| Performance | Manual optimization (selectors, React.memo) | Automatic (fine-grained updates) |
| Use case | Global shared state, undo/redo, sync to server | Complex local state with derived values |
| Postman use | Collections, auth, workspaces | Request builder, response viewer |

---

## 4. React Patterns — Postman Context

### Controlled vs Uncontrolled Components

```tsx
// Controlled — React owns the value (good for validation, formatting)
function UrlInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter request URL"
    />
  );
}

// Uncontrolled — DOM owns the value, we read on submit
function QuickSearchForm({ onSearch }: { onSearch: (q: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSearch(inputRef.current!.value);
    }}>
      <input ref={inputRef} type="search" defaultValue="" />
      <button type="submit">Search</button>
    </form>
  );
}
```

---

### Context for Dependency Injection

```tsx
// Postman pattern: inject store instances via context
interface RequestBuilderContextValue {
  store: RequestBuilderStore;
  runRequest: () => Promise<void>;
  cancelRequest: () => void;
}

const RequestBuilderContext = createContext<RequestBuilderContextValue | null>(null);

function useRequestBuilder() {
  const ctx = useContext(RequestBuilderContext);
  if (!ctx) throw new Error('useRequestBuilder must be inside RequestBuilderProvider');
  return ctx;
}

function RequestBuilderProvider({ children }: { children: React.ReactNode }) {
  const store = useRef(new RequestBuilderStore()).current; // stable across renders
  const { dispatch } = useAppDispatch();

  const runRequest = useCallback(async () => {
    dispatch(setActiveTab('response'));
    await dispatch(executeRequest(store.buildRequest()));
  }, [store, dispatch]);

  const cancelRequest = useCallback(() => {
    dispatch(cancelActiveRequest());
  }, [dispatch]);

  return (
    <RequestBuilderContext.Provider value={{ store, runRequest, cancelRequest }}>
      {children}
    </RequestBuilderContext.Provider>
  );
}
```

---

### Performance Optimization Patterns

```tsx
// Virtualized list for large collections (react-window)
import { FixedSizeList } from 'react-window';

function CollectionTree({ requests }: { requests: Request[] }) {
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => (
      <div style={style}>
        <RequestItem request={requests[index]} />
      </div>
    ),
    [requests]
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={requests.length}
      itemSize={40}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// Debounced URL input to avoid re-running validation on every keystroke
function UrlInputWithValidation() {
  const [rawUrl, setRawUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const validate = useCallback(
    debounce((url: string) => {
      try {
        new URL(url);
        setValidationError(null);
      } catch {
        setValidationError('Invalid URL format');
      }
    }, 300),
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setRawUrl(url); // instant update
    validate(url);  // debounced validation
  };

  return (
    <div>
      <input value={rawUrl} onChange={handleChange} />
      {validationError && <p className="error">{validationError}</p>}
    </div>
  );
}
```

---

## 5. useReducer for Complex Local State

```tsx
// Response panel state — multiple interacting state variables
type Tab = 'body' | 'headers' | 'cookies' | 'test-results';
type BodyFormat = 'pretty' | 'raw' | 'preview';

interface ResponsePanelState {
  activeTab: Tab;
  bodyFormat: BodyFormat;
  isWrapped: boolean;
  searchTerm: string;
  filteredHeaders: string | null;
}

type ResponsePanelAction =
  | { type: 'SWITCH_TAB'; tab: Tab }
  | { type: 'SET_BODY_FORMAT'; format: BodyFormat }
  | { type: 'TOGGLE_WRAP' }
  | { type: 'SET_SEARCH'; term: string }
  | { type: 'CLEAR_SEARCH' };

function responsePanelReducer(
  state: ResponsePanelState,
  action: ResponsePanelAction
): ResponsePanelState {
  switch (action.type) {
    case 'SWITCH_TAB':
      return { ...state, activeTab: action.tab, searchTerm: '' }; // clear search on tab switch
    case 'SET_BODY_FORMAT':
      return { ...state, bodyFormat: action.format };
    case 'TOGGLE_WRAP':
      return { ...state, isWrapped: !state.isWrapped };
    case 'SET_SEARCH':
      return { ...state, searchTerm: action.term };
    case 'CLEAR_SEARCH':
      return { ...state, searchTerm: '', filteredHeaders: null };
    default:
      return state;
  }
}

function ResponsePanel() {
  const [state, dispatch] = useReducer(responsePanelReducer, {
    activeTab: 'body',
    bodyFormat: 'pretty',
    isWrapped: false,
    searchTerm: '',
    filteredHeaders: null,
  });

  return (
    <div className="response-panel">
      <TabBar
        active={state.activeTab}
        onSwitch={(tab) => dispatch({ type: 'SWITCH_TAB', tab })}
      />
      {state.activeTab === 'body' && (
        <BodyViewer
          format={state.bodyFormat}
          wrapped={state.isWrapped}
          onFormatChange={(f) => dispatch({ type: 'SET_BODY_FORMAT', format: f })}
          onToggleWrap={() => dispatch({ type: 'TOGGLE_WRAP' })}
        />
      )}
      {state.activeTab === 'headers' && (
        <HeadersViewer
          searchTerm={state.searchTerm}
          onSearch={(t) => dispatch({ type: 'SET_SEARCH', term: t })}
        />
      )}
    </div>
  );
}
```

---

## Quick-Fire React Questions

| Question | Answer |
|----------|--------|
| Reconciliation vs rendering? | Rendering = calling component function. Reconciliation = diffing output with previous virtual DOM to compute minimal DOM changes. |
| When does React bail out of re-render? | `React.memo` (props unchanged), `useMemo`/`useCallback` (deps unchanged), `useState` same reference. |
| What is `useLayoutEffect`? | Fires synchronously AFTER DOM mutations but BEFORE browser paint. Use for DOM measurements. Most code should use `useEffect`. |
| Strict Mode behavior? | Double-invokes render functions (dev only) to detect side effects. Makes effects run twice in dev to surface cleanup issues. |
| What is `startTransition`? | Marks state update as non-urgent — allows React to interrupt it and prioritize urgent updates (like typing). |
| `key` prop purpose? | Tells React which list items are the same across renders. Without it, React diffs by index — can cause wrong state association. |
| Controlled component re-render? | On every keystroke. Optimize with `useTransition` for large lists or `debounce` for expensive side effects. |
