# Coding Challenge Solutions

> Try challenges first in [08-coding-challenges.md](../08-coding-challenges.md).

---

## Challenge 1: Cart Reducer

```javascript
const initialState = { items: [] };

function cartReducer(state = initialState, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { id, name, price } = action.payload;
      const existing = state.items.find((i) => i.id === id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === id ? { ...i, qty: i.qty + 1 } : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { id, name, price, qty: 1 }],
      };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.payload),
      };
    case 'CLEAR_CART':
      return initialState;
    default:
      return state;
  }
}

function selectCartTotal(state) {
  return state.items.reduce((sum, i) => sum + i.price * i.qty, 0);
}
```

---

## Challenge 2: createSlice Migration

```javascript
import { createSlice, createSelector, nanoid } from '@reduxjs/toolkit';

const todosSlice = createSlice({
  name: 'todos',
  initialState: { items: [], filter: 'all' },
  reducers: {
    add(state, action) {
      state.items.push({ id: nanoid(), text: action.payload, done: false });
    },
    toggle(state, action) {
      const todo = state.items.find((t) => t.id === action.payload);
      if (todo) todo.done = !todo.done;
    },
    setFilter(state, action) {
      state.filter = action.payload;
    },
  },
});

export const { add, toggle, setFilter } = todosSlice.actions;
export default todosSlice.reducer;

const selectTodos = (state) => state.todos.items;
const selectFilter = (state) => state.todos.filter;

export const selectFilteredTodos = createSelector(
  [selectTodos, selectFilter],
  (items, filter) => {
    if (filter === 'active') return items.filter((t) => !t.done);
    if (filter === 'completed') return items.filter((t) => t.done);
    return items;
  }
);
```

---

## Challenge 3: createAsyncThunk with condition

```javascript
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const fetchUser = createAsyncThunk(
  'users/fetchById',
  async (userId, { rejectWithValue }) => {
    try {
      return await api.getUser(userId);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
  {
    condition: (userId, { getState }) => {
      const { users } = getState();
      return !users.entities[userId] && !users.loading;
    },
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState: { entities: {}, loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.entities[action.payload.id] = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});
```

---

## Challenge 4: Optimistic Like

```javascript
const postsSlice = createSlice({
  name: 'posts',
  initialState: { entities: {}, snapshots: {} },
  reducers: {
    optimisticLike(state, action) {
      const id = action.payload;
      const post = state.entities[id];
      state.snapshots[id] = { liked: post.liked, likeCount: post.likeCount };
      post.liked = !post.liked;
      post.likeCount += post.liked ? 1 : -1;
    },
    revertLike(state, action) {
      const id = action.payload;
      const snap = state.snapshots[id];
      if (snap) {
        state.entities[id].liked = snap.liked;
        state.entities[id].likeCount = snap.likeCount;
        delete state.snapshots[id];
      }
    },
    commitLike(state, action) {
      delete state.snapshots[action.payload];
    },
  },
});

export const toggleLike = (postId) => async (dispatch) => {
  dispatch(optimisticLike(postId));
  try {
    await api.toggleLike(postId);
    dispatch(commitLike(postId));
  } catch {
    dispatch(revertLike(postId));
    dispatch(showToast({ type: 'error', message: 'Like failed' }));
  }
};
```

---

## Challenge 5: Timing Middleware

```javascript
const timingMiddleware = (store) => (next) => (action) => {
  if (process.env.NODE_ENV !== 'development') return next(action);

  const start = performance.now();
  const result = next(action);
  const ms = (performance.now() - start).toFixed(2);
  console.log(`[redux] ${action.type} took ${ms}ms`);
  return result;
};
```

---

## Challenge 6: Undoable Counter

