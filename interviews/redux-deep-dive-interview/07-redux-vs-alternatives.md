# Redux vs Alternatives — Decision Framework

> Interviewers increasingly ask: **"Would you still pick Redux today?"** Have a principled answer.

---

## 1. The State Taxonomy

```
┌─────────────────┬──────────────────────┬────────────────────────────┐
│  SERVER STATE   │     UI STATE         │   GLOBAL CLIENT STATE      │
│  (from API)     │  (local ephemeral)   │   (shared across app)      │
├─────────────────┼──────────────────────┼────────────────────────────┤
│ TanStack Query  │ useState             │ Redux / Zustand / Jotai    │
│ SWR             │ useReducer           │ (when justified)           │
│ RTK Query       │ React Context (local)│                            │
└─────────────────┴──────────────────────┴────────────────────────────┘
```

**Q: When do you still choose Redux in 2025?**

**Verbal answer:**
> "When I need predictable global client state with a clear action log, middleware for cross-cutting concerns, time-travel debugging, or a large team that benefits from enforced unidirectional flow. Examples: collaborative editing session state, complex multi-step client workflows, apps with heavy offline sync and optimistic queues. I don't reach for Redux first for server data or component-local UI — that's React Query and `useState`."

---

## 2. Redux vs React Context

| Aspect | Context | Redux |
|--------|---------|-------|
| Re-renders | All consumers on any value change | Per-selector subscription |
| DevTools | None | Full action history |
| Middleware | None | Thunk, listener, saga |
| Boilerplate | Low | Medium (low with RTK) |
| Best for | Theme, locale, DI | Complex shared domain state |

```jsx
// Context problem at scale
const AppContext = createContext();

function Provider({ children }) {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [theme, setTheme] = useState('light');
  // ANY change re-renders ALL useContext consumers
  return (
    <AppContext.Provider value={{ user, setUser, cart, setCart, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  );
}

// Fix: split contexts or use Redux/Zustand
```

**Q: Multiple contexts vs Redux?**
> "Splitting context by domain (AuthContext, ThemeContext) helps but doesn't give you action logs, middleware, or normalized entity patterns. For 3+ interacting domains, Redux or Zustand usually wins."

---

## 3. Redux vs Zustand

| Aspect | Redux (RTK) | Zustand |
|--------|-------------|---------|
| Philosophy | Flux, actions, reducers | Mutable-ish store, direct `set` |
| Learning curve | Steeper | Very low |
| DevTools | Excellent | Good (middleware) |
| Boilerplate | Low with RTK | Minimal |
| Ecosystem | RTK Query, sagas, large docs | Smaller |
| Team scale | Enforces conventions | More freedom = inconsistency risk |

```javascript
// Zustand — same cart, less ceremony
import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: [],
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, qty: i.qty + 1 } : i
          ),
        };
      }
      return { items: [...state.items, { ...item, qty: 1 }] };
    }),
  total: () => get().items.reduce((s, i) => s + i.price * i.qty, 0),
}));
```

**When Zustand over Redux:** Small/medium app, team wants speed, no saga requirements, global state is simple.

**When Redux over Zustand:** Large team, need action audit trail, complex async orchestration, existing Redux investment, RTK Query already in stack.

---

## 4. Redux vs MobX

| Aspect | Redux | MobX |
|--------|-------|------|
| Model | Functional, immutable | OOP, observable |
| Updates | Explicit dispatch | Automatic tracking |
| Derived state | Selectors | Computed values |
| Debugging | Excellent | Moderate |
| Re-renders | Manual optimization | Fine-grained automatic |

> "MobX shines for deeply interdependent local state (spreadsheets, form builders). Redux shines for global predictable state and replay. Postman uses both — see [postman 02-react-state.md](../postman-senior-frontend-interview/02-react-state.md)."

---

## 5. Redux vs TanStack Query (React Query)

**Q: Can Redux and React Query coexist?**

> "Yes — and that's the recommended split for many apps. React Query owns server cache: fetch, stale, refetch, invalidation. Redux owns client global state: selected tab, draft UI, auth token snapshot. Don't duplicate API entities in both — pick one source of truth for server data."

```jsx
function TodoPage() {
  const { data: todos, isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  });
  const filter = useAppSelector((s) => s.ui.todoFilter); // client-only

  const filtered = useMemo(
    () => todos?.filter((t) => (filter === 'active' ? !t.done : true)),
    [todos, filter]
  );
}
```

---

## 6. Redux vs Jotai / Recoil

| Aspect | Redux | Jotai |
|--------|-------|-------|
| Model | Single tree | Atomic pieces |
| Granularity | Slice-level | Atom-level |
| Use case | App-wide domains | Derived async atoms, fine composition |

> "Jotai/Recoil fit component-tree-adjacent shared state without one big store. Less common in enterprise interview loops than Redux/Zustand."

---

## 7. useReducer vs Redux (Again, with clarity)

```jsx
// useReducer — scoped to subtree, no DevTools middleware
function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);
  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}
```

**Rule of thumb:** If you'd copy-paste the same reducer+context to 3 features, promote to Redux/Zustand.

---

## 8. "Would you add Redux to a greenfield app?"

**Strong answer structure:**
1. **Start without** global store — local state + React Query for server
2. **Add Zustand or Redux** when you hit: cross-route shared state, action auditing requirement, complex middleware needs
3. **Pick Redux specifically** if team knows it, need RTK Query in Redux ecosystem, or compliance/logging requires action trail
4. **Avoid** Redux as default reflex

---

## 9. Comparison Table (Interview Cheat)

| Tool | Server state | Global client | Local UI | DevTools |
|------|-------------|---------------|----------|----------|
| Redux RTK | RTK Query | ✅ | overkill | ✅✅ |
| TanStack Query | ✅✅ | ❌ | ❌ | ✅ |
| Zustand | ❌ | ✅ | ok | ✅ |
| Context | ❌ | ⚠️ small | ✅ | ❌ |
| MobX | ❌ | ✅ | ✅✅ | ⚠️ |
| useState/useReducer | ❌ | ❌ | ✅✅ | ❌ |

---

## Quick-Fire

| Question | Answer |
|----------|--------|
| Replace Redux entirely with React Query? | No — different problems; often paired |
| Redux dead? | No — smaller role; RTK modernized it |
| XState vs Redux? | XState for explicit state machines; Redux for general app state |
| Form state in Redux? | Anti-pattern for most forms — local state |
