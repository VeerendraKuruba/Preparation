import React, { createContext, useContext, useMemo, useReducer } from 'react';
import { cartReducer, initialCartState, selectCartTotal } from './cartReducer';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);
  const total = selectCartTotal(state);

  const value = useMemo(() => ({ state, dispatch, total }), [state, total]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