```javascript
function undoable(reducer, limit = 20) {
  return (
    state = { past: [], present: reducer(undefined, { type: '@@INIT' }), future: [] },
    action
  ) => {
    const { past, present, future } = state;

    if (action.type === 'UNDO') {
      if (!past.length) return state;
      return {
        past: past.slice(0, -1),
        present: past[past.length - 1],
        future: [present, ...future],
      };
    }
    if (action.type === 'REDO') {
      if (!future.length) return state;
      return {
        past: [...past, present],
        present: future[0],
        future: future.slice(1),
      };
    }

    const newPresent = reducer(present, action);
    if (newPresent === present) return state;

    return {
      past: [...past, present].slice(-limit),
      present: newPresent,
      future: [],
    };
  };
}

function counterReducer(state = { count: 0 }, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { count: state.count + 1 };
    case 'DECREMENT':
      return { count: state.count - 1 };
    default:
      return state;
  }
}
```

---

## Challenge 7: Normalize Comments

```javascript
function normalizePosts(posts) {
  const postIds = [];
  const postEntities = {};
  const commentIds = [];
  const commentEntities = {};

  posts.forEach((post) => {
    postIds.push(post.id);
    const cIds = [];
    post.comments.forEach((c) => {
      commentIds.push(c.id);
      cIds.push(c.id);
      commentEntities[c.id] = { ...c, postId: post.id };
    });
    postEntities[post.id] = { id: post.id, title: post.title, commentIds: cIds };
  });

  return {
    posts: { ids: postIds, entities: postEntities },
    comments: { ids: commentIds, entities: commentEntities },
  };
}

// In slice extraReducer:
.addCase(POSTS_LOADED, (state, action) => {
  const normalized = normalizePosts(action.payload);
  state.posts = normalized.posts;
  state.comments = normalized.comments;
})
```

---

## Challenge 8: localStorage Listener

```javascript
import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { addItem, removeItem, clearCart } from './cartSlice';

const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
  matcher: isAnyOf(addItem, removeItem, clearCart),
  effect: (_, listenerApi) => {
    const cart = listenerApi.getState().cart;
    localStorage.setItem('cart', JSON.stringify(cart));
  },
});

// Hydrate in store setup
const saved = localStorage.getItem('cart');
const preloadedState = saved ? { cart: JSON.parse(saved) } : undefined;

const store = configureStore({
  reducer: { cart: cartReducer },
  preloadedState,
  middleware: (gDM) => gDM().prepend(listenerMiddleware.middleware),
});
```

---

## Challenge 9: Dedupe Fetch (condition)

```javascript
let inflightPromise = null;

export const fetchDashboard = createAsyncThunk(
  'dashboard/fetch',
  async () => {
    if (inflightPromise) return inflightPromise;
    inflightPromise = api.getDashboard().finally(() => {
      inflightPromise = null;
    });
    return inflightPromise;
  },
  {
    condition: (_, { getState }) => !getState().dashboard.loading,
  }
);
```

---

## Challenge 10: Vanilla Store

```javascript
import { createStore } from 'redux';

function counter(state = { count: 0 }, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { count: state.count + 1 };
    default:
      return state;
  }
}

const store = createStore(counter);
const unsubscribe = store.subscribe(() => console.log(store.getState()));

store.dispatch({ type: 'INCREMENT' });
store.dispatch({ type: 'INCREMENT' });
store.dispatch({ type: 'INCREMENT' });

unsubscribe();
```

---

## Challenge 12: RTK Query Tags (Sketch)

```javascript
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Post'],
  endpoints: (builder) => ({
    getPosts: builder.query({
      query: () => '/posts',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Post', id })), { type: 'Post', id: 'LIST' }]
          : [{ type: 'Post', id: 'LIST' }],
    }),
    getPostById: builder.query({
      query: (id) => `/posts/${id}`,
      providesTags: (_, __, id) => [{ type: 'Post', id }],
    }),
    addPost: builder.mutation({
      query: (body) => ({ url: '/posts', method: 'POST', body }),
      invalidatesTags: [{ type: 'Post', id: 'LIST' }],
    }),
    updatePost: builder.mutation({
      query: ({ id, ...patch }) => ({ url: `/posts/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (_, __, { id }) => [
        { type: 'Post', id },
        { type: 'Post', id: 'LIST' },
      ],
    }),
  }),
});
```
