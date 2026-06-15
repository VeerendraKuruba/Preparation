# Redux Coding Challenges

> Practice these without looking at solutions. Time yourself — interview coding rounds are often 30–45 minutes.

---

## Challenge 1: Cart Reducer (Classic)

**Prompt:** Implement a cart reducer with actions:
- `ADD_ITEM` — `{ id, name, price }` — increment qty if exists
- `REMOVE_ITEM` — `{ id }`
- `CLEAR_CART`

**Constraints:** Pure, immutable updates.

**Starter:**
```javascript
const initialState = { items: [] };

function cartReducer(state = initialState, action) {
  switch (action.type) {
    // your code
    default:
      return state;
  }
}
```

**Follow-ups:**
- Add `selectCartTotal(state)` selector
- Add `selectItemCount(state)` memoized with `createSelector`

---

## Challenge 2: createSlice Migration

**Prompt:** Convert this classic Redux to RTK `createSlice`:

```javascript
const ADD = 'todos/ADD';
const TOGGLE = 'todos/TOGGLE';
const SET_FILTER = 'todos/SET_FILTER';

function todosReducer(state = { items: [], filter: 'all' }, action) {
  switch (action.type) {
    case ADD:
      return { ...state, items: [...state.items, action.payload] };
    case TOGGLE:
      return {
        ...state,
        items: state.items.map((t) =>
          t.id === action.payload ? { ...t, done: !t.done } : t
        ),
      };
    case SET_FILTER:
      return { ...state, filter: action.payload };
    default:
      return state;
  }
}
```

**Deliver:** `todosSlice.ts` with exported actions + reducer + `selectFilteredTodos`.

---

## Challenge 3: createAsyncThunk

**Prompt:** Build a users slice that:
1. Fetches user by id from `GET /api/users/:id`
2. Tracks `loading`, `error`, and `entities` map
3. Skips fetch if user already in cache (`condition`)

**Mock API:**
```javascript
const api = {
  getUser: (id) =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        if (id === '404') reject(new Error('Not found'));
        else resolve({ id, name: `User ${id}` });
      }, 500);
    }),
};
```

---

## Challenge 4: Optimistic Like Button

**Prompt:** Implement like/unlike with optimistic UI:
- Immediately toggle `liked` and `likeCount` in store
- Revert on API failure
- Show error toast on failure

**State shape:**
```javascript
{ posts: { [postId]: { id, liked, likeCount } } }
```

---

## Challenge 5: Middleware From Scratch

**Prompt:** Write custom middleware that:
- Logs action type and duration (time from dispatch to `next` return)
- In development only

```javascript
const timingMiddleware = (store) => (next) => (action) => {
  // implement
};
```

---

## Challenge 6: Undoable Counter

**Prompt:** Wrap a counter reducer with undo/redo:
- Actions: `INCREMENT`, `DECREMENT`, `UNDO`, `REDO`
- Max 20 history entries

---

## Challenge 7: Normalized Comments

**Prompt:** Given denormalized API response, write a reducer case `POSTS_LOADED` that normalizes into:

```javascript
{
  posts: { ids: [], entities: {} },
  comments: { ids: [], entities: {} },
}
```

**Input:**
```javascript
[
  { id: 'p1', title: 'Hello', comments: [{ id: 'c1', text: 'Nice' }] },
]
```

---

## Challenge 8: Listener — Sync Cart to localStorage

**Prompt:** Use RTK listener middleware to persist `cart` slice to `localStorage` on every cart change, and hydrate on app init.

---

## Challenge 9: Prevent Duplicate Fetch

**Prompt:** Three components mount simultaneously and dispatch `fetchDashboard()`. Ensure only **one** network request fires.

**Approaches to implement (pick one):**
- `createAsyncThunk` with `condition`
- RTK Query `useGetDashboardQuery`
- Saga `takeLatest`

---

## Challenge 10: Mini Store Without React

**Prompt:** Using only `redux` package (no React):
1. Create store with counter reducer
2. Subscribe and log state
3. Dispatch 3 actions
4. Unsubscribe

---

## Challenge 11: TypeScript RootState

**Prompt:** Type a store with `auth` and `todos` slices. Export typed `useAppDispatch` and `useAppSelector`. Type a thunk that reads `state.auth.token` for API headers.

---

## Challenge 12: RTK Query Tags

**Prompt:** Define RTK Query API with:
- `getPosts` — provides `Post` list tag
- `addPost` — invalidates list
- `getPostById` — provides individual tag
- `updatePost` — invalidates both list and individual

---

## Self-Assessment Rubric

| Score | Meaning |
|-------|---------|
| 0–4 solved | Review [01-fundamentals](./01-fundamentals-and-data-flow.md) + [02-redux-toolkit](./02-redux-toolkit.md) |
| 5–8 solved | Solid mid-level; drill async + selectors |
| 9–12 solved | Senior-ready; mock verbal system design for state |

**Solutions:** [solutions/01-coding-challenges-solutions.md](./solutions/01-coding-challenges-solutions.md)
