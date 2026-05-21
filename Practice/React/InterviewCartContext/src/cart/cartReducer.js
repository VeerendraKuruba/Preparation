export const initialCartState = {
  items: [],
};

export function cartReducer(state, action) {
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

    case 'INCREMENT': {
      const id = action.payload;
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === id ? { ...i, qty: i.qty + 1 } : i
        ),
      };
    }

    case 'DECREMENT': {
      const id = action.payload;
      return {
        ...state,
        items: state.items
          .map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
          .filter((i) => i.qty > 0),
      };
    }

    case 'REMOVE_ITEM': {
      const id = action.payload;
      return { ...state, items: state.items.filter((i) => i.id !== id) };
    }

    case 'CLEAR': {
      return initialCartState;
    }

    default:
      return state;
  }
}

export function selectCartTotal(state) {
  return state.items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

