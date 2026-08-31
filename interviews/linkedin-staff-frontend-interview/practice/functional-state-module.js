/**
 * Functional state management — vanilla JS pattern
 * LinkedIn official brief: "functional style" + "managing state within the application"
 *
 * Run: node practice/functional-state-module.js
 */

function createStore(reducer, initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState() {
      return state;
    },
    dispatch(action) {
      state = reducer(state, action);
      listeners.forEach((fn) => fn(state));
      return action;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// ─── Example: todo module (pragmatic FE problem shape) ─────────────────────

const initialState = {
  items: [],
  filter: "all",
  loading: false,
  error: null,
};

function todoReducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload, error: null };
    case "SET_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "SET_ITEMS":
      return { ...state, loading: false, items: action.payload };
    case "ADD_ITEM":
      return { ...state, items: [...state.items, action.payload] };
    case "TOGGLE_ITEM":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload
            ? { ...item, done: !item.done }
            : item
        ),
      };
    case "SET_FILTER":
      return { ...state, filter: action.payload };
    default:
      return state;
  }
}

function selectVisibleItems(state) {
  if (state.filter === "active") return state.items.filter((i) => !i.done);
  if (state.filter === "done") return state.items.filter((i) => i.done);
  return state.items;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

const store = createStore(todoReducer, initialState);

store.dispatch({ type: "ADD_ITEM", payload: { id: 1, text: "Study closures", done: false } });
store.dispatch({ type: "ADD_ITEM", payload: { id: 2, text: "Build UI module", done: false } });
store.dispatch({ type: "TOGGLE_ITEM", payload: 1 });

const visible = selectVisibleItems(store.getState());
console.assert(visible.length === 2);
console.assert(visible.find((i) => i.id === 1).done === true);

store.dispatch({ type: "SET_FILTER", payload: "active" });
console.assert(selectVisibleItems(store.getState()).length === 1);

console.log("Functional state module tests passed.");

/**
 * INTERVIEW TALKING POINTS:
 *
 * 1. Single source of truth — one store, immutable updates
 * 2. Pure reducer — easy to unit test without DOM
 * 3. Selectors derive view state (filter) without mutating store
 * 4. subscribe() connects to DOM render function (manual React pattern)
 * 5. For async: dispatch SET_LOADING → fetch → SET_ITEMS or SET_ERROR
 *
 * Testing strategy:
 * - Test reducer in isolation with action/state pairs
 * - Test selectors with fixture states
 * - Integration: mock fetch, assert DOM after dispatch chain
 */

export { createStore, todoReducer, selectVisibleItems };
